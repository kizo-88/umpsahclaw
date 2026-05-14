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
    { id: 'phi3-mini', name: 'Phi-3 Mini', status: 'online', engine: 'NAS', specialty: 'Fast & Light', role: 'System Assistant', color: 'text-indigo-400', downloaded: true, size: '2.1 GB' },
    { id: 'llama3.1-8b', name: 'Llama 3.1 (8B)', status: 'ready', engine: 'Local', specialty: 'Balanced Intelligence', role: 'General Analyst', color: 'text-emerald-400', downloaded: false, size: '4.7 GB' },
    { id: 'qwen2.5-7b', name: 'Qwen 2.5 (7B)', status: 'ready', engine: 'Local', specialty: 'Code & Logic', role: 'Tech Lead', color: 'text-blue-400', downloaded: false, size: '4.2 GB' },
    { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', status: 'online', engine: 'Cloud', specialty: 'Extreme Reasoning', role: 'Master Agent', color: 'text-amber-400', downloaded: true, size: '0 GB' }
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
