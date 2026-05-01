import { create } from 'zustand';

export const useAppStore = create((set) => ({
  mode: 'chat', // chat, ai-agent, automation, pc-control, browser, coding, vps, admin
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
    { id: 'llama3.1:8b', name: 'Llama 3.1 (8B)', status: 'online', specialty: 'General Intelligence', role: 'Fact Checker', color: 'text-indigo-400' },
    { id: 'qwen3.5:latest', name: 'Qwen 3.5', status: 'online', specialty: 'Coding & Logic', role: 'Technical Architect', color: 'text-emerald-400' },
    { id: 'deepseek-v3', name: 'DeepSeek V3', status: 'standby', specialty: 'Advanced Reasoning', role: 'Security Auditor', color: 'text-rose-400' }
  ],

  updateModelRole: (id, role) => set((state) => ({
    availableModels: state.availableModels.map(m => m.id === id ? { ...m, role } : m)
  })),

  addMessage: (msg) => set((state) => ({ 
    messages: [...state.messages, msg] 
  })),
}));
