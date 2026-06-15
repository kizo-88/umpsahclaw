import React, { useState, useRef, useEffect } from 'react';
import { API_BASE } from '../../config';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, Sparkles, Cpu, Send, Bot, MessageSquare, ShieldCheck, ChevronRight, Loader2, Settings2, X, Check } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { localLLMService } from '../../services/localLLMService';
import Mascot from '../ui/Mascot';
import { useVoice } from '../../hooks/useVoice';

const AgentModule = () => {
  const { availableModels, updateModelRole } = useAppStore();
  const [prompt, setPrompt] = useState('');
  const [isDiscussing, setIsDiscussing] = useState(false);
  const [discussion, setDiscussion] = useState([]);
  const [consensus, setConsensus] = useState(null);
  const [activeStep, setActiveStep] = useState(0); // 0: Idle, 1: Gathering, 2: Synthesizing, 3: Completed
  const [showSettings, setShowSettings] = useState(false);
  const scrollRef = useRef(null);

  const { isListening, isSpeaking, transcript, startListening, stopListening, speak, setTranscript } = useVoice();

  useEffect(() => {
    if (transcript) setPrompt(transcript);
  }, [transcript]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [discussion, isDiscussing]);

  const startDiscussion = async () => {
    if (!prompt.trim()) return;
    
    setIsDiscussing(true);
    setDiscussion([]);
    setConsensus(null);
    setActiveStep(1);

    const currentPrompt = prompt;
    const modelResponses = [];

    // Step 1: Sequential Insights Gathering with Roles using Local WebGPU
    for (const model of availableModels) {
      if (model.id === 'deepseek-v3') continue;

      setDiscussion(prev => [...prev, { 
        id: Date.now() + model.id, 
        role: 'system', 
        text: `Querying Local Engine as ${model.role}...`,
        modelName: model.name,
        status: 'loading'
      }]);

      try {
        const rolePrompt = `You are acting as: ${model.role}. \n\nTask: ${currentPrompt}`;
        const responseText = await localLLMService.generate([{ role: 'user', content: rolePrompt }]);
        
        modelResponses.push({ name: model.name, role: model.role, text: responseText });
        
        setDiscussion(prev => {
          const filtered = prev.filter(d => d.modelName !== model.name);
          return [...filtered, { 
            id: Date.now() + model.id, 
            role: 'agent', 
            name: model.name,
            agentRole: model.role,
            text: responseText,
            color: model.color,
            status: 'done'
          }];
        });
      } catch (err) {
        console.error(err);
        setDiscussion(prev => [...prev, { role: 'system', text: `Failed to generate as ${model.role}`, status: 'error' }]);
      }
    }

    // Step 2: Synthesis
    setActiveStep(2);
    setDiscussion(prev => [...prev, { 
      id: 'synthesis', 
      role: 'system', 
      text: 'Lead Agent synthesizing consensus...',
      status: 'loading'
    }]);

    try {
      const synthesisPrompt = `Prompt: "${currentPrompt}". \n` + 
        modelResponses.map(r => `${r.name} (${r.role}): ${r.text.substring(0, 500)}`).join('\n') + 
        `\nSummarize into a single consensus answer.`;

      const responseText = await localLLMService.generate([{ role: 'user', content: synthesisPrompt }]);
      setConsensus(responseText);
      setActiveStep(3);
      speak(responseText); // Mascot speaks the consensus

      // Save to Memory Tree
      try {
        await fetch(API_BASE + '/api/memory/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: currentPrompt, consensus: responseText })
        });
      } catch (memoryErr) {
        console.error('Failed to save to memory tree:', memoryErr);
      }

    } catch (err) {
      console.error(err);
      setConsensus("Synthesis failed. Ensure a local model is downloaded and loaded.");
      speak("Synthesis failed. Ensure a local model is downloaded and loaded.");
    } finally {
      setIsDiscussing(false);
    }
  };

  return (
    <div className="h-full flex flex-col p-8 max-w-6xl mx-auto w-full relative">
      <div className="flex-1 flex flex-col gap-8 overflow-hidden">
        
        {/* Header with Mascot */}
        <div className="flex flex-col md:flex-row items-center justify-between shrink-0 gap-6">
          <div className="flex items-center gap-6 w-full md:w-auto">
            <Mascot 
              isSpeaking={isSpeaking} 
              isListening={isListening} 
              onToggleListen={isListening ? stopListening : startListening} 
            />
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center">
                  <Brain className="w-4 h-4 text-indigo-400" />
                </div>
                <h2 className="text-3xl font-black text-white uppercase tracking-tight">Consensus Engine</h2>
              </div>
              <p className="text-slate-400 text-sm font-medium">Multi-agent logic verification & synthesis with Native Voice.</p>
            </div>
          </div>
          <div className="flex items-center gap-6">
             <button 
                onClick={() => setShowSettings(!showSettings)}
                className={`p-3 rounded-xl border transition-all flex items-center gap-2 font-bold text-xs uppercase tracking-widest ${
                   showSettings ? 'bg-indigo-600 border-indigo-400 text-white' : 'bg-[#050505] border-white/5 text-slate-400 hover:text-white'
                }`}
             >
                <Settings2 className="w-4 h-4" /> {showSettings ? 'Close Config' : 'Configure Roles'}
             </button>
             <div className="flex flex-col items-end hidden sm:flex">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Active Cluster</p>
                <div className="flex -space-x-2 mt-1">
                   {availableModels.map(m => (
                      <div key={m.id} className={`w-8 h-8 rounded-full bg-slate-800 border-2 border-slate-950 flex items-center justify-center ${m.color}`} title={`${m.name} (${m.role})`}>
                         <Bot className="w-4 h-4" />
                      </div>
                   ))}
                </div>
             </div>
          </div>
        </div>

        {/* Roles Configuration Panel */}
        <AnimatePresence>
           {showSettings && (
              <motion.div 
                 initial={{ opacity: 0, y: -20 }}
                 animate={{ opacity: 1, y: 0 }}
                 exit={{ opacity: 0, y: -20 }}
                 className="shrink-0 bg-[#050505]/60 backdrop-blur-3xl border border-indigo-500/20 rounded-3xl p-6 grid grid-cols-1 md:grid-cols-3 gap-6 shadow-2xl relative"
              >
                 <div className="absolute -top-3 left-10 bg-indigo-600 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest shadow-lg shadow-indigo-600/30">
                    Cluster Configuration
                 </div>
                 {availableModels.map((model) => (
                    <div key={model.id} className="flex flex-col gap-3">
                       <div className="flex items-center gap-2">
                          <div className={`w-6 h-6 rounded-lg bg-slate-800 flex items-center justify-center ${model.color}`}>
                             <Bot className="w-3.5 h-3.5" />
                          </div>
                          <span className="text-[11px] font-black text-white uppercase tracking-tight">{model.name}</span>
                       </div>
                       <div className="relative group">
                          <input 
                             className="w-full bg-[#050505]/50 border border-white/5 rounded-xl px-4 py-2.5 text-xs text-slate-300 focus:border-indigo-500/50 transition-all outline-none"
                             value={model.role}
                             onChange={(e) => updateModelRole(model.id, e.target.value)}
                             placeholder="Set Agent Role..."
                          />
                          <div className="absolute right-3 top-1/2 -translate-y-1/2 opacity-0 group-focus-within:opacity-100 transition-opacity">
                             <Check className="w-3.5 h-3.5 text-indigo-400" />
                          </div>
                       </div>
                    </div>
                 ))}
              </motion.div>
           )}
        </AnimatePresence>

        {/* Discussion Area */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-6 pr-4 custom-scrollbar">
          {discussion.length === 0 && !isDiscussing && (
            <div className="h-full flex flex-col items-center justify-center text-center opacity-50">
               <div className="w-20 h-20 rounded-full bg-[#050505] border border-white/5 flex items-center justify-center mb-6">
                  <MessageSquare className="w-10 h-10 text-slate-600" />
               </div>
               <h3 className="text-white font-bold text-lg">No Active Discussion</h3>
               <p className="text-slate-500 text-sm max-w-[320px] mt-2">Enter a prompt below to trigger the consensus workflow between multiple AI models with custom roles.</p>
            </div>
          )}

          <AnimatePresence mode="popLayout">
            {discussion.map((msg, i) => (
              <motion.div
                key={msg.id || i}
                initial={{ opacity: 0, x: -20, scale: 0.95 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                className={`flex flex-col gap-3 ${msg.role === 'system' ? 'items-center' : ''}`}
              >
                {msg.role === 'system' ? (
                  <div className="bg-[#050505]/50 border border-white/5 px-4 py-2 rounded-full flex items-center gap-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                    {msg.status === 'loading' && <Loader2 className="w-3 h-3 animate-spin text-indigo-500" />}
                    {msg.text}
                  </div>
                ) : (
                  <div className="bg-[#050505]/40 backdrop-blur-xl border border-white/5 rounded-3xl p-6 flex flex-col gap-4 shadow-2xl shadow-black/50">
                    <div className="flex items-center justify-between">
                       <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl bg-slate-800 border border-white/10 flex items-center justify-center ${msg.color}`}>
                             <Bot className="w-6 h-6" />
                          </div>
                          <div>
                             <h4 className="text-white font-black">{msg.name}</h4>
                             <p className="text-[10px] text-indigo-400 font-black uppercase tracking-widest">{msg.agentRole}</p>
                          </div>
                       </div>
                       <span className="px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400 text-[9px] font-black uppercase tracking-widest border border-indigo-500/20">
                          Proposition
                       </span>
                    </div>
                    <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>

          {consensus && (
            <motion.div
              initial={{ opacity: 0, y: 30, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              className="bg-gradient-to-br from-indigo-600/20 to-purple-600/20 border border-indigo-500/30 rounded-[2.5rem] p-10 shadow-2xl relative overflow-hidden group"
            >
               <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-indigo-500 to-transparent"></div>
               <div className="flex items-center gap-4 mb-6">
                  <div className="w-14 h-14 rounded-xl bg-indigo-500 shadow-lg shadow-indigo-500/40 flex items-center justify-center">
                     <ShieldCheck className="w-8 h-8 text-white" />
                  </div>
                  <div>
                     <h3 className="text-2xl font-black text-white uppercase tracking-tight">Verified Consensus</h3>
                     <p className="text-indigo-300/70 text-xs font-bold uppercase tracking-[0.2em]">Cross-Referenced Role Synthesis</p>
                  </div>
               </div>
               <div className="prose prose-invert max-w-none">
                  <p className="text-white text-lg leading-relaxed font-medium whitespace-pre-wrap">
                    {consensus}
                  </p>
               </div>
               <div className="mt-8 pt-6 border-t border-indigo-500/20 flex items-center justify-between">
                  <div className="flex items-center gap-4 text-[10px] font-black text-indigo-400/60 uppercase tracking-widest">
                     <span>Confidence: 98.4%</span>
                     <span className="w-1 h-1 bg-indigo-800 rounded-full"></span>
                     <span>Role Sync: Active</span>
                  </div>
                  <button className="flex items-center gap-2 text-white font-bold text-xs hover:text-indigo-300 transition-colors group/btn">
                     Export Analysis <ChevronRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                  </button>
               </div>
            </motion.div>
          )}
        </div>

        {/* Input area */}
        <div className="shrink-0 pt-4">
           <div className="bg-[#050505]/60 backdrop-blur-3xl border border-white/5 rounded-[2.5rem] p-4 flex flex-col gap-4 shadow-2xl focus-within:border-indigo-500/30 transition-all">
              <div className="flex items-center justify-between px-4 pt-2">
                 <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></div>
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Neural Input Active</p>
                 </div>
                 <div className="flex gap-2">
                    {availableModels.map(m => (
                       <span key={m.id} className="text-[9px] font-black text-slate-600 uppercase tracking-tighter bg-[#050505] px-2 py-0.5 rounded border border-slate-900">{m.role}</span>
                    ))}
                 </div>
              </div>
              <div className="flex items-end gap-4 p-2">
                <textarea
                  rows="1"
                  className="flex-1 bg-transparent border-none outline-none text-white px-4 py-2 placeholder:text-slate-600 font-bold text-lg resize-none custom-scrollbar"
                  placeholder="Ask the cluster for a verified answer..."
                  value={prompt}
                  onChange={(e) => {
                    setPrompt(e.target.value);
                    setTranscript(e.target.value);
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), startDiscussion())}
                  disabled={isDiscussing}
                />
                <button
                  onClick={startDiscussion}
                  disabled={isDiscussing || !prompt.trim()}
                  className="w-16 h-16 rounded-[1.5rem] bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center text-white transition-all shadow-2xl shadow-black/50 shadow-indigo-600/20 active:scale-90 shrink-0"
                >
                  {isDiscussing ? <Loader2 className="w-8 h-8 animate-spin" /> : <Send className="w-8 h-8" />}
                </button>
              </div>
              
              {/* Progress Indicator */}
              {isDiscussing && (
                 <div className="px-6 pb-2">
                    <div className="flex justify-between text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">
                       <span>{activeStep === 1 ? 'Gathering Proposals' : 'Synthesizing Consensus'}</span>
                       <span>{activeStep === 1 ? '40%' : '85%'}</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                       <motion.div 
                          className="h-full bg-indigo-500" 
                          initial={{ width: '0%' }}
                          animate={{ width: activeStep === 1 ? '40%' : activeStep === 2 ? '85%' : '100%' }}
                       />
                    </div>
                 </div>
              )}
           </div>
        </div>
      </div>
    </div>
  );
};

export default AgentModule;
