import React from 'react';
import { motion } from 'framer-motion';
import { Gamepad2, Wrench } from 'lucide-react';

const PCControlModule = () => {
  return (
    <div className="h-full flex flex-col bg-slate-950 font-inter p-8 overflow-hidden items-center justify-center">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center text-center max-w-md"
      >
        <div className="w-24 h-24 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-8 relative">
           <div className="absolute inset-0 bg-emerald-500/20 blur-2xl rounded-full"></div>
           <Gamepad2 className="w-12 h-12 text-emerald-400 relative z-10" />
        </div>
        
        <h2 className="text-3xl font-black text-white uppercase tracking-tight mb-4">PC Control Hub</h2>
        <p className="text-slate-400 text-sm font-medium leading-relaxed mb-8">
          The manual file explorer has been migrated to the Code IDE. This module is currently undergoing redevelopment to bring advanced local PC automation, native script execution, and OS bridging capabilities.
        </p>

        <div className="flex items-center gap-3 px-6 py-3 bg-emerald-500/10 border border-emerald-500/20 rounded-full animate-pulse">
           <Wrench className="w-4 h-4 text-emerald-400" />
           <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest">In Progress / Coming Soon</span>
        </div>
      </motion.div>
    </div>
  );
};

export default PCControlModule;
