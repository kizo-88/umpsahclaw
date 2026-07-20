import React from 'react';
import { motion } from 'framer-motion';
import { 
  MessageSquare, 
  Zap, 
  Gamepad2, 
  Globe, 
  Code2, 
  Server, 
  ShieldCheck,
  Cpu,
  Brain,
  Layout,
  Database,
  Blocks,
  FileText
} from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { SparklesText } from './sparkles-text';

const Sidebar = () => {
  const { mode, setMode } = useAppStore();

  const navItems = [
    { id: 'hub', label: 'Model Hub', icon: Layout, color: 'text-indigo-400' },
    { id: 'chat', label: 'AI Chat', icon: MessageSquare, color: 'text-sky-400' },
    { id: 'ai-agent', label: 'AI Agent', icon: Brain, color: 'text-purple-400' },
    { id: 'memory', label: 'Memory Tree', icon: Database, color: 'text-emerald-400' },
    { id: 'integrations', label: 'Integrations', icon: Blocks, color: 'text-rose-400' },
    { id: 'automation', label: 'Automation', icon: Zap, color: 'text-amber-400' },
    { id: 'pc-control', label: 'PC Control', icon: Gamepad2, color: 'text-emerald-400' },
    { id: 'browser', label: 'Agent Browser', icon: Globe, color: 'text-sky-400' },
    { id: 'coding', label: 'Code IDE', icon: Code2, color: 'text-purple-400' },
    { id: 'vps', label: 'VPS Manager', icon: Server, color: 'text-rose-400' },
    { id: 'workspace', label: 'Workspace', icon: FileText, color: 'text-blue-400' },
    { id: 'admin', label: 'Admin Panel', icon: ShieldCheck, color: 'text-slate-400' },
  ];


  return (
    <motion.div 
      initial={{ x: -260 }}
      animate={{ x: 0 }}
      className="w-64 border-r border-slate-800 bg-slate-950/50 backdrop-blur-2xl flex flex-col p-4 shadow-2xl z-50 h-screen"
    >
      <div className="flex items-center gap-3 mb-10 px-2 pt-2">
        <img src="/logo.png" alt="UMPSA" className="w-11 h-11 object-contain rounded-lg" />
        <div>
          <SparklesText text="UMPSAHLLM" className="text-md font-black tracking-tighter text-[var(--theme-text)]" sparklesCount={5} />
          <p className="text-[9px] text-indigo-500 font-mono tracking-widest font-bold">ENTERPRISE OS</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1.5">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setMode(item.id)}
            className={`w-full group flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-300 border ${
              mode === item.id 
                ? 'bg-indigo-500/10 border-indigo-500/30 text-white shadow-lg shadow-indigo-500/10' 
                : 'border-transparent text-slate-400 hover:text-slate-100 hover:bg-slate-900/50'
            }`}
          >
            <item.icon className={`w-5 h-5 transition-transform group-hover:scale-110 ${mode === item.id ? item.color : 'text-slate-500'}`} />
            <span className="text-sm font-semibold tracking-tight">{item.label}</span>
            {mode === item.id && (
              <motion.div layoutId="active-pill" className="ml-auto w-1 h-4 bg-indigo-500 rounded-full" />
            )}
          </button>
        ))}
      </nav>

      <div className="mt-auto p-3 bg-slate-900/50 border border-slate-800/50 rounded-2xl">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center">
             <span className="text-xs font-bold text-indigo-400">AD</span>
          </div>
          <div className="flex-1 min-w-0">
             <p className="text-xs font-bold truncate">Admin User</p>
             <p className="text-[10px] text-slate-500 truncate">@umpsaholdings.my</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
           <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
           <span className="text-[10px] font-bold text-emerald-500/80 uppercase tracking-widest">System Online</span>
        </div>
      </div>
    </motion.div>
  );
};

export default Sidebar;
