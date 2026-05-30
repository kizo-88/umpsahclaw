import React, { useState } from 'react';
import { Server, Plus, Terminal, Play, Square, Trash2, HardDrive, UploadCloud, FileCode2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Mock initial VPS instances
const INITIAL_VPS = [
  { id: 'vps-1', name: 'Production Node Alpha', ip: '192.168.1.100', status: 'running', os: 'Ubuntu 22.04 LTS', files: ['deploy.sh', 'server.js'] },
  { id: 'vps-2', name: 'Agent Sandbox', ip: '192.168.1.105', status: 'stopped', os: 'Debian 11', files: [] }
];

export default function VPSModule() {
  const [instances, setInstances] = useState(INITIAL_VPS);
  const [selectedInstance, setSelectedInstance] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newVpsName, setNewVpsName] = useState('');

  const handleCreate = () => {
    if (!newVpsName) return;
    const newInstance = {
      id: `vps-${Date.now()}`,
      name: newVpsName,
      ip: `10.0.0.${Math.floor(Math.random() * 255)}`,
      status: 'stopped',
      os: 'Ubuntu 22.04 LTS',
      files: []
    };
    setInstances([...instances, newInstance]);
    setNewVpsName('');
    setShowCreate(false);
  };

  const handleDelete = (id) => {
    setInstances(instances.filter(i => i.id !== id));
    if (selectedInstance?.id === id) setSelectedInstance(null);
  };

  const handleToggleStatus = (id) => {
    setInstances(instances.map(i => {
      if (i.id === id) {
        return { ...i, status: i.status === 'running' ? 'stopped' : 'running' };
      }
      return i;
    }));
  };

  const [uploading, setUploading] = useState(false);
  const fileInputRef = React.useRef(null);

  const handleFileUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('instanceId', selectedInstance.id);

    try {
      const response = await fetch('http://localhost:3002/api/vps/upload', {
        method: 'POST',
        body: formData
      });
      const data = await response.json();

      if (data.success) {
        setInstances(instances.map(i => {
          if (i.id === selectedInstance.id) {
            // Check if file already exists in UI array
            if (i.files.includes(data.filename)) return i;
            const updated = { ...i, files: [...i.files, data.filename] };
            setSelectedInstance(updated); // Update selected view
            return updated;
          }
          return i;
        }));
      } else {
        alert("Upload failed: " + data.error);
      }
    } catch (err) {
      console.error('File upload error:', err);
      alert('Upload failed. Backend might be down.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="h-full flex p-8 gap-8 max-w-7xl mx-auto w-full">
      {/* Sidebar List */}
      <div className="w-1/3 flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center">
              <Server className="w-6 h-6 text-rose-400" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white uppercase">Compute VPS</h2>
              <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">Instance Manager</p>
            </div>
          </div>
          <button onClick={() => setShowCreate(true)} className="w-10 h-10 rounded-full bg-indigo-600 hover:bg-indigo-500 flex items-center justify-center text-white transition-colors">
            <Plus className="w-5 h-5" />
          </button>
        </div>

        {showCreate && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex gap-2">
            <input 
              type="text" 
              placeholder="Instance Name..." 
              value={newVpsName}
              onChange={(e) => setNewVpsName(e.target.value)}
              className="flex-1 bg-black/50 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
            />
            <button onClick={handleCreate} className="px-4 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-xs font-bold text-white uppercase tracking-wider">Create</button>
          </motion.div>
        )}

        <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-3 pr-2">
          {instances.map(inst => (
            <div 
              key={inst.id} 
              onClick={() => setSelectedInstance(inst)}
              className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${selectedInstance?.id === inst.id ? 'bg-indigo-900/20 border-indigo-500/50 shadow-[0_0_15px_rgba(99,102,241,0.1)]' : 'bg-[#050505] border-white/5 hover:border-white/20'}`}
            >
              <div>
                <h3 className="text-white font-bold">{inst.name}</h3>
                <p className="text-slate-500 text-xs font-mono mt-1">{inst.ip}</p>
              </div>
              <div className={`w-3 h-3 rounded-full shadow-lg ${inst.status === 'running' ? 'bg-emerald-500 shadow-emerald-500/50' : 'bg-rose-500 shadow-rose-500/50'}`}></div>
            </div>
          ))}
          {instances.length === 0 && <p className="text-slate-600 text-sm text-center mt-10">No instances found.</p>}
        </div>
      </div>

      {/* Main Detail View */}
      <div className="flex-1 bg-[#050505]/60 backdrop-blur-3xl border border-white/5 rounded-3xl p-8 relative overflow-hidden shadow-2xl flex flex-col">
        {!selectedInstance ? (
          <div className="m-auto text-center opacity-50 flex flex-col items-center">
            <HardDrive className="w-20 h-20 text-slate-600 mb-6" />
            <h3 className="text-2xl font-black text-white uppercase tracking-tight">No Instance Selected</h3>
            <p className="text-slate-400 mt-2">Select a VPS from the left to manage it.</p>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div key={selectedInstance.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="flex flex-col h-full">
              {/* Header */}
              <div className="flex items-start justify-between border-b border-white/10 pb-6 mb-6">
                <div>
                  <h2 className="text-3xl font-black text-white tracking-tight">{selectedInstance.name}</h2>
                  <div className="flex gap-4 mt-2">
                    <span className="text-slate-400 text-sm font-mono bg-white/5 px-2 py-1 rounded">{selectedInstance.ip}</span>
                    <span className="text-slate-400 text-sm font-mono bg-white/5 px-2 py-1 rounded">{selectedInstance.os}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => handleToggleStatus(selectedInstance.id)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest flex items-center gap-2 transition-all ${selectedInstance.status === 'running' ? 'bg-rose-500/20 text-rose-400 hover:bg-rose-500/30' : 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'}`}
                  >
                    {selectedInstance.status === 'running' ? <><Square className="w-4 h-4" /> Stop</> : <><Play className="w-4 h-4" /> Start</>}
                  </button>
                  <button onClick={() => handleDelete(selectedInstance.id)} className="w-10 h-10 rounded-xl bg-red-500/10 text-red-500 flex items-center justify-center hover:bg-red-500/20 transition-colors">
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Console Mock */}
              <div className="bg-black border border-slate-800 rounded-2xl h-48 mb-6 p-4 font-mono text-xs overflow-y-auto text-emerald-400">
                <p className="text-slate-500 mb-2">Last login: {new Date().toUTCString()} from 192.168.1.1</p>
                {selectedInstance.status === 'running' ? (
                  <>
                    <p>root@{selectedInstance.id.replace('-', '')}:~# systemctl status</p>
                    <p>● System is running normally.</p>
                    <p className="animate-pulse mt-2">_</p>
                  </>
                ) : (
                  <p className="text-rose-500">Instance is stopped. Start instance to access terminal.</p>
                )}
              </div>

              {/* Files / Scripts */}
              <div className="flex-1 flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Terminal className="w-5 h-5 text-indigo-400" /> Attached Scripts & Files
                  </h3>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleFileChange} 
                    className="hidden" 
                  />
                  <button 
                    onClick={handleFileUploadClick} 
                    disabled={uploading}
                    className="px-4 py-2 rounded-lg bg-indigo-600/20 text-indigo-400 text-xs font-bold uppercase tracking-widest hover:bg-indigo-600/30 transition-colors flex items-center gap-2 disabled:opacity-50"
                  >
                    <UploadCloud className="w-4 h-4" /> {uploading ? 'Uploading...' : 'Upload'}
                  </button>
                </div>
                
                <div className="flex-1 bg-white/5 border border-white/5 rounded-2xl p-4 grid grid-cols-2 md:grid-cols-3 gap-4 content-start">
                  {selectedInstance.files.map((file, idx) => (
                    <div key={idx} className="bg-black/40 border border-slate-700/50 rounded-xl p-3 flex items-center gap-3 hover:border-indigo-500/50 transition-colors cursor-pointer">
                      <FileCode2 className="w-8 h-8 text-indigo-400" />
                      <span className="text-sm font-mono text-slate-300 truncate">{file}</span>
                    </div>
                  ))}
                  {selectedInstance.files.length === 0 && (
                    <div className="col-span-full text-center text-slate-500 text-sm py-10">No scripts deployed to this instance.</div>
                  )}
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
