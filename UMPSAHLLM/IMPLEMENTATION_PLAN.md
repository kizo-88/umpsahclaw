# UMPSAHLLM 2.0 Implementation Plan: Tri-Engine Architecture

## 🎯 Project Vision
To create a high-performance, cost-effective AI OS that utilizes local user hardware for heavy tasks while centralizing interaction data on the UMPSAH NAS for future model fine-tuning.

---

## 🏗️ The Tri-Engine Strategy

### 1. Engine A: NAS-Hosted (Light Fallback)
*   **Model**: Small footprint (e.g., Qwen-1.5B or Phi-3 Mini).
*   **Purpose**: Instant availability for low-end devices or users who cannot download models.
*   **Infrastructure**: Existing `server.js` + Ollama on NAS.

### 2. Engine B: Local Device (Performance Mode)
*   **Model**: Mid-to-Large (e.g., Llama-3-8B, Mistral-7B).
*   **Purpose**: High-speed, private inference using the user's own GPU (WebGPU).
*   **Infrastructure**: WebLLM (MLC-AI) integration in the browser.

### 3. Engine C: Cloud Integrated (Agent Mode)
*   **Model**: Frontier Models (e.g., Gemini 1.5 Pro, GPT-4o).
*   **Purpose**: Complex agentic workflows and advanced reasoning. No download required.
*   **Infrastructure**: Direct API integration (Vertex AI / OpenAI).

---

## 🛣️ Roadmap & Phases

### Phase 1: The Model Hub (Post-Login Flow)
*   **Action**: Redesign the landing page after login.
*   **Feature**: A "Model Marketplace" grid showing:
    *   **Service Name** (e.g., "Smart Coder", "Legal Agent").
    *   **Engine Type** (NAS / Local / Cloud).
    *   **Download Button** (for Local Engine).
    *   **Status Indicator** (Ready / Need Download).

### Phase 2: Hybrid Backend Development
*   **Action**: Update `server.js` on the NAS.
*   **Feature**: Implement the **"Observation Logger"**. 
    *   Every message sent through ANY engine (Local/Cloud/NAS) must be mirrored to the NAS storage.
    *   Format: JSONL (Prompt, Response, EngineUsed, Timestamp, UserID).

### Phase 3: Local Engine Integration (WebLLM)
*   **Action**: Integrate `@mlc-ai/web-llm` into the React frontend.
*   **Feature**: Create the `ModelStreamingService` to handle local VRAM management and download progress.

### Phase 4: Cloud Engine Integration
*   **Action**: Add API keys to the NAS backend for Cloud models.
*   **Feature**: A secure proxy on the NAS to handle Cloud requests without exposing keys to the frontend.

### Phase 5: Interaction Data Centralization
*   **Action**: Create a `TrainingData` folder on the NAS.
*   **Feature**: Automated scripts to aggregate logged interactions into clean datasets for future LoRA fine-tuning.

---

## 🔒 Security & Privacy
*   **Auth**: Continue using Firebase Auth for all engines.
*   **Privacy**: Local models keep sensitive data in VRAM; only the "Interaction Log" is sent to the NAS for training purposes (with user transparency).
