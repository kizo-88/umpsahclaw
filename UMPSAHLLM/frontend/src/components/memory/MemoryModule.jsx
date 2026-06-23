import React, { useState, useEffect, useRef, useCallback } from 'react';
import { apiFetch } from '../../config';
import { Database, Search, ZoomIn, ZoomOut, Maximize, Activity } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ForceGraph2D from 'react-force-graph-2d';

export default function MemoryModule() {
  const [memories, setMemories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedNode, setSelectedNode] = useState(null);
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const containerRef = useRef();
  const graphRef = useRef();

  useEffect(() => {
    if (containerRef.current) {
      setDimensions({
        width: containerRef.current.clientWidth,
        height: containerRef.current.clientHeight
      });
    }
  }, []);

  useEffect(() => {
    apiFetch('/api/memory/list')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          const rawMemories = data.memories || [];
          setMemories(rawMemories);

          // Build Graph Data
          const nodes = [{ id: 'core', name: 'Core Intel', type: 'core', val: 10, color: '#6366f1' }];
          const links = [];

          rawMemories.forEach(mem => {
            const isSkill = mem.prompt.startsWith('/skills');
            const isRag = mem.prompt.startsWith('/rag');
            let type = 'interaction';
            let color = '#3b82f6'; // Blue for interaction
            
            if (isSkill) {
              type = 'skill';
              color = '#10b981'; // Green for skill
            } else if (isRag) {
              type = 'rag';
              color = '#f59e0b'; // Amber for RAG
            }

            nodes.push({
              id: `mem_${mem.id}`,
              name: isSkill || isRag ? mem.prompt : `Interaction #${mem.id}`,
              val: isSkill || isRag ? 6 : 4,
              color: color,
              type: type,
              data: mem
            });
            links.push({ source: 'core', target: `mem_${mem.id}` });
          });

          // Add some fake dummy skills and rags for visual flair if empty
          if (rawMemories.length === 0) {
            nodes.push(
              { id: 's1', name: '/skills web-search', val: 6, color: '#10b981', type: 'skill', data: { prompt: '/skills web-search', consensus: 'Web search tool installed.' } },
              { id: 's2', name: '/skills code-exec', val: 6, color: '#10b981', type: 'skill', data: { prompt: '/skills code-exec', consensus: 'Code execution tool installed.' } },
              { id: 'r1', name: '/rag docs.pdf', val: 6, color: '#f59e0b', type: 'rag', data: { prompt: '/rag docs.pdf', consensus: 'Ingested 42 pages.' } }
            );
            links.push({ source: 'core', target: 's1' }, { source: 'core', target: 's2' }, { source: 'core', target: 'r1' });
          }

          setGraphData({ nodes, links });
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleNodeClick = useCallback(node => {
    setSelectedNode(node);
  }, []);

  return (
    <div className="h-full flex flex-col p-8 max-w-7xl mx-auto w-full">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center shadow-lg shadow-indigo-500/10">
            <Activity className="w-7 h-7 text-indigo-400" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-white uppercase tracking-tight">Memory Neural Net</h2>
            <p className="text-slate-400 text-sm font-medium">Visualizing Interactions, Skills, and RAG knowledge.</p>
          </div>
        </div>
        <div className="flex gap-4">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase"><span className="w-2 h-2 rounded-full bg-blue-500"></span> Interaction</div>
          <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase"><span className="w-2 h-2 rounded-full bg-emerald-500"></span> Skill</div>
          <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase"><span className="w-2 h-2 rounded-full bg-amber-500"></span> RAG File</div>
        </div>
      </div>

      <div className="flex-1 flex gap-6 relative">
        <div 
          ref={containerRef}
          className="flex-1 bg-[#050505]/60 backdrop-blur-3xl border border-white/5 rounded-3xl overflow-hidden shadow-2xl relative cursor-crosshair"
        >
          {!loading && (
            <ForceGraph2D
              ref={graphRef}
              width={dimensions.width}
              height={dimensions.height}
              graphData={graphData}
              nodeColor="color"
              nodeVal="val"
              nodeLabel="name"
              onNodeClick={handleNodeClick}
              linkColor={() => 'rgba(255,255,255,0.1)'}
              linkWidth={1}
              backgroundColor="transparent"
              nodeCanvasObjectMode={() => 'after'}
              nodeCanvasObject={(node, ctx, globalScale) => {
                const label = node.name;
                const fontSize = 12/globalScale;
                ctx.font = `${fontSize}px Sans-Serif`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
                if (node.id !== 'core') {
                  ctx.fillText(label, node.x, node.y + 8 + fontSize);
                } else {
                  ctx.fillText(label, node.x, node.y + 12 + fontSize);
                }
              }}
            />
          )}
        </div>

        {/* Node Details Modal Overlay */}
        <AnimatePresence>
          {selectedNode && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-50 flex items-center justify-center p-8 bg-black/60 backdrop-blur-md rounded-3xl"
              onClick={() => setSelectedNode(null)}
            >
              <motion.div 
                initial={{ scale: 0.95, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 20 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-2xl bg-[#0a0a0a] border border-white/10 rounded-3xl p-8 shadow-2xl flex flex-col relative"
              >
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <span className={`w-4 h-4 rounded-full shadow-lg ${
                      selectedNode.id === 'core' ? 'bg-indigo-500 shadow-indigo-500/50' :
                      selectedNode.type === 'skill' ? 'bg-emerald-500 shadow-emerald-500/50' : 
                      selectedNode.type === 'rag' ? 'bg-amber-500 shadow-amber-500/50' : 
                      'bg-blue-500 shadow-blue-500/50'
                    }`}></span>
                    <span className={`text-xs font-black uppercase tracking-widest px-3 py-1 rounded-full ${
                      selectedNode.id === 'core' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' :
                      selectedNode.type === 'skill' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 
                      selectedNode.type === 'rag' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 
                      'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                    }`}>
                      {selectedNode.type === 'core' ? 'System Core' : selectedNode.type + ' Neuron'}
                    </span>
                  </div>
                  <button onClick={() => setSelectedNode(null)} className="text-slate-500 hover:text-white transition-colors bg-white/5 hover:bg-white/10 w-8 h-8 rounded-full flex items-center justify-center">&times;</button>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar max-h-[60vh]">
                  {selectedNode.id === 'core' ? (
                    <div className="bg-black/50 border border-white/5 rounded-2xl p-6">
                      <p className="text-slate-300 text-sm leading-relaxed font-mono">
                        This is the core intelligence node connecting all integrated memories, skills, and RAG contexts. All neural branches stem from here.
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-4">
                      {/* Interaction Query / Prompt */}
                      <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                        <h4 className="text-xs font-bold uppercase tracking-widest text-indigo-400 mb-3">User Query / Prompt</h4>
                        <h3 className="text-white font-medium text-lg leading-relaxed">
                          {selectedNode.data?.prompt || 'No Prompt Data'}
                        </h3>
                      </div>
                      
                      {/* AI Consensus / Detail */}
                      <div className="bg-black/50 border border-white/5 rounded-2xl p-6">
                        <h4 className="text-xs font-bold uppercase tracking-widest text-emerald-400 mb-3">AI Consensus / Details</h4>
                        <p className="text-slate-300 text-sm whitespace-pre-wrap leading-relaxed font-mono">
                          {selectedNode.data?.consensus || 'No Consensus Data'}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-between text-xs font-bold uppercase tracking-widest text-slate-500">
                   <span>Node ID: {selectedNode.id}</span>
                   <span>{selectedNode.data?.timestamp ? new Date(selectedNode.data.timestamp).toLocaleString() : 'System Active'}</span>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
