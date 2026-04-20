import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Editor from '@monaco-editor/react';
import { 
  Code2, 
  Terminal, 
  Play, 
  Settings, 
  Sparkles, 
  ChevronRight, 
  Files, 
  Zap,
  Cpu,
  RefreshCw,
  Layout,
  MessageSquare
} from 'lucide-react';

const CodingModule = () => {
  const [code, setCode] = useState(`// UMPSAHLLM Vibe IDE
// Powered by Antigravity Core

function automateTask() {
  console.log("Initializing Agent Sequence...");
  // PicoClaw tool usage
  const result = await pclaw.execute('list_dir', { path: './workspace' });
  return result;
}

automateTask();`);

  const [aiChat, setAiChat] = useState([
    { role: 'assistant', text: 'Vibe Coding active. I am synced with your RTX 3060. Paste any script and I will refactor it for PicoClaw automation.' }
  ]);

  const [input, setInput] = useState('');

  const handleSend = async () => {
    if (!input.trim()) return;
    const userMsg = input;
    setAiChat(prev => [...prev, { role: 'user', text: userMsg }]);
    setInput('');

    try {
      const response = await fetch('http://localhost:3001/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: userMsg,
          model: 'codellama:13b' 
        })
      });
      const data = await response.json();
      setAiChat(prev => [...prev, { role: 'assistant', text: data.response }]);
    } catch (err) {
      setAiChat(prev => [...prev, { role: 'assistant', text: 'Connection to Brain Failed.' }]);
    }
  };

  return (
    <div className="h-full flex overflow-hidden bg-slate-950 font-inter">
      
      {/* 📁 File Tree Sidebar (Slim) */}
      <div className="w-14 border-r border-slate-900 flex flex-col items-center py-6 gap-6 bg-slate-950/50 backdrop-blur-3xl shrink-0">
        <Files className="w-5 h-5 text-slate-500 hover:text-white cursor-pointer transition-colors" />
        <Layout className="w-5 h-5 text-indigo-400 cursor-pointer" />
        <RefreshCw className="w-5 h-5 text-slate-500 hover:text-white cursor-pointer transition-colors" />
        <div className="mt-auto pb-4">
           <Settings className="w-5 h-5 text-slate-600 hover:text-white cursor-pointer" />
        </div>
      </div>

      {/* 💻 Main Editor Space */}
      <div className="flex-1 flex flex-col relative overflow-hidden">
        <div className="h-12 border-b border-slate-900 flex items-center px-6 justify-between bg-slate-950/60 transition-all">
          <div className="flex items-center gap-6">
             <div className="flex items-center gap-2">
                <Code2 className="w-4 h-4 text-indigo-400" />
                <span className="text-xs font-bold text-slate-300">automation_logic.js</span>
             </div>
             <div className="h-4 w-[1px] bg-slate-800"></div>
             <div className="flex gap-4">
                <span className="text-[10px] font-bold text-slate-600 uppercase hover:text-slate-300 cursor-pointer">Terminal</span>
                <span className="text-[10px] font-bold text-slate-600 uppercase hover:text-slate-300 cursor-pointer">Logs</span>
             </div>
          </div>
          <div className="flex gap-2">
             <button className="flex items-center gap-2 px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-all text-[10px] font-black uppercase text-white shadow-lg shadow-indigo-500/10 active:scale-95">
                <Play className="w-3 h-3 fill-white" /> Run
             </button>
          </div>
        </div>

        <div className="flex-1 bg-slate-950 relative">
          <Editor
            height="100%"
            defaultLanguage="javascript"
            defaultValue={code}
            theme="vs-dark"
            options={{
              fontSize: 14,
              fontFamily: "'JetBrains Mono', monospace",
              minimap: { enabled: false },
              padding: { top: 20 },
              scrollBeyondLastLine: false,
              backgroundColor: '#020617',
              lineNumbers: 'on',
              glyphMargin: false,
              folding: true,
              lineDecorationsWidth: 10,
              lineNumbersMinChars: 3,
            }}
          />
        </div>

        {/* 📟 Terminal Drawer (Mocked) */}
        <div className="h-32 border-t border-slate-900 bg-slate-950/80 p-4 font-mono text-[11px] text-slate-500">
           <div className="flex items-center gap-2 mb-2 text-indigo-400 font-bold opacity-60">
              <Terminal className="w-3 h-3" /> AG_DEBUG_CONSOLE_v1
           </div>
           <div>[SYSTEM]: Compiled automation_logic.js successfully.</div>
           <div>[PCLAW]: Bridge mode active on 172.17.27.62.</div>
           <div className="flex gap-1 animate-pulse"><span className="text-indigo-500">_</span></div>
        </div>
      </div>

      {/* 🧬 Antigravity-Style AI Sidebar */}
      <div className="w-96 border-l border-slate-900 flex flex-col bg-slate-950/40 backdrop-blur-2xl relative shadow-[-20px_0px_50px_rgba(0,0,0,0.5)] z-20 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
           <div className="absolute top-[-10%] right-[-10%] w-full h-full bg-indigo-500/5 blur-[80px] rounded-full"></div>
        </div>

        <div className="p-6 border-b border-slate-900/60 flex items-center justify-between">
           <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center border border-indigo-400/20 shadow-lg shadow-indigo-500/10">
                 <Sparkles className="w-4 h-4 text-white" />
              </div>
              <div>
                 <h4 className="text-xs font-black uppercase text-white">Vibe Copilot</h4>
                 <p className="text-[9px] uppercase font-black tracking-widest text-indigo-500">Antigravity Mode</p>
              </div>
           </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
           {aiChat.map((msg, i) => (
              <div key={i} className={`flex gap-3 ${msg.role === 'assistant' ? 'flex-col' : 'flex-row-reverse'}`}>
                 <div className={`p-4 rounded-2xl text-[13px] leading-relaxed border ${
                    msg.role === 'assistant' 
                    ? 'bg-slate-900/50 border-slate-800 text-slate-300 rounded-tl-none font-medium' 
                    : 'bg-indigo-600 border-indigo-500 text-white rounded-tr-none'
                 }`}>
                    {msg.text}
                 </div>
              </div>
           ))}
        </div>

        <div className="p-4 border-t border-slate-900">
           <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-2 flex items-center gap-2 focus-within:border-indigo-500/50 transition-all">
              <input 
                placeholder="How should I refactor this?" 
                className="flex-1 bg-transparent text-xs outline-none px-3 py-1 font-medium text-slate-300"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSend()}
              />
              <button 
                onClick={handleSend}
                className="p-2.5 bg-indigo-600 hover:bg-indigo-500 rounded-xl transition-all shadow-lg active:scale-95"
              >
                 <ChevronRight className="w-4 h-4" />
              </button>
           </div>
           <div className="mt-4 flex items-center gap-4 px-2">
              <div className="flex items-center gap-1.5 opacity-40">
                 <Cpu className="w-3 h-3" />
                 <span className="text-[9px] font-black uppercase tracking-tighter">GPU Enabled</span>
              </div>
              <div className="flex items-center gap-1.5 opacity-40">
                 <Zap className="w-3 h-3" />
                 <span className="text-[9px] font-black uppercase tracking-tighter">Lat: 12ms</span>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default CodingModule;
