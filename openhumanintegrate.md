# Goal Description

Migrate the core intelligence architecture of UMPSAHLLM away from `PicoClaw` and fully adopt the **OpenHuman** architecture. The goal is to create a dual-client system (Web UI + Desktop App) backed by a powerful Node.js agent framework on the NAS that uses Composio for external tools and an Obsidian-style Markdown Vault for RAG (Retrieval-Augmented Generation) memory.

## Proposed Architecture Changes

### 1. Unified Backend API (Node.js on NAS)
We will completely replace the `picoclaw.exe` Go dependency in `server.js`. The new Node.js backend will serve as the central brain, exposing standard REST/WebSocket endpoints that both your custom Web UI and the OpenHuman Desktop app can connect to.

### 2. Dual-Client Support & White-Label Branding
- **The Chat (Web UI)**: Your existing React-based `UMPSAHLLM` frontend will be updated to handle streaming responses from the new Markdown/Composio-aware backend.
- **The Desktop (UMPSAHLLM Custom App)**: We will **fork the open-source OpenHuman desktop app** and completely white-label it. We will replace all OpenHuman logos and naming with **UMPSAHLLM** branding. You will receive a custom `.exe` installer for your Windows PC that provides a native, branded app experience while connecting seamlessly to your NAS backend.

### 3. Markdown Vault + RAG System
The agent's memory and state will be stored locally on the NAS in a designated folder as raw Markdown (`.md`) files.
- **Shared Access**: The Vault folder will be exposed via Synology SMB so you can open it directly in Obsidian on your Windows PC.
- **RAG Implementation**: When you send a message, the Node.js backend will quickly search (via basic keyword or local embeddings) the Markdown Vault for relevant previous conversations, system configs, or notes, and inject them into the system prompt before calling the Llama 3.1 model.

### 4. Composio Integration
We will integrate the official **Composio Node.js SDK** into the NAS backend.
- This will allow the Llama 3.1 model to request tool executions for over 100+ platforms (e.g., pulling GitHub repos, sending Slack messages, modifying Google Calendars) natively.
- The backend will handle the OAuth flows and securely execute the API calls on behalf of the AI.

## Verification Plan

### Automated Tests
- Verify the Node.js backend correctly creates, reads, and updates `.md` files in the Vault.
- Verify Composio SDK successfully authenticates and registers tools with the local Ollama instance via Function Calling.

### Manual Verification
- You will test sending a message from both the **Web UI** and the **Desktop App** and verify they both tap into the same Markdown memory.
- We will trigger a basic Composio tool (e.g., fetching a web page or getting weather) to prove the agent can route tasks outside the local network.
