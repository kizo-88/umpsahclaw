import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, Play, Shield, Zap, Cloud, Cpu, HardDrive, CheckCircle2, AlertCircle } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';

const ModelHub = () => {
  const { availableModels, setMode, setDownloaded } = useAppStore();
  const [downloading, setDownloading] = useState(null);
  const [progress, setProgress] = useState(0);

  const handleDownload = (id) => {
    setDownloading(id);
    let p = 0;
    const interval = setInterval(() => {
      p += 5;
      setProgress(p);
      if (p >= 100) {
        clearInterval(interval);
        setDownloaded(id);
        setDownloading(null);
        setProgress(0);
      }
    }, 200);
  };

  const getEngineIcon = (engine) => {
    switch(engine) {
      case 'NAS': return <HardDrive className="w-4 h-4" />;
      case 'Local': return <Cpu className="w-4 h-4" />;
      case 'Cloud': return <Cloud className="w-4 h-4" />;
      default: return <Zap className="w-4 h-4" />;
    }
  };

  return (
    <div className="h-full p-12 overflow-y-auto custom-scrollbar bg-slate-950/20">
      <div className="max-w-6xl mx-auto">
        <header className="mb-12">
          <motion.h1 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl font-black text-white mb-4 tracking-tight"
          >
            MODEL <span className="text-indigo-500">HUB</span>
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-slate-400 text-lg max-w-2xl"
          >
            Select your processing engine. Experience high-speed local inference or leverage our enterprise NAS and Cloud frontier models.
          </motion.p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {availableModels.map((model, idx) => (
            <motion.div
              key={model.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.1 }}
              className={`relative group rounded-3xl p-6 border transition-all duration-500 overflow-hidden ${
                model.downloaded 
                ? 'bg-slate-900/40 border-slate-800 hover:border-indigo-500/50 hover:bg-slate-900/60' 
                : 'bg-slate-950/40 border-slate-900 grayscale-[0.5] hover:grayscale-0'
              }`}
            >
              {/* Background Glow */}
              <div className={`absolute -right-10 -top-10 w-32 h-32 blur-[80px] opacity-20 rounded-full transition-all duration-700 group-hover:opacity-40 ${
                model.engine === 'NAS' ? 'bg-indigo-500' : model.engine === 'Local' ? 'bg-emerald-500' : 'bg-amber-500'
              }`}></div>

              <div className="relative z-10 flex flex-col h-full">
                <div className="flex items-center justify-between mb-6">
                  <div className={`p-3 rounded-2xl bg-slate-900 border border-slate-800 text-indigo-400 shadow-xl ${model.color}`}>
                    {getEngineIcon(model.engine)}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md bg-slate-900/80 border border-slate-800 ${
                      model.status === 'online' ? 'text-emerald-400' : 'text-slate-500'
                    }`}>
                      {model.status}
                    </span>
                  </div>
                </div>

                <h3 className="text-xl font-bold text-white mb-1">{model.name}</h3>
                <p className="text-xs font-medium text-slate-500 mb-4">{model.specialty}</p>

                <div className="mt-auto pt-6 space-y-4">
                  <div className="flex items-center justify-between text-[10px] font-black text-slate-600 uppercase tracking-tighter">
                    <span>Engine</span>
                    <span className="text-slate-300">{model.engine} Interface</span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] font-black text-slate-600 uppercase tracking-tighter">
                    <span>Footprint</span>
                    <span className="text-slate-300">{model.size}</span>
                  </div>

                  {downloading === model.id ? (
                    <div className="space-y-2">
                      <div className="flex justify-between text-[10px] font-black text-indigo-400 uppercase">
                        <span>Caching Model...</span>
                        <span>{progress}%</span>
                      </div>
                      <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${progress}%` }}
                          className="h-full bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]"
                        ></motion.div>
                      </div>
                    </div>
                  ) : model.downloaded ? (
                    <button 
                      onClick={() => setMode('chat')}
                      className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-600/20 active:scale-95"
                    >
                      <Play className="w-3 h-3 fill-current" />
                      Initialize Session
                    </button>
                  ) : (
                    <button 
                      onClick={() => handleDownload(model.id)}
                      className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95 border border-slate-700"
                    >
                      <Download className="w-3 h-3" />
                      Download to Device
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-16 p-8 rounded-3xl bg-indigo-600/5 border border-indigo-500/10 flex flex-col md:flex-row items-center gap-8"
        >
          <div className="p-4 rounded-2xl bg-indigo-600 shadow-xl shadow-indigo-600/20">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <div>
            <h4 className="text-lg font-bold text-white mb-1">Local Intelligence Protocol Active</h4>
            <p className="text-sm text-slate-400">All local model interactions are processed on your device. Only interaction logs are mirrored to the UMPSAH NAS for system-wide intelligence synchronization and future training.</p>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default ModelHub;
