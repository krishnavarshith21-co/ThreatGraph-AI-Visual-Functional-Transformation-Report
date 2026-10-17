'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import type { HealthStatus } from '@/lib/types';
import { HERO_NODES, HERO_EDGES, HERO_INVESTIGATION_STAGES } from '@/components/landing/hero/heroData';
import type { HeroNode } from '@/components/landing/hero/heroTypes';
import {
  Compass, Shield, ExternalLink,
  Database, User, Cpu, FileCode, Globe,
  AlertTriangle, Focus, Share2, RotateCcw,
  Search, Check, X, Clock, BarChart2,
  Layers, Terminal, CheckCircle2, ChevronRight,
  Copy, CheckCheck, Code, FileText, Crosshair,
  ArrowRight, Radio, Info, Activity, Zap
} from 'lucide-react';

const InteractiveTopologyExplorer = dynamic(
  () => import('./topology/InteractiveTopologyExplorer').then((m) => m.InteractiveTopologyExplorer),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full min-h-[580px] flex flex-col items-center justify-center bg-[#060A12] text-[#38BDF8] font-mono text-xs gap-3">
        <div className="w-7 h-7 border-2 border-[#38BDF8] border-t-transparent rounded-full animate-spin" />
        <span className="tracking-wider uppercase text-[11px]">Initializing 3D Cyber Topology Matrix...</span>
      </div>
    ),
  }
);

type EntityFilterType = 'All' | 'User' | 'Device' | 'Event' | 'IPAddress' | 'Resource';
type InspectorTab = 'Overview' | 'Attributes' | 'Evidence' | 'Relations';

// Cinematic entity type color mapping
const ENTITY_COLORS: Record<string, string> = {
  User: '#10B981',
  Device: '#38BDF8',
  Event: '#EF4444',
  IPAddress: '#A855F7',
  Resource: '#F59E0B',
};

export function TopologySandboxSection() {
  const { user, signInAsGuest } = useAuth();
  const router = useRouter();

  // Live Backend Health State
  const [backendHealth, setBackendHealth] = useState<HealthStatus | null>(null);

  // Interaction State
  const [selectedNode, setSelectedNode] = useState<HeroNode | null>(HERO_NODES[4]); // LSASS Memory Dump default
  const [focusTrigger, setFocusTrigger] = useState<number>(0);
  const [activeFilter, setActiveFilter] = useState<EntityFilterType>('All');
  const [isolateAttackPath, setIsolateAttackPath] = useState<boolean>(false);
  const [isolateSelection, setIsolateSelection] = useState<boolean>(false);
  const [showNeighbors, setShowNeighbors] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [viewMode, setViewMode] = useState<'3d' | '2d'>('3d');
  const [inspectorTab, setInspectorTab] = useState<InspectorTab>('Overview');
  const [isInspectorOpen, setIsInspectorOpen] = useState<boolean>(true);
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [rawJsonView, setRawJsonView] = useState<boolean>(false);

  // Fetch real backend health for live stats card
  useEffect(() => {
    let mounted = true;
    api.health()
      .then((data) => {
        if (mounted) setBackendHealth(data);
      })
      .catch(() => {
        if (mounted) setBackendHealth(null);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const handleLaunchApp = (destination = '/app/graph') => {
    if (!user) {
      signInAsGuest();
    }
    router.push(destination);
  };

  // Node count helpers
  const userCount = useMemo(() => HERO_NODES.filter((n) => n.type === 'User').length, []);
  const deviceCount = useMemo(() => HERO_NODES.filter((n) => n.type === 'Device').length, []);
  const eventCount = useMemo(() => HERO_NODES.filter((n) => n.type === 'Event').length, []);
  const ipCount = useMemo(() => HERO_NODES.filter((n) => n.type === 'IPAddress').length, []);
  const resourceCount = useMemo(() => HERO_NODES.filter((n) => n.type === 'Resource').length, []);

  // Connected edges and neighbor nodes for selected node
  const currentNode = selectedNode;

  const connectedEdgeList = useMemo(() => {
    if (!currentNode) return [];
    return HERO_EDGES.filter(
      (e) => e.source === currentNode.id || e.target === currentNode.id
    );
  }, [currentNode]);

  const connectedEntities = useMemo(() => {
    if (!currentNode) return [];
    return connectedEdgeList.map((edge) => {
      const isOutgoing = edge.source === currentNode.id;
      const targetId = isOutgoing ? edge.target : edge.source;
      const targetNode = HERO_NODES.find((n) => n.id === targetId);
      return {
        edgeId: edge.id,
        label: edge.label,
        isOutgoing,
        direction: isOutgoing ? 'OUTGOING' : 'INCOMING',
        targetNode,
        targetId,
      };
    }).filter((item): item is typeof item & { targetNode: HeroNode } => item.targetNode !== undefined);
  }, [connectedEdgeList, currentNode]);

  const handleSelectAndFocusNode = useCallback((node: HeroNode | null) => {
    setSelectedNode(node);
    if (node) {
      setFocusTrigger((prev) => prev + 1);
      setIsInspectorOpen(true);
    }
  }, []);

  const handleCopy = useCallback((text: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedText(text);
      setTimeout(() => {
        setCopiedText(null);
      }, 2000);
    }
  }, []);

  const handleResetAll = useCallback(() => {
    setActiveFilter('All');
    setIsolateAttackPath(false);
    setIsolateSelection(false);
    setShowNeighbors(false);
    setSearchQuery('');
    setSelectedNode(HERO_NODES[4]);
    setFocusTrigger((prev) => prev + 1);
  }, []);

  // Search matches for live dropdown
  const searchMatches = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return HERO_NODES.filter(
      (n) =>
        n.label.toLowerCase().includes(q) ||
        n.id.toLowerCase().includes(q) ||
        (n.meta && Object.values(n.meta).some((v) => String(v).toLowerCase().includes(q)))
    ).slice(0, 6);
  }, [searchQuery]);

  // Render node icon with cinematic colors
  const renderIcon = (type: string, className = "w-4 h-4") => {
    const color = ENTITY_COLORS[type] || '#38BDF8';
    switch (type) {
      case 'User':
        return <User className={className} style={{ color }} />;
      case 'Device':
        return <Cpu className={className} style={{ color }} />;
      case 'IPAddress':
        return <Globe className={className} style={{ color }} />;
      case 'Event':
        return <FileCode className={className} style={{ color }} />;
      case 'Resource':
        return <Database className={className} style={{ color }} />;
      default:
        return <Shield className={className} style={{ color }} />;
    }
  };

  // Live node & edge count from real FalkorDB health or fallback
  const liveNodes = backendHealth?.services?.falkordb?.nodes ?? 49;
  const liveEdges = backendHealth?.services?.falkordb?.edges ?? 57;
  const isCloudConnected = backendHealth?.services?.falkordb?.status === 'connected';

  // Matched stage data for selected node if attack path
  const currentStageData = useMemo(() => {
    if (!currentNode || !currentNode.isAttackPath) return null;
    return HERO_INVESTIGATION_STAGES.find(
      (s) => s.anchorNodeId === currentNode.id || s.stageNumber === currentNode.stageNumber
    ) || null;
  }, [currentNode]);

  return (
    <section id="topology" className="py-10 sm:py-14 lg:py-16 bg-[#060A12] relative border-t border-[#0F1A28] overflow-hidden scroll-mt-20">
      {/* Atmospheric ambient gradients — cinematic depth */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-0 w-[650px] h-[650px] bg-[#38BDF8]/[0.015] rounded-full blur-[200px]" />
        <div className="absolute bottom-20 right-0 w-[550px] h-[550px] bg-[#EF4444]/[0.012] rounded-full blur-[180px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-[#A855F7]/[0.008] rounded-full blur-[220px]" />
      </div>

      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* ── CINEMATIC SECTION HEADER & TELEMETRY CARDS ─────────── */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-end mb-6">
          
          {/* Left Title & Description (col-span-5) */}
          <div className="xl:col-span-5 space-y-2.5">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono uppercase tracking-[0.22em] text-[#38BDF8]/80 font-semibold flex items-center gap-1.5">
                <span className="text-[#38BDF8]">✦</span>
                CHAPTER 03 / OPERATIONAL TOPOLOGY EXPLORATION
              </span>
            </div>
            
            <h2 className="font-heading text-3xl sm:text-4xl lg:text-[2.5rem] font-bold text-[#E8ECF0] leading-[1.12] tracking-tight">
              Enterprise topology sandbox &amp;<br />
              <span className="bg-gradient-to-r from-[#38BDF8] to-[#818CF8] bg-clip-text text-transparent">
                live graph correlation.
              </span>
            </h2>

            <p className="text-[#7A8BA0] text-sm font-body leading-relaxed max-w-xl">
              Inspect relationships directly across workstations, administrative bastions, database assets, and compromised identities. The visualization camera automatically calibrates to the bounding geometry of the topology cluster.
            </p>
          </div>

          {/* Right: 3 Cinematic Metric Cards (col-span-7) */}
          <div className="xl:col-span-7 grid grid-cols-1 sm:grid-cols-3 gap-3">
            
            {/* Card 1: Dataset Synthetic Scenario */}
            <div className="rounded-lg border border-[#162332] bg-[#0A0F1A]/90 backdrop-blur-sm p-3.5 font-mono shadow-lg relative overflow-hidden group hover:border-[#EF4444]/30 transition-colors">
              <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-gradient-to-b from-[#EF4444] to-[#EF4444]/30 rounded-r" />
              <div className="pl-2">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-[#EF4444]/10 border border-[#EF4444]/20 flex items-center justify-center flex-shrink-0">
                      <Layers className="w-3.5 h-3.5 text-[#EF4444]" />
                    </div>
                    <div>
                      <span className="text-[9px] uppercase tracking-wider text-[#5A6B80] block leading-none">Dataset</span>
                      <span className="text-[11px] font-bold text-[#E8ECF0] leading-tight block mt-0.5">Synthetic Scenario</span>
                    </div>
                  </div>
                  <span className="text-[8px] font-mono font-bold px-1.5 py-0.5 rounded bg-[#111A26] text-[#7A8BA0] border border-[#162332]">
                    SANDBOX
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 mt-2.5 pt-2.5 border-t border-[#162332]">
                  <div>
                    <span className="text-lg font-bold text-white block leading-none">24</span>
                    <span className="text-[9px] text-[#5A6B80] mt-0.5 block">Nodes</span>
                  </div>
                  <div>
                    <span className="text-lg font-bold text-white block leading-none">32</span>
                    <span className="text-[9px] text-[#5A6B80] mt-0.5 block">Relationships</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Card 2: Live Graph (FalkorDB) */}
            <div className="rounded-lg border border-[#162332] bg-[#0A0F1A]/90 backdrop-blur-sm p-3.5 font-mono shadow-lg relative overflow-hidden group hover:border-[#10B981]/30 transition-colors">
              <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-gradient-to-b from-[#10B981] to-[#10B981]/30 rounded-r" />
              <div className="pl-2">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-[#10B981]/10 border border-[#10B981]/20 flex items-center justify-center flex-shrink-0">
                      <Database className="w-3.5 h-3.5 text-[#10B981]" />
                    </div>
                    <div>
                      <span className="text-[9px] uppercase tracking-wider text-[#5A6B80] block leading-none">Live Graph</span>
                      <span className="text-[11px] font-bold text-[#E8ECF0] leading-tight block mt-0.5">FalkorDB Cloud</span>
                    </div>
                  </div>
                  <span className={`text-[8px] font-bold font-mono px-1.5 py-0.5 rounded flex items-center gap-1 ${
                    isCloudConnected
                      ? 'bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30'
                      : 'bg-[#111A26] text-[#38BDF8] border border-[#162332]'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${isCloudConnected ? 'bg-[#10B981] animate-pulse' : 'bg-[#38BDF8]'}`} />
                    {isCloudConnected ? 'CONNECTED' : 'STANDBY'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 mt-2.5 pt-2.5 border-t border-[#162332]">
                  <div>
                    <span className="text-lg font-bold text-white block leading-none">{liveNodes}</span>
                    <span className="text-[9px] text-[#5A6B80] mt-0.5 block">Nodes</span>
                  </div>
                  <div>
                    <span className="text-lg font-bold text-white block leading-none">{liveEdges}</span>
                    <span className="text-[9px] text-[#5A6B80] mt-0.5 block">Relationships</span>
                  </div>
                </div>

                <div className="mt-2 pt-2 border-t border-[#162332] flex items-center gap-1.5 text-[8px] text-[#7A8BA0]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#F59E0B]" />
                  <span className="truncate">Development · Unencrypted (Free Tier)</span>
                </div>
              </div>
            </div>

            {/* Card 3: Backend API */}
            <div className="rounded-lg border border-[#162332] bg-[#0A0F1A]/90 backdrop-blur-sm p-3.5 font-mono shadow-lg relative overflow-hidden group hover:border-[#38BDF8]/30 transition-colors">
              <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-gradient-to-b from-[#38BDF8] to-[#38BDF8]/30 rounded-r" />
              <div className="pl-2">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-[#38BDF8]/10 border border-[#38BDF8]/20 flex items-center justify-center flex-shrink-0">
                      <Cpu className="w-3.5 h-3.5 text-[#38BDF8]" />
                    </div>
                    <div>
                      <span className="text-[9px] uppercase tracking-wider text-[#5A6B80] block leading-none">Backend API</span>
                      <span className="text-[11px] font-bold text-[#E8ECF0] leading-tight block mt-0.5">v0.5.18</span>
                    </div>
                  </div>
                  <span className="text-[8px] font-bold font-mono px-1.5 py-0.5 rounded bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
                    Healthy
                  </span>
                </div>

                <div className="mt-2.5 pt-2.5 border-t border-[#162332] flex items-center justify-between">
                  <div>
                    <span className="text-[9px] text-[#5A6B80] block">Uptime</span>
                    <span className="text-[11px] font-bold text-[#E8ECF0]">Active</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[9px] text-[#5A6B80] block">Environment</span>
                    <span className="text-[11px] font-bold text-[#38BDF8]">Development</span>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* ── 3-COLUMN CINEMATIC WORKSPACE ── */}
        <div className={`rounded-xl border border-[#162332] bg-[#080D17] shadow-2xl shadow-black/40 overflow-hidden grid grid-cols-1 ${
          isInspectorOpen
            ? 'min-[960px]:grid-cols-[210px_1fr_320px] xl:grid-cols-[230px_1fr_360px]'
            : 'min-[960px]:grid-cols-[210px_1fr] xl:grid-cols-[230px_1fr]'
        }`}>
          
          {/* ── 1. Left Sidebar: Entity Types, Search, Quick Filters ── */}
          <div className="w-full border-b min-[960px]:border-b-0 min-[960px]:border-r border-[#162332] bg-[#070C15] p-3.5 flex flex-col justify-between font-mono text-xs overflow-y-auto min-[960px]:max-h-[660px] custom-scrollbar">
            <div className="space-y-3.5">
              
              {/* Entity Types Section */}
              <div>
                <span className="text-[10px] font-semibold text-[#5A6B80] uppercase tracking-wider block mb-2">
                  Entity Types
                </span>

                <div className="grid grid-cols-2 sm:grid-cols-3 min-[960px]:grid-cols-1 gap-1">
                  {/* All Entities */}
                  <button
                    onClick={() => setActiveFilter('All')}
                    className={`w-full flex items-center justify-between px-2 py-1.5 rounded-md transition-all cursor-pointer text-[11px] ${
                      activeFilter === 'All'
                        ? 'bg-[#38BDF8]/10 text-[#38BDF8] border border-[#38BDF8]/30 font-semibold'
                        : 'text-[#8A9BB0] hover:bg-[#0E1724] border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className={`w-3.5 h-3.5 rounded flex items-center justify-center border transition-colors ${
                        activeFilter === 'All' ? 'bg-[#38BDF8] border-[#38BDF8] text-[#060A12]' : 'border-[#162332]'
                      }`}>
                        {activeFilter === 'All' && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                      </div>
                      <span>All Entities</span>
                    </div>
                    <span className="text-[10px] text-[#5A6B80] font-medium">{HERO_NODES.length}</span>
                  </button>

                  {/* Per-type filter buttons with color-coded checkboxes */}
                  {([
                    { type: 'User' as EntityFilterType, icon: User, count: userCount },
                    { type: 'Device' as EntityFilterType, icon: Cpu, count: deviceCount },
                    { type: 'Event' as EntityFilterType, icon: FileCode, count: eventCount },
                    { type: 'IPAddress' as EntityFilterType, icon: Globe, count: ipCount },
                    { type: 'Resource' as EntityFilterType, icon: Database, count: resourceCount },
                  ]).map(({ type, icon: Icon, count }) => {
                    const color = ENTITY_COLORS[type];
                    const isActive = activeFilter === type;
                    return (
                      <button
                        key={type}
                        onClick={() => setActiveFilter(type)}
                        className={`w-full flex items-center justify-between px-2 py-1.5 rounded-md transition-all cursor-pointer text-[11px] ${
                          isActive
                            ? 'bg-[#0E1724] font-semibold border'
                            : 'text-[#8A9BB0] hover:bg-[#0E1724] border border-transparent'
                        }`}
                        style={isActive ? { borderColor: `${color}40`, color } : undefined}
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3.5 h-3.5 rounded flex items-center justify-center border transition-colors"
                            style={isActive
                              ? { backgroundColor: color, borderColor: color, color: '#060A12' }
                              : { borderColor: '#162332' }
                            }
                          >
                            {isActive && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                          </div>
                          <Icon className="w-3.5 h-3.5" style={{ color }} />
                          <span>{type}</span>
                        </div>
                        <span className="text-[10px] text-[#5A6B80] font-medium">{count}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Search Entity */}
              <div>
                <span className="text-[10px] font-semibold text-[#5A6B80] uppercase tracking-wider block mb-2">
                  Search Entity
                </span>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-[#5A6B80] absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by name, ID, IP..."
                    className="w-full bg-[#0B1320] border border-[#162332] focus:border-[#38BDF8]/50 rounded-md pl-8 pr-7 py-1.5 text-[11px] text-[#E8ECF0] placeholder-[#3D4E63] outline-none transition-colors"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-[#5A6B80] hover:text-white"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {/* Instant Search Matches List */}
                {searchMatches.length > 0 && (
                  <div className="mt-2 space-y-0.5 max-h-36 overflow-y-auto p-1 bg-[#0A0F1A] rounded border border-[#162332]">
                    <span className="text-[8px] text-[#5A6B80] uppercase px-1.5 block">Matches:</span>
                    {searchMatches.map((m) => (
                      <button
                        key={m.id}
                        onClick={() => handleSelectAndFocusNode(m)}
                        className="w-full flex items-center justify-between p-1.5 rounded hover:bg-[#111A29] text-left text-[10px] text-[#E8ECF0] transition-colors truncate"
                      >
                        <div className="flex items-center gap-1.5 truncate">
                          {renderIcon(m.type, "w-3 h-3 flex-shrink-0")}
                          <span className="truncate">{m.label}</span>
                        </div>
                        <span className="text-[8px] text-[#5A6B80] uppercase font-mono ml-1">{m.type}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Quick Filters */}
              <div>
                <span className="text-[10px] font-semibold text-[#5A6B80] uppercase tracking-wider block mb-2">
                  Quick Filters
                </span>

                <div className="grid grid-cols-2 min-[960px]:grid-cols-1 gap-1">
                  <button
                    onClick={() => setIsolateAttackPath(!isolateAttackPath)}
                    className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md transition-all cursor-pointer text-[11px] ${
                      isolateAttackPath
                        ? 'bg-[#EF4444]/15 text-[#EF4444] border border-[#EF4444]/40 font-semibold shadow-[0_0_12px_rgba(239,68,68,0.15)]'
                        : 'text-[#8A9BB0] hover:bg-[#0E1724] border border-transparent'
                    }`}
                  >
                    <AlertTriangle className="w-3.5 h-3.5 text-[#EF4444]" />
                    <span>Show Attack Path</span>
                  </button>

                  <button
                    onClick={() => setIsolateSelection(!isolateSelection)}
                    className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md transition-all cursor-pointer text-[11px] ${
                      isolateSelection
                        ? 'bg-[#38BDF8]/15 text-[#38BDF8] border border-[#38BDF8]/40 font-semibold'
                        : 'text-[#8A9BB0] hover:bg-[#0E1724] border border-transparent'
                    }`}
                  >
                    <Focus className="w-3.5 h-3.5 text-[#38BDF8]" />
                    <span>Isolate Selection</span>
                  </button>

                  <button
                    onClick={() => setShowNeighbors(!showNeighbors)}
                    className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md transition-all cursor-pointer text-[11px] ${
                      showNeighbors
                        ? 'bg-[#38BDF8]/15 text-[#38BDF8] border border-[#38BDF8]/40 font-semibold'
                        : 'text-[#8A9BB0] hover:bg-[#0E1724] border border-transparent'
                    }`}
                  >
                    <Share2 className="w-3.5 h-3.5 text-[#38BDF8]" />
                    <span>Show Neighbors</span>
                  </button>

                  <button
                    onClick={handleResetAll}
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-[#8A9BB0] hover:bg-[#0E1724] hover:text-[#E8ECF0] transition-colors cursor-pointer text-[11px]"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-[#5A6B80]" />
                    <span>Reset View</span>
                  </button>
                </div>
              </div>

            </div>
          </div>

          {/* ── 2. Central Graph Visualization Viewport ─────────────── */}
          <div className="min-w-0 w-full relative min-h-[560px] sm:min-h-[600px] min-[960px]:min-h-[660px] bg-[#060A12] overflow-hidden">
            <InteractiveTopologyExplorer
              selectedNode={selectedNode}
              onSelectNode={setSelectedNode}
              activeFilter={activeFilter}
              isolateAttackPath={isolateAttackPath}
              viewMode={viewMode}
              onFilterChange={(f) => setActiveFilter(f as EntityFilterType)}
              onViewModeChange={setViewMode}
              searchQuery={searchQuery}
              isolateSelection={isolateSelection}
              showNeighbors={showNeighbors}
              onResetView={handleResetAll}
              focusTrigger={focusTrigger}
            />

            {!isInspectorOpen && (
              <button
                onClick={() => setIsInspectorOpen(true)}
                className="absolute right-3.5 top-16 sm:top-18 z-20 px-2.5 py-1.5 rounded-lg bg-[#09111A]/95 border border-[#162332] text-[#38BDF8] hover:bg-[#0E1724] font-mono text-xs flex items-center gap-1.5 shadow-xl cursor-pointer transition-colors"
                title="Open Inspector"
              >
                <Compass className="w-3.5 h-3.5" />
                <span>Inspector</span>
              </button>
            )}
          </div>

          {/* ── 3. Right Sidebar: Cinematic Entity Inspector ──────── */}
          {isInspectorOpen && (
            <div className="w-full border-t min-[960px]:border-t-0 min-[960px]:border-l border-[#162332] bg-[#070C15] p-3.5 flex flex-col justify-between font-mono text-xs overflow-y-auto min-[960px]:max-h-[660px] custom-scrollbar">
              {currentNode ? (
                <div className="space-y-3">
                  
                  {/* Inspector Header */}
                  <div className="flex items-center justify-between pb-2 border-b border-[#162332]">
                    <span className="text-[#38BDF8] font-semibold text-[11px] flex items-center gap-1.5 uppercase tracking-wide">
                      <Compass className="w-3.5 h-3.5" /> ENTITY INSPECTOR
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[8px] text-[#38BDF8] bg-[#38BDF8]/8 px-2 py-0.5 rounded border border-[#38BDF8]/15 font-semibold">
                        SYNTHETIC SCENARIO
                      </span>
                      <button
                        onClick={() => setIsInspectorOpen(false)}
                        className="p-1 text-[#5A6B80] hover:text-white rounded transition-colors cursor-pointer"
                        title="Collapse Inspector"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  {/* Selected Node Identity Card — Cinematic Style */}
                  <div className="bg-[#0A0F1A] p-3 rounded-lg border border-[#162332] relative overflow-hidden">
                    {/* Subtle glow accent for attack path nodes */}
                    {currentNode.isAttackPath && (
                      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[#EF4444] via-[#EF4444]/60 to-transparent" />
                    )}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2.5 min-w-0">
                        <div className="w-9 h-9 rounded-lg bg-[#0E1724] border border-[#162332] flex items-center justify-center flex-shrink-0 mt-0.5">
                          {renderIcon(currentNode.type, "w-4.5 h-4.5")}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <span className="text-[8px] uppercase font-bold px-1.5 py-0.5 rounded" style={{
                              backgroundColor: `${ENTITY_COLORS[currentNode.type] || '#38BDF8'}15`,
                              color: ENTITY_COLORS[currentNode.type] || '#38BDF8',
                              border: `1px solid ${ENTITY_COLORS[currentNode.type] || '#38BDF8'}30`,
                            }}>
                              {currentNode.type}
                            </span>
                          </div>
                          <h3 className="font-heading font-bold text-[13px] text-[#E8ECF0] mt-0.5 truncate" title={currentNode.label}>
                            {currentNode.label}
                          </h3>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[#5A6B80] text-[9px] truncate font-mono">
                              ID: {currentNode.id}
                            </span>
                            <button
                              onClick={() => handleCopy(currentNode.id)}
                              className="text-[#5A6B80] hover:text-[#38BDF8] transition-colors p-0.5 cursor-pointer"
                              title="Copy entity ID"
                            >
                              {copiedText === currentNode.id ? (
                                <CheckCheck className="w-2.5 h-2.5 text-[#10B981]" />
                              ) : (
                                <Copy className="w-2.5 h-2.5" />
                              )}
                            </button>
                          </div>
                        </div>
                      </div>

                      <span className={`text-[8px] font-bold px-2 py-1 rounded-md flex-shrink-0 whitespace-nowrap ${
                        currentNode.isAttackPath
                          ? 'text-[#EF4444] bg-[#EF4444]/12 border border-[#EF4444]/25'
                          : 'text-[#10B981] bg-[#10B981]/12 border border-[#10B981]/25'
                      }`}>
                        ● {currentNode.isAttackPath ? 'High Risk' : 'Baseline'}
                      </span>
                    </div>
                  </div>

                  {/* Threat Trajectory Banner — Cinematic */}
                  {currentNode.isAttackPath && (
                    <div className="text-[10px] bg-gradient-to-r from-[#EF4444]/12 to-[#EF4444]/5 border border-[#EF4444]/25 p-2.5 rounded-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1.5">
                      <div className="flex items-center gap-1.5">
                        <Shield className="w-3.5 h-3.5 text-[#EF4444] flex-shrink-0" />
                        <span className="text-[#EF4444] font-semibold">Active in Attack Trajectory (Stage 0{currentNode.stageNumber || 2})</span>
                      </div>
                      {currentNode.meta?.technique && (
                        <a
                          href={`https://attack.mitre.org/techniques/${String(currentNode.meta.technique).replace(/MITRE\s+/i, '').replace(/\./, '/')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[9px] text-[#38BDF8] hover:underline flex items-center gap-1 flex-shrink-0"
                        >
                          <span>MITRE ATT&CK: {String(currentNode.meta.technique)}</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      )}
                    </div>
                  )}

                  {/* Inspector Tabs — Cinematic */}
                  <div className="flex items-center border-b border-[#162332] text-[10px]">
                    {(['Overview', 'Attributes', 'Evidence', 'Relations'] as InspectorTab[]).map((tab) => {
                      const isActive = inspectorTab === tab;
                      const countBadge =
                        tab === 'Evidence'
                          ? `(${currentNode.meta?.evidenceAnchor ? '1' : '0'})`
                          : tab === 'Relations'
                          ? `(${connectedEntities.length})`
                          : '';

                      return (
                        <button
                          key={tab}
                          onClick={() => setInspectorTab(tab)}
                          className={`px-2.5 py-1.5 font-medium transition-colors cursor-pointer border-b-2 -mb-[1px] ${
                            isActive
                              ? 'border-[#38BDF8] text-[#38BDF8]'
                              : 'border-transparent text-[#5A6B80] hover:text-[#8A9BB0]'
                          }`}
                        >
                          {tab} {countBadge && <span className="text-[9px] opacity-70">{countBadge}</span>}
                        </button>
                      );
                    })}
                  </div>

                  {/* Tab Content: Overview */}
                  {inspectorTab === 'Overview' && (
                    <div className="space-y-2.5">
                      <p className="text-[10px] text-[#8A9BB0] leading-relaxed bg-[#0A0F1A] p-2.5 rounded border border-[#162332]">
                        {currentNode.meta?.summary ||
                          'Target infrastructure asset under active behavioral baseline observation in cybersecurity topology sandbox.'}
                      </p>

                      {/* Dynamic Metadata Key-Value Grid — Cinematic */}
                      <div className="space-y-0 text-[10px] bg-[#0A0F1A] rounded-lg border border-[#162332] overflow-hidden">
                        {currentNode.meta?.technique && (
                          <div className="flex justify-between items-center py-1.5 px-3 border-b border-[#162332]/60">
                            <span className="text-[#5A6B80]">Technique</span>
                            <span className="text-[#E8ECF0] font-medium font-mono">{String(currentNode.meta.technique)}</span>
                          </div>
                        )}
                        {currentNode.meta?.tactic && (
                          <div className="flex justify-between items-center py-1.5 px-3 border-b border-[#162332]/60">
                            <span className="text-[#5A6B80]">Tactic</span>
                            <span className="text-[#E8ECF0] font-medium font-mono">{String(currentNode.meta.tactic)}</span>
                          </div>
                        )}
                        {currentNode.meta?.tool && (
                          <div className="flex justify-between items-center py-1.5 px-3 border-b border-[#162332]/60">
                            <span className="text-[#5A6B80]">Tool</span>
                            <span className="text-[#E8ECF0] font-medium font-mono truncate max-w-[180px]">{String(currentNode.meta.tool)}</span>
                          </div>
                        )}
                        {currentNode.meta?.targetProcess && (
                          <div className="flex justify-between items-center py-1.5 px-3 border-b border-[#162332]/60">
                            <span className="text-[#5A6B80]">Target Process</span>
                            <span className="text-[#E8ECF0] font-medium font-mono">{String(currentNode.meta.targetProcess)}</span>
                          </div>
                        )}
                        {currentNode.meta?.os && (
                          <div className="flex justify-between items-center py-1.5 px-3 border-b border-[#162332]/60">
                            <span className="text-[#5A6B80]">Host</span>
                            <span className="text-[#E8ECF0] font-medium font-mono">{String(currentNode.meta.os)}</span>
                          </div>
                        )}
                        {currentNode.meta?.role && (
                          <div className="flex justify-between items-center py-1.5 px-3 border-b border-[#162332]/60">
                            <span className="text-[#5A6B80]">Role / Scope</span>
                            <span className="text-[#E8ECF0] font-medium font-mono">{String(currentNode.meta.role)}</span>
                          </div>
                        )}
                        {currentNode.meta?.internalIp && (
                          <div className="flex justify-between items-center py-1.5 px-3 border-b border-[#162332]/60">
                            <span className="text-[#5A6B80]">Internal IP</span>
                            <span className="text-[#E8ECF0] font-medium font-mono">{String(currentNode.meta.internalIp)}</span>
                          </div>
                        )}
                        {currentNode.meta?.classification && (
                          <div className="flex justify-between items-center py-1.5 px-3 border-b border-[#162332]/60">
                            <span className="text-[#5A6B80]">Classification</span>
                            <span className="text-[#38BDF8] font-medium font-mono">{String(currentNode.meta.classification)}</span>
                          </div>
                        )}
                        <div className="flex justify-between items-center py-1.5 px-3">
                          <span className="text-[#5A6B80]">Severity</span>
                          <span className={`font-bold font-mono flex items-center gap-1 ${
                            currentNode.isAttackPath ? 'text-[#EF4444]' : 'text-[#10B981]'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${
                              currentNode.isAttackPath ? 'bg-[#EF4444]' : 'bg-[#10B981]'
                            }`} />
                            {currentNode.isAttackPath ? 'High' : 'Benign Baseline'}
                          </span>
                        </div>
                      </div>

                      {/* Connected Entities Section */}
                      <div className="space-y-1.5 pt-1">
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="text-[#E8ECF0] font-bold">
                            Connected Entities ({connectedEntities.length})
                          </span>
                          <button
                            onClick={() => handleLaunchApp('/app/graph')}
                            className="text-[9px] text-[#38BDF8] hover:underline flex items-center gap-1 cursor-pointer"
                          >
                            <span>View In Graph</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </button>
                        </div>

                        <div className="space-y-1">
                          {connectedEntities.length > 0 ? (
                            connectedEntities.map((ent) => (
                              <div
                                key={ent.edgeId}
                                onClick={() => handleSelectAndFocusNode(ent.targetNode)}
                                className="flex items-center justify-between p-2 rounded-lg bg-[#0A0F1A] hover:bg-[#0E1724] border border-[#162332] hover:border-[#38BDF8]/40 transition-all cursor-pointer"
                                title={`Click to focus ${ent.targetNode.label}`}
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <div className="w-5 h-5 rounded flex items-center justify-center bg-[#0E1724]">
                                    {renderIcon(ent.targetNode.type, "w-3 h-3")}
                                  </div>
                                  <span className="text-[#E8ECF0] font-medium truncate text-[10px]">{ent.targetNode.label}</span>
                                  <span className="text-[9px] text-[#5A6B80] font-mono">{ent.targetNode.type}</span>
                                </div>
                                <span className="text-[8px] px-1.5 py-0.5 rounded bg-[#0E1724] text-[#38BDF8] border border-[#38BDF8]/15 flex-shrink-0 font-mono">
                                  [{ent.label}]
                                </span>
                              </div>
                            ))
                          ) : (
                            <div className="text-[10px] text-[#5A6B80] p-3 text-center bg-[#0A0F1A] rounded border border-[#162332]">
                              No direct single-hop relationships found.
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Tab Content: Attributes */}
                  {inspectorTab === 'Attributes' && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between pb-1">
                        <span className="text-[9px] text-[#5A6B80] uppercase">Attributes Schema</span>
                        <button
                          onClick={() => setRawJsonView(!rawJsonView)}
                          className="text-[9px] text-[#38BDF8] hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <Code className="w-3 h-3" />
                          <span>{rawJsonView ? 'Table View' : 'Raw JSON'}</span>
                        </button>
                      </div>

                      {rawJsonView ? (
                        <div className="relative">
                          <pre className="text-[9px] font-mono text-[#8A9BB0] bg-[#050910] p-3 rounded-lg border border-[#162332] overflow-x-auto max-h-72">
                            {JSON.stringify(currentNode, null, 2)}
                          </pre>
                          <button
                            onClick={() => handleCopy(JSON.stringify(currentNode, null, 2))}
                            className="absolute top-2 right-2 p-1 rounded bg-[#0E1724] border border-[#162332] text-[#8A9BB0] hover:text-[#38BDF8] cursor-pointer"
                            title="Copy JSON"
                          >
                            {copiedText === JSON.stringify(currentNode, null, 2) ? (
                              <CheckCheck className="w-3 h-3 text-[#10B981]" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                      ) : (
                        <div className="text-[10px] bg-[#0A0F1A] rounded-lg border border-[#162332] overflow-hidden">
                          <div className="flex justify-between py-1.5 px-3 border-b border-[#162332]/60">
                            <span className="text-[#5A6B80]">Node ID:</span>
                            <span className="text-[#E8ECF0] font-mono truncate">{currentNode.id}</span>
                          </div>
                          <div className="flex justify-between py-1.5 px-3 border-b border-[#162332]/60">
                            <span className="text-[#5A6B80]">Entity Label:</span>
                            <span className="text-[#E8ECF0] font-mono truncate">{currentNode.label}</span>
                          </div>
                          <div className="flex justify-between py-1.5 px-3 border-b border-[#162332]/60">
                            <span className="text-[#5A6B80]">Entity Type:</span>
                            <span className="font-mono" style={{ color: ENTITY_COLORS[currentNode.type] || '#38BDF8' }}>{currentNode.type}</span>
                          </div>
                          <div className="flex justify-between py-1.5 px-3 border-b border-[#162332]/60">
                            <span className="text-[#5A6B80]">Attack Path Flag:</span>
                            <span className="text-[#E8ECF0] font-mono">{currentNode.isAttackPath ? 'true' : 'false'}</span>
                          </div>
                          {currentNode.meta &&
                            Object.entries(currentNode.meta).map(([k, v]) => (
                              <div key={k} className="flex justify-between py-1.5 px-3 border-b border-[#162332]/60 last:border-0 group">
                                <span className="text-[#5A6B80] capitalize">{k}:</span>
                                <span
                                  onClick={() => handleCopy(String(v))}
                                  className="text-[#E8ECF0] font-mono text-right max-w-[180px] truncate cursor-pointer hover:text-[#38BDF8]"
                                  title="Click to copy value"
                                >
                                  {String(v)}
                                </span>
                              </div>
                            ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Tab Content: Evidence */}
                  {inspectorTab === 'Evidence' && (
                    <div className="space-y-2 text-[10px]">
                      {currentNode.meta?.evidenceAnchor ? (
                        <div className="p-2.5 rounded-lg bg-[#0A0F1A] border border-[#162332]">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[#EF4444] font-bold">Forensic Evidence Anchor</span>
                            <button
                              onClick={() => handleCopy(String(currentNode.meta?.evidenceAnchor))}
                              className="text-[#5A6B80] hover:text-[#38BDF8] cursor-pointer"
                              title="Copy Evidence Log"
                            >
                              {copiedText === String(currentNode.meta?.evidenceAnchor) ? (
                                <CheckCheck className="w-3 h-3 text-[#10B981]" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          </div>
                          <p className="text-[#8A9BB0] text-[9px] font-mono leading-relaxed bg-[#080D17] p-2 rounded border border-[#162332]/60">
                            {String(currentNode.meta?.evidenceAnchor)}
                          </p>
                        </div>
                      ) : null}

                      {currentNode.meta?.provenance ? (
                        <div className="p-2.5 rounded-lg bg-[#0A0F1A] border border-[#162332]">
                          <span className="text-[#38BDF8] font-bold block mb-1">Telemetry Provenance</span>
                          <p className="text-[#8A9BB0] text-[9px] font-mono leading-relaxed">
                            {String(currentNode.meta?.provenance)}
                          </p>
                        </div>
                      ) : null}

                      {currentStageData ? (
                        <div className="p-2.5 rounded-lg bg-[#0A0F1A] border border-[#162332]">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[#D8C99A] font-bold">Chronology Correlation</span>
                            <span className="text-[9px] text-[#5A6B80] font-mono">{currentStageData.timestamp}</span>
                          </div>
                          <p className="text-[#8A9BB0] text-[9px] leading-relaxed">
                            {currentStageData.summary}
                          </p>
                        </div>
                      ) : null}

                      {!currentNode.meta?.evidenceAnchor && !currentNode.meta?.provenance && (
                        <div className="p-3 text-center bg-[#0A0F1A] rounded-lg border border-[#162332] text-[#5A6B80]">
                          <CheckCircle2 className="w-5 h-5 text-[#10B981] mx-auto mb-1.5 opacity-80" />
                          <span className="text-white font-medium block">Baseline Telemetry Verified</span>
                          <p className="text-[9px] text-[#5A6B80] mt-1">No hostile indicators or anomalous EDR alerts linked to this node.</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Tab Content: Relations */}
                  {inspectorTab === 'Relations' && (
                    <div className="space-y-1.5 text-[10px]">
                      <div className="flex items-center justify-between text-[9px] text-[#5A6B80] pb-1">
                        <span>Graph Traversal Edges ({connectedEdgeList.length})</span>
                      </div>
                      {connectedEdgeList.length > 0 ? (
                        connectedEdgeList.map((e) => (
                          <div
                            key={e.id}
                            className="p-2 rounded bg-[#0A0F1A] border border-[#162332]/60 flex items-center justify-between gap-1 text-[9px]"
                          >
                            <button
                              onClick={() => {
                                const target = HERO_NODES.find((n) => n.id === e.source);
                                if (target) handleSelectAndFocusNode(target);
                              }}
                              className="text-[#38BDF8] font-mono hover:underline truncate max-w-[85px] cursor-pointer"
                              title={`Focus ${e.source}`}
                            >
                              {e.source}
                            </button>
                            <span className="text-[#EF4444] text-[8px] font-mono px-1.5 py-0.5 rounded bg-[#EF4444]/8 border border-[#EF4444]/15 flex-shrink-0">
                              [{e.label}]
                            </span>
                            <button
                              onClick={() => {
                                const target = HERO_NODES.find((n) => n.id === e.target);
                                if (target) handleSelectAndFocusNode(target);
                              }}
                              className="text-[#38BDF8] font-mono hover:underline truncate max-w-[85px] cursor-pointer"
                              title={`Focus ${e.target}`}
                            >
                              {e.target}
                            </button>
                          </div>
                        ))
                      ) : (
                        <div className="text-[10px] text-[#5A6B80] p-3 text-center bg-[#0A0F1A] rounded border border-[#162332]">
                          No connected edges recorded.
                        </div>
                      )}
                    </div>
                  )}

                </div>
              ) : (
                /* Empty state when no node is selected */
                <div className="h-full flex flex-col items-center justify-center text-center p-4 space-y-4">
                  <div className="w-12 h-12 rounded-full bg-[#0E1E30] border border-[#38BDF8]/30 flex items-center justify-center text-[#38BDF8] animate-pulse">
                    <Crosshair className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-heading font-bold text-sm text-[#E8ECF0]">NO ENTITY SELECTED</h4>
                    <p className="text-[10px] text-[#5A6B80] mt-1 max-w-[240px]">
                      Select any node in the 3D topology canvas or click an event from the timeline below to inspect forensic telemetry and graph relations.
                    </p>
                  </div>

                  <div className="w-full space-y-1 pt-2">
                    <span className="text-[8px] uppercase tracking-wider text-[#5A6B80] block text-left">Quick Launcher:</span>
                    <button
                      onClick={() => handleSelectAndFocusNode(HERO_NODES[4])}
                      className="w-full text-left p-2 rounded bg-[#0E1724] hover:bg-[#162234] border border-[#162332] text-[10px] text-[#EF4444] flex items-center justify-between transition-colors cursor-pointer"
                    >
                      <span>LSASS Memory Dump</span>
                      <span className="text-[8px] text-[#5A6B80]">Stage 02</span>
                    </button>
                    <button
                      onClick={() => handleSelectAndFocusNode(HERO_NODES[0])}
                      className="w-full text-left p-2 rounded bg-[#0E1724] hover:bg-[#162234] border border-[#162332] text-[10px] text-[#38BDF8] flex items-center justify-between transition-colors cursor-pointer"
                    >
                      <span>185.220.101.42 (TOR Exit)</span>
                      <span className="text-[8px] text-[#5A6B80]">Stage 01</span>
                    </button>
                    <button
                      onClick={() => handleSelectAndFocusNode(HERO_NODES[6])}
                      className="w-full text-left p-2 rounded bg-[#0E1724] hover:bg-[#162234] border border-[#162332] text-[10px] text-[#F59E0B] flex items-center justify-between transition-colors cursor-pointer"
                    >
                      <span>SRV-ADMIN-01 (Bastion)</span>
                      <span className="text-[8px] text-[#5A6B80]">Stage 03</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Bottom Traversal Actions */}
              <div className="pt-3 border-t border-[#162332] space-y-2 mt-4">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleLaunchApp('/app/graph')}
                    className="text-[10px] py-2 px-3 rounded-lg bg-[#38BDF8]/10 hover:bg-[#38BDF8]/15 border border-[#38BDF8]/30 text-[#38BDF8] font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <Terminal className="w-3 h-3" />
                    <span>Run Graph Query</span>
                  </button>
                  <button
                    onClick={() => handleLaunchApp('/app/graph')}
                    className="text-[10px] py-2 px-3 rounded-lg bg-[#0A0F1A] hover:bg-[#0E1724] border border-[#162332] text-[#E8ECF0] font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <span>Explore Full Workspace</span>
                    <ExternalLink className="w-3 h-3 text-[#38BDF8]" />
                  </button>
                </div>
              </div>

            </div>
          )}

        </div>

        {/* ── LOWER 3 CINEMATIC INFORMATION PANELS ── */}
        <div className="grid grid-cols-1 min-[960px]:grid-cols-12 gap-3 mt-3 font-mono text-xs items-stretch">
          
          {/* 1. Investigation Timeline (col-span-4) */}
          <div className="min-[960px]:col-span-4 rounded-lg border border-[#162332] bg-[#0A0F1A]/90 p-3.5 shadow-xl flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-2 border-b border-[#162332] mb-2.5">
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-[#38BDF8]" />
                  <span className="font-bold text-white text-[11px]">Investigation Timeline</span>
                </div>
                <button
                  onClick={() => handleLaunchApp('/app/investigations')}
                  className="text-[9px] text-[#38BDF8] hover:underline cursor-pointer flex items-center gap-0.5"
                >
                  View All <ArrowRight className="w-2.5 h-2.5" />
                </button>
              </div>

              <div className="space-y-1">
                {[
                  { id: 'evt-lsass-dump', time: '03:22:08', label: 'LSASS Memory Dump detected', severity: 'Critical', color: '#EF4444' },
                  { id: 'evt-rdp-lateral', time: '03:38:45', label: 'Lateral RDP to Bastion', severity: 'High', color: '#F59E0B' },
                  { id: 'evt-phish-ingress', time: '03:14:22', label: 'Spear Phishing Ingress', severity: 'High', color: '#EF4444' },
                  { id: 'evt-db-query', time: '03:49:12', label: 'Bulk Database Query', severity: 'Critical', color: '#EF4444' },
                  { id: 'evt-exfil-stream', time: '04:02:30', label: '4.2GB Encrypted Egress', severity: 'Critical', color: '#EF4444' },
                ].map((item) => {
                  const isSelected = selectedNode?.id === item.id;
                  return (
                    <button
                      key={item.id}
                      id={`timeline-event-${item.id}`}
                      onClick={() => {
                        const target = HERO_NODES.find((n) => n.id === item.id);
                        if (target) handleSelectAndFocusNode(target);
                      }}
                      className={`w-full flex items-center justify-between p-1.5 rounded cursor-pointer transition-all text-left ${
                        isSelected
                          ? 'bg-[#162538] border border-[#38BDF8]/40 shadow-[0_0_8px_rgba(56,189,248,0.15)]'
                          : 'hover:bg-[#0E1724] border border-transparent'
                      }`}
                      title="Click to focus event in 3D graph"
                    >
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                        <span className="text-[#5A6B80] text-[9px] font-mono flex-shrink-0">{item.time}</span>
                        <span className="text-[#E8ECF0] text-[10px] truncate">{item.label}</span>
                      </div>
                      <span className={`text-[8px] px-1.5 py-0.5 rounded font-bold ml-1 flex-shrink-0 ${
                        item.severity === 'Critical'
                          ? 'bg-[#EF4444]/12 text-[#EF4444] border border-[#EF4444]/25'
                          : 'bg-[#F59E0B]/12 text-[#F59E0B] border border-[#F59E0B]/25'
                      }`}>
                        {item.severity}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* 2. Attack Path Overview (col-span-5) */}
          <div className="min-[960px]:col-span-5 rounded-lg border border-[#162332] bg-[#0A0F1A]/90 p-3.5 shadow-xl flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-2 border-b border-[#162332] mb-2.5">
                <div className="flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-[#EF4444]" />
                  <span className="font-bold text-white text-[11px]">Attack Path Overview</span>
                  <span className="text-[9px] text-[#5A6B80]">5 stages &bull; 13 entities</span>
                </div>
                <button
                  onClick={() => setIsolateAttackPath(!isolateAttackPath)}
                  className={`text-[9px] flex items-center gap-1 cursor-pointer transition-colors px-2 py-1 rounded ${
                    isolateAttackPath
                      ? 'text-[#EF4444] font-bold bg-[#EF4444]/10 border border-[#EF4444]/25'
                      : 'text-[#38BDF8] hover:bg-[#38BDF8]/8 border border-transparent'
                  }`}
                >
                  <span>{isolateAttackPath ? 'Show Full Graph' : 'View Full Attack Path'}</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>

              {/* 5-Stage Stepper — Cinematic */}
              <div className="grid grid-cols-5 gap-1 pt-0.5">
                {[
                  { num: 1, label: 'Ingress', anchor: 'evt-phish-ingress', desc: 'Phishing Delivery' },
                  { num: 2, label: 'Privilege', anchor: 'evt-lsass-dump', desc: 'LSASS Dump' },
                  { num: 3, label: 'Lateral', anchor: 'evt-rdp-lateral', desc: 'RDP Bastion' },
                  { num: 4, label: 'Target DB', anchor: 'evt-db-query', desc: 'Vault Access' },
                  { num: 5, label: 'Exfil', anchor: 'evt-exfil-stream', desc: 'TLS Egress' },
                ].map((stg) => {
                  const isActive = selectedNode?.stageNumber === stg.num;
                  return (
                    <button
                      key={stg.num}
                      id={`stage-step-${stg.num}`}
                      onClick={() => {
                        const target = HERO_NODES.find((n) => n.id === stg.anchor);
                        if (target) handleSelectAndFocusNode(target);
                      }}
                      className="cursor-pointer group flex flex-col justify-between text-left p-1 rounded hover:bg-[#0E1724] transition-all"
                      title={`Stage 0${stg.num}: ${stg.label}`}
                    >
                      <div className="flex items-center gap-1 mb-1.5 w-full">
                        <div className={`w-5 h-5 rounded-full text-[9px] font-bold flex items-center justify-center flex-shrink-0 transition-all ${
                          isActive
                            ? 'bg-[#EF4444] text-white shadow-[0_0_12px_rgba(239,68,68,0.6)] scale-110'
                            : 'bg-[#160D10] border border-[#EF4444]/50 text-[#EF4444] group-hover:border-[#38BDF8] group-hover:text-[#38BDF8]'
                        }`}>
                          0{stg.num}
                        </div>
                        {stg.num < 5 && <div className="h-[1px] flex-1 border-t border-dashed border-[#EF4444]/30" />}
                      </div>
                      <div>
                        <span className={`font-bold text-[10px] block transition-colors truncate ${
                          isActive ? 'text-[#EF4444]' : 'text-white group-hover:text-[#38BDF8]'
                        }`}>
                          {stg.label}
                        </span>
                        <span className="text-[8px] text-[#5A6B80] block truncate mt-0.5">
                          {stg.desc}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Attack Path Telemetry Strip */}
            <div className="mt-2.5 pt-2 border-t border-[#162332] flex items-center justify-between text-[9px] text-[#7A8BA0]">
              <div className="flex items-center gap-1.5 truncate">
                <span className="w-1.5 h-1.5 rounded-full bg-[#EF4444]" />
                <span className="truncate">
                  {selectedNode?.isAttackPath
                    ? `Stage 0${selectedNode.stageNumber || 2} Active: ${selectedNode.label}`
                    : 'Deterministic Trajectory: Ingress → Dump → Lateral → Vault → Exfil'}
                </span>
              </div>
              <span className="font-mono text-[#38BDF8] flex-shrink-0 ml-2">100% Provenance</span>
            </div>
          </div>

          {/* 3. Graph Statistics & Direct Query Actions (col-span-3) */}
          <div className="min-[960px]:col-span-3 rounded-lg border border-[#162332] bg-[#0A0F1A]/90 p-3.5 shadow-xl flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-2 border-b border-[#162332] mb-2.5">
                <div className="flex items-center gap-1.5">
                  <BarChart2 className="w-3.5 h-3.5 text-[#38BDF8]" />
                  <span className="font-bold text-white text-[11px]">Graph Statistics</span>
                </div>
                <span className="text-[9px] font-mono text-[#10B981] flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse" />
                  {isCloudConnected ? 'FalkorDB Cloud' : 'Local'}
                </span>
              </div>

              {/* 2x2 Metric Grid — Cinematic */}
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2 rounded-lg bg-[#0A0F1A] border border-[#162332] flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-[#38BDF8]/10 border border-[#38BDF8]/20 flex items-center justify-center flex-shrink-0">
                    <Cpu className="w-3.5 h-3.5 text-[#38BDF8]" />
                  </div>
                  <div>
                    <span className="text-sm font-bold text-white block leading-none">{liveNodes}</span>
                    <span className="text-[8px] text-[#5A6B80] mt-0.5 block">Total Nodes</span>
                  </div>
                </div>

                <div className="p-2 rounded-lg bg-[#0A0F1A] border border-[#162332] flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-[#A855F7]/10 border border-[#A855F7]/20 flex items-center justify-center flex-shrink-0">
                    <Share2 className="w-3.5 h-3.5 text-[#A855F7]" />
                  </div>
                  <div>
                    <span className="text-sm font-bold text-white block leading-none">{liveEdges}</span>
                    <span className="text-[8px] text-[#5A6B80] mt-0.5 block">Relationships</span>
                  </div>
                </div>

                <div className="p-2 rounded-lg bg-[#0A0F1A] border border-[#162332] flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-[#EF4444]/10 border border-[#EF4444]/20 flex items-center justify-center flex-shrink-0">
                    <AlertTriangle className="w-3.5 h-3.5 text-[#EF4444]" />
                  </div>
                  <div>
                    <span className="text-sm font-bold text-white block leading-none">5</span>
                    <span className="text-[8px] text-[#5A6B80] mt-0.5 block">Attack Stages</span>
                  </div>
                </div>

                <div className="p-2 rounded-lg bg-[#0A0F1A] border border-[#162332] flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-[#10B981]/10 border border-[#10B981]/20 flex items-center justify-center flex-shrink-0">
                    <Shield className="w-3.5 h-3.5 text-[#10B981]" />
                  </div>
                  <div>
                    <span className="text-sm font-bold text-white block leading-none">13</span>
                    <span className="text-[8px] text-[#5A6B80] mt-0.5 block">Path Entities</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#162332] mt-2.5">
              <button
                onClick={() => handleLaunchApp('/app/graph')}
                className="py-1.5 px-2 rounded-md bg-[#38BDF8]/10 hover:bg-[#38BDF8]/15 border border-[#38BDF8]/30 text-[#38BDF8] text-[9px] font-semibold flex items-center justify-center gap-1 cursor-pointer transition-colors"
              >
                <Terminal className="w-3 h-3" />
                <span>Run Graph Query</span>
              </button>
              <button
                onClick={() => handleLaunchApp('/app/graph')}
                className="py-1.5 px-2 rounded-md bg-[#0A0F1A] hover:bg-[#0E1724] border border-[#162332] text-[#E8ECF0] text-[9px] font-semibold flex items-center justify-center gap-1 cursor-pointer transition-colors"
              >
                <span>Full Workspace</span>
                <ExternalLink className="w-3 h-3 text-[#38BDF8]" />
              </button>
            </div>
          </div>

        </div>

      </div>
    </section>
  );
}
