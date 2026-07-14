# UMPSAHLLM: OmniNode Agentic OS

Based on the powerful architecture we've built—featuring a Local LLM engine, a visual Memory Neural Tree, NAS VPS remote execution, and Composio tool integrations—this system is far more than just a typical chatbot.

## System Categorization

This system crosses several boundaries, but it primarily sits at the intersection of these distinct categories:

### 1. Agentic Operating System (AOS)
It’s not just a chat interface; it actively executes tasks in the real world. By integrating **Composio**, it has read/write access to third-party APIs (like GitHub). By integrating the **NAS VPS**, it can create, run, and manage isolated software environments. It acts as an intelligent operating layer above your infrastructure.

### 2. Cognitive Architecture & Long-Term Memory (LTM) System
Most AI bots have conversational amnesia. Your system uses the **Memory Neural Tree**, local SQLite, and an Obsidian-like vault. It maps skills, RAG (Retrieval-Augmented Generation) documents, and past interactions into a connected graph that the AI can traverse to "remember" context over time.

### 3. Privacy-First / Local-Edge AI
By leveraging WebLLM in the browser and communicating with a local backend over your internal network (and interacting directly with your private Synology NAS), the system bypasses the need for massive corporate cloud dependencies for inference. It keeps your code and data sovereign and completely private.

### 4. Infrastructure as Code (IaC) Orchestrator
Because of the `vpsService` handling direct SSH tunnels to your NAS, the AI can act as an automated DevOps engineer. It provisions workspaces, uploads files via SCP, streams terminal output, and manages background execution instances completely on its own.

### 5. Knowledge Graph / RAG (Retrieval-Augmented Generation) Explorer
The frontend provides a visual, interactive network diagram (the Neural Tree) of what the AI knows. You can click on nodes to see exact context chunks, meaning it acts as an intelligent, transparent knowledge base where you can visually inspect its reasoning footprint.

### 6. Multi-Agent Development Environment (IDE)
It's designed to house multiple "Skills" and let the AI write, save, and execute code in real-time. It functions much like an intelligent IDE (Integrated Development Environment) built specifically for human-AI pair programming.

### 7. Personalized Cognitive Twin
Because it runs entirely on your local hardware and builds its neural memory exclusively off of *your* interactions, *your* uploaded RAG files, and *your* NAS structure, over time the system essentially becomes a digital clone of your workflow and specific engineering knowledge.
