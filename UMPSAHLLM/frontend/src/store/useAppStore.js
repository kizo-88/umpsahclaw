import { create } from 'zustand';

export const useAppStore = create((set) => ({
  mode: 'chat', // chat, automation, pc-control, browser, coding, vps, admin
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

  addMessage: (msg) => set((state) => ({ 
    messages: [...state.messages, msg] 
  })),
}));
