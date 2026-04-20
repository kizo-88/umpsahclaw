import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Terminal, 
  Play, 
  Files, 
  Monitor, 
  Cpu, 
  ShieldCheck, 
  HardDrive,
  Code,
  Layout,
  Command
} from 'lucide-react';

const PCControlModule = () => {
  const [logs, setLogs] = useState([
    { type: 'info', msg: 'System initialized. Runtime: Node v24.14.0' },
    { type: 'success', msg: 'PicoClaw OS Bridge Connected via 127.0.0.1:18790' },
    { type: 'info', msg: 'Sandbox permissions: UNLOCKED' }
  ]);
  const [isExecuting, setIsExecuting] = useState(false);
  const logEndRef = useRef(null);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const addLog = (msg, type = 'info') => {
    setLogs(prev => [...prev, { msg, type }]);
  };

  const handleRunTask = () => {
    setIsExecuting(true);
    addLog('Initiating COW_WORK sequence...', 'command');
    
    setTimeout(() => {
        addLog('Searching for: C:\\Users\\maste\\Desktop\\test\\test.txt', 'info');
    }, 800);

    setTimeout(() => {
        addLog('MATCH FOUND. Analyzing file structure...', 'success');
        addLog('Applying patch: 1-1000 sequence insertion.', 'info');
    }, 1500);

    setTimeout(() => {
        addLog('Task buffer flushed successfully.', 'success');
        setIsExecuting(false);
    }, 3000);
  };

  return (
    <div className="h-full flex flex-col bg-slate-950 text-slate-100 overflow-hidden font-inter">
      {/* Header */}
      <div className="p-6 border-b border-slate-900 flex justify-between items-center bg-slate-950/50 backdrop-blur-xl shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
             <Monitor className="text-indigo-400 w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-black tracking-tight uppercase">CO-WORK / PC CONTROL</h3>
            <p className="text-[10px] uppercase font-black tracking-[0.2em] text-slate-500 flex items-center gap-2">
               Live Control Environment <span className="w-1 h-1 bg-emerald-500 rounded-full animate-pulse"></span>
            </p>
          </div>
        </div>
        <div className="flex gap-4">
           <button className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl hover:bg-slate-800 transition-all text-xs font-bold text-slate-400">
              <Files className="w-4 h-4" /> Workspace
           </button>
           <button 
             onClick={handleRunTask}
             disabled={isExecuting}
             className={`flex items-center gap-3 px-6 py-2.5 rounded-xl transition-all shadow-xl font-black text-xs uppercase tracking-widest ${
               isExecuting ? 'bg-indigo-500/20 text-indigo-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-500/20 active:scale-95'
             }`}
           >
              {isExecuting ? <Cpu className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-current" />} 
              {isExecuting ? 'Processing' : 'Run Sequence'}
           </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Main Work Area (Visual) */}
        <div className="flex-1 p-8 overflow-y-auto custom-scrollbar flex flex-col gap-8">
           <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              
              {/* File Context Card */}
              <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-8 space-y-6 relative overflow-hidden group">
                 <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity">
                    <Files className="w-32 h-32" />
                 </div>
                 <div>
                    <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Active Context</h4>
                    <div className="flex items-center gap-3 p-4 bg-slate-950 border border-slate-800 rounded-2xl">
                       <HardDrive className="text-indigo-400 w-5 h-5" />
                       <span className="text-xs font-mono text-indigo-300">C:\Users\maste\Desktop\test\test.txt</span>
                    </div>
                 </div>
                 <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs font-bold">
                       <span className="text-slate-500">Operation Mode:</span>
                       <span className="text-white">Full Access (CRUD)</span>
                    </div>
                    <div className="flex items-center justify-between text-xs font-bold">
                       <span className="text-slate-500">Stability:</span>
                       <span className="text-emerald-400">Stable</span>
                    </div>
                 </div>
              </div>

              {/* Stats Card */}
              <div className="grid grid-cols-2 gap-4">
                 <div className="bg-slate-900/40 border border-indigo-500/10 rounded-3xl p-6 flex flex-col justify-center items-center gap-2">
                    <Cpu className="text-indigo-400 w-5 h-5" />
                    <p className="text-[9px] font-black text-slate-500 uppercase">Process ID</p>
                    <p className="text-lg font-black font-mono">#9921</p>
                 </div>
                 <div className="bg-slate-900/40 border border-indigo-500/10 rounded-3xl p-6 flex flex-col justify-center items-center gap-2">
                    <ShieldCheck className="text-emerald-400 w-5 h-5" />
                    <p className="text-[9px] font-black text-slate-500 uppercase">Auth Level</p>
                    <p className="text-lg font-black font-mono text-emerald-500">SUDO</p>
                 </div>
                 <div className="bg-slate-900/40 border border-indigo-500/10 rounded-3xl p-6 flex flex-col justify-center items-center gap-2 col-span-2">
                    <div className="flex justify-between w-full mb-2">
                       <p className="text-[9px] font-black text-slate-500 uppercase">Resource Usage</p>
                       <p className="text-[9px] font-bold text-indigo-400">12ms response</p>
                    </div>
                    <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden">
                       <div className="h-full w-[14%] bg-indigo-500"></div>
                    </div>
                 </div>
              </div>
           </div>

           {/* Terminal Emulator (The "Cowork" vibe) */}
           <div className="flex-1 bg-slate-950 border border-slate-900 rounded-[2rem] overflow-hidden flex flex-col shadow-2xl relative">
              <div className="h-10 px-6 bg-slate-900/50 border-b border-slate-900 flex items-center justify-between flex-none">
                 <div className="flex items-center gap-4">
                    <div className="flex gap-1.5">
                       <div className="w-2.5 h-2.5 rounded-full bg-slate-800"></div>
                       <div className="w-2.5 h-2.5 rounded-full bg-slate-800"></div>
                       <div className="w-2.5 h-2.5 rounded-full bg-slate-800"></div>
                    </div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                       <Terminal className="w-3 h-3" /> Console_Output.sh
                    </span>
                 </div>
                 <Code className="w-3 h-3 text-slate-600" />
              </div>

              <div className="flex-1 p-6 font-mono text-sm space-y-2 overflow-y-auto custom-scrollbar bg-[rgba(2,6,23,0.8)]">
                 {logs.map((log, i) => (
                    <div key={i} className={`flex gap-3 ${log.type === 'command' ? 'text-indigo-400 font-black' : log.type === 'success' ? 'text-emerald-400' : 'text-slate-400'}`}>
                       <span className="opacity-30">[{new Date().toLocaleTimeString([], { hour12: false })}]</span>
                       <span className="opacity-50">{log.type === 'command' ? '>' : '$'}</span>
                       <span>{log.msg}</span>
                    </div>
                 ))}
                 <div ref={logEndRef} />
              </div>
           </div>
        </div>

        {/* Right Tool Sidebar */}
        <div className="w-80 border-l border-slate-900 bg-slate-950/40 backdrop-blur-3xl overflow-y-auto p-6 space-y-8 flex-none hidden xl:flex flex-col">
           <h4 className="text-[10px] font-black text-slate-600 uppercase tracking-widest px-2">Control Presets</h4>
           <div className="space-y-3 px-1">
              {[
                { label: 'Check File Integrity', icon: ShieldCheck },
                { label: 'Automate Sequence', icon: Command },
                { label: 'Refactor Workspace', icon: Layout }
              ].map((tool, i) => (
                <button key={i} className="w-full p-4 bg-slate-900/30 border border-slate-800 rounded-2xl flex items-center gap-4 hover:bg-slate-900 transition-all hover:border-slate-700 active:scale-95 group">
                   <div className="p-2.5 bg-slate-800 rounded-xl group-hover:bg-indigo-500/10 group-hover:text-indigo-400 transition-colors">
                      <tool.icon className="w-4 h-4" />
                   </div>
                   <span className="text-xs font-bold text-slate-400 group-hover:text-white">{tool.label}</span>
                </button>
              ))}
           </div>

           <div className="mt-auto space-y-4">
              <div className="p-4 bg-indigo-500/5 border border-indigo-500/10 rounded-2xl">
                 <p className="text-[10px] font-black text-indigo-400 uppercase mb-2">Connected Bridge</p>
                 <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-500/20 rounded-lg">
                       <Cpu className="w-3 h-3 text-indigo-400" />
                    </div>
                    <span className="text-[10px] font-mono font-bold text-slate-400">PCLAW_ENGINE_v1x</span>
                 </div>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default PCControlModule;
