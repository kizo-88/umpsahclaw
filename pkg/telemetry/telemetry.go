package telemetry

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"sync"
	"time"

	"github.com/sipeed/picoclaw/pkg/providers/protocoltypes"
)

// MetricType defines types of metrics
type MetricType string

const (
	MetricLatency      MetricType = "latency_ms"
	MetricTokens       MetricType = "tokens"
	MetricErrors       MetricType = "errors"
	MetricCacheHits    MetricType = "cache_hits"
	MetricRequests     MetricType = "requests"
	MetricToolCalls    MetricType = "tool_calls"
)

// TelemetryConfig holds configuration
type TelemetryConfig struct {
	Enabled        bool
	LogToFile      string
	LogToStdout    bool
	SampleRate     float64 // 0.0-1.0, sample rate for high-volume events
	IncludeContent bool    // Include prompt/completion content in logs
}

// Telemetry provides observability for LLM operations
type Telemetry struct {
	config   TelemetryConfig
	mu       sync.RWMutex
	metrics  map[string][]Metric
	startTime time.Time
}

// Metric represents a single metric data point
type Metric struct {
	Timestamp  time.Time
	Type       MetricType
	Value      float64
	Tags       map[string]string
	Metadata   map[string]any
}

// TraceSpan represents a distributed tracing span
type TraceSpan struct {
	ID         string
	ParentID   string
	Name       string
	StartTime  time.Time
	EndTime    *time.Time
	Tags       map[string]string
	Attributes map[string]any
	Error      error
}

// NewTelemetry creates a new telemetry instance
func NewTelemetry(config TelemetryConfig) *Telemetry {
	if config.SampleRate <= 0 {
		config.SampleRate = 1.0
	}

	t := &Telemetry{
		config:    config,
		metrics:   make(map[string][]Metric),
		startTime: time.Now(),
	}

	return t
}

// RecordRequest logs an LLM request
func (t *Telemetry) RecordRequest(
	model string,
	provider string,
	promptTokens int,
	options map[string]any,
) {
	t.mu.Lock()
	defer t.mu.Unlock()

	if !t.config.Enabled {
		return
	}

	tags := map[string]string{
		"model":    model,
		"provider": provider,
	}

	t.recordMetric("requests", Metric{
		Timestamp: time.Now(),
		Type:      MetricRequests,
		Value:     1,
		Tags:      tags,
		Metadata: map[string]any{
			"prompt_tokens": promptTokens,
			"options":       options,
		},
	})
}

// RecordResponse logs an LLM response
func (t *Telemetry) RecordResponse(
	model string,
	provider string,
	usage protocoltypes.UsageInfo,
	latencyMs float64,
	isCached bool,
) {
	t.mu.Lock()
	defer t.mu.Unlock()

	if !t.config.Enabled {
		return
	}

	tags := map[string]string{
		"model":    model,
		"provider": provider,
		"cached":   fmt.Sprintf("%v", isCached),
	}

	now := time.Now()

	// Record tokens
	t.recordMetric("tokens", Metric{
		Timestamp: now,
		Type:      MetricTokens,
		Value:     float64(usage.TotalTokens),
		Tags:      tags,
		Metadata: map[string]any{
			"prompt_tokens":     usage.PromptTokens,
			"completion_tokens": usage.CompletionTokens,
		},
	})

	// Record latency
	t.recordMetric("latency", Metric{
		Timestamp: now,
		Type:      MetricLatency,
		Value:     latencyMs,
		Tags:      tags,
	})

	// Record cache hit
	if isCached {
		t.recordMetric("cache", Metric{
			Timestamp: now,
			Type:      MetricCacheHits,
			Value:     1,
			Tags:      tags,
		})
	}
}

// RecordError logs an error
func (t *Telemetry) RecordError(
	model string,
	provider string,
	err error,
	errorType string,
) {
	t.mu.Lock()
	defer t.mu.Unlock()

	if !t.config.Enabled {
		return
	}

	tags := map[string]string{
		"model":      model,
		"provider":   provider,
		"error_type": errorType,
	}

	t.recordMetric("errors", Metric{
		Timestamp: time.Now(),
		Type:      MetricErrors,
		Value:     1,
		Tags:      tags,
		Metadata: map[string]any{
			"error": err.Error(),
		},
	})
}

// RecordToolCall logs a tool execution
func (t *Telemetry) RecordToolCall(
	toolName string,
	durationMs float64,
	success bool,
) {
	t.mu.Lock()
	defer t.mu.Unlock()

	if !t.config.Enabled {
		return
	}

	tags := map[string]string{
		"tool":    toolName,
		"success": fmt.Sprintf("%v", success),
	}

	t.recordMetric("tools", Metric{
		Timestamp: time.Now(),
		Type:      MetricToolCalls,
		Value:     durationMs,
		Tags:      tags,
	})
}

func (t *Telemetry) recordMetric(key string, m Metric) {
	if len(t.metrics[key]) > 10000 {
		// Drop old metrics if too many
		t.metrics[key] = t.metrics[key][1000:]
	}
	t.metrics[key] = append(t.metrics[key], m)

	if t.config.LogToStdout {
		data, _ := json.Marshal(map[string]any{
			"type":      "metric",
			"timestamp": m.Timestamp,
			"metric":    m.Type,
			"value":     m.Value,
			"tags":      m.Tags,
		})
		fmt.Println(string(data))
	}

	if t.config.LogToFile != "" {
		// Append to file
		f, err := os.OpenFile(t.config.LogToFile, os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0644)
		if err == nil {
			data, _ := json.Marshal(map[string]any{
				"type":      "metric",
				"timestamp": m.Timestamp,
				"metric":    m.Type,
				"value":     m.Value,
				"tags":      m.Tags,
			})
			f.Write(append(data, '\n'))
			f.Close()
		}
	}
}

// StartSpan begins a trace span
func (t *Telemetry) StartSpan(name, parentID string) *TraceSpan {
	return &TraceSpan{
		ID:         fmt.Sprintf("span_%d", time.Now().UnixNano()),
		ParentID:   parentID,
		Name:       name,
		StartTime:  time.Now(),
		Tags:       make(map[string]string),
		Attributes: make(map[string]any),
	}
}

// EndSpan ends a trace span
func (t *Telemetry) EndSpan(span *TraceSpan, err error) {
	if span == nil {
		return
	}

	now := time.Now()
	span.EndTime = &now
	span.Error = err

	// Log span completion
	if t.config.Enabled && t.config.LogToStdout {
		data, _ := json.Marshal(map[string]any{
			"type":      "span",
			"id":        span.ID,
			"parent_id": span.ParentID,
			"name":      span.Name,
			"duration":  now.Sub(span.StartTime).Milliseconds(),
			"error":     err,
		})
		fmt.Println(string(data))
	}
}

// GetMetrics retrieves metrics filtered by type and time range
func (t *Telemetry) GetMetrics(
	metricType MetricType,
	from, to time.Time,
) []Metric {
	t.mu.RLock()
	defer t.mu.RUnlock()

	var results []Metric
	for _, metrics := range t.metrics {
		for _, m := range metrics {
			if m.Type == metricType && !m.Timestamp.Before(from) && !m.Timestamp.After(to) {
				results = append(results, m)
			}
		}
	}
	return results
}

// GetStats returns aggregated statistics
func (t *Telemetry) GetStats() TelemetryStats {
	t.mu.RLock()
	defer t.mu.RUnlock()

	stats := TelemetryStats{
		Uptime:      time.Since(t.startTime),
		TotalEvents: 0,
	}

	for _, metrics := range t.metrics {
		stats.TotalEvents += len(metrics)
	}

	return stats
}

// TelemetryStats holds aggregated statistics
type TelemetryStats struct {
	Uptime      time.Duration
	TotalEvents int
}

// Context keys for tracing
type contextKey string

const (
	TraceIDKey  contextKey = "trace_id"
	SpanIDKey   contextKey = "span_id"
)

// WithTraceID adds trace ID to context
func WithTraceID(ctx context.Context, traceID string) context.Context {
	return context.WithValue(ctx, TraceIDKey, traceID)
}

// GetTraceID retrieves trace ID from context
func GetTraceID(ctx context.Context) string {
	if id, ok := ctx.Value(TraceIDKey).(string); ok {
		return id
	}
	return ""
}

// Exporter defines interface for exporting telemetry data
type Exporter interface {
	ExportMetrics([]Metric) error
	ExportSpans([]*TraceSpan) error
}

// ConsoleExporter exports to stdout
type ConsoleExporter struct{}

func (e *ConsoleExporter) ExportMetrics(metrics []Metric) error {
	for _, m := range metrics {
		data, _ := json.MarshalIndent(m, "", "  ")
		fmt.Println(string(data))
	}
	return nil
}

func (e *ConsoleExporter) ExportSpans(spans []*TraceSpan) error {
	for _, s := range spans {
		data, _ := json.MarshalIndent(s, "", "  ")
		fmt.Println(string(data))
	}
	return nil
}

// FileExporter exports to file
type FileExporter struct {
	path string
}

func NewFileExporter(path string) *FileExporter {
	return &FileExporter{path: path}
}

func (e *FileExporter) ExportMetrics(metrics []Metric) error {
	f, err := os.OpenFile(e.path, os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0644)
	if err != nil {
		return err
	}
	defer f.Close()

	for _, m := range metrics {
		data, _ := json.Marshal(m)
		f.Write(append(data, '\n'))
	}
	return nil
}

func (e *FileExporter) ExportSpans(spans []*TraceSpan) error {
	f, err := os.OpenFile(e.path+".spans", os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0644)
	if err != nil {
		return err
	}
	defer f.Close()

	for _, s := range spans {
		data, _ := json.Marshal(s)
		f.Write(append(data, '\n'))
	}
	return nil
}
