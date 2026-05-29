import { create } from 'zustand';

export const useAppStore = create((set) => ({
  mode: 'hub', // hub, chat, ai-agent, automation, pc-control, browser, coding, vps, admin
  setMode: (mode) => set({ mode }),
  
  user: {
    email: 'admin@umpsaholdings.my',
    role: 'admin',
    permissions: ['all']
  },
  
  systemHealth: {
    ollama: 'healthy',
    gpu: '54°C',
    vram: '4.2/12GB',
    picoclaw: 'active'
  },

  messages: [
    { role: 'assistant', text: 'UMPSAHLLM System Initialized. All professional modules active.' }
  ],

  availableModels: [
    { id: 'Llama-3.1-8B-Instruct-q4f32_1-MLC', name: 'Llama 3.1 (8B)', status: 'ready', engine: 'Local', specialty: 'Balanced Intelligence', role: 'Best for Everything & RAG', color: 'text-emerald-400', downloaded: false, size: '4.7 GB' },
    { id: 'Phi-3.5-mini-instruct-q4f16_1-MLC', name: 'Phi-3.5 Mini', status: 'ready', engine: 'Local', specialty: 'Fast & Light', role: 'Best for Fast Automation', color: 'text-indigo-400', downloaded: false, size: '2.1 GB' },
    { id: 'Qwen2.5-7B-Instruct-q4f32_1-MLC', name: 'Qwen 2.5 (7B)', status: 'ready', engine: 'Local', specialty: 'Code & Logic', role: 'Best for Coding & Debugging', color: 'text-blue-400', downloaded: false, size: '4.2 GB' }
  ],

  setDownloaded: (id) => set((state) => ({
    availableModels: state.availableModels.map(m => m.id === id ? { ...m, downloaded: true, status: 'online' } : m)
  })),

  updateModelRole: (id, role) => set((state) => ({
    availableModels: state.availableModels.map(m => m.id === id ? { ...m, role } : m)
  })),

  addMessage: (msg) => set((state) => ({ 
    messages: [...state.messages, msg] 
  })),
}));
