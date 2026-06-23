import React, { useState, useRef, useEffect } from 'react';
import { API_BASE, apiFetch } from '../../config';
import { motion, AnimatePresence } from 'framer-motion';
import { Globe, Search, RefreshCw, ChevronRight, Sparkles, Cpu, Link, MousePointer2 } from 'lucide-react';
import { localLLMService } from '../../services/localLLMService';

const BrowserModule = () => {
  const [urlInput, setUrlInput] = useState('');
  const [currentUrl, setCurrentUrl] = useState('');
  const [proxyUrl, setProxyUrl] = useState('');
  const [pageData, setPageData] = useState({ title: '', text: '', loading: false, error: '' });
  
  const [aiChat, setAiChat] = useState([
    { role: 'assistant', text: 'Agent Browser Copilot online. I can read the page and visually automate actions (scroll, click) if you ask me to.' }
  ]);
  const [chatInput, setChatInput] = useState('');
  const chatEndRef = useRef(null);
  
  const iframeRef = useRef(null);
  const [mousePos, setMousePos] = useState({ x: -100, y: -100 });
  const [clicking, setClicking] = useState(false);
  const [coordsCallback, setCoordsCallback] = useState(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [aiChat]);

  // Listen for iframe messages
  useEffect(() => {
    const handleMessage = (event) => {
      if (event.data && event.data.type === 'AI_COORDS_REPLY') {
        const { rect } = event.data;
        if (coordsCallback) {
          coordsCallback(rect);
          setCoordsCallback(null);
        }
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [coordsCallback]);

  const handleNavigate = async (e) => {
    e?.preventDefault();
    if (!urlInput.trim()) return;

    let targetUrl = urlInput.trim();
    if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
      targetUrl = 'https://' + targetUrl;
    }

    setCurrentUrl(targetUrl);
    setUrlInput(targetUrl);
    setProxyUrl(`${API_BASE}/proxy/${targetUrl}`);
    setPageData({ title: '', text: '', loading: true, error: '' });

    try {
      const res = await apiFetch('/api/browse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: targetUrl })
      });
      const data = await res.json();
      if (res.ok) {
        setPageData({ title: data.title, text: data.text, loading: false, error: '' });
      } else {
        setPageData({ title: 'Error', text: '', loading: false, error: data.error || 'Failed to load page context.' });
      }
    } catch (err) {
      setPageData({ title: 'Connection Error', text: '', loading: false, error: 'Could not connect to backend proxy.' });
    }
  };

  const executeAction = async (commandStr) => {
    try {
      const cmd = JSON.parse(commandStr);
      if (cmd.action === 'scroll') {
        let amount = cmd.amount || 500;
        if (cmd.direction === 'up') amount = -amount;
        iframeRef.current?.contentWindow?.postMessage({ type: 'AI_ACTION', action: 'scroll', amount }, '*');
        return "Scrolled the page.";
      }
      if (cmd.action === 'click' && cmd.selector) {
        return new Promise((resolve) => {
          setCoordsCallback(() => (rect) => {
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;
            setMousePos({ x: centerX, y: centerY });
            
            setTimeout(() => {
              setClicking(true);
              iframeRef.current?.contentWindow?.postMessage({ type: 'AI_ACTION', action: 'click', selector: cmd.selector }, '*');
              
              setTimeout(() => {
                setClicking(false);
                resolve(`Clicked on element ${cmd.selector}`);
              }, 500);
            }, 800); // 800ms for mouse travel animation
          });
          // Ask for coords
          iframeRef.current?.contentWindow?.postMessage({ type: 'AI_ACTION', action: 'getCoords', selector: cmd.selector }, '*');
        });
      }
    } catch (e) {
      return "Failed to parse or execute action JSON.";
    }
    return "Action executed.";
  };

  const handleSendAI = async () => {
    if (!chatInput.trim()) return;
    const userMsg = chatInput;
    setAiChat(prev => [...prev, { role: 'user', text: userMsg }]);
    setChatInput('');

    try {
      const systemPrompt = `You are Agent Browser Copilot. The user is currently browsing the web.
If they ask you to scroll or click something, you must output a JSON block wrapped in \`\`\`json.
For scrolling: \`\`\`json { "action": "scroll", "direction": "down", "amount": 500 } \`\`\` (Use a large amount like 5000 if they want to scroll to the footer or bottom of the page).
For clicking: \`\`\`json { "action": "click", "selector": "a" } \`\`\` (Guess the CSS selector for the element based on the page context).
Do not explain the JSON, just output it if an action is requested. You can also answer questions normally.`;
      
      const pageContext = currentUrl 
        ? `\n\n--- CURRENT WEBPAGE ---\nURL: ${currentUrl}\nContent:\n${pageData.text.substring(0, 10000)}\n-----------------------\n` 
        : `\n\n(No webpage currently loaded)\n`;
      
      const prompt = `${systemPrompt}${pageContext}\nUser Request: ${userMsg}`;

      setAiChat(prev => [...prev, { role: 'assistant', text: '...', loading: true }]);

      const responseText = await localLLMService.generate([{ role: 'user', content: prompt }]);

      // Check for JSON action
      let actionResult = "";
      const jsonMatch = responseText.match(/```json\n([\s\S]*?)\n```/);
      if (jsonMatch && jsonMatch[1]) {
        actionResult = await executeAction(jsonMatch[1]);
      } else {
        // sometimes LLMs skip the backticks
        if (responseText.trim().startsWith('{') && responseText.includes('"action"')) {
            actionResult = await executeAction(responseText.trim());
        }
      }

      setAiChat(prev => {
        const newChat = [...prev];
        const displayTxt = jsonMatch ? (responseText.replace(jsonMatch[0], '') + `\n\n*(Automated System: ${actionResult})*`) : responseText;
        newChat[newChat.length - 1] = { role: 'assistant', text: displayTxt.trim() };
        return newChat;
      });
    } catch (err) {
      setAiChat(prev => {
        const newChat = [...prev];
        newChat[newChat.length - 1] = { role: 'assistant', text: 'Local WebGPU Connection Failed.' };
        return newChat;
      });
    }
  };

  return (
    <div className="h-full flex overflow-hidden bg-[#050505] font-inter text-slate-300">
      
      {/* 🌐 Main Browser Viewport */}
      <div className="flex-1 flex flex-col relative overflow-hidden">
        
        {/* URL Bar */}
        <div className="h-14 border-b border-slate-900 flex items-center px-4 bg-[#050505] z-10 gap-4">
          <div className="flex items-center gap-2 text-slate-500">
            <Globe className="w-5 h-5 text-sky-400" />
            <span className="text-xs font-black uppercase tracking-widest text-slate-400">Agent Browser</span>
          </div>

          <form onSubmit={handleNavigate} className="flex-1 flex items-center max-w-2xl bg-[#050505]/50 border border-white/5 rounded-full px-4 py-1.5 focus-within:border-sky-500/50 transition-colors shadow-inner">
            <Link className="w-4 h-4 text-slate-500 mr-2" />
            <input 
              type="text" 
              placeholder="Enter URL to scrape and analyze..." 
              className="flex-1 bg-transparent text-sm outline-none text-slate-200 placeholder:text-slate-600 font-medium"
              value={urlInput}
              onChange={e => setUrlInput(e.target.value)}
            />
            <button type="submit" className="p-1 hover:bg-slate-800 rounded-full transition-colors">
              <Search className="w-4 h-4 text-sky-400" />
            </button>
          </form>

          <button onClick={() => currentUrl && handleNavigate()} className="p-2 hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-sky-400 active:rotate-180">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* Viewport Content */}
        <div className="flex-1 bg-[#050505]/20 relative overflow-hidden">
          {pageData.loading ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center opacity-50 animate-pulse bg-[#050505]/50 z-10">
              <Globe className="w-12 h-12 mb-4 text-sky-400" />
              <p className="font-bold text-sm text-sky-400 uppercase tracking-widest">Fetching Web Content...</p>
            </div>
          ) : null}

          {proxyUrl ? (
            <>
              <iframe 
                ref={iframeRef}
                src={proxyUrl} 
                className="w-full h-full border-none bg-white relative z-0"
                title="Agent Browser Viewport"
                sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
              />
              
              {/* Fake AI Mouse Cursor */}
              <motion.div 
                animate={{ x: mousePos.x, y: mousePos.y }}
                transition={{ type: "spring", stiffness: 100, damping: 20 }}
                className="absolute z-50 pointer-events-none drop-shadow-2xl"
                style={{ top: 0, left: 0 }}
              >
                <motion.div animate={{ scale: clicking ? 0.8 : 1 }}>
                  <MousePointer2 className="w-8 h-8 text-sky-500 fill-sky-500/50 -rotate-12" />
                </motion.div>
                <AnimatePresence>
                  {clicking && (
                    <motion.div 
                      initial={{ scale: 0, opacity: 1 }}
                      animate={{ scale: 2.5, opacity: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.6, ease: "easeOut" }}
                      className="absolute top-0 left-0 w-8 h-8 rounded-full border-4 border-sky-400"
                    />
                  )}
                </AnimatePresence>
              </motion.div>
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center opacity-30 text-center">
              <Globe className="w-16 h-16 mb-4 text-sky-400" />
              <p className="font-bold text-sm text-white uppercase tracking-widest">Awaiting Navigation</p>
              <p className="text-xs font-medium text-slate-400 mt-2">Enter a URL to open the page and initialize AI context.</p>
            </div>
          )}
        </div>
      </div>

      {/* 🧬 Agent Copilot Sidebar */}
      <div className="w-96 border-l border-slate-900 flex flex-col bg-[#050505]/40 backdrop-blur-2xl relative shadow-[-20px_0px_50px_rgba(0,0,0,0.5)] z-20 overflow-hidden shrink-0">
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
           <div className="absolute top-[-10%] right-[-10%] w-full h-full bg-sky-500/5 blur-[80px] rounded-full"></div>
        </div>

        <div className="p-6 border-b border-slate-900/60 flex items-center justify-between shrink-0">
           <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-sky-400 to-indigo-600 flex items-center justify-center border border-sky-400/20 shadow-lg shadow-sky-500/10">
                 <Sparkles className="w-4 h-4 text-white" />
              </div>
              <div>
                 <h4 className="text-xs font-black uppercase text-white">Browser Copilot</h4>
                 <p className="text-[9px] uppercase font-black tracking-widest text-sky-400">Visual Automation Active</p>
              </div>
           </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
           {aiChat.map((msg, i) => (
              <div key={i} className={`flex gap-3 ${msg.role === 'assistant' ? 'flex-col' : 'flex-row-reverse'}`}>
                 <div className={`p-4 rounded-xl text-[13px] leading-relaxed border ${
                    msg.role === 'assistant' 
                    ? 'bg-[#050505]/50 border-white/5 text-slate-300 rounded-tl-none font-medium whitespace-pre-wrap' 
                    : 'bg-sky-600 border-sky-500 text-white rounded-tr-none shadow-lg shadow-sky-600/20'
                 }`}>
                    {msg.loading ? <span className="animate-pulse">Analyzing page context...</span> : msg.text}
                 </div>
              </div>
           ))}
           <div ref={chatEndRef} />
        </div>

        <div className="p-4 border-t border-slate-900 shrink-0">
           <div className="bg-[#050505]/60 border border-white/5 rounded-xl p-2 flex items-center gap-2 focus-within:border-sky-500/50 transition-all shadow-inner">
              <input 
                placeholder="Command AI (e.g., 'scroll down', 'click login')..." 
                className="flex-1 bg-transparent text-xs outline-none px-3 py-1 font-medium text-slate-300 placeholder:text-slate-600"
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSendAI()}
              />
              <button 
                onClick={handleSendAI}
                disabled={!chatInput.trim()}
                className="p-2.5 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 disabled:hover:bg-sky-600 rounded-xl transition-all shadow-lg shadow-sky-600/20 active:scale-95"
              >
                 <ChevronRight className="w-4 h-4 text-white" />
              </button>
           </div>
           <div className="mt-4 flex items-center gap-4 px-2">
              <div className="flex items-center gap-1.5 opacity-40">
                 <Cpu className="w-3 h-3" />
                 <span className="text-[9px] font-black uppercase tracking-tighter">Local WebGPU</span>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default BrowserModule;
