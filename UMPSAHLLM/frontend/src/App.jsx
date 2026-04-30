import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LogOut } from 'lucide-react';
import Sidebar from './components/ui/Sidebar';
import ChatModule from './components/chat/ChatModule';
import AdminModule from './components/admin/AdminModule';
import PCControlModule from './components/pc-control/PCControlModule';
import AutomationModule from './components/automation/AutomationModule';
import CodingModule from './components/coding/CodingModule';
import { useAppStore } from './store/useAppStore';
import LoginPage from './components/auth/LoginPage';
import { auth } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { useState, useEffect } from 'react';

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

function App() {
  const { mode } = useAppStore();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

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
      case 'admin': return <AdminModule />;
      case 'pc-control': return <PCControlModule />;
      case 'automation': return <AutomationModule />;
      case 'browser': return <GenericModule title="Agent Browser" />;
      case 'coding': return <CodingModule />;
      case 'vps': return <GenericModule title="VPS Manager" />;
      default: return <ChatModule />;
    }
  };

  return (
    <div className="flex h-screen w-full bg-slate-950 text-slate-100 font-sans overflow-hidden selection:bg-indigo-500/30">
      {/* Absolute Background Mesh FX */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-600/10 blur-[150px] rounded-full animate-pulse"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-emerald-600/10 blur-[150px] rounded-full"></div>
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none z-0" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E\")" }}></div>
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
              <div className="flex items-center gap-4 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">
                 <span className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.6)]"></span> ai.umpt.my v0.9</span>
                 <span className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]"></span> pclaw active</span>
              </div>
           </div>
           
           <div className="flex items-center gap-10">
              <div className="flex flex-col items-end gap-1">
                 <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest">RTX 3060 Node 01</p>
                 <div className="flex items-center gap-2">
                    <p className="text-xs font-mono text-indigo-400 font-black">4.2GB / 12GB</p>
                    <div className="w-24 bg-slate-900 h-1 rounded-full overflow-hidden">
                       <div className="bg-indigo-500 w-1/3 h-full"></div>
                    </div>
                 </div>
              </div>
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
