package cache

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"sync"
	"time"

	"github.com/sipeed/picoclaw/pkg/providers/protocoltypes"
)

// CacheEntry represents a cached LLM response
type CacheEntry struct {
	Key       string
	Response  *protocoltypes.LLMResponse
	CreatedAt time.Time
	ExpiresAt time.Time
	Hits      int
}

// CacheConfig holds cache configuration
type CacheConfig struct {
	MaxSize      int           // Maximum number of entries
	TTL          time.Duration // Time to live for entries
	Enabled      bool
	Persistence  string // Path for persistent storage (optional)
}

// ResponseCache provides LLM response caching with TTL and size limits
type ResponseCache struct {
	entries   map[string]*CacheEntry
	mu        sync.RWMutex
	maxSize   int
	ttl       time.Duration
	enabled   bool
	hits      int
	misses    int
	evictions int
}

// NewResponseCache creates a new response cache
func NewResponseCache(config CacheConfig) *ResponseCache {
	if config.MaxSize <= 0 {
		config.MaxSize = 1000
	}
	if config.TTL == 0 {
		config.TTL = 1 * time.Hour
	}

	cache := &ResponseCache{
		entries: make(map[string]*CacheEntry),
		maxSize: config.MaxSize,
		ttl:     config.TTL,
		enabled: config.Enabled,
	}

	// Start background cleanup
	go cache.cleanupLoop()

	return cache
}

// Get retrieves a cached response
func (c *ResponseCache) Get(key string) (*protocoltypes.LLMResponse, bool) {
	c.mu.RLock()
	defer c.mu.RUnlock()

	if !c.enabled {
		return nil, false
	}

	entry, exists := c.entries[key]
	if !exists {
		c.misses++
		return nil, false
	}

	// Check expiration
	if time.Now().After(entry.ExpiresAt) {
		c.misses++
		return nil, false
	}

	entry.Hits++
	c.hits++
	return entry.Response, true
}

// Set stores a response in the cache
func (c *ResponseCache) Set(key string, response *protocoltypes.LLMResponse) {
	c.mu.Lock()
	defer c.mu.Unlock()

	if !c.enabled {
		return
	}

	// Evict if at capacity
	if len(c.entries) >= c.maxSize {
		c.evictOldest()
	}

	now := time.Now()
	c.entries[key] = &CacheEntry{
		Key:       key,
		Response:  response,
		CreatedAt: now,
		ExpiresAt: now.Add(c.ttl),
		Hits:      0,
	}
}

// GetOrCompute gets from cache or computes and caches the result
func (c *ResponseCache) GetOrCompute(
	ctx context.Context,
	key string,
	compute func() (*protocoltypes.LLMResponse, error),
) (*protocoltypes.LLMResponse, error) {
	// Try cache first
	if response, found := c.Get(key); found {
		return response, nil
	}

	// Compute
	response, err := compute()
	if err != nil {
		return nil, err
	}

	// Cache the result
	c.Set(key, response)
	return response, nil
}

// Delete removes an entry from the cache
func (c *ResponseCache) Delete(key string) {
	c.mu.Lock()
	defer c.mu.Unlock()
	delete(c.entries, key)
}

// Clear removes all entries
func (c *ResponseCache) Clear() {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.entries = make(map[string]*CacheEntry)
}

// Stats returns cache statistics
func (c *ResponseCache) Stats() CacheStats {
	c.mu.RLock()
	defer c.mu.RUnlock()

	hitRate := float64(0)
	total := c.hits + c.misses
	if total > 0 {
		hitRate = float64(c.hits) / float64(total) * 100
	}

	return CacheStats{
		Size:      len(c.entries),
		MaxSize:   c.maxSize,
		Hits:      c.hits,
		Misses:    c.misses,
		Evictions: c.evictions,
		HitRate:   hitRate,
	}
}

// CacheStats holds cache statistics
type CacheStats struct {
	Size      int
	MaxSize   int
	Hits      int
	Misses    int
	Evictions int
	HitRate   float64
}

func (c *ResponseCache) evictOldest() {
	if len(c.entries) == 0 {
		return
	}

	var oldestKey string
	var oldestTime time.Time

	for key, entry := range c.entries {
		if oldestKey == "" || entry.CreatedAt.Before(oldestTime) {
			oldestKey = key
			oldestTime = entry.CreatedAt
		}
	}

	if oldestKey != "" {
		delete(c.entries, oldestKey)
		c.evictions++
	}
}

func (c *ResponseCache) cleanupLoop() {
	ticker := time.NewTicker(1 * time.Minute)
	defer ticker.Stop()

	for range ticker.C {
		c.cleanup()
	}
}

func (c *ResponseCache) cleanup() {
	c.mu.Lock()
	defer c.mu.Unlock()

	now := time.Now()
	for key, entry := range c.entries {
		if now.After(entry.ExpiresAt) {
			delete(c.entries, key)
			c.evictions++
		}
	}
}

// GenerateCacheKey creates a cache key from messages and options
func GenerateCacheKey(messages []protocoltypes.Message, model string, options map[string]any) string {
	hasher := sha256.New()

	// Hash messages
	for _, msg := range messages {
		json.NewEncoder(hasher).Encode(msg)
	}

	// Hash model
	hasher.Write([]byte(model))

	// Hash options
	json.NewEncoder(hasher).Encode(options)

	return hex.EncodeToString(hasher.Sum(nil))
}

// SemanticCache extends ResponseCache with semantic similarity matching
type SemanticCache struct {
	cache     *ResponseCache
	threshold float32 // Similarity threshold for semantic match
}

// NewSemanticCache creates a semantic cache
func NewSemanticCache(cacheConfig CacheConfig, threshold float32) *SemanticCache {
	return &SemanticCache{
		cache:     NewResponseCache(cacheConfig),
		threshold: threshold,
	}
}

// GetSimilar finds semantically similar cached responses
// Note: Requires embedding integration for full functionality
func (sc *SemanticCache) GetSimilar(queryEmbedding []float32) (*protocoltypes.LLMResponse, bool) {
	// TODO: Implement semantic similarity search
	// Would compare query embedding against cached response embeddings
	// Return match if similarity > threshold
	return sc.cache.Get("") // Placeholder
}

// BatchCache handles batched request caching
type BatchCache struct {
	cache       *ResponseCache
	batchWindow time.Duration
	pending     map[string][]chan *protocoltypes.LLMResponse
	mu          sync.Mutex
}

// NewBatchCache creates a batch cache for request deduplication
func NewBatchCache(config CacheConfig, window time.Duration) *BatchCache {
	if window == 0 {
		window = 100 * time.Millisecond
	}

	return &BatchCache{
		cache:       NewResponseCache(config),
		batchWindow: window,
		pending:     make(map[string][]chan *protocoltypes.LLMResponse),
	}
}

// GetOrBatch gets from cache or batches duplicate requests
func (bc *BatchCache) GetOrBatch(
	ctx context.Context,
	key string,
	compute func() (*protocoltypes.LLMResponse, error),
) (*protocoltypes.LLMResponse, error) {
	// Try cache first
	if response, found := bc.cache.Get(key); found {
		return response, nil
	}

	bc.mu.Lock()
	
	// Check if request is already pending
	if channels, exists := bc.pending[key]; exists {
		// Add to pending batch
		resultChan := make(chan *protocoltypes.LLMResponse, 1)
		bc.pending[key] = append(channels, resultChan)
		bc.mu.Unlock()

		// Wait for batch result
		select {
		case response := <-resultChan:
			return response, nil
		case <-ctx.Done():
			return nil, ctx.Err()
		}
	}

	// Start new batch
	resultChan := make(chan *protocoltypes.LLMResponse, 1)
	bc.pending[key] = []chan *protocoltypes.LLMResponse{resultChan}
	bc.mu.Unlock()

	// Delay to collect batch
	time.Sleep(bc.batchWindow)

	// Execute computation
	response, err := compute()

	// Distribute to all waiters
	bc.mu.Lock()
	channels := bc.pending[key]
	delete(bc.pending, key)
	bc.mu.Unlock()

	if err != nil {
		// Send error to all waiters
		for _, ch := range channels {
			select {
			case ch <- nil:
			default:
			}
		}
		return nil, err
	}

	// Cache and distribute
	bc.cache.Set(key, response)
	for _, ch := range channels {
		select {
		case ch <- response:
		default:
		}
	}

	return response, nil
}
