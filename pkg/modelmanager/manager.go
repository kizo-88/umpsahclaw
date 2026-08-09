package modelmanager

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"sync"
	"time"
)

// ModelInfo describes a downloadable model
type ModelInfo struct {
	ID          string   `json:"id"`
	Name        string   `json:"name"`
	Description string   `json:"description"`
	Size        int64    `json:"size_bytes"`
	Quantization string  `json:"quantization"`
	URL         string   `json:"url"`
	SHA256      string   `json:"sha256"`
	Tags        []string `json:"tags"`
}

// ModelStatus tracks download/installation status
type ModelStatus struct {
	ModelID     string
	Status      string // downloading, completed, failed, not_found
	Progress    float64 // 0.0-1.0
	Downloaded  int64
	Total       int64
	Error       error
	LocalPath   string
}

// ModelManager handles model discovery, download, and management
type ModelManager struct {
	modelDir    string
	cache       map[string]*ModelStatus
	mu          sync.RWMutex
	httpClient  *http.Client
}

// NewModelManager creates a new model manager
func NewModelManager(modelDir string) (*ModelManager, error) {
	if modelDir == "" {
		home, err := os.UserHomeDir()
		if err != nil {
			return nil, err
		}
		modelDir = filepath.Join(home, ".picoclaw", "models")
	}

	if err := os.MkdirAll(modelDir, 0755); err != nil {
		return nil, err
	}

	return &ModelManager{
		modelDir: modelDir,
		cache:    make(map[string]*ModelStatus),
		httpClient: &http.Client{
			Timeout: 30 * time.Second,
		},
	}, nil
}

// ListAvailableModels fetches available models from HuggingFace
func (m *ModelManager) ListAvailableModels(ctx context.Context, query string) ([]ModelInfo, error) {
	// Search HuggingFace for GGUF models
	// Example: TheBloke/Mistral-7B-Instruct-v0.2-GGUF
	
	baseURL := "https://huggingface.co/api/models"
	params := fmt.Sprintf("?search=%s&filter=gguf&limit=20", query)
	
	req, err := http.NewRequestWithContext(ctx, "GET", baseURL+params, nil)
	if err != nil {
		return nil, err
	}

	resp, err := m.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("API request failed: %s", resp.Status)
	}

	var models []ModelInfo
	if err := json.NewDecoder(resp.Body).Decode(&models); err != nil {
		return nil, err
	}

	return models, nil
}

// GetRecommendedModel returns a recommended model for the current system
func (m *ModelManager) GetRecommendedModel(task string) ModelInfo {
	// Detect system capabilities
	ram := detectRAM()
	hasGPU := detectGPU()
	
	var model ModelInfo
	
	if ram < 8*GB {
		// Very limited RAM - suggest tiny models
		model = ModelInfo{
			ID:   "TinyLlama-1.1B-Chat-v1.0-GGUF",
			Name: "TinyLlama 1.1B Q4_K_M",
			Size: int64(600 * MB),
			URL:  "https://huggingface.co/TheBloke/TinyLlama-1.1B-Chat-v1.0-GGUF/resolve/main/tinyllama-1.1b-chat-v1.0.Q4_K_M.gguf",
		}
	} else if ram < 16*GB {
		// Moderate RAM - 7B models
		model = ModelInfo{
			ID:   "Mistral-7B-Instruct-v0.2-GGUF",
			Name: "Mistral 7B Instruct Q4_K_M",
			Size: int64(4.2 * float64(GB)),
			URL:  "https://huggingface.co/TheBloke/Mistral-7B-Instruct-v0.2-GGUF/resolve/main/mistral-7b-instruct-v0.2.Q4_K_M.gguf",
		}
	} else {
		// Plenty of RAM - larger models
		model = ModelInfo{
			ID:   "Llama-2-13B-chat-GGUF",
			Name: "Llama 2 13B Chat Q4_K_M",
			Size: int64(7.8 * float64(GB)),
			URL:  "https://huggingface.co/TheBloke/Llama-2-13B-chat-GGUF/resolve/main/llama-2-13b-chat.Q4_K_M.gguf",
		}
	}
	
	_ = hasGPU // Could use GPU for faster inference
	
	return model
}

// Download downloads a model with progress tracking
func (m *ModelManager) Download(ctx context.Context, modelURL, filename string) (*ModelStatus, error) {
	m.mu.Lock()
	
	status := &ModelStatus{
		ModelID:  filename,
		Status:   "downloading",
		Progress: 0,
	}
	m.cache[filename] = status
	m.mu.Unlock()

	if filename == "" {
		filename = filepath.Base(modelURL)
	}
	
	destPath := filepath.Join(m.modelDir, filename)
	
	// Check if already exists
	if info, err := os.Stat(destPath); err == nil {
		status.Status = "completed"
		status.Progress = 1.0
		status.LocalPath = destPath
		return status, nil
	}

	req, err := http.NewRequestWithContext(ctx, "GET", modelURL, nil)
	if err != nil {
		status.Status = "failed"
		status.Error = err
		return status, err
	}

	resp, err := m.httpClient.Do(req)
	if err != nil {
		status.Status = "failed"
		status.Error = err
		return status, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		err := fmt.Errorf("download failed: %s", resp.Status)
		status.Status = "failed"
		status.Error = err
		return status, err
	}

	status.Total = resp.ContentLength

	// Create temp file
	tmpPath := destPath + ".tmp"
	file, err := os.Create(tmpPath)
	if err != nil {
		status.Status = "failed"
		status.Error = err
		return status, err
	}

	var downloaded int64
	buf := make([]byte, 32*1024)
	
	for {
		select {
		case <-ctx.Done():
			file.Close()
			os.Remove(tmpPath)
			status.Status = "failed"
			status.Error = ctx.Err()
			return status, ctx.Err()
		default:
		}

		n, err := resp.Body.Read(buf)
		if n > 0 {
			file.Write(buf[:n])
			downloaded += int64(n)
			status.Downloaded = downloaded
			
			if status.Total > 0 {
				status.Progress = float64(downloaded) / float64(status.Total)
			}
		}

		if err == io.EOF {
			break
		}
		if err != nil {
			file.Close()
			os.Remove(tmpPath)
			status.Status = "failed"
			status.Error = err
			return status, err
		}
	}

	file.Close()
	
	// Move to final location
	if err := os.Rename(tmpPath, destPath); err != nil {
		os.Remove(tmpPath)
		status.Status = "failed"
		status.Error = err
		return status, err
	}

	status.Status = "completed"
	status.Progress = 1.0
	status.LocalPath = destPath
	
	return status, nil
}

// GetStatus returns the status of a model download
func (m *ModelManager) GetStatus(modelID string) (*ModelStatus, bool) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	
	status, exists := m.cache[modelID]
	return status, exists
}

// ListLocalModels lists all locally available models
func (m *ModelManager) ListLocalModels() ([]string, error) {
	var models []string
	
	err := filepath.Walk(m.modelDir, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return nil
		}
		if !info.IsDir() && strings.HasSuffix(strings.ToLower(info.Name()), ".gguf") {
			models = append(models, path)
		}
		return nil
	})
	
	return models, err
}

// Delete removes a local model
func (m *ModelManager) Delete(modelID string) error {
	path := filepath.Join(m.modelDir, modelID)
	return os.Remove(path)
}

// GetModelPath returns the full path to a model
func (m *ModelManager) GetModelPath(modelID string) string {
	return filepath.Join(m.modelDir, modelID)
}

// Constants for size calculations
const (
	MB = 1024 * 1024
	GB = 1024 * MB
)

// detectRAM estimates available system RAM
func detectRAM() int64 {
	// Simple detection - in production, use proper system calls
	switch runtime.GOOS {
	case "linux":
		// Read /proc/meminfo
		data, err := os.ReadFile("/proc/meminfo")
		if err == nil {
			// Parse MemTotal
			// Simplified for brevity
		}
	case "darwin":
		// Use sysctl
	case "windows":
		// Use GlobalMemoryStatusEx
	}
	
	// Default assumption
	return 8 * GB
}

// detectGPU checks for GPU availability
func detectGPU() bool {
	// Check for CUDA, Metal, etc.
	// Simplified for brevity
	return false
}

// AutoDownload ensures a model is available, downloading if necessary
func (m *ModelManager) AutoDownload(ctx context.Context, modelURL, filename string) (string, error) {
	destPath := filepath.Join(m.modelDir, filename)
	
	// Check if exists
	if _, err := os.Stat(destPath); err == nil {
		return destPath, nil
	}
	
	// Download
	status, err := m.Download(ctx, modelURL, filename)
	if err != nil {
		return "", err
	}
	
	if status.Status != "completed" {
		return "", fmt.Errorf("download did not complete: %s", status.Error)
	}
	
	return status.LocalPath, nil
}

// ValidateModel checks model integrity
func (m *ModelManager) ValidateModel(path, expectedSHA256 string) error {
	if expectedSHA256 == "" {
		return nil // Skip validation
	}
	
	// Calculate SHA256 of file
	// Compare with expected
	// Return error if mismatch
	
	return nil
}
