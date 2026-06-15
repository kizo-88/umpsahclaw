import React, { useState, useEffect, useRef } from 'react';
import { API_BASE } from '../../config';
import { motion } from 'framer-motion';
import { Cpu, HardDrive, Terminal, Folder, File, Trash, FolderPlus, FilePlus, XCircle, Activity, ArrowRight } from 'lucide-react';

const PCControlModule = () => {
  const [stats, setStats] = useState(null);
  const [processes, setProcesses] = useState([]);
  
  // File Explorer State
  const [cwd, setCwd] = useState('C:\\');
  const [files, setFiles] = useState([]);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFileName, setNewFileName] = useState('');

  // Terminal State
  const [termOutput, setTermOutput] = useState([]);
  const [termInput, setTermInput] = useState('');
  const bottomRef = useRef(null);

  const fetchStats = async () => {
    try {
      const res = await fetch(API_BASE + '/api/pc/stats');
      const data = await res.json();
      setStats(data);
    } catch(e) {}
  };

  const fetchProcesses = async () => {
    try {
      const res = await fetch(API_BASE + '/api/pc/processes');
      const data = await res.json();
      setProcesses(data.processes || []);
    } catch(e) {}
  };

  const killProcess = async (pid) => {
    try {
      await fetch(API_BASE + '/api/pc/kill', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ pid })
      });
      fetchProcesses();
    } catch(e) {}
  };

  const fetchFiles = async (dir) => {
    try {
      const res = await fetch(API_BASE + '/api/fs/list', {
        method: 'POST', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ folderPath: dir })
      });
      const data = await res.json();
      setFiles(data.files || []);
      setCwd(dir);
    } catch(e) {}
  };

  const handleMkdir = async (e) => {
    e.preventDefault();
    if(!newFolderName) return;
    try {
      await fetch(API_BASE + '/api/fs/mkdir', {
        method: 'POST', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ filePath: cwd + '\\\\' + newFolderName })
      });
      setNewFolderName('');
      fetchFiles(cwd);
    } catch(e) {}
  };

  const handleMkfile = async (e) => {
    e.preventDefault();
    if(!newFileName) return;
    try {
      await fetch(API_BASE + '/api/fs/write', {
        method: 'POST', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ filePath: cwd + '\\\\' + newFileName, content: '' })
      });
      setNewFileName('');
      fetchFiles(cwd);
    } catch(e) {}
  };

  const handleDelete = async (file) => {
    try {
      await fetch(API_BASE + '/api/fs/delete', {
        method: 'POST', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ filePath: cwd + '\\\\' + file.name })
      });
      fetchFiles(cwd);
    } catch(e) {}
  };

  const runCommand = async (e) => {
    e.preventDefault();
    if(!termInput) return;
    const cmd = termInput;
    setTermInput('');
    setTermOutput(prev => [...prev, `C:\\> ${cmd}`]);
    try {
      const res = await fetch(API_BASE + '/api/automation/bash', {
        method: 'POST', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ command: cmd })
      });
      const data = await res.json();
      setTermOutput(prev => [...prev, data.output]);
    } catch(e) {
      setTermOutput(prev => [...prev, "Error executing command."]);
    }
  };

  useEffect(() => {
    fetchStats();
    fetchProcesses();
    fetchFiles(cwd);
    const interval = setInterval(() => {
      fetchStats();
      fetchProcesses();
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if(bottomRef.current) bottomRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [termOutput]);

  const memPercent = stats ? ((stats.memory.used / stats.memory.total) * 100).toFixed(1) : 0;

  return (
    <div className="h-full flex flex-col p-6 gap-6 overflow-y-auto custom-scrollbar font-inter">
      
      {/* Stats Row */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-6"
      >
        <div className="bg-[#0a0a0a] border border-white/5 rounded-xl p-6 flex items-center gap-4 shadow-2xl shadow-black/50">
          <div className="w-12 h-12 rounded-xl bg-blue-500/20 border border-blue-500/30 text-blue-400 flex items-center justify-center">
            <Cpu />
          </div>
          <div>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">CPU Threads</p>
            <p className="text-2xl font-black text-white">{stats ? stats.cpu.length : 0}</p>
          </div>
        </div>
        
        <div className="bg-[#0a0a0a] border border-white/5 rounded-xl p-6 flex items-center gap-4 shadow-2xl shadow-black/50">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center">
            <Activity />
          </div>
          <div className="flex-1">
            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Memory</p>
            <div className="flex justify-between items-end mb-1">
              <p className="text-2xl font-black text-white">{memPercent}%</p>
            </div>
            <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 transition-all duration-1000" style={{ width: `${memPercent}%` }} />
            </div>
          </div>
        </div>

        <div className="bg-[#0a0a0a] border border-white/5 rounded-xl p-6 flex items-center gap-4 shadow-2xl shadow-black/50">
          <div className="w-12 h-12 rounded-xl bg-purple-500/20 border border-purple-500/30 text-purple-400 flex items-center justify-center">
            <HardDrive />
          </div>
          <div>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">OS Platform</p>
            <p className="text-2xl font-black text-white uppercase">{stats?.platform} {stats?.release}</p>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 min-h-0">
        
        {/* File Explorer */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
          className="bg-[#0a0a0a] border border-white/5 rounded-xl flex flex-col overflow-hidden shadow-2xl shadow-black/50"
        >
          <div className="p-4 border-b border-white/5 bg-[#050505] flex justify-between items-center">
            <h3 className="text-sm font-bold uppercase tracking-widest text-slate-300 flex items-center gap-2">
              <Folder className="w-4 h-4 text-emerald-400" />
              File Manager
            </h3>
            <div className="flex gap-2">
              <form onSubmit={handleMkdir} className="flex bg-[#050505] border border-white/5 rounded overflow-hidden">
                <input value={newFolderName} onChange={e=>setNewFolderName(e.target.value)} placeholder="New Folder" className="bg-transparent text-xs px-3 w-28 outline-none text-white placeholder:text-slate-600" />
                <button type="submit" className="p-2 bg-slate-800 hover:bg-slate-700 transition-colors"><FolderPlus className="w-4 h-4 text-emerald-400"/></button>
              </form>
              <form onSubmit={handleMkfile} className="flex bg-[#050505] border border-white/5 rounded overflow-hidden">
                <input value={newFileName} onChange={e=>setNewFileName(e.target.value)} placeholder="New File" className="bg-transparent text-xs px-3 w-28 outline-none text-white placeholder:text-slate-600" />
                <button type="submit" className="p-2 bg-slate-800 hover:bg-slate-700 transition-colors"><FilePlus className="w-4 h-4 text-blue-400"/></button>
              </form>
            </div>
          </div>
          <div className="p-2 border-b border-white/5 bg-[#050505]/50 flex items-center gap-2">
             <input className="w-full bg-[#050505] border border-white/5 text-xs p-2 rounded outline-none text-slate-300 focus:border-indigo-500/50 transition-colors" value={cwd} onChange={e => setCwd(e.target.value)} onKeyDown={e => e.key === 'Enter' && fetchFiles(cwd)} />
             <button onClick={() => fetchFiles(cwd)} className="p-2 bg-indigo-600 rounded hover:bg-indigo-500 text-white transition-colors"><ArrowRight className="w-4 h-4" /></button>
          </div>
          <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
            {files.length === 0 && <div className="p-4 text-center text-slate-500 text-xs">Directory is empty or inaccessible.</div>}
            {files.map(f => (
              <div key={f.name} className="flex justify-between items-center p-2 hover:bg-slate-800 rounded-lg group transition-colors">
                <div className="flex items-center gap-3 cursor-pointer" onClick={() => f.isDirectory && fetchFiles(cwd + '\\\\' + f.name)}>
                  {f.isDirectory ? <Folder className="w-5 h-5 text-yellow-500" /> : <File className="w-5 h-5 text-indigo-400" />}
                  <span className="text-sm text-slate-300 font-medium">{f.name}</span>
                </div>
                <button onClick={() => handleDelete(f)} className="opacity-0 group-hover:opacity-100 p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-md transition-all">
                  <Trash className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </motion.div>

        <div className="flex flex-col gap-6 h-full overflow-hidden">
          
          {/* Task Manager */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
            className="bg-[#0a0a0a] border border-white/5 rounded-xl flex flex-col flex-1 overflow-hidden shadow-2xl shadow-black/50"
          >
            <div className="p-4 border-b border-white/5 bg-[#050505]">
              <h3 className="text-sm font-bold uppercase tracking-widest text-slate-300 flex items-center gap-2">
                <Activity className="w-4 h-4 text-purple-400" />
                Process Manager
              </h3>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#050505]/50 sticky top-0 backdrop-blur-md">
                  <tr className="text-slate-500 uppercase tracking-widest border-b border-white/5">
                    <th className="p-3 font-bold">Name</th>
                    <th className="p-3 font-bold">PID</th>
                    <th className="p-3 font-bold">Mem (KB)</th>
                    <th className="p-3 font-bold text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {processes.slice(0,100).map((p, i) => (
                    <tr key={i} className="border-b border-white/5/50 hover:bg-slate-800/50 transition-colors">
                      <td className="p-3 text-slate-300 truncate max-w-[150px] font-medium">{p.name}</td>
                      <td className="p-3 text-slate-500 font-mono">{p.pid}</td>
                      <td className="p-3 text-slate-400">{p.mem}</td>
                      <td className="p-3 text-right">
                        <button onClick={() => killProcess(p.pid)} className="text-red-400 bg-red-500/10 hover:bg-red-500/20 p-1.5 rounded-md transition-colors"><XCircle className="w-4 h-4" /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>

          {/* Web Terminal */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="bg-[#050505] border border-white/5 rounded-xl flex flex-col h-1/2 overflow-hidden shadow-2xl shadow-black/50 font-mono"
          >
            <div className="p-3 border-b border-white/5 bg-black flex items-center gap-2">
              <Terminal className="w-4 h-4 text-emerald-400" />
              <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">Web Terminal</h3>
            </div>
            <div className="flex-1 overflow-y-auto p-4 text-xs text-emerald-400 whitespace-pre-wrap custom-scrollbar leading-relaxed">
              <div className="mb-4 text-emerald-600">UMPSA Local System Terminal [Version 1.0.0]<br/>(c) UMPSA Holdings. All rights reserved.</div>
              {termOutput.map((line, i) => (
                <div key={i} className="mb-1">{line}</div>
              ))}
              <div ref={bottomRef} />
            </div>
            <form onSubmit={runCommand} className="border-t border-white/5 p-3 flex bg-black items-center">
              <span className="text-emerald-500 font-bold mr-3">{'>'}</span>
              <input 
                value={termInput} 
                onChange={e => setTermInput(e.target.value)} 
                className="w-full bg-transparent outline-none text-emerald-400 text-sm placeholder:text-emerald-900" 
                placeholder="Enter command..."
                spellCheck="false"
              />
            </form>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default PCControlModule;
