import React, { useCallback } from 'react';
import { 
  ReactFlow, 
  Controls, 
  Background, 
  useNodesState, 
  useEdgesState, 
  addEdge,
  Handle,
  Position
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { motion } from 'framer-motion';
import { Zap, Play, Plus, Settings2, Database, Globe, Calendar } from 'lucide-react';

// Custom Node Style for a "PicoClaw Node" (n8n vibe)
const CustomNode = ({ data }) => (
  <div className="px-4 py-3 shadow-2xl rounded-xl bg-slate-900 border border-slate-700 min-w-[180px] group hover:border-indigo-500 transition-all">
    <Handle type="target" position={Position.Left} className="w-2 h-2 bg-indigo-500 border-none" />
    <div className="flex items-center gap-3">
      <div className={`p-2 rounded-lg ${data.color || 'bg-indigo-500/10'}`}>
        {data.icon}
      </div>
      <div>
        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{data.type}</p>
        <p className="text-xs font-bold text-white uppercase">{data.label}</p>
      </div>
    </div>
    <Handle type="source" position={Position.Right} className="w-2 h-2 bg-indigo-500 border-none" />
  </div>
);

const nodeTypes = {
  clawNode: CustomNode,
};

const initialNodes = [
  { 
    id: '1', 
    type: 'clawNode', 
    position: { x: 50, y: 150 }, 
    data: { 
      label: 'On Schedule', 
      type: 'Trigger', 
      icon: <Calendar className="w-4 h-4 text-amber-400" />,
      color: 'bg-amber-400/10'
    } 
  },
  { 
    id: '2', 
    type: 'clawNode', 
    position: { x: 350, y: 150 }, 
    data: { 
       label: 'Search UMPSA', 
       type: 'Action', 
       icon: <Globe className="w-4 h-4 text-sky-400" />,
       color: 'bg-sky-400/10'
    } 
  },
  { 
    id: '3', 
    type: 'clawNode', 
    position: { x: 650, y: 150 }, 
    data: { 
       label: 'Discord Notify', 
       type: 'Output', 
       icon: <Plus className="w-4 h-4 text-indigo-400" />,
       color: 'bg-indigo-400/10'
    } 
  },
];

const initialEdges = [
  { id: 'e1-2', source: '1', target: '2', animated: true, style: { stroke: '#6366f1', strokeWidth: 2 } },
  { id: 'e2-3', source: '2', target: '3', animated: false, style: { stroke: '#64748b', strokeWidth: 2 } },
];

const AutomationModule = () => {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onConnect = useCallback((params) => setEdges((eds) => addEdge(params, eds)), [setEdges]);

  const handleExecute = async () => {
    // Collect workflow data
    const workflow = {
       nodes: nodes.map(n => ({ id: n.id, label: n.data.label, type: n.data.type })),
       edges: edges.map(e => ({ from: e.source, to: e.target }))
    };

    console.log("Executing Workflow:", workflow);
    
    try {
       const response = await fetch('http://localhost:3001/api/chat', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ 
           message: `Execute this automation workflow: ${JSON.stringify(workflow)}`,
           model: 'llama3.1:8b' 
         })
       });
       const data = await response.json();
       alert(`Workflow Execution Started: ${data.response}`);
    } catch (err) {
       alert("Failed to connect to Automation Engine.");
    }
  };

  return (
    <div className="h-full w-full flex flex-col bg-slate-950 font-inter overflow-hidden relative">
      <div className="p-6 border-b border-slate-900 bg-slate-950/80 backdrop-blur-xl z-20 flex justify-between items-center">
         <div>
            <h3 className="text-xl font-black flex items-center gap-3">
               <Zap className="text-amber-400 w-6 h-6" /> WORKFLOW AUTOMATION
            </h3>
            <p className="text-[10px] uppercase font-black tracking-widest text-slate-500">Node-based Agent Orchestration</p>
         </div>
         <div className="flex gap-3">
            <button className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl transition-all text-xs font-bold text-slate-300">
               <Plus className="w-3.5 h-3.5" /> ADD NODE
            </button>
            <button 
              onClick={handleExecute}
              className="flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-xl transition-all text-xs font-black shadow-lg shadow-indigo-500/20 active:scale-95"
            >
               <Play className="w-4 h-4" /> EXECUTE WORKFLOW
            </button>
         </div>
      </div>

      <div className="flex-1 relative">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          fitView
          colorMode="dark"
        >
          <Background color="#334155" gap={20} />
          <Controls className="bg-slate-900 border-slate-800 fill-white" />
          
          <div className="absolute top-6 left-6 z-10">
             <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-2xl backdrop-blur-md">
                <div className="flex items-center gap-2 mb-2">
                   <Settings2 className="w-3 h-3 text-slate-500" />
                   <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Workflow Inspector</span>
                </div>
                <div className="text-[11px] font-bold text-slate-500">Target Server: <span className="text-white font-mono">172.17.27.62</span></div>
             </div>
          </div>
        </ReactFlow>
      </div>
    </div>
  );
};

export default AutomationModule;
