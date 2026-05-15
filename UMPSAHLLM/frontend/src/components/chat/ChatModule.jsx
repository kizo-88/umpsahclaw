import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Bot, User, Sparkles, LogOut, History } from 'lucide-react';
import { storageService } from '../../services/storageService';
import { db, auth } from '../../firebase';
import { collection, addDoc, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';
import { useAppStore } from '../../store/useAppStore';
import { localLLMService } from '../../services/localLLMService';

const ChatModule = () => {
  const [messages, setMessages] = useState([
    { id: 1, role: 'assistant', text: 'UMPSAHLLM Chat Core Online. How can I assist with your UMPSA Holding tasks today?' }
  ]);
  const [input, setInput] = useState('');
  const [selectedModel, setSelectedModel] = useState('phi3-mini');
  const [sessionId] = useState(() => `session-${Math.random().toString(36).substr(2, 9)}`);
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef(null);


  const { availableModels: models } = useAppStore();

  useEffect(() => {
    // Select the first downloaded model if current is not downloaded
    const current = models.find(m => m.id === selectedModel);
    if (!current?.downloaded) {
      const firstAvailable = models.find(m => m.downloaded);
      if (firstAvailable) setSelectedModel(firstAvailable.id);
    }
  }, [models]);

  useEffect(() => {
    // Load local history for the current session
    const loadHistory = async () => {
      const history = await storageService.getMessages(sessionId);
      if (history && history.length > 0) {
        setMessages(history);
      }
    };
    loadHistory();
  }, [sessionId]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    // Persist messages to local IndexedDB whenever they change
    if (messages.length > 1) {
      storageService.saveMessages(sessionId, messages);
    }
  }, [messages, isTyping]);

  const handleSend = async () => {
    if (!input.trim()) return;
    const userMsg = input;
    setInput('');
    const newMessages = [...messages, { id: Date.now(), role: 'user', text: userMsg }];
    setMessages(newMessages);
    setIsTyping(true);

    // Sync Title to Firestore (Cloud Index)
    if (newMessages.length === 2 && auth.currentUser) {
      try {
        addDoc(collection(db, "conversations"), {
          userId: auth.currentUser.uid,
          sessionId: sessionId,
          title: userMsg.substring(0, 40) + "...",
          createdAt: new Date()
        });
      } catch (e) { console.error("Cloud sync failed", e); }
    }

    try {
      const modelMeta = models.find(m => m.id === selectedModel);
      const engine = modelMeta?.engine || 'NAS';
      let assistantMsg = "";

      if (engine === 'Local') {
        // 🚀 Local Inference Mode (Phase 3)
        await localLLMService.generateStream(newMessages, (fullText) => {
          assistantMsg = fullText;
          setMessages([...newMessages, { id: 'stream-temp', role: 'assistant', text: fullText }]);
          setIsTyping(false);
        });
        setMessages([...newMessages, { id: Date.now() + 1, role: 'assistant', text: assistantMsg }]);
      } else if (engine === 'Cloud') {
        // ☁️ Cloud Engine Proxy (Phase 4)
        const response = await fetch('https://submerge-trustable-approve.ngrok-free.dev/api/cloud-chat', {
          method: 'POST',
          headers: { 
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true'
        },
          body: JSON.stringify({ 
            message: userMsg,
            model: selectedModel,
            sessionId: sessionId
          })
        });

        const data = await response.json();
        assistantMsg = data.response;
        setMessages(prev => [...prev, { id: Date.now() + 1, role: 'assistant', text: assistantMsg }]);
      } else {
        // 🛰️ NAS Engine
        const response = await fetch('https://submerge-trustable-approve.ngrok-free.dev/api/chat', {
          method: 'POST',
          headers: { 
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true'
        },
          body: JSON.stringify({ 
            message: userMsg,
            model: selectedModel,
            sessionId: sessionId
          })
        });

        const data = await response.json();
        assistantMsg = data.response;
        setMessages(prev => [...prev, { id: Date.now() + 1, role: 'assistant', text: assistantMsg }]);
      }

      // 📡 Centralized NAS Logging (Shared across all engines)
      fetch('https://submerge-trustable-approve.ngrok-free.dev/api/log', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true'
        },
        body: JSON.stringify({

          prompt: userMsg,
          response: assistantMsg,
          engine: engine,
          model: selectedModel,
          userId: auth.currentUser?.email || 'anonymous',
          timestamp: new Date().toISOString()
        })
      }).catch(e => console.error("Logging failed", e));

    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, { id: Date.now() + 1, role: 'assistant', text: 'Error: Connection Failed or GPU Memory Full.' }]);
    } finally {
      setIsTyping(false);
    }
  };


  return (
    <div className="h-full flex flex-col p-6 max-w-5xl mx-auto w-full relative">
      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-6 custom-scrollbar pr-4 pb-12">
        {messages.map((msg) => (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            key={msg.id}
            className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`flex gap-4 max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${
                msg.role === 'user' ? 'bg-indigo-600 border-indigo-400' : 'bg-slate-900 border-slate-700'
              }`}>
                {msg.role === 'user' ? <User className="w-4 h-4 text-white" /> : <Bot className="w-4 h-4 text-indigo-400" />}
              </div>
              <div className={`p-4 rounded-2xl shadow-sm border ${
                msg.role === 'user' 
                  ? 'bg-indigo-600 border-indigo-500 text-white rounded-tr-none' 
                  : 'bg-slate-900/50 border-slate-800 text-slate-200 rounded-tl-none backdrop-blur-md'
              }`}>
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</p>
              </div>
            </div>
          </motion.div>
        ))}
        {isTyping && (
          <div className="flex justify-start">
             <div className="bg-slate-900/50 border border-slate-800 p-3 rounded-xl flex gap-1.5">
                <motion.span animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1 }} className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></motion.span>
                <motion.span animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></motion.span>
                <motion.span animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></motion.span>
             </div>
          </div>
        )}
      </div>

      <div className="pt-4">
        <div className="relative group bg-slate-900/40 backdrop-blur-xl border border-slate-800 rounded-2xl p-2 flex items-center gap-2 focus-within:border-indigo-500/50 transition-all shadow-2xl">
            <div className="flex items-center gap-2">
              <select 
                className="bg-slate-800 text-slate-300 text-xs font-semibold px-3 py-2 rounded-lg border border-slate-700 outline-none focus:border-indigo-500/50 transition-all cursor-pointer hover:bg-slate-700"
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
              >
                {models.map(m => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
              <div className={`px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-widest border ${
                models.find(m => m.id === selectedModel)?.engine === 'NAS' ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400' :
                models.find(m => m.id === selectedModel)?.engine === 'Local' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' :
                'bg-amber-500/10 border-amber-500/30 text-amber-400'
              }`}>
                {models.find(m => m.id === selectedModel)?.engine}
              </div>
            </div>
            <input 
              className="flex-1 bg-transparent border-none outline-none text-slate-200 px-4 py-2 placeholder:text-slate-500 font-medium"
              placeholder={`Message with ${models.find(m => m.id === selectedModel)?.name}...`}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
            />
           <button 
             onClick={handleSend}
             className="p-3 rounded-xl bg-indigo-500 text-white hover:bg-indigo-400 active:scale-95 transition-all shadow-lg shadow-indigo-500/20"
           >
             <Send className="w-4 h-4" />
           </button>
        </div>
      </div>
    </div>
  );
};

export default ChatModule;
