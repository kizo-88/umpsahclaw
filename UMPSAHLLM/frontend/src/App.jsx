import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LogOut } from 'lucide-react';
import Sidebar from './components/ui/Sidebar';
import ChatModule from './components/chat/ChatModule';
import AgentModule from './components/agent/AgentModule';
import AdminModule from './components/admin/AdminModule';
import PCControlModule from './components/pc-control/PCControlModule';
import AutomationModule from './components/automation/AutomationModule';
import CodingModule from './components/coding/CodingModule';
import BrowserModule from './components/browser/BrowserModule';
import MemoryModule from './components/memory/MemoryModule';
import IntegrationsModule from './components/integrations/IntegrationsModule';
import { useAppStore } from './store/useAppStore';
import LoginPage from './components/auth/LoginPage';
import ModelHub from './components/hub/ModelHub';
import VPSModule from './components/vps/VPSModule';
import { auth } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { useState, useEffect } from 'react';
import { localLLMService } from './services/localLLMService';

const GenericModule = ({ title }) => (
  <div className="h-full flex items-center justify-center p-20 flex-col gap-4">
    <div className="w-20 h-20 rounded-3xl bg-slate-900 border border-slate-800 flex items-center justify-center animate-pulse">
       <span className="text-2xl">⏳</span>
    </div>
    <div className="text-center">
      <h2 className="text-2xl font-black uppercase text-white">{title}</h2>
      <p className="text-slate-500 font-medium">Enterprise core module initializing. Deployment in progress.</p>
    </div>
  </div>
);

import DarkVeil from './components/ui/DarkVeil';

function App() {
  const { mode, activeModelId } = useAppStore();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (activeModelId) {
      localLLMService.init(activeModelId, (p) => {
        console.log(`Auto-loading engine from cache: ${Math.round(p * 100)}%`);
      }).catch(e => console.error("Auto-load failed", e));
    }
  }, [activeModelId]);

  if (loading) {
    return (
      <div className="h-screen w-full bg-slate-950 flex items-center justify-center">
        <motion.div animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }} transition={{ repeat: Infinity, duration: 2 }} className="w-12 h-12 bg-indigo-600 rounded-2xl" />
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  const renderModule = () => {
    switch(mode) {
      case 'chat': return <ChatModule />;
      case 'ai-agent': return <AgentModule />;
      case 'memory': return <MemoryModule />;
      case 'integrations': return <IntegrationsModule />;
      case 'admin': return <AdminModule />;
      case 'pc-control': return <PCControlModule />;
      case 'automation': return <AutomationModule />;
      case 'browser': return <BrowserModule />;
      case 'coding': return <CodingModule />;
      case 'vps': return <VPSModule />;
      case 'hub': return <ModelHub />;
      default: return <ModelHub />;
    }
  };

  return (
    <div className="flex h-screen w-full bg-black text-slate-100 font-sans overflow-hidden selection:bg-indigo-500/30">
      {/* Absolute Background WebGL FX */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <DarkVeil
          hueShift={220}
          noiseIntensity={0.06}
          scanlineIntensity={0.1}
          speed={0.15}
          scanlineFrequency={800}
          warpAmount={0.05}
        />
      </div>

      <Sidebar />

      <main className="flex-1 flex flex-col relative z-20 bg-slate-950/40 backdrop-blur-3xl overflow-hidden">
        <header className="h-24 min-h-[6rem] border-b border-slate-900/60 flex items-center px-12 justify-between bg-slate-950/60 backdrop-blur-xl">
           <div className="flex flex-col">
               <motion.h2 
                key={mode}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="text-2xl font-black uppercase tracking-tighter text-white"
              >
                {mode.replace('-', ' ')}
              </motion.h2>
           </div>
           
           <div className="flex items-center gap-10">
              <div className="w-12 h-12 rounded-2xl bg-indigo-600 border border-indigo-400 shadow-xl shadow-indigo-500/20 flex items-center justify-center text-xs font-black text-white hover:bg-indigo-500 transition-all cursor-pointer active:scale-95 group overflow-hidden relative"
                   onClick={() => auth.signOut()}
              >
                 {user.displayName ? user.displayName.substring(0, 2).toUpperCase() : user.email.substring(0, 2).toUpperCase()}
                 <div className="absolute inset-0 bg-red-600 translate-y-full group-hover:translate-y-0 transition-transform duration-300 flex items-center justify-center">
                    <LogOut className="w-4 h-4" />
                 </div>
              </div>
           </div>
        </header>

        <div className="flex-1 relative overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={mode}
              initial={{ opacity: 0, scale: 0.98, filter: 'blur(10px)' }}
              animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
              exit={{ opacity: 0, scale: 1.02, filter: 'blur(20px)' }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="h-full overflow-y-auto custom-scrollbar"
            >
              {renderModule()}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

export default App;
