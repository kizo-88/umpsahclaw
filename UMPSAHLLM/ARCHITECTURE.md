# UMPSAHLLM 2.0: System Architecture

The following diagram illustrates the **Tri-Engine Hybrid Flow**. This design maximizes performance by utilizing local hardware while ensuring all interaction data is centralized for future training.

## 📊 System Flowchart

```mermaid
graph TD
    User([User Application])
    
    subgraph Engines
        Local[Local Engine: WebGPU/WebLLM]
        NAS_Engine[NAS Engine: Light Fallback]
        Cloud[Cloud Engine: Frontier API]
    end
    
    User -->|Selects Mode| Engines
    
    Local -->|Response| User
    NAS_Engine -->|Response| User
    Cloud -->|Response| User
    
    subgraph Data_Pipeline
        Log[Interaction Logger]
        NAS_Storage[(NAS Interaction Database)]
        Trainer[Model Training / LoRA]
    end
    
    Local -.->|Mirror Interaction| Log
    NAS_Engine -.->|Mirror Interaction| Log
    Cloud -.->|Mirror Interaction| Log
    
    Log --> NAS_Storage
    NAS_Storage --> Trainer
```

## 🖼️ Visual Architecture Overview
![Architecture Flowchart](./umpsahllm_v2_flowchart.png)

---

## 🚀 Key Benefits
1. **Low Latency**: Local engine provides instant responses without server delay.
2. **Infinite Scale**: User hardware scales with the user base.
3. **Data Rich**: Every interaction contributes to the UMPSAH training set.
4. **Resiliency**: NAS and Cloud engines serve as perfect fallbacks.
