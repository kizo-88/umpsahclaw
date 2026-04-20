import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Users, Server, ShieldCheck, HeartPulse, HardDrive, Trash2, Edit3, Plus, Cpu } from 'lucide-react';

const AdminModule = () => {
  const [activeTab, setActiveTab] = useState('health');
  const [users] = useState([
    { id: 1, email: 'admin@umpsaholdings.my', roles: ['Admin', 'Chat', 'Coding'], status: 'Active' },
    { id: 2, email: 'staff@umpsaholdings.my', roles: ['Chat'], status: 'Active' },
  ]);

  const services = [
    { name: 'Ollama (GPU)', status: 'Healthy', latency: '45ms', vram: '4.2GB / 12GB' },
    { name: 'PicoClaw Gateway', status: 'Healthy', latency: '12ms', vram: 'N/A' },
    { name: 'Cloudflare Tunnel', status: 'Active', latency: '120ms', vram: 'N/A' },
  ];

  return (
    <div className="p-8 h-full flex flex-col max-w-7xl mx-auto w-full overflow-y-auto pr-4 custom-scrollbar">
      <div className="flex justify-between items-end mb-12">
        <div>
          <h2 className="text-3xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-emerald-400">ADMIN COMMAND</h2>
          <p className="text-slate-500 font-medium">UMPT.MY Infrastructure Management</p>
        </div>
        <div className="flex gap-2">
           <button onClick={() => setActiveTab('users')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'users' ? 'bg-indigo-600' : 'bg-slate-900 border border-slate-800'}`}>USER ACCESS</button>
           <button onClick={() => setActiveTab('health')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'health' ? 'bg-indigo-600' : 'bg-slate-900 border border-slate-800'}`}>AI HEALTH</button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8">
        {activeTab === 'users' ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-slate-900/40 border border-slate-800 rounded-3xl p-8 backdrop-blur-md">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-lg font-bold">Authorized Staff (@umpsaholdings.my)</h3>
              <button className="bg-emerald-600 px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 hover:bg-emerald-500 transition-all active:scale-95 shadow-lg shadow-emerald-500/10">
                <Plus className="w-4 h-4" /> ADD OPERATOR
              </button>
            </div>
            <table className="w-full text-left">
              <thead>
                <tr className="text-slate-500 text-[10px] font-black tracking-widest uppercase border-b border-slate-800">
                  <th className="pb-4">Email</th>
                  <th className="pb-4 text-center">Permissions</th>
                  <th className="pb-4 text-center">Status</th>
                  <th className="pb-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} className="border-b border-slate-800/50 hover:bg-slate-800/20 transition-colors group">
                    <td className="py-4 font-mono text-sm text-indigo-300 font-bold">{u.email}</td>
                    <td className="py-4 flex justify-center gap-2">
                      {u.roles.map(r => <span key={r} className="text-[10px] bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 px-2.5 py-1 rounded-lg font-black">{r}</span>)}
                    </td>
                    <td className="py-4 text-center">
                       <span className="inline-flex items-center gap-2 text-[10px] font-black uppercase text-emerald-500">
                         <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>
                         {u.status}
                       </span>
                    </td>
                    <td className="py-4">
                       <div className="flex justify-end gap-3 opacity-40 group-hover:opacity-100 transition-opacity">
                          <button className="p-2 hover:bg-slate-800 rounded-lg"><Edit3 className="w-4 h-4" /></button>
                          <button className="p-2 hover:bg-slate-800 rounded-lg text-pink-500"><Trash2 className="w-4 h-4" /></button>
                       </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
             {services.map(s => (
               <motion.div key={s.name} whileHover={{ y: -5 }} className="bg-slate-900/40 border border-slate-800 p-6 rounded-3xl backdrop-blur-md">
                 <div className="flex justify-between items-start mb-6">
                    <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{s.name}</h4>
                    <div className="bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded-md text-[9px] font-black border border-emerald-500/20 shadow-sm uppercase tracking-tighter">Healthy</div>
                 </div>
                 <div className="space-y-4">
                    <div className="flex justify-between text-xs font-bold">
                       <span className="text-slate-500">Latency:</span>
                       <span className="text-emerald-500 font-mono">{s.latency}</span>
                    </div>
                    <div className="flex justify-between text-xs font-bold">
                       <span className="text-slate-500">Resource:</span>
                       <span className="text-indigo-400 font-mono">{s.vram}</span>
                    </div>
                    <div className="w-full bg-slate-950/50 h-2 rounded-full overflow-hidden border border-slate-800">
                       <motion.div 
                          initial={{ width: 0 }} 
                          animate={{ width: s.name.includes('Ollama') ? '35%' : '100%' }} 
                          className="bg-gradient-to-r from-indigo-500 to-emerald-500 h-full"
                       ></motion.div>
                    </div>
                 </div>
               </motion.div>
             ))}

             <div className="lg:col-span-3 bg-indigo-500/5 border border-indigo-500/20 p-8 rounded-[2rem] shadow-2xl">
                <div className="flex items-center gap-4 mb-8">
                   <div className="p-3 bg-indigo-500/10 rounded-2xl border border-indigo-500/30 shadow-lg shadow-indigo-500/5">
                      <Cpu className="text-indigo-400 w-8 h-8" />
                   </div>
                   <div>
                      <h4 className="text-xl font-black tracking-tight">RTX 3060 INFRASTRUCTURE</h4>
                      <p className="text-[10px] uppercase font-black tracking-widest text-slate-500">Hardware Verified Node: 172.17.27.62</p>
                   </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                   <div className="p-5 bg-slate-900/60 rounded-2xl border border-slate-800">
                      <p className="text-[9px] font-black text-slate-500 uppercase mb-2">Model</p>
                      <p className="text-sm font-black text-indigo-300">LLAMA3:8B</p>
                   </div>
                   <div className="p-5 bg-slate-900/60 rounded-2xl border border-slate-800">
                      <p className="text-[9px] font-black text-slate-500 uppercase mb-2">Temp</p>
                      <p className="text-sm font-black text-emerald-400">54°C</p>
                   </div>
                   <div className="p-5 bg-slate-900/60 rounded-2xl border border-slate-800">
                      <p className="text-[9px] font-black text-slate-500 uppercase mb-2">Uptime</p>
                      <p className="text-sm font-black text-white">99.98%</p>
                   </div>
                   <div className="p-5 bg-slate-900/60 rounded-2xl border border-slate-800">
                      <p className="text-[9px] font-black text-slate-500 uppercase mb-2">Engines</p>
                      <p className="text-sm font-black text-slate-300">OLLAMA / GW</p>
                   </div>
                </div>
             </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminModule;
