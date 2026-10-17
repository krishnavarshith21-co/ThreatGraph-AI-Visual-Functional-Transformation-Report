import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import type { GraphData, GraphNode } from '../types';
import { CytoscapeGraph } from '../components/graph/CytoscapeGraph';
import {
  Globe, Terminal, RefreshCw, Sliders, Play,
  Database, ShieldAlert, ArrowUpRight,
  Copy, Check, X, Share2
} from 'lucide-react';

const CYPHER_PRESETS = [
  { 
    id: 'full-cluster', 
    label: 'Full Topology Cluster', 
    tag: 'Identity',
    query: "MATCH path = (u:User {id: 'user-001'})-[*1..3]-(n) RETURN path" 
  },
  { 
    id: 'db-access', 
    label: 'Database Access Paths', 
    tag: 'Crown Jewels',
    query: "MATCH (e:Event)-[:ACCESSED]->(r:Resource {id: 'res-001'}) RETURN e, r" 
  },
  { 
    id: 'exfil-c2', 
    label: 'Exfiltration & C2 Drops', 
    tag: 'Network Breach',
    query: "MATCH (e:Event)-[:CONNECTED_TO]->(ip:IPAddress) RETURN e, ip" 
  },
  { 
    id: 'lateral-rdp', 
    label: 'Lateral Movement (RDP)', 
    tag: 'Persistence',
    query: "MATCH (u:User {id: 'user-003'})-[r]-(d:Device) RETURN u, r, d" 
  },
];

export function GraphExplorerPage() {
  const navigate = useNavigate();
  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], edges: [] });
  const [loading, setLoading] = useState(true);
  const [cypherQuery, setCypherQuery] = useState(CYPHER_PRESETS[0].query);
  const [queryRunning, setQueryRunning] = useState(false);
  const [traversalDepth, setTraversalDepth] = useState<number>(3);
  const [selectedPreset, setSelectedPreset] = useState<number>(0);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [copiedId, setCopiedId] = useState(false);

  useEffect(() => {
    loadGraphData();
  }, [traversalDepth]);

  async function loadGraphData() {
    try {
      setLoading(true);
      const res = await api.traverseGraph('Device', 'dev-001', traversalDepth);
      setGraphData({
        nodes: res.nodes || [],
        edges: res.edges || [],
        depth: traversalDepth,
      });
    } catch {
      setGraphData({ nodes: [], edges: [] });
    } finally {
      setLoading(false);
    }
  }

  const handleRunQuery = async () => {
    setQueryRunning(true);
    try {
      if (cypherQuery.includes('res-001')) {
        const res = await api.traverseGraph('Resource', 'res-001', 2);
        setGraphData({ nodes: res.nodes || [], edges: res.edges || [] });
      } else if (cypherQuery.includes('user-003')) {
        const res = await api.traverseGraph('User', 'user-003', 2);
        setGraphData({ nodes: res.nodes || [], edges: res.edges || [] });
      } else {
        await loadGraphData();
      }
    } finally {
      setQueryRunning(false);
    }
  };

  const handlePresetSelect = (presetIndex: number) => {
    setSelectedPreset(presetIndex);
    setCypherQuery(CYPHER_PRESETS[presetIndex].query);
  };

  const handleCopyNodeId = () => {
    if (!selectedNode) return;
    navigator.clipboard.writeText(selectedNode.id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const getNodeBadgeClass = (label?: string) => {
    switch (label) {
      case 'User':
        return 'border-[#83CFE0]/30 bg-[#83CFE0]/10 text-[#83CFE0]';
      case 'Device':
        return 'border-[#D8C99A]/30 bg-[#D8C99A]/10 text-[#D8C99A]';
      case 'Alert':
      case 'Incident':
        return 'border-[#DC666B]/30 bg-[#DC666B]/10 text-[#DC666B]';
      case 'Event':
      case 'Resource':
        return 'border-[#C68A69]/30 bg-[#C68A69]/10 text-[#C68A69]';
      default:
        return 'border-[#8A99A8]/30 bg-[#8A99A8]/10 text-[#8A99A8]';
    }
  };

  // Connected edges for the selected node
  const connectedEdges = selectedNode
    ? graphData.edges.filter(e => e.source === selectedNode.id || e.target === selectedNode.id)
    : [];

  return (
    <div className="w-full max-w-[1780px] mx-auto h-[calc(100vh-6.5rem)] flex flex-col gap-3.5 pb-2">
      {/* ── Top Header Bar ────────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-[#1E2D38] flex-shrink-0">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-[#83CFE0] animate-pulse" />
            <span className="text-[11px] font-mono uppercase tracking-widest text-[#83CFE0]">
              FalkorDB Direct Topology Engine
            </span>
            <span className="text-[#344451]">|</span>
            <span className="text-[11px] font-mono text-[#8A99A8]">Cypher 2.0 Subgraph Telemetry</span>
          </div>
          <h1 className="font-heading font-bold text-xl lg:text-2xl text-[#F3F4F0] flex items-center gap-2.5">
            <Globe className="w-5 h-5 text-[#83CFE0]" />
            Knowledge Graph Navigator
          </h1>
        </div>

        {/* Tactical Telemetry Metrics & Hop Control */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Active Graph Metrics Pill */}
          <div className="hidden sm:flex items-center gap-3 px-3 py-1.5 bg-[#101923] border border-[#1E2D38] rounded-sm text-xs font-mono">
            <div className="flex items-center gap-1.5 text-[#8A99A8]">
              <Database className="w-3.5 h-3.5 text-[#83CFE0]" />
              <span>Nodes:</span>
              <strong className="text-[#F3F4F0]">{loading ? '...' : graphData.nodes.length}</strong>
            </div>
            <span className="text-[#1E2D38]">/</span>
            <div className="flex items-center gap-1.5 text-[#8A99A8]">
              <Share2 className="w-3.5 h-3.5 text-[#C68A69]" />
              <span>Edges:</span>
              <strong className="text-[#F3F4F0]">{loading ? '...' : graphData.edges.length}</strong>
            </div>
          </div>

          {/* Hop Depth Range Slider */}
          <div className="flex items-center gap-2.5 text-xs font-mono text-[#8A99A8] bg-[#101923] px-3 py-1.5 rounded-sm border border-[#1E2D38]">
            <Sliders className="w-3.5 h-3.5 text-[#83CFE0]" />
            <span>Hop Depth:</span>
            <input
              type="range"
              min="1"
              max="4"
              value={traversalDepth}
              onChange={(e) => setTraversalDepth(Number(e.target.value))}
              className="w-18 accent-[#83CFE0] cursor-pointer"
            />
            <span className="text-[#83CFE0] font-semibold w-3 text-center">{traversalDepth}</span>
          </div>

          {/* Reset View Button */}
          <button
            onClick={loadGraphData}
            disabled={loading}
            className="p-2 text-[#8A99A8] hover:text-[#F3F4F0] hover:bg-[#1A2732] rounded-sm border border-[#1E2D38] transition-colors"
            title="Reset Graph to Default Cluster"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#83CFE0]' : ''}`} />
          </button>
        </div>
      </div>

      {/* ── Cypher Query Console Bar ──────────────────────────────── */}
      <div className="border border-[#1E2D38] bg-[#101923] p-3 rounded-sm flex-shrink-0 space-y-2.5 shadow-md">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-mono text-[#8A99A8] flex items-center gap-1 mr-1">
              <Terminal className="w-3.5 h-3.5 text-[#83CFE0]" /> Presets:
            </span>
            {CYPHER_PRESETS.map((preset, idx) => (
              <button
                key={preset.id}
                onClick={() => handlePresetSelect(idx)}
                className={`text-[10px] font-mono px-2.5 py-1 rounded-sm transition-all flex items-center gap-1.5 ${
                  selectedPreset === idx
                    ? 'bg-[#83CFE0]/15 text-[#83CFE0] border border-[#83CFE0]/40 font-semibold shadow-sm'
                    : 'bg-[#1A2732]/60 text-[#8A99A8] hover:text-[#F3F4F0] hover:bg-[#1A2732] border border-[#1E2D38]'
                }`}
              >
                <span>{preset.label}</span>
                <span className="text-[9px] opacity-70 px-1 py-0.2 bg-[#070C13]/50 rounded">
                  {preset.tag}
                </span>
              </button>
            ))}
          </div>

          <div className="hidden lg:flex items-center gap-1 text-[11px] font-mono text-[#6B7A85]">
            <span>Press</span>
            <kbd className="px-1.5 py-0.5 bg-[#1A2732] border border-[#1E2D38] rounded text-[10px] text-[#8A99A8]">Enter</kbd>
            <span>to execute</span>
          </div>
        </div>

        {/* Input Bar */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 flex items-center bg-[#070C13] border border-[#1E2D38] focus-within:border-[#83CFE0] rounded-sm transition-colors">
            <span className="pl-3 pr-2 text-xs font-mono text-[#83CFE0] select-none font-semibold">
              CYPHER&gt;
            </span>
            <input
              type="text"
              value={cypherQuery}
              onChange={(e) => setCypherQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleRunQuery();
              }}
              placeholder="MATCH (n) RETURN n LIMIT 25"
              className="w-full bg-transparent py-1.5 pr-3 text-xs font-mono text-[#F3F4F0] placeholder-[#6B7A85] outline-none"
            />
          </div>

          <button
            onClick={handleRunQuery}
            disabled={queryRunning}
            className="btn-primary text-xs py-1.5 px-4 flex items-center gap-1.5 flex-shrink-0"
          >
            <Play className={`w-3 h-3 ${queryRunning ? 'animate-pulse' : ''}`} />
            {queryRunning ? 'Executing...' : 'Run Query'}
          </button>
        </div>
      </div>

      {/* ── Main Canvas Viewport + Lateral Inspector Panel ───────── */}
      <div className="flex-1 w-full min-h-0 flex gap-3.5 relative overflow-hidden">
        {/* Cytoscape Graph Canvas Area */}
        <div className="flex-1 w-full h-full min-w-0 relative">
          <CytoscapeGraph 
            data={graphData} 
            onNodeSelect={(node) => setSelectedNode(node)}
          />
        </div>

        {/* Lateral Entity Inspector Dossier Panel (Shown when a node is selected) */}
        {selectedNode && (
          <aside className="w-80 lg:w-96 flex-shrink-0 bg-[#101923] border border-[#1E2D38] rounded-sm flex flex-col z-20 shadow-2xl animate-in slide-in-from-right duration-200">
            {/* Dossier Header */}
            <div className="p-3.5 border-b border-[#1E2D38] flex items-center justify-between bg-[#1A2732]/40">
              <div className="flex items-center gap-2">
                <span className={`badge-tag border text-[10px] ${getNodeBadgeClass(selectedNode._label)}`}>
                  {selectedNode._label || 'ENTITY'}
                </span>
                <span className="text-xs font-mono font-semibold text-[#F3F4F0] truncate max-w-[180px]">
                  {(selectedNode.hostname as string) || (selectedNode.name as string) || (selectedNode.title as string) || (selectedNode.address as string) || selectedNode.id}
                </span>
              </div>
              <button
                onClick={() => setSelectedNode(null)}
                className="p-1 text-[#8A99A8] hover:text-[#F3F4F0] hover:bg-[#1A2732] rounded transition-colors"
                title="Close Inspector"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Dossier Content Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 font-mono text-xs">
              {/* Primary Identity Section */}
              <div className="space-y-1.5 bg-[#070C13] p-3 rounded-sm border border-[#1E2D38]">
                <div className="text-[10px] uppercase text-[#6B7A85] tracking-wider flex items-center justify-between">
                  <span>Canonical Node ID</span>
                  <button
                    onClick={handleCopyNodeId}
                    className="text-[#83CFE0] hover:text-white flex items-center gap-1 transition-colors"
                    title="Copy Node ID"
                  >
                    {copiedId ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-400" />
                        <span className="text-[9px] text-emerald-400">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span className="text-[9px]">Copy</span>
                      </>
                    )}
                  </button>
                </div>
                <div className="text-xs text-[#F3F4F0] break-all select-all font-mono font-medium">
                  {selectedNode.id}
                </div>
              </div>

              {/* Entity Properties */}
              <div className="space-y-2">
                <span className="text-[10px] uppercase tracking-wider text-[#8A99A8] font-bold block">
                  Node Properties
                </span>
                <div className="space-y-1 bg-[#070C13] p-3 rounded-sm border border-[#1E2D38] divide-y divide-[#1E2D38]/50">
                  {Object.entries(selectedNode)
                    .filter(([key]) => !key.startsWith('_') && key !== 'id')
                    .map(([key, val]) => (
                      <div key={key} className="py-1.5 first:pt-0 last:pb-0 flex items-start justify-between gap-2">
                        <span className="text-[11px] text-[#8A99A8]">{key}:</span>
                        <span className="text-[11px] text-[#F3F4F0] text-right font-medium break-all">
                          {typeof val === 'object' ? JSON.stringify(val) : String(val)}
                        </span>
                      </div>
                    ))}
                  {Object.keys(selectedNode).filter(k => !k.startsWith('_') && k !== 'id').length === 0 && (
                    <div className="text-[11px] text-[#6B7A85] py-1">
                      No additional telemetry attributes logged.
                    </div>
                  )}
                </div>
              </div>

              {/* Connected Relationships Stream */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-[#8A99A8] font-bold">
                  <span>Connected Topology ({connectedEdges.length})</span>
                  <span className="text-[#6B7A85]">1-Hop Radius</span>
                </div>

                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {connectedEdges.map((edge, idx) => {
                    const isOutbound = edge.source === selectedNode.id;
                    const neighborId = isOutbound ? edge.target : edge.source;
                    return (
                      <div 
                        key={idx}
                        className="bg-[#070C13] border border-[#1E2D38] p-2 rounded-sm text-[11px] flex items-center justify-between gap-2"
                      >
                        <div className="flex items-center gap-1.5 truncate">
                          <span className={`text-[9px] px-1 py-0.5 rounded font-bold uppercase ${
                            edge.type === 'CONNECTED_TO' || edge.type === 'EXFILTRATED' 
                              ? 'bg-[#DC666B]/20 text-[#DC666B]' 
                              : 'bg-[#83CFE0]/15 text-[#83CFE0]'
                          }`}>
                            {edge.type}
                          </span>
                          <span className="text-[#8A99A8] truncate">{neighborId}</span>
                        </div>
                        <span className="text-[10px] text-[#6B7A85] flex-shrink-0">
                          {isOutbound ? 'OUT' : 'IN'}
                        </span>
                      </div>
                    );
                  })}
                  {connectedEdges.length === 0 && (
                    <div className="text-[11px] text-[#6B7A85] bg-[#070C13] p-3 rounded-sm border border-[#1E2D38]">
                      No active edge connections in current viewport.
                    </div>
                  )}
                </div>
              </div>

              {/* Triage / Investigation Trigger Action */}
              <div className="pt-2 space-y-2">
                <button
                  onClick={() => {
                    navigate(`/app/investigations?alert=${encodeURIComponent(selectedNode.id)}`);
                  }}
                  className="w-full btn-primary text-xs py-2 px-3 flex items-center justify-center gap-2"
                >
                  <ShieldAlert className="w-3.5 h-3.5" />
                  <span>Launch Agent Investigation</span>
                  <ArrowUpRight className="w-3 h-3 ml-auto" />
                </button>
              </div>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
