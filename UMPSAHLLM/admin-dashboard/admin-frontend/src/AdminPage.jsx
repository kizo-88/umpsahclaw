import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, Activity, Settings, ShieldCheck, HeartPulse, HardDrive, Trash2, Edit3, Plus } from 'lucide-react';

const AdminPage = () => {
  const [activeTab, setActiveTab] = useState('users');
  const [users, setUsers] = useState([
    { id: 1, email: 'admin@umpsaholdings.my', roles: ['Admin', 'Chat', 'Coding'], status: 'Active' },
    { id: 2, email: 'staff@umpsaholdings.my', roles: ['Chat'], status: 'Active' },
  ]);

  const [services, setServices] = useState([
    { name: 'Ollama (GPU)', status: 'Healthy', latency: '45ms', vram: '4.2GB / 12GB' },
    { name: 'PicoClaw Gateway', status: 'Healthy', latency: '12ms', vram: 'N/A' },
    { name: 'Cloudflare Tunnel', status: 'Active', latency: '120ms', vram: 'N/A' },
  ]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-8 font-inter">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="max-w-7xl mx-auto uppercase tracking-tighter text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 to-emerald-500 mb-12">
        UMPT.MY ADMIN COMMAND
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Sidebar Nav */}
        <div className="space-y-4">
          <button onClick={() => setActiveTab('users')} className={`w-full flex items-center gap-3 p-4 rounded-xl transition-all ${activeTab === 'users' ? 'bg-indigo-600 shadow-lg shadow-indigo-500/20' : 'bg-slate-900 hover:bg-slate-800'}`}>
            <Users className="w-5 h-5" /> User Management
          </button>
          <button onClick={() => setActiveTab('health')} className={`w-full flex items-center gap-3 p-4 rounded-xl transition-all ${activeTab === 'health' ? 'bg-indigo-600 shadow-lg shadow-indigo-500/20' : 'bg-slate-900 hover:bg-slate-800'}`}>
            <HeartPulse className="w-5 h-5" /> AI Health & Services
          </button>
          <button onClick={() => setActiveTab('logs')} className={`w-full flex items-center gap-3 p-4 rounded-xl transition-all ${activeTab === 'logs' ? 'bg-indigo-600 shadow-lg shadow-indigo-500/20' : 'bg-slate-900 hover:bg-slate-800'}`}>
            <Activity className="w-5 h-5" /> Activity Logs
          </button>
        </div>

        {/* Content Area */}
        <div className="lg:col-span-3 space-y-6">
          {activeTab === 'users' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-slate-900/50 border border-slate-800 rounded-3xl p-6 backdrop-blur-xl">
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-xl font-semibold">Authorized Users (@umpsaholdings.my)</h3>
                <button className="bg-emerald-600 px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-emerald-500 transition-colors">
                  <Plus className="w-4 h-4" /> Add User
                </button>
              </div>
              <table className="w-full text-left">
                <thead>
                  <tr className="text-slate-500 border-b border-slate-800">
                    <th className="pb-4 px-2">EMAIL</th>
                    <th className="pb-4 px-2">PERMISSIONS</th>
                    <th className="pb-4 px-2">STATUS</th>
                    <th className="pb-4 px-2">ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                      <td className="py-4 px-2 font-mono text-indigo-400">{u.email}</td>
                      <td className="py-4 px-2 flex gap-2">
                        {u.roles.map(r => <span key={r} className="text-[10px] bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 px-2 py-1 rounded-md">{r}</span>)}
                      </td>
                      <td className="py-4 px-2">
                         <span className="flex items-center gap-2">
                           <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>
                           {u.status}
                         </span>
                      </td>
                      <td className="py-4 px-2 flex gap-4">
                        <button className="text-slate-400 hover:text-white"><Edit3 className="w-4 h-4" /></button>
                        <button className="text-pink-500/80 hover:text-pink-400"><Trash2 className="w-4 h-4" /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </motion.div>
          )}

          {activeTab === 'health' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               {services.map(s => (
                 <motion.div key={s.name} whileHover={{ scale: 1.02 }} className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl">
                    <div className="flex justify-between items-start mb-4">
                      <h4 className="font-bold text-slate-300 uppercase letter tracking-wider">{s.name}</h4>
                      <div className="bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded text-[10px] border border-emerald-500/20">ONLINE</div>
                    </div>
                    <div className="space-y-3">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-500">Latency:</span>
                        <span className="font-mono text-emerald-500">{s.latency}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-500">Resources:</span>
                        <span className="font-mono text-indigo-400">{s.vram}</span>
                      </div>
                      <div className="w-full bg-slate-800 h-1.5 rounded-full mt-4 overflow-hidden">
                        <motion.div initial={{ width: 0 }} animate={{ width: s.name.includes('Ollama') ? '35%' : '100%' }} className="bg-gradient-to-r from-indigo-500 to-emerald-500 h-full"></motion.div>
                      </div>
                    </div>
                 </motion.div>
               ))}
               
               {/* RTX 3060 Live Monitor */}
               <div className="bg-slate-900/50 border border-indigo-500/20 p-6 rounded-2xl col-span-full shadow-lg shadow-indigo-500/5">
                 <div className="flex items-center gap-3 mb-6">
                    <ShieldCheck className="text-indigo-400 w-6 h-6" />
                    <h3 className="text-lg font-bold">RTX 3060 INFRASTRUCTURE</h3>
                 </div>
                 <div className="grid grid-cols-3 gap-4 text-center">
                    <div className="p-4 bg-slate-800/50 rounded-xl">
                      <p className="text-[10px] text-slate-500 uppercase mb-1">Inference Engine</p>
                      <p className="font-mono text-indigo-300">OLLAMA v0.4.1</p>
                    </div>
                    <div className="p-4 bg-slate-800/50 rounded-xl">
                      <p className="text-[10px] text-slate-500 uppercase mb-1">Active Model</p>
                      <p className="font-mono text-indigo-300">LLAMA-3.1-8B</p>
                    </div>
                    <div className="p-4 bg-slate-800/50 rounded-xl">
                      <p className="text-[10px] text-slate-500 uppercase mb-1">Temp (C)</p>
                      <p className="font-mono text-indigo-300">54°C</p>
                    </div>
                 </div>
               </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminPage;
