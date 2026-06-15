import React, { useCallback, useState } from 'react';
import { API_BASE } from '../../config';
import { 
  ReactFlow, 
  Controls, 
  Background, 
  useNodesState, 
  useEdgesState, 
  addEdge,
  Handle,
  Position,
  MarkerType
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Zap, Play, Plus, Settings2, Globe, Terminal, BrainCircuit, PlayCircle, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { localLLMService } from '../../services/localLLMService';

// -- CUSTOM NODE COMPONENT --
const CustomNode = ({ data, selected }) => {
  let StatusIcon = null;
  if (data.status === 'running') StatusIcon = <Loader2 className="w-3 h-3 text-indigo-400 animate-spin absolute -top-1 -right-1 bg-[#050505] rounded-full" />;
  if (data.status === 'success') StatusIcon = <CheckCircle2 className="w-3 h-3 text-emerald-400 absolute -top-1 -right-1 bg-[#050505] rounded-full" />;
  if (data.status === 'error') StatusIcon = <XCircle className="w-3 h-3 text-red-400 absolute -top-1 -right-1 bg-[#050505] rounded-full" />;

  return (
    <div className={`px-4 py-3 shadow-2xl rounded-xl bg-[#050505] border transition-all relative min-w-[180px] ${selected ? 'border-indigo-500 shadow-indigo-500/20' : 'border-white/10 hover:border-slate-500'}`}>
      {StatusIcon}
      {data.isInput !== false && <Handle type="target" position={Position.Left} className="w-2 h-2 bg-indigo-500 border-none" />}
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${data.color || 'bg-slate-800'}`}>
          {data.icon}
        </div>
        <div>
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{data.type}</p>
          <p className="text-xs font-bold text-white truncate max-w-[120px]">{data.label}</p>
        </div>
      </div>
      {data.isOutput !== false && <Handle type="source" position={Position.Right} className="w-2 h-2 bg-indigo-500 border-none" />}
    </div>
  );
};

const nodeTypes = { clawNode: CustomNode };

const AutomationModule = () => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [isExecuting, setIsExecuting] = useState(false);

  const onConnect = useCallback((params) => setEdges((eds) => addEdge({ ...params, animated: true, markerEnd: { type: MarkerType.ArrowClosed, color: '#6366f1' }, style: { stroke: '#6366f1', strokeWidth: 2 } }, eds)), [setEdges]);
  const onSelectionChange = useCallback(({ nodes }) => { setSelectedNodeId(nodes.length > 0 ? nodes[0].id : null); }, []);

  // -- ADD NODE HELPERS --
  const addNode = (type, label, icon, color, isInput = true, config = {}) => {
    const newNode = {
      id: Date.now().toString(),
      type: 'clawNode',
      position: { x: Math.random() * 200 + 100, y: Math.random() * 200 + 100 },
      data: { type, label, icon, color, isInput, config, status: 'idle', output: null }
    };
    setNodes((nds) => nds.concat(newNode));
  };

  const handleAddTrigger = () => addNode('Trigger', 'Manual Run', <PlayCircle className="w-4 h-4 text-emerald-400" />, 'bg-emerald-400/10', false);
  const handleAddBash = () => addNode('Bash Command', 'Run CLI', <Terminal className="w-4 h-4 text-orange-400" />, 'bg-orange-400/10', true, { command: 'echo "Hello World"' });
  const handleAddHTTP = () => addNode('HTTP Request', 'Fetch API', <Globe className="w-4 h-4 text-sky-400" />, 'bg-sky-400/10', true, { url: 'https://jsonplaceholder.typicode.com/todos/1' });
  const handleAddLLM = () => addNode('LLM Prompt', 'Analyze', <BrainCircuit className="w-4 h-4 text-purple-400" />, 'bg-purple-400/10', true, { prompt: 'Summarize this input: {{input}}' });

  // -- NODE UPDATER --
  const updateNodeConfig = (id, newConfig) => {
    setNodes((nds) => nds.map(n => n.id === id ? { ...n, data: { ...n.data, config: { ...n.data.config, ...newConfig } } } : n));
  };

  const updateNodeLabel = (id, newLabel) => {
    setNodes((nds) => nds.map(n => n.id === id ? { ...n, data: { ...n.data, label: newLabel } } : n));
  };

  const setNodeStatus = (id, status, output = null) => {
    setNodes((nds) => nds.map(n => n.id === id ? { ...n, data: { ...n.data, status, output: output !== null ? output : n.data.output } } : n));
  };

  // -- EXECUTION ENGINE --
  const executeWorkflow = async () => {
    if (isExecuting) return;
    setIsExecuting(true);
    
    // Reset all statuses
    setNodes(nds => nds.map(n => ({ ...n, data: { ...n.data, status: 'idle', output: null } })));

    // Find all triggers (nodes with no incoming edges)
    const incomingEdges = new Set(edges.map(e => e.target));
    const startingNodes = nodes.filter(n => !incomingEdges.has(n.id));

    if (startingNodes.length === 0) {
      alert("No starting Trigger nodes found!");
      setIsExecuting(false);
      return;
    }

    const runNode = async (node, inputData) => {
      setNodeStatus(node.id, 'running');
      let result = null;
      try {
        if (node.data.type === 'Trigger') {
          result = "Triggered manually";
        } 
        else if (node.data.type === 'Bash Command') {
          const resolvedCommand = node.data.config.command.replace('{{input}}', String(inputData || ''));
          const res = await fetch(API_BASE + '/api/automation/bash', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ command: resolvedCommand })
          });
          const data = await res.json();
          result = data.output;
          if (!data.success) throw new Error(data.output);
        }
        else if (node.data.type === 'HTTP Request') {
          const url = node.data.config.url.replace('{{input}}', String(inputData || ''));
          const res = await fetch(`${API_BASE}/proxy/${url}`);
          result = await res.text();
        }
        else if (node.data.type === 'LLM Prompt') {
          const prompt = node.data.config.prompt.replace('{{input}}', String(inputData || ''));
          result = await localLLMService.generate([{ role: 'user', content: prompt }]);
        }

        setNodeStatus(node.id, 'success', result);
        
        // Find children and execute them
        const childrenEdges = edges.filter(e => e.source === node.id);
        for (const edge of childrenEdges) {
          const targetNode = nodes.find(n => n.id === edge.target);
          if (targetNode) {
            await runNode(targetNode, result);
          }
        }
      } catch (err) {
        console.error("Node error:", err);
        setNodeStatus(node.id, 'error', err.message);
      }
    };

    // Start execution from all triggers
    for (const startNode of startingNodes) {
      await runNode(startNode, null);
    }
    
    setIsExecuting(false);
  };

  const selectedNode = nodes.find(n => n.id === selectedNodeId);

  return (
    <div className="h-full w-full flex flex-col bg-[#050505] font-inter overflow-hidden relative">
      <div className="p-6 border-b border-slate-900 bg-[#050505] backdrop-blur-xl z-20 flex justify-between items-center">
         <div>
            <h3 className="text-xl font-black flex items-center gap-3">
               <Zap className="text-amber-400 w-6 h-6" /> WORKFLOW AUTOMATION
            </h3>
            <p className="text-[10px] uppercase font-black tracking-widest text-slate-500">Node-based Desktop Orchestration</p>
         </div>
         <div className="flex gap-3">
            <button 
              onClick={executeWorkflow}
              disabled={isExecuting || nodes.length === 0}
              className={`flex items-center gap-2 px-5 py-2 rounded-xl transition-all text-xs font-black shadow-lg ${isExecuting ? 'bg-slate-800 text-slate-500' : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-500/20 active:scale-95'}`}
            >
               {isExecuting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
               {isExecuting ? 'EXECUTING...' : 'EXECUTE WORKFLOW'}
            </button>
         </div>
      </div>

      <div className="flex-1 flex relative">
        <div className="flex-1 relative">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onSelectionChange={onSelectionChange}
            nodeTypes={nodeTypes}
            colorMode="dark"
          >
            <Background color="#334155" gap={20} />
            <Controls className="bg-[#050505] border-white/5 fill-white" />
          </ReactFlow>

          {/* Add Node Floating Palette */}
          <div className="absolute top-6 left-6 z-10 flex flex-col gap-2">
            <div className="p-3 bg-[#0a0a0a] border border-white/5 rounded-xl backdrop-blur-md shadow-2xl flex flex-col gap-2 w-48">
              <p className="text-[10px] font-black uppercase text-slate-500 mb-1 ml-1 flex items-center gap-1"><Plus className="w-3 h-3"/> ADD NODE</p>
              <button onClick={handleAddTrigger} className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-800 transition-colors text-left group">
                <PlayCircle className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" /> <span className="text-xs font-bold text-slate-300">Trigger (Manual)</span>
              </button>
              <button onClick={handleAddBash} className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-800 transition-colors text-left group">
                <Terminal className="w-4 h-4 text-orange-400 group-hover:scale-110 transition-transform" /> <span className="text-xs font-bold text-slate-300">Bash Command</span>
              </button>
              <button onClick={handleAddHTTP} className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-800 transition-colors text-left group">
                <Globe className="w-4 h-4 text-sky-400 group-hover:scale-110 transition-transform" /> <span className="text-xs font-bold text-slate-300">HTTP Request</span>
              </button>
              <button onClick={handleAddLLM} className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-800 transition-colors text-left group">
                <BrainCircuit className="w-4 h-4 text-purple-400 group-hover:scale-110 transition-transform" /> <span className="text-xs font-bold text-slate-300">LLM Prompt</span>
              </button>
            </div>
          </div>
        </div>

        {/* Node Inspector Sidebar */}
        {selectedNode && (
          <div className="w-80 bg-[#050505]/90 border-l border-white/5 backdrop-blur-xl flex flex-col shadow-2xl z-20 animate-in slide-in-from-right-8 duration-200">
            <div className="p-4 border-b border-white/5 flex items-center gap-2 bg-[#050505]">
               <Settings2 className="w-4 h-4 text-indigo-400" />
               <span className="text-sm font-black uppercase tracking-widest text-slate-200">Node Inspector</span>
            </div>
            
            <div className="p-4 flex flex-col gap-4 overflow-y-auto flex-1">
              {/* Common Fields */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black uppercase text-slate-500">Node Label</label>
                <input 
                  type="text" 
                  value={selectedNode.data.label}
                  onChange={(e) => updateNodeLabel(selectedNode.id, e.target.value)}
                  className="bg-[#050505] border border-white/5 rounded-lg px-3 py-2 text-sm text-white focus:border-indigo-500 outline-none transition-colors font-bold"
                />
              </div>

              {/* Specific Config Fields */}
              {selectedNode.data.type === 'Bash Command' && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black uppercase text-orange-400">Command to Execute</label>
                  <p className="text-[9px] text-slate-500 leading-tight mb-1">Use <code className="text-orange-300">{"{{input}}"}</code> to inject the previous node's output.</p>
                  <textarea 
                    value={selectedNode.data.config.command || ''}
                    onChange={(e) => updateNodeConfig(selectedNode.id, { command: e.target.value })}
                    className="bg-[#050505] border border-white/5 rounded-lg px-3 py-2 text-xs text-white focus:border-orange-500 outline-none transition-colors font-mono h-24 resize-none"
                    placeholder="e.g. dir, ls, echo {{input}}"
                  />
                </div>
              )}

              {selectedNode.data.type === 'HTTP Request' && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black uppercase text-sky-400">URL</label>
                  <input 
                    type="text" 
                    value={selectedNode.data.config.url || ''}
                    onChange={(e) => updateNodeConfig(selectedNode.id, { url: e.target.value })}
                    className="bg-[#050505] border border-white/5 rounded-lg px-3 py-2 text-xs text-white focus:border-sky-500 outline-none transition-colors font-mono"
                  />
                </div>
              )}

              {selectedNode.data.type === 'LLM Prompt' && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black uppercase text-purple-400">Prompt / Instructions</label>
                  <p className="text-[9px] text-slate-500 leading-tight mb-1">Use <code className="text-purple-300">{"{{input}}"}</code> to inject the previous node's output into the prompt.</p>
                  <textarea 
                    value={selectedNode.data.config.prompt || ''}
                    onChange={(e) => updateNodeConfig(selectedNode.id, { prompt: e.target.value })}
                    className="bg-[#050505] border border-white/5 rounded-lg px-3 py-2 text-xs text-white focus:border-purple-500 outline-none transition-colors h-32 resize-none"
                  />
                </div>
              )}

              {/* Output Viewer */}
              {selectedNode.data.output && (
                <div className="mt-4 flex flex-col gap-1.5">
                  <label className="text-[10px] font-black uppercase text-emerald-400 flex items-center gap-1"><CheckCircle2 className="w-3 h-3"/> Last Output</label>
                  <div className="bg-[#050505] border border-white/5 rounded-lg p-3 text-xs text-slate-300 font-mono overflow-auto max-h-48 whitespace-pre-wrap selection:bg-indigo-500/30">
                    {selectedNode.data.output}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AutomationModule;
