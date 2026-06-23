import React from 'react';
import { apiFetch } from '../../config';
import { Blocks, Search, ArrowUpRight, GitPullRequest, Mail, FileText, MessageSquare, CreditCard, Calendar, Cloud, Database, Globe, Image, Layout, Server, Settings, Shield, ShoppingCart, Terminal, Users, Video, Zap } from 'lucide-react';
import { motion } from 'framer-motion';

const MOCK_INTEGRATIONS = [
  { id: 'github', name: 'GitHub', icon: GitPullRequest, color: 'text-white', bg: 'bg-zinc-800' },
  { id: 'gmail', name: 'Gmail', icon: Mail, color: 'text-red-500', bg: 'bg-red-500/10' },
  { id: 'notion', name: 'Notion', icon: FileText, color: 'text-slate-200', bg: 'bg-slate-800' },
  { id: 'slack', name: 'Slack', icon: MessageSquare, color: 'text-amber-500', bg: 'bg-amber-500/10' },
  { id: 'stripe', name: 'Stripe', icon: CreditCard, color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
  { id: 'google_calendar', name: 'Google Calendar', icon: Calendar, color: 'text-blue-500', bg: 'bg-blue-500/10' },
  { id: 'aws', name: 'AWS', icon: Cloud, color: 'text-orange-400', bg: 'bg-orange-500/10' },
  { id: 'mongodb', name: 'MongoDB', icon: Database, color: 'text-green-500', bg: 'bg-green-500/10' },
  { id: 'linear', name: 'Linear', icon: Layout, color: 'text-purple-400', bg: 'bg-purple-500/10' },
  { id: 'jira', name: 'Jira', icon: Shield, color: 'text-blue-600', bg: 'bg-blue-600/10' },
  { id: 'discord', name: 'Discord', icon: Users, color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
  { id: 'zoom', name: 'Zoom', icon: Video, color: 'text-sky-500', bg: 'bg-sky-500/10' },
  { id: 'shopify', name: 'Shopify', icon: ShoppingCart, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
  { id: 'vercel', name: 'Vercel', icon: Globe, color: 'text-white', bg: 'bg-zinc-900' },
  { id: 'figma', name: 'Figma', icon: Image, color: 'text-pink-500', bg: 'bg-pink-500/10' },
  { id: 'hubspot', name: 'HubSpot', icon: Zap, color: 'text-orange-500', bg: 'bg-orange-500/10' },
  { id: 'kubernetes', name: 'Kubernetes', icon: Server, color: 'text-blue-400', bg: 'bg-blue-500/10' },
  { id: 'docker', name: 'Docker', icon: Terminal, color: 'text-sky-400', bg: 'bg-sky-500/10' },
];

export default function IntegrationsModule() {
  const [connectedApps, setConnectedApps] = React.useState([]);
  const [connecting, setConnecting] = React.useState(null);

  const fetchStatus = () => {
    apiFetch('/api/composio/status')
      .then(res => res.json())
      .then(data => {
        if (data.success) setConnectedApps(data.connections);
      })
      .catch(console.error);
  };

  React.useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 10000); // poll every 10s
    return () => clearInterval(interval);
  }, []);

  const handleConnect = async (appId) => {
    if (connectedApps.includes(appId)) return; // Already connected
    setConnecting(appId);
    try {
      const res = await apiFetch('/api/composio/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appName: appId })
      });
      const data = await res.json();
      if (data.success && data.redirectUrl) {
        window.open(data.redirectUrl, '_blank');
        // Polling will eventually catch the new connection
      }
    } catch (err) {
      console.error(err);
      alert('Failed to initiate connection. Backend down?');
    } finally {
      setConnecting(null);
    }
  };
  return (
    <div className="h-full flex flex-col p-8 max-w-6xl mx-auto w-full">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center shadow-lg shadow-indigo-500/10">
            <Blocks className="w-7 h-7 text-indigo-400" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-white uppercase tracking-tight">Composio Integrations</h2>
            <p className="text-slate-400 text-sm font-medium">118+ Managed integrations for autonomous agent actions.</p>
          </div>
        </div>
        <div className="bg-[#050505] border border-white/5 rounded-full px-4 py-2 flex items-center gap-2">
           <Search className="w-4 h-4 text-slate-500" />
           <input type="text" placeholder="Search 118+ apps..." className="bg-transparent border-none outline-none text-xs text-white" />
        </div>
      </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {MOCK_INTEGRATIONS.map((integration, index) => {
            const isConnected = connectedApps.includes(integration.id);
            const isConnecting = connecting === integration.id;
            
            return (
            <motion.div 
              key={integration.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="bg-[#050505] border border-white/5 hover:border-white/20 rounded-2xl p-6 transition-colors flex flex-col group relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              
              <div className="flex items-start justify-between relative z-10">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${integration.bg}`}>
                    <integration.icon className={`w-6 h-6 ${integration.color}`} />
                  </div>
                  <div>
                    <h3 className="text-white font-bold text-lg">{integration.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500' : 'bg-slate-600'}`}></span>
                      <span className="text-xs font-medium text-slate-400">
                        {isConnected ? 'Connected' : 'Not Connected'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex gap-3 relative z-10">
                <button 
                  onClick={() => handleConnect(integration.id)}
                  disabled={isConnected || isConnecting}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${
                  isConnected ? 'bg-white/5 text-slate-500 cursor-not-allowed' : 
                  'bg-indigo-600 text-white hover:bg-indigo-500 shadow-lg shadow-indigo-500/20 active:scale-95'
                }`}>
                  {isConnecting ? 'Opening...' : isConnected ? 'Authorized' : 'Connect'}
                </button>
                <button className="w-10 flex items-center justify-center rounded-xl bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 transition-colors">
                  <ArrowUpRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )})}
        </div>
    </div>
  );
}
