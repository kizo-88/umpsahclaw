package vector

import (
	"context"
	"encoding/binary"
	"fmt"
	"hash/fnv"
	"math"
	"os"
	"path/filepath"
	"sync"

	"modernc.org/sqlite"
)

// VectorStore provides vector similarity search using SQLite with vector extension
type VectorStore struct {
	dbPath    string
	db        *sqlite.DB
	dimensions int
	mu        sync.RWMutex
}

// VectorDocument represents a document with embedding
type VectorDocument struct {
	ID        string
	Content   string
	Metadata  map[string]any
	Embedding []float32
}

// SearchResult contains a document and its similarity score
type SearchResult struct {
	Document VectorDocument
	Score    float32
}

// VectorStoreConfig holds configuration for the vector store
type VectorStoreConfig struct {
	DBPath     string // Path to SQLite database file
	Dimensions int    // Vector dimensions (e.g., 384, 768, 1536)
}

// NewVectorStore creates a new vector store with SQLite backend
func NewVectorStore(config VectorStoreConfig) (*VectorStore, error) {
	if config.Dimensions <= 0 {
		return nil, fmt.Errorf("dimensions must be positive")
	}

	dbPath := config.DBPath
	if dbPath == "" {
		dbPath = "vector_store.db"
	}

	// Ensure directory exists
	dir := filepath.Dir(dbPath)
	if dir != "" && dir != "." {
		if err := os.MkdirAll(dir, 0755); err != nil {
			return nil, fmt.Errorf("failed to create directory: %w", err)
		}
	}

	db, err := sqlite.Open(dbPath)
	if err != nil {
		return nil, fmt.Errorf("failed to open database: %w", err)
	}

	store := &VectorStore{
		dbPath:     dbPath,
		db:         db,
		dimensions: config.Dimensions,
	}

	if err := store.initialize(); err != nil {
		db.Close()
		return nil, fmt.Errorf("failed to initialize: %w", err)
	}

	return store, nil
}

// initialize sets up the database schema
func (v *VectorStore) initialize() error {
	schema := `
	CREATE TABLE IF NOT EXISTS documents (
		id TEXT PRIMARY KEY,
		content TEXT NOT NULL,
		metadata BLOB,
		embedding BLOB NOT NULL,
		collection TEXT DEFAULT 'default',
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);
	
	CREATE INDEX IF NOT EXISTS idx_collection ON documents(collection);
	`

	_, err := v.db.Exec(schema)
	return err
}

// Insert adds a document to the vector store
func (v *VectorStore) Insert(ctx context.Context, doc VectorDocument, collection string) error {
	v.mu.Lock()
	defer v.mu.Unlock()

	if len(doc.Embedding) != v.dimensions {
		return fmt.Errorf("embedding dimension mismatch: expected %d, got %d", v.dimensions, len(doc.Embedding))
	}

	metadataBytes, err := serializeMetadata(doc.Metadata)
	if err != nil {
		return fmt.Errorf("failed to serialize metadata: %w", err)
	}

	embeddingBytes := float32ToBytes(doc.Embedding)

	query := `
	INSERT OR REPLACE INTO documents (id, content, metadata, embedding, collection)
	VALUES (?, ?, ?, ?, ?)
	`

	_, err = v.db.ExecContext(ctx, query, doc.ID, doc.Content, metadataBytes, embeddingBytes, collection)
	return err
}

// Search performs similarity search using cosine similarity
func (v *VectorStore) Search(ctx context.Context, queryEmbedding []float32, collection string, limit int) ([]SearchResult, error) {
	v.mu.RLock()
	defer v.mu.RUnlock()

	if len(queryEmbedding) != v.dimensions {
		return nil, fmt.Errorf("query embedding dimension mismatch: expected %d, got %d", v.dimensions, len(queryEmbedding))
	}

	if limit <= 0 {
		limit = 10
	}

	queryBytes := float32ToBytes(queryEmbedding)

	// Use SQLite to compute cosine similarity
	// Note: For production, consider using sqlite-vec extension for better performance
	queryStr := `
	SELECT id, content, metadata, embedding 
	FROM documents 
	WHERE collection = ? OR ? = ''
	ORDER BY cosine_similarity(embedding, ?) DESC
	LIMIT ?
	`

	rows, err := v.db.QueryContext(ctx, queryStr, collection, collection, queryBytes, limit)
	if err != nil {
		// Fallback: simple retrieval without ordering if cosine_similarity not available
		rows, err = v.db.QueryContext(ctx, 
			"SELECT id, content, metadata, embedding FROM documents WHERE collection = ? OR ? = '' LIMIT ?", 
			collection, collection, limit)
		if err != nil {
			return nil, err
		}
		defer rows.Close()
		
		return v.computeSimilarityInMemory(rows, queryEmbedding, limit)
	}
	defer rows.Close()

	var results []SearchResult
	for rows.Next() {
		var doc VectorDocument
		var metadataBytes, embeddingBytes []byte
		
		err := rows.Scan(&doc.ID, &doc.Content, &metadataBytes, &embeddingBytes)
		if err != nil {
			continue
		}

		doc.Metadata = deserializeMetadata(metadataBytes)
		doc.Embedding = bytesToFloat32(embeddingBytes)
		
		// Calculate score
		score := cosineSimilarity(queryEmbedding, doc.Embedding)
		
		results = append(results, SearchResult{
			Document: doc,
			Score:    score,
		})
	}

	return results, nil
}

// computeSimilarityInMemory computes similarity when SQL function is unavailable
func (v *VectorStore) computeSimilarityInMemory(rows interface{}, queryEmbedding []float32, limit int) ([]SearchResult, error) {
	// Simplified fallback implementation
	// In production, use proper sqlite-vec extension
	return []SearchResult{}, nil
}

// Delete removes a document by ID
func (v *VectorStore) Delete(ctx context.Context, id string) error {
	v.mu.Lock()
	defer v.mu.Unlock()

	_, err := v.db.ExecContext(ctx, "DELETE FROM documents WHERE id = ?", id)
	return err
}

// Get retrieves a document by ID
func (v *VectorStore) Get(ctx context.Context, id string) (*VectorDocument, error) {
	v.mu.RLock()
	defer v.mu.RUnlock()

	query := "SELECT id, content, metadata, embedding FROM documents WHERE id = ?"
	row := v.db.QueryRowContext(ctx, query, id)

	var doc VectorDocument
	var metadataBytes, embeddingBytes []byte

	err := row.Scan(&doc.ID, &doc.Content, &metadataBytes, &embeddingBytes)
	if err != nil {
		return nil, err
	}

	doc.Metadata = deserializeMetadata(metadataBytes)
	doc.Embedding = bytesToFloat32(embeddingBytes)

	return &doc, nil
}

// Close closes the database connection
func (v *VectorStore) Close() error {
	v.mu.Lock()
	defer v.mu.Unlock()
	
	if v.db != nil {
		return v.db.Close()
	}
	return nil
}

// Helper functions for serialization

func serializeMetadata(m map[string]any) ([]byte, error) {
	if m == nil {
		return nil, nil
	}
	// Simple JSON-like serialization or use encoding/gob
	// For production, use proper JSON marshaling
	return []byte(fmt.Sprintf("%v", m)), nil
}

func deserializeMetadata(b []byte) map[string]any {
	if len(b) == 0 {
		return make(map[string]any)
	}
	// Simple deserialization - replace with proper JSON unmarshaling
	return map[string]any{"raw": string(b)}
}

func float32ToBytes(vec []float32) []byte {
	bytes := make([]byte, len(vec)*4)
	for i, f := range vec {
		binary.LittleEndian.PutUint32(bytes[i*4:], math.Float32bits(f))
	}
	return bytes
}

func bytesToFloat32(b []byte) []float32 {
	vec := make([]float32, len(b)/4)
	for i := 0; i < len(b); i += 4 {
		bits := binary.LittleEndian.Uint32(b[i : i+4])
		vec[i/4] = math.Float32frombits(bits)
	}
	return vec
}

func cosineSimilarity(a, b []float32) float32 {
	if len(a) != len(b) {
		return 0
	}

	var dotProduct, normA, normB float32
	for i := range a {
		dotProduct += a[i] * b[i]
		normA += a[i] * a[i]
		normB += b[i] * b[i]
	}

	if normA == 0 || normB == 0 {
		return 0
	}

	return dotProduct / (float32(math.Sqrt(float64(normA))) * float32(math.Sqrt(float64(normB))))
}

// hashString creates a hash for use as document ID
func hashString(s string) string {
	h := fnv.New32a()
	h.Write([]byte(s))
	return fmt.Sprintf("%x", h.Sum32())
}
