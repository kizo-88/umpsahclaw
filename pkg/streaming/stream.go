package streaming

import (
	"context"
	"fmt"
	"strings"
	"sync"
	"time"

	"github.com/sipeed/picoclaw/pkg/providers/protocoltypes"
)

// StreamEventType defines types of streaming events
type StreamEventType string

const (
	EventToken       StreamEventType = "token"
	EventToolCall    StreamEventType = "tool_call"
	EventUsage       StreamEventType = "usage"
	EventDone        StreamEventType = "done"
	EventError       StreamEventType = "error"
	EventThought     StreamEventType = "thought"
	EventCitation    StreamEventType = "citation"
)

// StreamEvent represents a single streaming event
type StreamEvent struct {
	Type      StreamEventType
	Data      string
	ToolCall  *protocoltypes.ToolCall
	Usage     *protocoltypes.UsageInfo
	Timestamp time.Time
}

// StreamResponse wraps a channel of stream events with metadata
type StreamResponse struct {
	StreamID  string
	Model     string
	Events    <-chan StreamEvent
	Done      chan struct{}
	mu        sync.Mutex
	isComplete bool
	lastError error
}

// StreamConfig holds streaming configuration
type StreamConfig struct {
	BufferSize      int           // Channel buffer size
	SendThoughts    bool          // Include thought/reasoning tokens
	SendCitations   bool          // Include citation information
	Timeout         time.Duration // Overall timeout
	TokenDelay      time.Duration // Artificial delay between tokens (for UX)
}

// DefaultStreamConfig returns default streaming configuration
func DefaultStreamConfig() StreamConfig {
	return StreamConfig{
		BufferSize:    32,
		SendThoughts:  false,
		SendCitations: false,
		Timeout:       5 * time.Minute,
		TokenDelay:    0,
	}
}

// NewStreamResponse creates a new stream response wrapper
func NewStreamResponse(streamID, model string, events <-chan StreamEvent) *StreamResponse {
	return &StreamResponse{
		StreamID:  streamID,
		Model:     model,
		Events:    events,
		Done:      make(chan struct{}),
		isComplete: false,
	}
}

// Collect gathers all tokens into a complete response
func (sr *StreamResponse) Collect(ctx context.Context) (*protocoltypes.LLMResponse, error) {
	var content strings.Builder
	var toolCalls []protocoltypes.ToolCall
	var usage *protocoltypes.UsageInfo

	for {
		select {
		case <-ctx.Done():
			return nil, ctx.Err()
		case event, ok := <-sr.Events:
			if !ok {
				// Stream closed
				sr.mu.Lock()
				sr.isComplete = true
				sr.mu.Unlock()
				close(sr.Done)

				return &protocoltypes.LLMResponse{
					Content:   content.String(),
					ToolCalls: toolCalls,
					Usage:     usage,
					Model:     sr.Model,
				}, sr.lastError
			}

			switch event.Type {
			case EventToken:
				content.WriteString(event.Data)
			case EventToolCall:
				if event.ToolCall != nil {
					toolCalls = append(toolCalls, *event.ToolCall)
				}
			case EventUsage:
				usage = event.Usage
			case EventError:
				sr.lastError = fmt.Errorf("stream error: %s", event.Data)
			}
		}
	}
}

// StreamCollector accumulates streamed tokens with callbacks
type StreamCollector struct {
	mu             sync.Mutex
	content        strings.Builder
	toolCalls      []protocoltypes.ToolCall
	usage          *protocoltypes.UsageInfo
	onToken        func(token string)
	onToolCall     func(tc protocoltypes.ToolCall)
	onUsage        func(usage protocoltypes.UsageInfo)
	onComplete     func(content string, toolCalls []protocoltypes.ToolCall)
	currentToolBuf map[int]*strings.Builder
}

// NewStreamCollector creates a new stream collector
func NewStreamCollector() *StreamCollector {
	return &StreamCollector{
		currentToolBuf: make(map[int]*strings.Builder),
	}
}

// OnToken sets callback for token events
func (sc *StreamCollector) OnToken(fn func(string)) *StreamCollector {
	sc.onToken = fn
	return sc
}

// OnToolCall sets callback for tool call events
func (sc *StreamCollector) OnToolCall(fn func(protocoltypes.ToolCall)) *StreamCollector {
	sc.onToolCall = fn
	return sc
}

// OnUsage sets callback for usage events
func (sc *StreamCollector) OnUsage(fn func(protocoltypes.UsageInfo)) *StreamCollector {
	sc.onUsage = fn
	return sc
}

// OnComplete sets callback for completion
func (sc *StreamCollector) OnComplete(fn func(string, []protocoltypes.ToolCall)) *StreamCollector {
	sc.onComplete = fn
	return sc
}

// Process processes a stream event
func (sc *StreamCollector) Process(event StreamEvent) {
	sc.mu.Lock()
	defer sc.mu.Unlock()

	switch event.Type {
	case EventToken:
		sc.content.WriteString(event.Data)
		if sc.onToken != nil {
			sc.onToken(event.Data)
		}

	case EventToolCall:
		if event.ToolCall != nil {
			sc.toolCalls = append(sc.toolCalls, *event.ToolCall)
			if sc.onToolCall != nil {
				sc.onToolCall(*event.ToolCall)
			}
		}

	case EventUsage:
		sc.usage = event.Usage
		if sc.onUsage != nil {
			sc.onUsage(*event.Usage)
		}

	case EventDone:
		if sc.onComplete != nil {
			toolCalls := make([]protocoltypes.ToolCall, len(sc.toolCalls))
			for i, tc := range sc.toolCalls {
				toolCalls[i] = protocoltypes.ToolCall(tc)
			}
			sc.onComplete(sc.content.String(), toolCalls)
		}
	}
}

// GetContent returns accumulated content
func (sc *StreamCollector) GetContent() string {
	sc.mu.Lock()
	defer sc.mu.Unlock()
	return sc.content.String()
}

// GetToolCalls returns accumulated tool calls
func (sc *StreamCollector) GetToolCalls() []protocoltypes.ToolCall {
	sc.mu.Lock()
	defer sc.mu.Unlock()
	return sc.toolCalls
}

// TokenBuffer provides a sliding window of recent tokens
type TokenBuffer struct {
	tokens   []string
	maxSize  int
	mu       sync.RWMutex
}

// NewTokenBuffer creates a token buffer
func NewTokenBuffer(maxSize int) *TokenBuffer {
	if maxSize <= 0 {
		maxSize = 100
	}
	return &TokenBuffer{
		tokens:  make([]string, 0, maxSize),
		maxSize: maxSize,
	}
}

// Add adds a token to the buffer
func (tb *TokenBuffer) Add(token string) {
	tb.mu.Lock()
	defer tb.mu.Unlock()

	tb.tokens = append(tb.tokens, token)
	if len(tb.tokens) > tb.maxSize {
		tb.tokens = tb.tokens[1:]
	}
}

// GetRecent returns recent tokens
func (tb *TokenBuffer) GetRecent(n int) []string {
	tb.mu.RLock()
	defer tb.mu.RUnlock()

	if n > len(tb.tokens) {
		n = len(tb.tokens)
	}
	if n <= 0 {
		return tb.tokens
	}
	return tb.tokens[len(tb.tokens)-n:]
}

// GetAll returns all buffered tokens joined
func (tb *TokenBuffer) GetAll() string {
	tb.mu.RLock()
	defer tb.mu.RUnlock()
	return strings.Join(tb.tokens, "")
}

// Clear clears the buffer
func (tb *TokenBuffer) Clear() {
	tb.mu.Lock()
	defer tb.mu.Unlock()
	tb.tokens = tb.tokens[:0]
}

// StreamMultiplexer fans out a single stream to multiple consumers
type StreamMultiplexer struct {
	source   <-chan StreamEvent
	consumers []chan<- StreamEvent
	mu       sync.Mutex
	done     chan struct{}
}

// NewStreamMultiplexer creates a multiplexer
func NewStreamMultiplexer(source <-chan StreamEvent) *StreamMultiplexer {
	m := &StreamMultiplexer{
		source:    source,
		consumers: make([]chan<- StreamEvent, 0),
		done:      make(chan struct{}),
	}
	go m.run()
	return m
}

// AddConsumer adds a consumer channel
func (m *StreamMultiplexer) AddConsumer(ch chan<- StreamEvent) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.consumers = append(m.consumers, ch)
}

func (m *StreamMultiplexer) run() {
	defer func() {
		m.mu.Lock()
		for _, ch := range m.consumers {
			close(ch)
		}
		m.mu.Unlock()
		close(m.done)
	}()

	for event := range m.source {
		m.mu.Lock()
		consumers := make([]chan<- StreamEvent, len(m.consumers))
		copy(consumers, m.consumers)
		m.mu.Unlock()

		for _, ch := range consumers {
			select {
			case ch <- event:
			default:
				// Consumer too slow, skip
			}
		}
	}
}

// Wait waits for multiplexing to complete
func (m *StreamMultiplexer) Wait() <-chan struct{} {
	return m.done
}

// TransformStream applies transformations to stream events
type TransformStream struct {
	source      <-chan StreamEvent
	output      chan StreamEvent
	transformFn func(StreamEvent) (StreamEvent, bool)
}

// NewTransformStream creates a transforming stream
func NewTransformStream(
	source <-chan StreamEvent,
	transformFn func(StreamEvent) (StreamEvent, bool),
) *TransformStream {
	output := make(chan StreamEvent, 32)

	ts := &TransformStream{
		source:      source,
		output:      output,
		transformFn: transformFn,
	}

	go ts.run()
	return ts
}

func (ts *TransformStream) run() {
	defer close(ts.output)

	for event := range ts.source {
		if ts.transformFn != nil {
			transformed, keep := ts.transformFn(event)
			if !keep {
				continue
			}
			event = transformed
		}
		ts.output <- event
	}
}

// Output returns the transformed stream
func (ts *TransformStream) Output() <-chan StreamEvent {
	return ts.output
}

// Helper: Create stream from static response
func ResponseToStream(response *protocoltypes.LLMResponse, config StreamConfig) <-chan StreamEvent {
	ch := make(chan StreamEvent, config.BufferSize)

	go func() {
		defer close(ch)

		// Stream content character by character or in chunks
		for i, r := range response.Content {
			ch <- StreamEvent{
				Type:      EventToken,
				Data:      string(r),
				Timestamp: time.Now(),
			}
			_ = i
		}

		// Send tool calls
		for _, tc := range response.ToolCalls {
			tcCopy := tc
			ch <- StreamEvent{
				Type:      EventToolCall,
				ToolCall:  &tcCopy,
				Timestamp: time.Now(),
			}
		}

		// Send usage if available
		if response.Usage != nil {
			ch <- StreamEvent{
				Type:      EventUsage,
				Usage:     response.Usage,
				Timestamp: time.Now(),
			}
		}

		// Done
		ch <- StreamEvent{
			Type:      EventDone,
			Timestamp: time.Now(),
		}
	}()

	return ch
}
