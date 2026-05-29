import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Server, 
  Plus, 
  Search, 
  MoreVertical, 
  Terminal, 
  Activity, 
  Database, 
  Cpu, 
  HardDrive, 
  Play, 
  Square, 
  RotateCcw, 
  Trash2, 
  ExternalLink,
  Shield,
  Zap
} from 'lucide-react';

const VPSModule = () => {
  const [vpsList, setVpsList] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedVps, setSelectedVps] = useState(null);
  const [loading, setLoading] = useState(true);

  // Provisioning Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newVpsName, setNewVpsName] = useState('');
  const [newVpsImage, setNewVpsImage] = useState('nginx:alpine');
  const [isCreating, setIsCreating] = useState(false);

  const fetchVPS = async () => {
    try {
      const res = await fetch('http://localhost:3002/api/vps/list', {
        headers: { 'ngrok-skip-browser-warning': 'true' }
      });
      const data = await res.json();
      setVpsList(data);
      if (selectedVps) {
        const updated = data.find(v => v.id === selectedVps.id);
        setSelectedVps(updated);
      }
    } catch (e) {
      console.error("Failed to fetch VPS", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVPS();
    const interval = setInterval(fetchVPS, 5000);
    return () => clearInterval(interval);
  }, [selectedVps]);

  const filteredVps = vpsList.filter(v => v.name.toLowerCase().includes(search.toLowerCase()));

  const toggleStatus = async (id) => {
    try {
      await fetch('http://localhost:3002/api/vps/toggle', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true'
        },
        body: JSON.stringify({ id })
      });
      fetchVPS();
    } catch (e) {
      console.error("Toggle failed", e);
    }
  };

  const handleCreate = async () => {
    if (!newVpsName) return;
    setIsCreating(true);
    try {
      await fetch('http://localhost:3002/api/vps/create', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true'
        },
        body: JSON.stringify({ name: newVpsName, image: newVpsImage })
      });
      setShowCreateModal(false);
      setNewVpsName('');
      setNewVpsImage('nginx:alpine');
      fetchVPS(); // Refresh list to show new VPS
    } catch (e) {
      console.error("Failed to provision", e);
      alert("Provisioning failed. Check NAS logs.");
    } finally {
      setIsCreating(false);
    }
  };


  return (
    <div className="h-full p-8 flex flex-col gap-8 bg-slate-950/20">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Instances', value: vpsList.length, icon: Server, color: 'text-indigo-400' },
          { label: 'Active Memory', value: '1.6 GB', icon: Activity, color: 'text-emerald-400' },
          { label: 'CPU Cluster Load', value: '14%', icon: Cpu, color: 'text-amber-400' },
          { label: 'NAS Storage', value: '42.8 GB', icon: HardDrive, color: 'text-purple-400' },
        ].map((stat, i) => (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            key={stat.label}
            className="bg-slate-900/40 border border-slate-800 p-5 rounded-3xl backdrop-blur-xl"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">{stat.label}</span>
              <stat.icon className={`w-4 h-4 ${stat.color}`} />
            </div>
            <p className="text-2xl font-black text-white">{stat.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex gap-8 min-h-0">
        {/* VPS List */}
        <div className="w-full lg:w-2/3 flex flex-col gap-4">
          <div className="flex items-center justify-between gap-4 mb-2">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input 
                type="text" 
                placeholder="Search NAS Instances..." 
                className="w-full bg-slate-900/40 border border-slate-800 rounded-2xl py-3 pl-12 pr-4 text-sm focus:border-indigo-500/50 outline-none transition-all"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <button 
              onClick={() => setShowCreateModal(true)}
              className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-all active:scale-95 shadow-xl shadow-indigo-600/20"
            >
              <Plus className="w-4 h-4" />
              Provision New VPS
            </button>
          </div>

          {/* Create VPS Modal */}
          <AnimatePresence>
            {showCreateModal && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
              >
                <motion.div 
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.95, opacity: 0 }}
                  className="bg-slate-900 border border-slate-800 p-8 rounded-3xl w-full max-w-md shadow-2xl"
                >
                  <h2 className="text-xl font-black text-white mb-6">Provision Compute Instance</h2>
                  
                  <div className="space-y-4 mb-8">
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-500 mb-2 tracking-widest">Instance Name</label>
                      <input 
                        type="text" 
                        placeholder="e.g. Analytics Engine" 
                        value={newVpsName}
                        onChange={e => setNewVpsName(e.target.value)}
                        className="w-full bg-slate-950/50 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:border-indigo-500 outline-none transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-500 mb-2 tracking-widest">Base Image</label>
                      <select 
                        value={newVpsImage}
                        onChange={e => setNewVpsImage(e.target.value)}
                        className="w-full bg-slate-950/50 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:border-indigo-500 outline-none transition-all appearance-none"
                      >
                        <option value="nginx:alpine">Web Server (Nginx Alpine)</option>
                        <option value="node:18-alpine">Node.js 18 Microservice</option>
                        <option value="python:3.10-slim">Python 3.10 Data Worker</option>
                      </select>
                    </div>
                    <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
                      <p className="text-[10px] font-bold text-indigo-400">Instances are automatically limited to 0.5 CPU cores and 512MB RAM via Docker Engine.</p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button 
                      onClick={() => setShowCreateModal(false)}
                      className="flex-1 py-3 rounded-xl border border-slate-700 text-slate-400 text-xs font-black uppercase tracking-widest hover:bg-slate-800 transition-all"
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={handleCreate}
                      disabled={isCreating || !newVpsName}
                      className="flex-1 py-3 rounded-xl bg-indigo-600 text-white text-xs font-black uppercase tracking-widest hover:bg-indigo-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
                    >
                      {isCreating ? <Zap className="w-4 h-4 animate-pulse" /> : <Play className="w-4 h-4" />}
                      {isCreating ? 'Deploying...' : 'Deploy'}
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>


          <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3">
            <AnimatePresence mode="popLayout">
              {filteredVps.map((vps) => (
                <motion.div
                  layout
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  key={vps.id}
                  onClick={() => setSelectedVps(vps)}
                  className={`group p-4 rounded-2xl border transition-all cursor-pointer ${
                    selectedVps?.id === vps.id 
                    ? 'bg-indigo-600/10 border-indigo-500/50 shadow-lg shadow-indigo-500/5' 
                    : 'bg-slate-900/40 border-slate-800/50 hover:border-slate-700 hover:bg-slate-900/60'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center border ${
                      vps.status === 'running' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-slate-800 border-slate-700 text-slate-500'
                    }`}>
                      <Server className="w-6 h-6" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        {vps.name}
                        <span className="text-[9px] font-black uppercase bg-slate-800 px-1.5 py-0.5 rounded text-slate-500 tracking-tighter">{vps.type}</span>
                      </h3>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-[10px] text-slate-500 font-mono">{vps.ip}</span>
                        <span className="text-[10px] text-slate-600 tracking-tighter uppercase font-black italic">{vps.uptime} UPTIME</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-6 pr-4">
                      <div className="hidden md:block">
                        <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-1 text-right">CPU Usage</p>
                        <div className="w-20 bg-slate-800 h-1 rounded-full overflow-hidden">
                          <div className="bg-indigo-500 h-full" style={{ width: vps.cpu }}></div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {vps.status === 'running' ? (
                          <button onClick={(e) => { e.stopPropagation(); toggleStatus(vps.id); }} className="p-2 rounded-lg hover:bg-red-500/10 text-red-500 transition-colors">
                            <Square className="w-4 h-4 fill-current" />
                          </button>
                        ) : (
                          <button onClick={(e) => { e.stopPropagation(); toggleStatus(vps.id); }} className="p-2 rounded-lg hover:bg-emerald-500/10 text-emerald-400 transition-colors">
                            <Play className="w-4 h-4 fill-current" />
                          </button>
                        )}
                        <button className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 transition-colors">
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>

        {/* VPS Detail / Terminal Sidebar */}
        <div className="hidden lg:flex w-1/3 flex-col gap-4">
          <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 flex flex-col h-full backdrop-blur-2xl overflow-hidden">
            {selectedVps ? (
              <>
                <div className="flex items-center justify-between mb-8">
                  <h4 className="text-sm font-black uppercase text-slate-400 tracking-widest">Instance Details</h4>
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${selectedVps.status === 'running' ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`}></span>
                    <span className="text-[10px] font-black uppercase text-white">{selectedVps.status}</span>
                  </div>
                </div>

                <div className="space-y-6 flex-1">
                  <div className="flex flex-col gap-1">
                    <span className="text-[9px] font-black text-slate-600 uppercase">Internal Endpoint</span>
                    <p className="text-xs font-mono text-indigo-400 bg-slate-950/50 p-2 rounded-lg border border-slate-800/50">http://{selectedVps.ip}:3000</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-2xl bg-slate-950/40 border border-slate-800/50">
                      <Cpu className="w-4 h-4 text-indigo-500 mb-2" />
                      <p className="text-[9px] font-black text-slate-600 uppercase mb-1">CPU Load</p>
                      <p className="text-sm font-bold text-white">{selectedVps.cpu}</p>
                    </div>
                    <div className="p-4 rounded-2xl bg-slate-950/40 border border-slate-800/50">
                      <Database className="w-4 h-4 text-emerald-500 mb-2" />
                      <p className="text-[9px] font-black text-slate-600 uppercase mb-1">Mem Used</p>
                      <p className="text-sm font-bold text-white">{selectedVps.ram.split(' / ')[0]}</p>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-800">
                    <p className="text-[10px] font-black text-slate-600 uppercase mb-4 tracking-widest">Control Panel</p>
                    <div className="grid grid-cols-2 gap-2">
                      <button className="flex items-center justify-center gap-2 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold transition-all border border-slate-700 active:scale-95">
                        <RotateCcw className="w-3 h-3" /> Soft Reboot
                      </button>
                      <button className="flex items-center justify-center gap-2 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold transition-all border border-slate-700 active:scale-95">
                        <Terminal className="w-3 h-3" /> Console
                      </button>
                      <button className="flex items-center justify-center gap-2 py-3 rounded-xl bg-red-950/20 border border-red-900/50 hover:bg-red-900/30 text-red-400 text-xs font-bold transition-all active:scale-95 col-span-2">
                        <Trash2 className="w-3 h-3" /> Terminate Instance
                      </button>
                    </div>
                  </div>
                </div>

                <div className="mt-8 p-4 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 flex items-center gap-3">
                  <Shield className="w-5 h-5 text-indigo-500" />
                  <p className="text-[10px] font-bold text-indigo-400 leading-tight">This VPS is isolated in the UMPSAH NAS sandbox. Port 3000-4000 are open for internal traffic.</p>
                </div>
              </>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center opacity-40">
                <Server className="w-16 h-16 text-slate-700 mb-4 stroke-1" />
                <p className="text-sm font-bold text-slate-600">Select an instance to view telemetry and control panel</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VPSModule;
