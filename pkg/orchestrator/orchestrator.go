package orchestrator

import (
	"context"
	"fmt"
	"sync"
	"time"

	"github.com/sipeed/picoclaw/pkg/providers/protocoltypes"
)

// Task represents a unit of work for the orchestrator
type Task struct {
	ID          string
	Description string
	Type        TaskType
	Priority    int
	Status      TaskStatus
	Result      string
	Error       error
	CreatedAt   time.Time
	CompletedAt *time.Time
}

// TaskType defines the type of task
type TaskType string

const (
	TaskTypeResearch     TaskType = "research"
	TaskTypeCoding       TaskType = "coding"
	TaskTypeAnalysis     TaskType = "analysis"
	TaskTypePlanning     TaskType = "planning"
	TaskTypeVerification TaskType = "verification"
)

// TaskStatus tracks task execution state
type TaskStatus string

const (
	TaskStatusPending   TaskStatus = "pending"
	TaskStatusRunning   TaskStatus = "running"
	TaskStatusCompleted TaskStatus = "completed"
	TaskStatusFailed    TaskStatus = "failed"
	TaskStatusCancelled TaskStatus = "cancelled"
)

// AgentCapability describes what an agent can do
type AgentCapability struct {
	Name        string
	Description string
	TaskTypes   []TaskType
	Model       string
	MaxTokens   int
}

// WorkerAgent represents a specialized agent in the multi-agent system
type WorkerAgent struct {
	ID           string
	Name         string
	Capabilities []AgentCapability
	Busy         bool
	CurrentTask  *Task
}

// Orchestrator manages multi-agent task decomposition and execution
type Orchestrator struct {
	agents      map[string]*WorkerAgent
	taskQueue   chan *Task
	resultChan  chan *Task
	mu          sync.RWMutex
	maxWorkers  int
	timeout     time.Duration
	strategy    OrchestrationStrategy
}

// OrchestrationStrategy defines how tasks are distributed
type OrchestrationStrategy string

const (
	StrategyParallel     OrchestrationStrategy = "parallel"
	StrategySequential   OrchestrationStrategy = "sequential"
	StrategyHierarchical OrchestrationStrategy = "hierarchical"
	StrategyDynamic      OrchestrationStrategy = "dynamic"
)

// OrchestratorConfig holds configuration
type OrchestratorConfig struct {
	MaxWorkers int
	Timeout    time.Duration
	Strategy   OrchestrationStrategy
}

// NewOrchestrator creates a new multi-agent orchestrator
func NewOrchestrator(config OrchestratorConfig) *Orchestrator {
	if config.MaxWorkers <= 0 {
		config.MaxWorkers = 5
	}
	if config.Timeout == 0 {
		config.Timeout = 30 * time.Minute
	}
	if config.Strategy == "" {
		config.Strategy = StrategyDynamic
	}

	o := &Orchestrator{
		agents:     make(map[string]*WorkerAgent),
		taskQueue:  make(chan *Task, 100),
		resultChan: make(chan *Task, 100),
		maxWorkers: config.MaxWorkers,
		timeout:    config.Timeout,
		strategy:   config.Strategy,
	}

	return o
}

// RegisterAgent adds a worker agent to the orchestrator
func (o *Orchestrator) RegisterAgent(agent *WorkerAgent) error {
	o.mu.Lock()
	defer o.mu.Unlock()

	if _, exists := o.agents[agent.ID]; exists {
		return fmt.Errorf("agent %s already registered", agent.ID)
	}

	o.agents[agent.ID] = agent
	return nil
}

// UnregisterAgent removes an agent from the orchestrator
func (o *Orchestrator) UnregisterAgent(agentID string) error {
	o.mu.Lock()
	defer o.mu.Unlock()

	if _, exists := o.agents[agentID]; !exists {
		return fmt.Errorf("agent %s not found", agentID)
	}

	delete(o.agents, agentID)
	return nil
}

// DecomposeTask breaks down a complex task into subtasks
func (o *Orchestrator) DecomposeTask(ctx context.Context, description string) ([]*Task, error) {
	// TODO: Use LLM to decompose complex tasks
	// This is a placeholder implementation
	
	switch o.strategy {
	case StrategyHierarchical:
		return o.decomposeHierarchical(description)
	case StrategyDynamic:
		return o.decomposeDynamic(description)
	default:
		// Return single task for parallel/sequential
		return []*Task{{
			ID:          generateTaskID(),
			Description: description,
			Type:        TaskTypePlanning,
			Priority:    1,
			Status:      TaskStatusPending,
			CreatedAt:   time.Now(),
		}}, nil
	}
}

func (o *Orchestrator) decomposeHierarchical(description string) ([]*Task, error) {
	// Create planning, execution, and verification tasks
	tasks := []*Task{
		{
			ID:          generateTaskID(),
			Description: fmt.Sprintf("Plan: %s", description),
			Type:        TaskTypePlanning,
			Priority:    3,
			Status:      TaskStatusPending,
			CreatedAt:   time.Now(),
		},
		{
			ID:          generateTaskID(),
			Description: fmt.Sprintf("Execute: %s", description),
			Type:        TaskTypeCoding,
			Priority:    2,
			Status:      TaskStatusPending,
			CreatedAt:   time.Now(),
		},
		{
			ID:          generateTaskID(),
			Description: fmt.Sprintf("Verify: %s", description),
			Type:        TaskTypeVerification,
			Priority:    1,
			Status:      TaskStatusPending,
			CreatedAt:   time.Now(),
		},
	}
	return tasks, nil
}

func (o *Orchestrator) decomposeDynamic(description string) ([]*Task, error) {
	// Dynamic decomposition based on task complexity
	// Placeholder - would use LLM in production
	return []*Task{{
		ID:          generateTaskID(),
		Description: description,
		Type:        TaskTypeResearch,
		Priority:    1,
		Status:      TaskStatusPending,
		CreatedAt:   time.Now(),
	}}, nil
}

// ExecuteTask assigns and executes a task
func (o *Orchestrator) ExecuteTask(ctx context.Context, task *Task) error {
	select {
	case o.taskQueue <- task:
		task.Status = TaskStatusRunning
		return nil
	case <-ctx.Done():
		return ctx.Err()
	default:
		return fmt.Errorf("task queue full")
	}
}

// Run starts the orchestrator worker pool
func (o *Orchestrator) Run(ctx context.Context) {
	var wg sync.WaitGroup

	for i := 0; i < o.maxWorkers; i++ {
		wg.Add(1)
		go func(workerID int) {
			defer wg.Done()
			o.workerLoop(ctx, workerID)
		}(i)
	}

	wg.Wait()
}

func (o *Orchestrator) workerLoop(ctx context.Context, workerID int) {
	for {
		select {
		case <-ctx.Done():
			return
		case task := <-o.taskQueue:
			o.executeTask(ctx, task)
			o.resultChan <- task
		}
	}
}

func (o *Orchestrator) executeTask(ctx context.Context, task *Task) {
	task.Status = TaskStatusRunning
	
	// Find suitable agent
	agent := o.findSuitableAgent(task)
	if agent == nil {
		task.Error = fmt.Errorf("no suitable agent found")
		task.Status = TaskStatusFailed
		return
	}

	// Mark agent as busy
	o.markAgentBusy(agent.ID, task)
	defer o.markAgentFree(agent.ID)

	// Execute with timeout
	_ = execCtx // Timeout handled by context passed to execute
	
	time.Sleep(100 * time.Millisecond) // Placeholder
	
	task.Status = TaskStatusCompleted
	now := time.Now()
	task.CompletedAt = &now
}

func (o *Orchestrator) findSuitableAgent(task *Task) *WorkerAgent {
	o.mu.RLock()
	defer o.mu.RUnlock()

	for _, agent := range o.agents {
		if agent.Busy {
			continue
		}
		
		// Check if agent has capability for this task type
		for _, cap := range agent.Capabilities {
			for _, t := range cap.TaskTypes {
				if t == task.Type {
					return agent
				}
			}
		}
	}

	return nil
}

func (o *Orchestrator) markAgentBusy(agentID string, task *Task) {
	o.mu.Lock()
	defer o.mu.Unlock()
	
	if agent, exists := o.agents[agentID]; exists {
		agent.Busy = true
		agent.CurrentTask = task
	}
}

func (o *Orchestrator) markAgentFree(agentID string) {
	o.mu.Lock()
	defer o.mu.Unlock()
	
	if agent, exists := o.agents[agentID]; exists {
		agent.Busy = false
		agent.CurrentTask = nil
	}
}

// GetTaskStatus returns the status of a task
func (o *Orchestrator) GetTaskStatus(taskID string) (*Task, error) {
	// In production, track tasks in a map
	return nil, fmt.Errorf("task not found")
}

// CancelTask cancels a running task
func (o *Orchestrator) CancelTask(taskID string) error {
	// TODO: Implement cancellation
	return fmt.Errorf("not implemented")
}

// GetAgents returns list of registered agents
func (o *Orchestrator) GetAgents() []*WorkerAgent {
	o.mu.RLock()
	defer o.mu.RUnlock()
	
	agents := make([]*WorkerAgent, 0, len(o.agents))
	for _, agent := range o.agents {
		agents = append(agents, agent)
	}
	return agents
}

// Stats returns orchestrator statistics
type OrchestratorStats struct {
	TotalTasks    int
	PendingTasks  int
	RunningTasks  int
	CompletedTasks int
	FailedTasks   int
	ActiveAgents  int
	TotalAgents   int
}

func (o *Orchestrator) GetStats() OrchestratorStats {
	o.mu.RLock()
	defer o.mu.RUnlock()
	
	activeAgents := 0
	for _, agent := range o.agents {
		if agent.Busy {
			activeAgents++
		}
	}

	return OrchestratorStats{
		TotalAgents:  len(o.agents),
		ActiveAgents: activeAgents,
	}
}

func generateTaskID() string {
	return fmt.Sprintf("task_%d", time.Now().UnixNano())
}

// MultiAgentSession manages a conversation across multiple agents
type MultiAgentSession struct {
	ID          string
	Orchestrator *Orchestrator
	Tasks       []*Task
	Messages    []protocoltypes.Message
	CreatedAt   time.Time
}

// NewMultiAgentSession creates a new session for multi-agent collaboration
func NewMultiAgentSession(orchestrator *Orchestrator) *MultiAgentSession {
	return &MultiAgentSession{
		ID:          fmt.Sprintf("session_%d", time.Now().UnixNano()),
		Orchestrator: orchestrator,
		Tasks:       make([]*Task, 0),
		Messages:    make([]protocoltypes.Message, 0),
		CreatedAt:   time.Now(),
	}
}

// AddMessage adds a message to the session
func (s *MultiAgentSession) AddMessage(role, content string) {
	s.Messages = append(s.Messages, protocoltypes.Message{
		Role:    role,
		Content: content,
	})
}
