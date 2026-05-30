import React from 'react';
import { motion } from 'framer-motion';
import { Mic, MicOff, Volume2 } from 'lucide-react';

export default function Mascot({ isSpeaking, isListening, onToggleListen }) {
  return (
    <div className="relative flex flex-col items-center justify-center p-6 bg-[#0a0a0a]/80 backdrop-blur-3xl rounded-3xl border border-white/5 shadow-2xl overflow-hidden">
      
      {/* Background Aura */}
      <motion.div 
        animate={{ 
          scale: isSpeaking ? [1, 1.2, 1] : 1,
          opacity: isSpeaking ? 0.3 : 0.1
        }}
        transition={{ repeat: Infinity, duration: 1.5 }}
        className="absolute w-40 h-40 bg-indigo-500 rounded-full blur-[60px] pointer-events-none"
      />

      {/* Face Container */}
      <div className="relative w-32 h-32 flex flex-col items-center justify-center gap-4 z-10">
        
        {/* Eyes */}
        <div className="flex gap-8">
          <motion.div 
            animate={{ 
              scaleY: isListening ? [1, 0.2, 1] : 1,
              scaleX: isSpeaking ? [1, 1.1, 1] : 1
            }}
            transition={{ repeat: isListening ? Infinity : 0, duration: 2, ease: "easeInOut" }}
            className="w-4 h-6 bg-white rounded-full shadow-[0_0_15px_rgba(255,255,255,0.8)]"
          />
          <motion.div 
            animate={{ 
              scaleY: isListening ? [1, 0.2, 1] : 1,
              scaleX: isSpeaking ? [1, 1.1, 1] : 1
            }}
            transition={{ repeat: isListening ? Infinity : 0, duration: 2, ease: "easeInOut", delay: 0.1 }}
            className="w-4 h-6 bg-white rounded-full shadow-[0_0_15px_rgba(255,255,255,0.8)]"
          />
        </div>

        {/* Mouth */}
        <motion.div 
          animate={{
            height: isSpeaking ? [4, 16, 4, 20, 8, 4] : 4,
            width: isSpeaking ? [16, 24, 20, 28, 16] : 16,
            borderRadius: isSpeaking ? 8 : 4
          }}
          transition={{ repeat: isSpeaking ? Infinity : 0, duration: 0.8, ease: "easeInOut" }}
          className="w-4 h-1 bg-white/80 rounded-full shadow-[0_0_10px_rgba(255,255,255,0.5)] mt-2"
        />
      </div>

      {/* Voice Controls */}
      <div className="mt-6 flex gap-4 z-10">
        <button 
          onClick={onToggleListen}
          className={`p-3 rounded-full transition-all ${isListening ? 'bg-rose-500/20 text-rose-400 border border-rose-500/50 shadow-[0_0_15px_rgba(244,63,94,0.3)]' : 'bg-white/5 text-slate-400 hover:text-white border border-white/10'}`}
        >
          {isListening ? <Mic className="w-5 h-5 animate-pulse" /> : <MicOff className="w-5 h-5" />}
        </button>
        <div className={`p-3 rounded-full border ${isSpeaking ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500/50 shadow-[0_0_15px_rgba(99,102,241,0.3)]' : 'bg-white/5 text-slate-600 border-transparent'}`}>
          <Volume2 className="w-5 h-5" />
        </div>
      </div>
      
    </div>
  );
}
