import React, { useState, useEffect, useRef } from 'react';
import { API_BASE } from '../../config';
import { motion, AnimatePresence } from 'framer-motion';
import Editor from '@monaco-editor/react';
import { localLLMService } from '../../services/localLLMService';
import { 
  Code2, Terminal, Play, Settings, Sparkles, ChevronRight, Files, 
  Zap, Cpu, RefreshCw, Layout, MessageSquare, Folder, File as FileIcon, 
  Save, Plus, Trash2, HardDrive
} from 'lucide-react';

const CodingModule = () => {
  const [logs, setLogs] = useState([
    { type: 'info', msg: 'Code IDE initialized.' },
    { type: 'success', msg: 'Local file system connected.' }
  ]);
  const [files, setFiles] = useState([]);
  const [activeFile, setActiveFile] = useState(null);
  const [fileContent, setFileContent] = useState('');
  const [isExecuting, setIsExecuting] = useState(false);
  const logEndRef = useRef(null);
  const chatEndRef = useRef(null);

  const [aiChat, setAiChat] = useState([
    { role: 'assistant', text: 'Code IDE Copilot active. I have direct access to your local Workspace. What file should we create or edit?' }
  ]);
  const [input, setInput] = useState('');

  useEffect(() => {
    fetchFiles();
  }, []);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [aiChat]);

  const addLog = (msg, type = 'info') => {
    setLogs(prev => [...prev, { msg, type }]);
  };

  const fetchFiles = async () => {
    try {
      const res = await fetch(API_BASE + '/api/fs/list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dirPath: '' })
      });
      const data = await res.json();
      if (data.files) setFiles(data.files);
    } catch (e) {
      addLog('Failed to fetch directory: ' + e.message, 'error');
    }
  };

  const handleSelectFile = async (filePath) => {
    addLog(`Reading file: ${filePath}`, 'command');
    try {
      const res = await fetch(API_BASE + '/api/fs/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath })
      });
      const data = await res.json();
      if (res.ok) {
        setFileContent(data.content);
        setActiveFile(filePath);
        addLog(`Successfully read ${filePath}`, 'success');
      } else {
        addLog(`Error reading file: ${data.error}`, 'error');
      }
    } catch (e) {
      addLog(`Failed to read file: ${e.message}`, 'error');
    }
  };

  const handleSaveFile = async (targetFile = activeFile, targetContent = fileContent) => {
    if (!targetFile) return;
    setIsExecuting(true);
    addLog(`Saving changes to ${targetFile}...`, 'command');
    try {
      const res = await fetch(API_BASE + '/api/fs/write', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath: targetFile, content: targetContent })
      });
      if (res.ok) {
        addLog(`Successfully saved ${targetFile}`, 'success');
        fetchFiles();
      } else {
        const data = await res.json();
        addLog(`Error saving file: ${data.error}`, 'error');
      }
    } catch (e) {
      addLog(`Failed to save file: ${e.message}`, 'error');
    }
    setIsExecuting(false);
  };

  const handleDeleteFile = async () => {
    if (!activeFile) return;
    if (!window.confirm(`Delete ${activeFile}?`)) return;
    setIsExecuting(true);
    addLog(`Deleting ${activeFile}...`, 'command');
    try {
      const res = await fetch(API_BASE + '/api/fs/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath: activeFile })
      });
      if (res.ok) {
        addLog(`Successfully deleted ${activeFile}`, 'success');
        setActiveFile(null);
        setFileContent('');
        fetchFiles();
      } else {
        const data = await res.json();
        addLog(`Error deleting file: ${data.error}`, 'error');
      }
    } catch (e) {
      addLog(`Failed to delete file: ${e.message}`, 'error');
    }
    setIsExecuting(false);
  };

  const handleCreateFile = async () => {
    const filename = window.prompt("Enter new file name:");
    if (!filename) return;
    setIsExecuting(true);
    addLog(`Creating file ${filename}...`, 'command');
    try {
      const res = await fetch(API_BASE + '/api/fs/write', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath: filename, content: '// New File' })
      });
      if (res.ok) {
        addLog(`Successfully created ${filename}`, 'success');
        fetchFiles();
        handleSelectFile(filename);
      } else {
        const data = await res.json();
        addLog(`Error creating file: ${data.error}`, 'error');
      }
    } catch (e) {
      addLog(`Failed to create file: ${e.message}`, 'error');
    }
    setIsExecuting(false);
  };

  const handleSendAI = async () => {
    if (!input.trim()) return;
    const userMsg = input;
    setAiChat(prev => [...prev, { role: 'user', text: userMsg }]);
    setInput('');

    try {
      const systemPrompt = `You are Code IDE Copilot, an AI assisting with local coding tasks. 
If the user asks you to write code, provide the code wrapped in standard markdown code blocks (e.g. \`\`\`javascript).
I will automatically detect the code block and update the user's local file.`;
      
      const fileContext = activeFile 
        ? `\n\n--- CURRENT OPEN FILE: ${activeFile} ---\n${fileContent}\n---------------------------\n` 
        : `\n\n(No file currently open)\n`;
      
      const prompt = `${systemPrompt}${fileContext}\nUser Request: ${userMsg}`;

      setAiChat(prev => [...prev, { role: 'assistant', text: '...', loading: true }]);

      const responseText = await localLLMService.generate([{ role: 'user', content: prompt }]);
      
      // Check if response has code block to auto-apply
      let applied = false;
      const codeMatch = responseText.match(/```[a-z]*\n([\s\S]*?)\n```/);
      if (codeMatch && codeMatch[1] && activeFile) {
        const newCode = codeMatch[1].trim();
        setFileContent(newCode);
        handleSaveFile(activeFile, newCode);
        applied = true;
      }

      setAiChat(prev => {
        const newChat = [...prev];
        newChat[newChat.length - 1] = { 
          role: 'assistant', 
          text: responseText + (applied ? '\n\n*(Auto-applied code to file and saved to disk)*' : '')
        };
        return newChat;
      });
    } catch (err) {
      console.error(err);
      setAiChat(prev => {
        const newChat = [...prev];
        newChat[newChat.length - 1] = { role: 'assistant', text: 'Local WebGPU Connection Failed. Ensure a model is loaded.' };
        return newChat;
      });
    }
  };

  return (
    <div className="h-full flex overflow-hidden bg-[#050505] font-inter">
      
      {/* 📁 File Tree Sidebar (Slim) */}
      <div className="w-14 border-r border-slate-900 flex flex-col items-center py-6 gap-6 bg-[#050505]/50 backdrop-blur-3xl shrink-0">
        <Files className="w-5 h-5 text-indigo-400 cursor-pointer" />
        <Layout className="w-5 h-5 text-slate-500 hover:text-white cursor-pointer transition-colors" />
        <RefreshCw onClick={fetchFiles} className="w-5 h-5 text-slate-500 hover:text-white cursor-pointer transition-colors active:rotate-180" />
        <div className="mt-auto pb-4">
           <Settings className="w-5 h-5 text-slate-600 hover:text-white cursor-pointer" />
        </div>
      </div>

      {/* 📁 Extended File Explorer */}
      <div className="w-56 border-r border-slate-900 bg-[#050505]/40 p-4 flex flex-col overflow-y-auto shrink-0">
        <div className="flex items-center justify-between mb-4 px-2">
           <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Workspace</span>
           <button onClick={handleCreateFile} className="w-6 h-6 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 flex items-center justify-center transition-colors">
              <Plus className="w-4 h-4" />
           </button>
        </div>
        <div className="space-y-1">
          {files.map((file, i) => (
            <button 
              key={i} 
              onClick={() => !file.isDirectory && handleSelectFile(file.path)}
              className={`w-full text-left px-3 py-2 rounded-lg flex items-center gap-3 text-xs font-bold transition-all ${
                activeFile === file.path 
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' 
                  : 'text-slate-400 hover:bg-[#050505] hover:text-white'
              }`}
            >
              {file.isDirectory ? <Folder className="w-4 h-4 text-emerald-400 shrink-0" /> : <FileIcon className="w-4 h-4 text-indigo-400 shrink-0" />}
              <span className="truncate">{file.name}</span>
            </button>
          ))}
          {files.length === 0 && (
            <div className="text-xs text-slate-600 font-medium px-2 italic">Workspace is empty.</div>
          )}
        </div>
      </div>

      {/* 💻 Main Editor Space */}
      <div className="flex-1 flex flex-col relative overflow-hidden">
        <div className="h-12 border-b border-slate-900 flex items-center px-6 justify-between bg-[#050505]/60 transition-all z-10">
          <div className="flex items-center gap-6">
             <div className="flex items-center gap-2">
                <Code2 className="w-4 h-4 text-indigo-400" />
                <span className="text-xs font-bold text-slate-300">{activeFile || 'No file selected'}</span>
             </div>
             {activeFile && (
               <>
                 <div className="h-4 w-[1px] bg-slate-800"></div>
                 <div className="flex gap-4">
                    <span className="text-[10px] font-bold text-slate-600 uppercase hover:text-slate-300 cursor-pointer transition-colors">Terminal</span>
                    <span className="text-[10px] font-bold text-slate-600 uppercase hover:text-slate-300 cursor-pointer transition-colors">Logs</span>
                 </div>
               </>
             )}
          </div>
          {activeFile && (
            <div className="flex gap-2">
               <button 
                 onClick={() => handleSaveFile(activeFile, fileContent)}
                 disabled={isExecuting}
                 className="flex items-center gap-2 px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-all text-[10px] font-black uppercase text-white shadow-lg shadow-indigo-500/10 active:scale-95 disabled:opacity-50"
               >
                  <Save className="w-3 h-3" /> Save
               </button>
               <button 
                 onClick={handleDeleteFile}
                 disabled={isExecuting}
                 className="flex items-center gap-2 px-3 py-1.5 bg-red-600/10 hover:bg-red-600/20 text-red-400 border border-red-600/20 hover:border-red-600/40 rounded-lg transition-all text-[10px] font-black uppercase active:scale-95 disabled:opacity-50"
               >
                  <Trash2 className="w-3 h-3" />
               </button>
            </div>
          )}
        </div>

        <div className="flex-1 bg-[#050505] relative">
          {activeFile ? (
             <Editor
               height="100%"
               defaultLanguage="javascript"
               value={fileContent}
               onChange={setFileContent}
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
          ) : (
             <div className="h-full flex flex-col items-center justify-center opacity-30 text-center">
               <Code2 className="w-16 h-16 mb-4 text-indigo-400" />
               <p className="font-bold text-sm text-white uppercase tracking-widest">Code IDE Module</p>
               <p className="text-xs font-medium text-slate-400 mt-2">Select a file from the workspace to begin.</p>
             </div>
          )}
        </div>

        {/* 📟 Terminal Drawer */}
        <div className="h-40 border-t border-slate-900 bg-[#050505] font-mono text-[11px] flex flex-col shadow-2xl relative z-10">
           <div className="flex items-center gap-2 h-8 px-4 bg-[#050505]/50 border-b border-slate-900 text-indigo-400 font-bold opacity-60 shrink-0">
              <Terminal className="w-3 h-3" /> AG_DEBUG_CONSOLE_v1
           </div>
           <div className="flex-1 p-4 space-y-1.5 overflow-y-auto custom-scrollbar text-slate-500">
             {logs.map((log, i) => (
                <div key={i} className={`flex gap-3 ${log.type === 'command' ? 'text-indigo-400 font-bold' : log.type === 'success' ? 'text-emerald-400' : log.type === 'error' ? 'text-red-400' : 'text-slate-400'}`}>
                  <span className="opacity-30 shrink-0">[{new Date().toLocaleTimeString([], { hour12: false })}]</span>
                  <span className="opacity-50">{log.type === 'command' ? '>' : '$'}</span>
                  <span className="break-all">{log.msg}</span>
                </div>
              ))}
              <div ref={logEndRef} />
           </div>
        </div>
      </div>

      {/* 🧬 Antigravity-Style AI Sidebar */}
      <div className="w-96 border-l border-slate-900 flex flex-col bg-[#050505]/40 backdrop-blur-2xl relative shadow-[-20px_0px_50px_rgba(0,0,0,0.5)] z-20 overflow-hidden shrink-0">
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
           <div className="absolute top-[-10%] right-[-10%] w-full h-full bg-indigo-500/5 blur-[80px] rounded-full"></div>
        </div>

        <div className="p-6 border-b border-slate-900/60 flex items-center justify-between shrink-0">
           <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center border border-indigo-400/20 shadow-lg shadow-indigo-500/10">
                 <Sparkles className="w-4 h-4 text-white" />
              </div>
              <div>
                 <h4 className="text-xs font-black uppercase text-white">Code IDE Copilot</h4>
                 <p className="text-[9px] uppercase font-black tracking-widest text-indigo-500">System Controller</p>
              </div>
           </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
           {aiChat.map((msg, i) => (
              <div key={i} className={`flex gap-3 ${msg.role === 'assistant' ? 'flex-col' : 'flex-row-reverse'}`}>
                 <div className={`p-4 rounded-xl text-[13px] leading-relaxed border ${
                    msg.role === 'assistant' 
                    ? 'bg-[#050505]/50 border-white/5 text-slate-300 rounded-tl-none font-medium' 
                    : 'bg-indigo-600 border-indigo-500 text-white rounded-tr-none shadow-lg shadow-indigo-600/20'
                 }`}>
                    {msg.loading ? <span className="animate-pulse">Synthesizing...</span> : msg.text}
                 </div>
              </div>
           ))}
           <div ref={chatEndRef} />
        </div>

        <div className="p-4 border-t border-slate-900 shrink-0">
           <div className="bg-[#050505]/60 border border-white/5 rounded-xl p-2 flex items-center gap-2 focus-within:border-indigo-500/50 transition-all shadow-inner">
              <input 
                placeholder="Ask AI to modify this code..." 
                className="flex-1 bg-transparent text-xs outline-none px-3 py-1 font-medium text-slate-300 placeholder:text-slate-600"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSendAI()}
              />
              <button 
                onClick={handleSendAI}
                disabled={!input.trim()}
                className="p-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:hover:bg-indigo-600 rounded-xl transition-all shadow-lg shadow-indigo-600/20 active:scale-95"
              >
                 <ChevronRight className="w-4 h-4 text-white" />
              </button>
           </div>
           <div className="mt-4 flex items-center gap-4 px-2">
              <div className="flex items-center gap-1.5 opacity-40">
                 <Cpu className="w-3 h-3" />
                 <span className="text-[9px] font-black uppercase tracking-tighter">Local WebGPU</span>
              </div>
              <div className="flex items-center gap-1.5 opacity-40">
                 <Zap className="w-3 h-3" />
                 <span className="text-[9px] font-black uppercase tracking-tighter">Auto-Save ON</span>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default CodingModule;
