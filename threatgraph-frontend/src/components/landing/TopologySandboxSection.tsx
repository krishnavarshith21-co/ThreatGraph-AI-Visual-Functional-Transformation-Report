import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { HERO_NODES, HERO_EDGES } from './hero/heroData';
import type { HeroNode, HeroEdge } from './hero/heroTypes';
import { InteractiveTopologyExplorer } from './topology/InteractiveTopologyExplorer';
import {
  Compass, Shield, ExternalLink,
  Database, User, Cpu, FileCode,
  Globe
} from 'lucide-react';

type EntityFilterType = 'All' | 'User' | 'Device' | 'Event' | 'IPAddress' | 'Resource';

export function TopologySandboxSection() {
  const { user, signInAsGuest } = useAuth();
  const navigate = useNavigate();

  // State
  const [selectedNode, setSelectedNode] = useState<HeroNode | null>(HERO_NODES[4]); // LSASS Memory Dump
  const [activeFilter, setActiveFilter] = useState<EntityFilterType>('All');
  const [isolateAttackPath, setIsolateAttackPath] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'3d' | '2d'>('3d');

  const handleLaunchApp = (destination = '/app/graph') => {
    localStorage.setItem('threatgraph_guest_session', 'true');
    if (!user) {
      signInAsGuest();
    }
    navigate(destination);
  };

  // Connected edges and neighbor nodes for selected node
  const currentNode = selectedNode || HERO_NODES[0];
  const connectedEdgeList = HERO_EDGES.filter(
    (e: HeroEdge) => e.source === currentNode.id || e.target === currentNode.id
  );
  const neighborIds = new Set<string>();
  connectedEdgeList.forEach((e: HeroEdge) => {
    if (e.source === currentNode.id) neighborIds.add(e.target);
    if (e.target === currentNode.id) neighborIds.add(e.source);
  });
  const neighborNodes = HERO_NODES.filter((n: HeroNode) => neighborIds.has(n.id));

  // Entity icon renderer
  const renderIcon = (type: string) => {
    switch (type) {
      case 'User':
        return <User className="w-4 h-4 text-[#38BDF8]" />;
      case 'Device':
        return <Cpu className="w-4 h-4 text-[#D9C18A]" />;
      case 'IPAddress':
        return <Globe className="w-4 h-4 text-[#DC666B]" />;
      case 'Event':
        return <FileCode className="w-4 h-4 text-[#C68A69]" />;
      case 'Resource':
        return <Database className="w-4 h-4 text-[#38BDF8]" />;
      default:
        return <Shield className="w-4 h-4 text-[#38BDF8]" />;
    }
  };

  return (
    <section id="topology" className="py-20 lg:py-28 bg-[#070B14] relative border-t border-[#1E2D38] overflow-hidden scroll-mt-16">
      {/* Background atmospheric ambient gradient */}
      <div className="absolute top-1/3 left-0 w-[550px] h-[550px] bg-[#38BDF8]/[0.025] rounded-full blur-[170px] pointer-events-none" />
      <div className="absolute bottom-10 right-0 w-[500px] h-[500px] bg-[#818CF8]/[0.02] rounded-full blur-[160px] pointer-events-none" />

      <div className="max-w-[1780px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-12">
          <div className="max-w-3xl">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-[11px] font-mono uppercase tracking-[0.2em] text-[#38BDF8] font-semibold flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#38BDF8] animate-pulse" />
                Chapter 03 / Operational Topology Exploration
              </span>
              <div className="w-12 h-[1px] bg-[#1E2D38]" />
            </div>
            <h2 className="font-heading text-3xl sm:text-4xl lg:text-[2.75rem] font-bold text-[#F3F4F0] leading-[1.12] mb-4 tracking-tight">
              Enterprise topology sandbox &amp;<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#38BDF8] to-[#818CF8]">
                live graph correlation.
              </span>
            </h2>
            <p className="text-[#94A3B8] text-sm sm:text-base font-body leading-relaxed">
              Inspect relationships directly across workstations, administrative bastions, database assets, and compromised identities. The visualization camera automatically calibrates to the bounding geometry of the topology cluster.
            </p>
          </div>

          <button
            onClick={() => handleLaunchApp('/app/graph')}
            className="bg-[#0B1525] hover:bg-[#122338] text-white border border-[#1E2D38] hover:border-[#38BDF8]/60 px-5 py-3 rounded-lg text-xs font-mono flex items-center gap-2 transition-all shadow-lg hover:shadow-[0_0_20px_rgba(56,189,248,0.25)] self-start lg:self-auto cursor-pointer"
          >
            <span>Open Full Graph Workspace</span>
            <ExternalLink className="w-4 h-4 text-[#38BDF8]" />
          </button>
        </div>

        {/* 3D Topology Analysis Workspace & Inspector Frame */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 rounded-xl border border-[#1E2D38] bg-[#0A1320] shadow-2xl overflow-hidden">
          
          {/* Main Viewport (lg:col-span-8 xl:col-span-9) */}
          <div className="lg:col-span-8 xl:col-span-9 min-h-[540px] sm:min-h-[620px] w-full relative bg-[#070B14]">
            
            {/* Top HUD Overlay: 3D/2D Mode, Filter Pills, Attack Path Isolation */}
            <div className="absolute top-4 inset-x-4 z-20 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
              
              {/* Left Controls: 3D/2D switch + Filter Pills */}
              <div className="flex flex-wrap items-center gap-1.5 bg-[#09111A]/90 backdrop-blur-md p-1 rounded-lg border border-[#1E2D38] pointer-events-auto font-mono text-xs shadow-lg">
                <button
                  onClick={() => setViewMode('3d')}
                  className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                    viewMode === '3d'
                      ? 'bg-[#122338] text-[#38BDF8] font-semibold border border-[#38BDF8]/40 shadow-sm'
                      : 'text-[#64748B] hover:text-[#94A3B8]'
                  }`}
                >
                  3D Spatial
                </button>
                <button
                  onClick={() => setViewMode('2d')}
                  className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                    viewMode === '2d'
                      ? 'bg-[#122338] text-[#38BDF8] font-semibold border border-[#38BDF8]/40 shadow-sm'
                      : 'text-[#64748B] hover:text-[#94A3B8]'
                  }`}
                >
                  2D Planar
                </button>

                <div className="w-[1px] h-4 bg-[#1E2D38] mx-1" />

                {(['All', 'User', 'Device', 'Event', 'IPAddress', 'Resource'] as EntityFilterType[]).map((type) => {
                  const count = type === 'All' ? HERO_NODES.length : HERO_NODES.filter((n: HeroNode) => n.type === type).length;
                  const isSelected = activeFilter === type;
                  return (
                    <button
                      key={type}
                      onClick={() => setActiveFilter(type)}
                      className={`px-2.5 py-1 rounded transition-all cursor-pointer text-[11px] ${
                        isSelected
                          ? 'bg-[#1E2D38] text-[#38BDF8] font-semibold'
                          : 'text-[#64748B] hover:text-[#94A3B8]'
                      }`}
                    >
                      <span>{type}</span>
                      <span className="text-[9px] opacity-60 ml-1">({count})</span>
                    </button>
                  );
                })}
              </div>

              {/* Right Controls: Attack Path Toggle */}
              <div className="flex items-center gap-1.5 bg-[#09111A]/90 backdrop-blur-md p-1 rounded-lg border border-[#1E2D38] pointer-events-auto font-mono text-xs shadow-lg">
                <button
                  onClick={() => setIsolateAttackPath(!isolateAttackPath)}
                  className={`px-3 py-1.5 rounded-md text-[11px] transition-all cursor-pointer flex items-center gap-1.5 ${
                    isolateAttackPath
                      ? 'bg-[#DC666B]/20 text-[#DC666B] border border-[#DC666B]/40 font-semibold shadow-[0_0_12px_rgba(220,102,107,0.3)]'
                      : 'text-[#64748B] hover:text-[#94A3B8]'
                  }`}
                  title="Isolate 5-Stage Attack Trajectory"
                >
                  <Shield className="w-3.5 h-3.5" />
                  <span>Isolate Attack Path</span>
                </button>
              </div>
            </div>

            {/* Interactive 3D / 2D Explorer Canvas */}
            <InteractiveTopologyExplorer
              selectedNode={selectedNode}
              onSelectNode={setSelectedNode}
              activeFilter={activeFilter}
              isolateAttackPath={isolateAttackPath}
              viewMode={viewMode}
            />
          </div>

          {/* Contextual Entity Inspector Panel (lg:col-span-4 xl:col-span-3) */}
          <div className="lg:col-span-4 xl:col-span-3 border-t lg:border-t-0 lg:border-l border-[#1E2D38] bg-[#0A1320] p-5 sm:p-6 flex flex-col justify-between font-mono text-xs">
            <div className="space-y-4">
              {/* Header */}
              <div className="flex items-center justify-between pb-3.5 border-b border-[#1E2D38]">
                <span className="text-[#38BDF8] font-semibold text-xs flex items-center gap-2">
                  <Compass className="w-4 h-4 text-[#38BDF8]" /> ENTITY INSPECTOR
                </span>
                <span
                  className="text-[9px] text-[#38BDF8] bg-[#38BDF8]/10 px-2 py-0.5 rounded border border-[#38BDF8]/20 font-semibold"
                  title="Curated 24-node incident trajectory scenario"
                >
                  SYNTHETIC SCENARIO
                </span>
              </div>

              {/* Entity Overview */}
              <div className="space-y-3.5">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-[#0F1E32] border border-[#1E2D38] flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm">
                    {renderIcon(currentNode.type)}
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-[#122338] text-[#38BDF8] border border-[#38BDF8]/30">
                      {currentNode.type}
                    </span>
                    <h3 className="font-heading font-bold text-base text-[#F3F4F0] mt-1.5 truncate">
                      {currentNode.label}
                    </h3>
                    <span className="text-[#64748B] text-[10px] block truncate font-mono">
                      ID: {currentNode.id}
                    </span>
                  </div>
                </div>

                {currentNode.isAttackPath && (
                  <div className="text-[11px] text-[#DC666B] bg-[#DC666B]/10 border border-[#DC666B]/30 p-2.5 rounded-lg flex items-center gap-2">
                    <Shield className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>Active in Attack Trajectory (Stage 0{currentNode.stageNumber || 1})</span>
                  </div>
                )}

                {/* Attributes Table */}
                <div className="space-y-1.5 border-t border-[#1E2D38] pt-3">
                  <span className="text-[10px] text-[#64748B] uppercase tracking-wider block font-semibold">
                    Entity Attributes
                  </span>
                  <div className="bg-[#070D16] p-3 rounded-lg border border-[#1E2D38] space-y-1.5 text-[11px]">
                    {currentNode.meta &&
                      Object.entries(currentNode.meta).map(([k, v]) => (
                        <div key={k} className="flex justify-between gap-2">
                          <span className="text-[#64748B] capitalize">{k}:</span>
                          <span className="text-[#F3F4F0] font-medium truncate text-right">{String(v)}</span>
                        </div>
                      ))}
                  </div>
                </div>

                {/* Connected Relationships & Neighbor Quick Pivots */}
                <div className="space-y-1.5 border-t border-[#1E2D38] pt-3">
                  <div className="flex items-center justify-between text-[10px] text-[#64748B] uppercase tracking-wider font-semibold">
                    <span>Connected Entities ({neighborNodes.length})</span>
                    <span className="text-[9px] text-[#38BDF8]">Click to inspect</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 max-h-[85px] overflow-y-auto pt-1">
                    {neighborNodes.length > 0 ? (
                      neighborNodes.map((neighbor: HeroNode) => (
                        <button
                          key={neighbor.id}
                          onClick={() => setSelectedNode(neighbor)}
                          className="px-2.5 py-1 rounded-md text-[10px] bg-[#0F1E32] hover:bg-[#1A2E46] border border-[#1E2D38] hover:border-[#38BDF8] text-[#94A3B8] hover:text-[#F3F4F0] transition-colors truncate max-w-[150px] cursor-pointer"
                          title={neighbor.label}
                        >
                          {neighbor.label}
                        </button>
                      ))
                    ) : (
                      <span className="text-[10px] text-[#64748B] italic">No immediate neighbors</span>
                    )}
                  </div>
                </div>

                {/* Cypher Query Representation */}
                <div className="space-y-1.5 border-t border-[#1E2D38] pt-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-[#64748B] uppercase tracking-wider block font-semibold">
                      FalkorDB Cypher Traversal
                    </span>
                    <span className="text-[9px] text-[#38BDF8] font-mono">Incident Projection</span>
                  </div>
                  <div className="bg-[#070D16] p-2.5 rounded-lg border border-[#1E2D38] text-[10px] text-[#38BDF8] overflow-x-auto leading-relaxed font-mono">
                    MATCH (n &#123;id: &apos;{currentNode.id}&apos;&#125;)-[r]-(target)<br />
                    RETURN n, r, target LIMIT 25
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Launch Button */}
            <button
              onClick={() => handleLaunchApp('/app/graph')}
              className="w-full text-xs py-2.5 px-4 rounded-lg bg-[#122338] hover:bg-[#1A314E] border border-[#38BDF8]/40 hover:border-[#38BDF8] text-[#38BDF8] hover:text-white justify-center flex items-center gap-2 font-mono mt-4 transition-all shadow-md cursor-pointer"
            >
              <span>Explore in Console Workspace</span>
              <ExternalLink className="w-3.5 h-3.5 text-[#38BDF8]" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
