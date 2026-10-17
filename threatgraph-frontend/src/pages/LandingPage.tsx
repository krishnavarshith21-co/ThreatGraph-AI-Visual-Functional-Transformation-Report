import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../lib/api';
import {
  Shield, ArrowRight, Search,
  ExternalLink, Zap, Database, Cpu,
  Pause, Play, RotateCcw, ZoomIn, ZoomOut, Maximize2,
  FileText, Globe, Laptop, Server, Radio
} from 'lucide-react';
import { BlindSpotSection } from '../components/landing/BlindSpotSection';
import { MethodologySection } from '../components/landing/MethodologySection';
import { TopologySandboxSection } from '../components/landing/TopologySandboxSection';
import { ForensicDimensionsSection } from '../components/landing/ForensicDimensionsSection';
import { TechnicalEngineSection } from '../components/landing/TechnicalEngineSection';
import { LandingFooter } from '../components/landing/LandingFooter';

// ── Types & Data ──────────────────────────────────────────────────
interface AttackStage {
  id: string;
  num: string;
  label: string;
  mitre: string;
  numColor: string;
  nodeId: string;
  alertId: string;
  entityType: string;
  entityId: string;
  eventName: string;
  eventCode: string;
  summary: string;
  evidenceAnchor: string;
  provenance: string;
  relatedEntities: string[];
  context: {
    user: string;
    host: string;
    time: string;
  };
}

interface HUDNode {
  id: string;
  label: string;
  sublabel: string;
  iconType: 'shield' | 'network' | 'database' | 'workstation' | 'threat' | 'core';
  stageIndex: number;
  // Percentage coordinates relative to 3D canvas viewport
  top: string;
  left?: string;
  right?: string;
  color: string;
  isCore?: boolean;
  isThreat?: boolean;
}

const HUD_NODES: HUDNode[] = [
  {
    id: 'identity-provider',
    label: 'Identity Provider',
    sublabel: 'Okta • IAM',
    iconType: 'network',
    stageIndex: 1,
    top: '14%',
    left: '36%',
    color: '#38BDF8'
  },
  {
    id: 'corporate-network',
    label: 'Corporate Network',
    sublabel: 'Internal Resources',
    iconType: 'network',
    stageIndex: 2,
    top: '9%',
    left: '66%',
    color: '#38BDF8'
  },
  {
    id: 'database-cluster',
    label: 'Database Cluster',
    sublabel: 'PostgreSQL • Production',
    iconType: 'database',
    stageIndex: 3,
    top: '18%',
    right: '3%',
    color: '#38BDF8'
  },
  {
    id: 'threatgraph-ai',
    label: 'ThreatGraph AI',
    sublabel: 'Graph Intelligence Core',
    iconType: 'core',
    stageIndex: 2,
    top: '32%',
    left: '58%',
    color: '#38BDF8',
    isCore: true
  },
  {
    id: 'endpoint-fleet',
    label: 'Endpoint Fleet',
    sublabel: 'Workstations • EDR',
    iconType: 'workstation',
    stageIndex: 0,
    top: '49%',
    left: '35%',
    color: '#C68A69'
  },
  {
    id: 'external-threat',
    label: 'External Threat',
    sublabel: 'TOR Exit Node',
    iconType: 'threat',
    stageIndex: 4,
    top: '53%',
    right: '7%',
    color: '#EF4444',
    isThreat: true
  }
];

const ATTACK_STAGES: AttackStage[] = [
  {
    id: 'stage-1',
    num: '01',
    label: 'Spear Phishing Ingress',
    mitre: 'MITRE T1566.001',
    numColor: '#EF4444',
    nodeId: 'endpoint-fleet',
    alertId: 'alert-001',
    entityType: 'Device',
    entityId: 'dev-001',
    eventName: 'Spear Phishing Ingress',
    eventCode: 'evt-phish-ingress',
    summary: 'Spear-phishing attachment invoice_march.pdf.exe executed via Microsoft Outlook process hook.',
    evidenceAnchor: 'MITRE T1566.001: Process creation OUTLOOK.EXE -> cmd.exe /c invoice_march.pdf.exe',
    provenance: 'Endpoint Detection Telemetry (LAPTOP-MCHEN)',
    relatedEntities: ['Marcus Chen', 'LAPTOP-MCHEN', '10.0.1.45 (Workstation)'],
    context: {
      user: 'MARCUS_CHEN',
      host: 'LAPTOP-MCHEN',
      time: '2024-10-14T17:41:09Z'
    }
  },
  {
    id: 'stage-2',
    num: '02',
    label: 'LSASS Memory Dump',
    mitre: 'MITRE T1003.001',
    numColor: '#F59E0B',
    nodeId: 'identity-provider',
    alertId: 'alert-002',
    entityType: 'User',
    entityId: 'user-003',
    eventName: 'LSASS Memory Dump',
    eventCode: 'evt-lsass-dump',
    summary: 'Procdump utility executed to dump Local Security Authority Subsystem Service (LSASS) memory.',
    evidenceAnchor: 'MITRE T1003.001: procdump.exe -ma lsass.exe C:\\Temp\\lsass.dmp (MD5: 8f9b...a102)',
    provenance: 'Sysmon Event ID 10 (ProcessAccess GrantedAccess: 0x1010)',
    relatedEntities: ['LAPTOP-MCHEN', 'admin-service', 'DC-PRIMARY-01'],
    context: {
      user: 'MARCUS_CHEN',
      host: 'LAPTOP-MCHEN',
      time: '2024-10-14T18:05:44Z'
    }
  },
  {
    id: 'stage-3',
    num: '03',
    label: 'Lateral RDP to Bastion',
    mitre: 'MITRE T1021.001',
    numColor: '#38BDF8',
    nodeId: 'threatgraph-ai',
    alertId: 'alert-003',
    entityType: 'Device',
    entityId: 'dev-003',
    eventName: 'Lateral RDP to Bastion',
    eventCode: 'evt-rdp-lateral',
    summary: 'Interactive RDP session established from workstation to DMZ bastion jump host.',
    evidenceAnchor: 'MITRE T1021.001: mstsc.exe connection from 10.0.1.45 to 10.0.2.15:3389',
    provenance: 'Network Security Monitor Flow Session #1092',
    relatedEntities: ['admin-service', 'SRV-ADMIN-01', 'bastion-host'],
    context: {
      user: 'MARCUS_CHEN',
      host: 'LAPTOP-MCHEN',
      time: '2024-10-14T18:22:31Z'
    }
  },
  {
    id: 'stage-4',
    num: '04',
    label: 'Bulk Database Query',
    mitre: 'MITRE T1530',
    numColor: '#94A3B8',
    nodeId: 'database-cluster',
    alertId: 'alert-004',
    entityType: 'Resource',
    entityId: 'res-001',
    eventName: 'Bulk Database Query',
    eventCode: 'evt-db-query',
    summary: 'Bulk SQL extraction query executed against production customer database table.',
    evidenceAnchor: 'SQL Audit: SELECT * FROM customers_pii; 14,820 rows dumped to /tmp/export.enc',
    provenance: 'PostgreSQL pg_stat_statements Query Audit',
    relatedEntities: ['SRV-ADMIN-01', 'Customer PII Records', 'SRV-DB-PROD-01'],
    context: {
      user: 'admin-service',
      host: 'SRV-DB-PROD-01',
      time: '2024-10-14T18:47:12Z'
    }
  },
  {
    id: 'stage-5',
    num: '05',
    label: '4.2GB Encrypted Egress',
    mitre: 'MITRE T1048.002',
    numColor: '#94A3B8',
    nodeId: 'external-threat',
    alertId: 'alert-005',
    entityType: 'IPAddress',
    entityId: 'ip-006',
    eventName: '4.2GB Encrypted Egress',
    eventCode: 'evt-exfil-stream',
    summary: 'Encrypted TLS egress data stream transmitting 4.2GB out to bulletproof hosting IP.',
    evidenceAnchor: 'Egress NetFlow: 4,294,967,296 bytes sent over TCP 443 to 91.219.236.18',
    provenance: 'Perimeter Firewall Flow Record #FW-8819',
    relatedEntities: ['SRV-ADMIN-01', '91.219.236.18 (Exfil Drop)'],
    context: {
      user: 'admin-service',
      host: 'SRV-ADMIN-01',
      time: '2024-10-14T18:59:05Z'
    }
  }
];

export function LandingPage() {
  const { user, signInAsGuest } = useAuth();
  const navigate = useNavigate();

  // Active attack stage (0 to 4) - Default to stage index 2 (Stage 03) matching reference screenshot
  const [activeStageIdx, setActiveStageIdx] = useState<number>(2);
  const [autoProgress, setAutoProgress] = useState<boolean>(true);
  const [speedMultiplier, setSpeedMultiplier] = useState<number>(2.4);
  const [focusPath, setFocusPath] = useState<boolean>(false);
  const [zoomLevel, setZoomLevel] = useState<number>(1.0);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

  // Live dynamic data fetched from FalkorDB / Graph Service
  const [liveNeighbors, setLiveNeighbors] = useState<string[]>([]);
  const [apiLatencyMs, setApiLatencyMs] = useState<number | null>(null);
  const [isLaunching, setIsLaunching] = useState<boolean>(false);

  // Parallax tilt state
  const [tilt, setTilt] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // FalkorDB health counts
  const [backendHealth, setBackendHealth] = useState<{
    status: string;
    services?: {
      falkordb?: { status: string; mode?: string; nodes?: number; edges?: number };
    };
  } | null>(null);

  useEffect(() => {
    let isMounted = true;
    const t0 = performance.now();
    api.health()
      .then((data) => {
        const ms = Math.round(performance.now() - t0);
        if (isMounted) {
          setBackendHealth(data);
          setApiLatencyMs(ms);
        }
      })
      .catch(() => {
        if (isMounted) {
          setBackendHealth(null);
          setApiLatencyMs(null);
        }
      });
    return () => { isMounted = false; };
  }, []);

  const nodeCount = backendHealth?.services?.falkordb?.nodes ?? 49;
  const edgeCount = backendHealth?.services?.falkordb?.edges ?? 49;
  const isFallbackMode = backendHealth?.services?.falkordb?.mode === 'in_memory_fallback';

  // Fetch real neighbors from backend when active stage changes
  useEffect(() => {
    let isMounted = true;
    const stage = ATTACK_STAGES[activeStageIdx];
    api.getNeighbors(stage.entityType, stage.entityId)
      .then((res) => {
        if (isMounted && res && res.neighbors && Array.isArray(res.neighbors)) {
          const names = res.neighbors
            .map((n: any) => n.hostname || n.name || n.title || n.address || n.id)
            .filter(Boolean)
            .slice(0, 4);
          if (names.length > 0) {
            setLiveNeighbors(names);
          }
        }
      })
      .catch(() => {});
    return () => { isMounted = false; };
  }, [activeStageIdx]);

  // Auto-progression timer
  useEffect(() => {
    if (!autoProgress) return;
    const intervalTime = Math.round(4000 / speedMultiplier);
    const timer = setInterval(() => {
      setActiveStageIdx((prev) => (prev + 1) % ATTACK_STAGES.length);
    }, intervalTime);
    return () => clearInterval(timer);
  }, [autoProgress, speedMultiplier]);

  const currentStage = ATTACK_STAGES[activeStageIdx];

  // Mouse move parallax handler
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setTilt({ x: x * 1.5, y: y * 1.5 });
  }, []);

  const handleLaunchApp = useCallback((dest = '/app') => {
    localStorage.setItem('threatgraph_guest_session', 'true');
    if (!user) signInAsGuest();
    navigate(dest);
  }, [user, signInAsGuest, navigate]);

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Real Launch Investigation workflow: starts real AI investigation on backend
  const handleLaunchInvestigation = async () => {
    setIsLaunching(true);
    try {
      if (!user) signInAsGuest();
      const current = ATTACK_STAGES[activeStageIdx];
      const res = await api.startInvestigation(
        current.alertId,
        `Investigation for ${current.label} initiated from ThreatGraph AI Hero`
      );
      navigate(`/app/investigations/${res.id}`);
    } catch {
      navigate('/app/investigations');
    } finally {
      setIsLaunching(false);
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  const cycleSpeed = () => {
    if (speedMultiplier === 1.0) setSpeedMultiplier(1.5);
    else if (speedMultiplier === 1.5) setSpeedMultiplier(2.4);
    else if (speedMultiplier === 2.4) setSpeedMultiplier(3.0);
    else setSpeedMultiplier(1.0);
  };

  const getNodeIcon = (type: string) => {
    switch (type) {
      case 'core':
        return <Shield className="w-4 h-4 text-[#38BDF8]" />;
      case 'threat':
        return <Globe className="w-3.5 h-3.5 text-[#EF4444]" />;
      case 'workstation':
        return <Laptop className="w-3.5 h-3.5 text-[#38BDF8]" />;
      case 'database':
        return <Database className="w-3.5 h-3.5 text-[#38BDF8]" />;
      default:
        return <Server className="w-3.5 h-3.5 text-[#38BDF8]" />;
    }
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      className="min-h-screen w-full bg-[#070C13] text-[#F3F4F0] flex flex-col font-sans select-none selection:bg-[#38BDF8] selection:text-[#070C13]"
    >
      {/* ═══════════════════════════════════════════════════════════
          TOP NAVIGATION BAR — Matches reference exactly
      ═══════════════════════════════════════════════════════════ */}
      <header className="sticky top-0 z-50 h-[56px] w-full bg-[#070C13]/90 backdrop-blur-xl border-b border-[#1E2D38]/60 flex-shrink-0 px-6 flex items-center justify-between">
        {/* Left: Brand Logo — clicking scrolls smoothly to top */}
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="flex items-center gap-2.5 group cursor-pointer text-left"
        >
          <div className="w-7 h-7 rounded-lg bg-[#0F1D2A] border border-[#38BDF8]/40 flex items-center justify-center shadow-[0_0_12px_rgba(56,189,248,0.25)] transition-transform group-hover:scale-105">
            <Shield className="w-4 h-4 text-[#38BDF8]" />
          </div>
          <span className="font-bold text-[15px] tracking-tight text-white flex items-center">
            ThreatGraph<span className="text-[#38BDF8]">AI</span>
          </span>
        </button>

        {/* Center: Navigation Links — click scrolls to respective chapters */}
        <nav className="hidden lg:flex items-center gap-8 text-[13px] font-medium text-[#94A3B8]">
          <button
            onClick={() => scrollToSection('challenge')}
            className="hover:text-white transition-colors cursor-pointer"
          >
            Challenge
          </button>
          <button
            onClick={() => scrollToSection('methodology')}
            className="hover:text-white transition-colors cursor-pointer"
          >
            Methodology
          </button>
          <button
            onClick={() => scrollToSection('topology')}
            className="hover:text-white transition-colors cursor-pointer"
          >
            Topology
          </button>
          <button
            onClick={() => scrollToSection('evidence')}
            className="hover:text-white transition-colors cursor-pointer"
          >
            Evidence
          </button>
          <button
            onClick={() => scrollToSection('engine')}
            className="hover:text-white transition-colors cursor-pointer"
          >
            Engine
          </button>
        </nav>

        {/* Right: Telemetry & Actions */}
        <div className="flex items-center gap-3">
          {/* Live Graph Search Pill — Clickable to open Graph Explorer */}
          <button
            onClick={() => handleLaunchApp('/app/graph')}
            className="hidden sm:flex items-center gap-2.5 bg-[#0B131D] hover:bg-[#111D2A] border border-[#1E2D38] hover:border-[#38BDF8]/60 rounded-full px-3.5 py-1.5 shadow-inner transition-colors cursor-pointer group"
            title="Search and explore live graph topology"
          >
            <span className="relative flex h-2 w-2">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${
                backendHealth?.status === 'healthy' ? (isFallbackMode ? 'bg-[#38BDF8]' : 'bg-[#10B981]') : 'bg-[#EF4444]'
              } opacity-75`} />
              <span className={`relative inline-flex rounded-full h-2 w-2 ${
                backendHealth?.status === 'healthy' ? (isFallbackMode ? 'bg-[#38BDF8]' : 'bg-[#10B981]') : 'bg-[#EF4444]'
              }`} />
            </span>
            <span className="text-[11px] font-semibold text-white group-hover:text-[#38BDF8] transition-colors">
              {backendHealth?.status !== 'healthy' ? 'Graph Offline' : (isFallbackMode ? 'Demo Mode' : 'Live Graph')}
            </span>
            <span className="text-[11px] text-[#64748B]">•</span>
            <span className="text-[11px] font-mono text-[#94A3B8]">
              {nodeCount} Nodes · {edgeCount} Edges
              {apiLatencyMs !== null && (
                <span className="text-[#64748B] ml-1.5 font-normal">({apiLatencyMs}ms)</span>
              )}
            </span>
            <Search className="w-3.5 h-3.5 text-[#64748B] group-hover:text-[#38BDF8] transition-colors ml-1" />
          </button>

          {/* Sign In text link */}
          <Link
            to="/signin"
            className="text-[13px] font-medium text-[#94A3B8] hover:text-white transition-colors px-2 cursor-pointer"
          >
            Sign In
          </Link>

          {/* Launch Platform Button */}
          <button
            onClick={() => handleLaunchApp('/app')}
            className="bg-[#38BDF8] hover:bg-[#7DD3FC] text-[#070C13] font-semibold text-[13px] px-4 py-2 rounded-lg flex items-center gap-1.5 transition-all shadow-[0_0_15px_rgba(56,189,248,0.25)] hover:shadow-[0_0_20px_rgba(56,189,248,0.45)] hover:-translate-y-0.5 cursor-pointer"
          >
            Launch Platform <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* ═══════════════════════════════════════════════════════════
          MAIN VIEWPORT STAGE: 3D Datacenter + Text + Conduits + Badges
      ═══════════════════════════════════════════════════════════ */}
      <div className="relative w-full h-[calc(100vh-56px)] min-h-[660px] max-h-[920px] overflow-hidden flex flex-col flex-shrink-0">
        {/* ── Layer 1: 3D Isometric Cyber Datacenter Background Image ─ */}
        <div
          className="absolute inset-0 transition-transform duration-700 ease-out pointer-events-none"
          style={{
            transform: `scale(${zoomLevel}) translate3d(${tilt.x * 12}px, ${tilt.y * 12}px, 0)`,
            transformOrigin: 'center center'
          }}
        >
          <img
            src="/cyber-datacenter.jpg"
            alt="ThreatGraph AI 3D Cyber Datacenter Infrastructure"
            className="w-full h-full object-cover object-center"
            style={{ filter: 'brightness(0.96) contrast(1.05)' }}
          />

          {/* Gradient Vignettes to ensure absolute headline readability on left */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#070C13] via-[#070C13]/75 to-transparent" style={{ width: '45%' }} />
          <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-[#070C13]/60 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#070C13] to-transparent" />
        </div>

        {/* ── Layer 2: Animated SVG Fiber-Optic Conduits & Energy Pulses ─ */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none z-10"
          style={{
            transform: `scale(${zoomLevel}) translate3d(${tilt.x * 14}px, ${tilt.y * 14}px, 0)`,
            transformOrigin: 'center center'
          }}
          viewBox="0 0 1000 600"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="cyanConduitGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#818CF8" stopOpacity="0.8" />
            </linearGradient>
            <linearGradient id="redConduitGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.7" />
              <stop offset="100%" stopColor="#EF4444" stopOpacity="0.9" />
            </linearGradient>
            <filter id="glowCyan" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="glowRed" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Conduit 1: Endpoint Fleet (Workstations ~ 410, 360) -> Central Core (~ 640, 270) */}
          <path
            d="M 410 360 L 530 310 L 640 270"
            fill="none"
            stroke="url(#cyanConduitGrad)"
            strokeWidth="3"
            filter="url(#glowCyan)"
            className="animate-conduit-flow opacity-90"
          />

          {/* Conduit 2: Identity Provider (~ 450, 150) -> Central Core (~ 640, 270) */}
          <path
            d="M 450 150 L 540 210 L 640 270"
            fill="none"
            stroke="url(#cyanConduitGrad)"
            strokeWidth="2.5"
            filter="url(#glowCyan)"
            className="animate-conduit-flow opacity-80"
          />

          {/* Conduit 3: Corporate Network (~ 700, 110) -> Central Core (~ 640, 270) */}
          <path
            d="M 700 110 L 670 190 L 640 270"
            fill="none"
            stroke="url(#cyanConduitGrad)"
            strokeWidth="2.5"
            filter="url(#glowCyan)"
            className="animate-conduit-flow opacity-80"
          />

          {/* Conduit 4: Database Cluster (~ 890, 190) -> Central Core (~ 640, 270) */}
          <path
            d="M 890 190 L 760 230 L 640 270"
            fill="none"
            stroke="url(#cyanConduitGrad)"
            strokeWidth="3"
            filter="url(#glowCyan)"
            className="animate-conduit-flow-reverse opacity-85"
          />

          {/* Conduit 5: Central Core (~ 640, 270) -> External Threat (Red zone ~ 860, 380) */}
          <path
            d="M 640 270 L 750 330 L 860 380"
            fill="none"
            stroke="url(#redConduitGrad)"
            strokeWidth="3.5"
            filter="url(#glowRed)"
            className="animate-conduit-flow opacity-95"
          />
        </svg>

        {/* ── Layer 3: Floating 3D Toolbar (Top Right Corner) ───────── */}
        <div className="absolute top-4 right-6 z-30 flex items-center gap-1 bg-[#09111A]/85 backdrop-blur-md p-1 rounded-lg border border-[#1E2D38]/80 shadow-2xl">
          {/* Pause / Play */}
          <button
            onClick={() => setAutoProgress(!autoProgress)}
            className="p-1.5 text-[#94A3B8] hover:text-white hover:bg-[#162334] rounded transition-colors"
            title={autoProgress ? 'Pause auto progression' : 'Resume auto progression'}
          >
            {autoProgress ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          </button>
          {/* Reset */}
          <button
            onClick={() => setActiveStageIdx(0)}
            className="p-1.5 text-[#94A3B8] hover:text-white hover:bg-[#162334] rounded transition-colors"
            title="Reset to Stage 01"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          {/* Zoom Out */}
          <button
            onClick={() => setZoomLevel((z) => Math.max(0.9, z - 0.1))}
            className="p-1.5 text-[#94A3B8] hover:text-white hover:bg-[#162334] rounded transition-colors"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          {/* Zoom In */}
          <button
            onClick={() => setZoomLevel((z) => Math.min(1.4, z + 0.1))}
            className="p-1.5 text-[#94A3B8] hover:text-white hover:bg-[#162334] rounded transition-colors"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          {/* Fullscreen */}
          <button
            onClick={toggleFullscreen}
            className="p-1.5 text-[#94A3B8] hover:text-white hover:bg-[#162334] rounded transition-colors"
            title="Toggle Fullscreen"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* ── Layer 4: Interactive Floating 3D HUD Badges on Infrastructure ─ */}
        <div
          className="absolute inset-0 pointer-events-none z-20"
          style={{
            transform: `scale(${zoomLevel}) translate3d(${tilt.x * 16}px, ${tilt.y * 16}px, 0)`,
            transformOrigin: 'center center'
          }}
        >
          {HUD_NODES.map((node) => {
            const isActive = currentStage.nodeId === node.id;
            const isHovered = hoveredNodeId === node.id;

            return (
              <div
                key={node.id}
                className="absolute pointer-events-auto cursor-pointer animate-float"
                style={{
                  top: node.top,
                  left: node.left,
                  right: node.right,
                  animationDelay: `${node.stageIndex * 0.7}s`
                }}
                onMouseEnter={() => setHoveredNodeId(node.id)}
                onMouseLeave={() => setHoveredNodeId(null)}
                onClick={() => {
                  setActiveStageIdx(node.stageIndex);
                  setAutoProgress(false);
                }}
              >
                {/* Radar Ring Ripple when active */}
                {isActive && (
                  <div
                    className={`absolute -inset-2 rounded-xl pointer-events-none ${
                      node.isThreat ? 'animate-radar-ring border border-[#EF4444]' : 'animate-radar-ring border border-[#38BDF8]'
                    }`}
                  />
                )}

                {/* Glass Badge Card */}
                <div
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg backdrop-blur-xl transition-all duration-300 shadow-xl ${
                    node.isCore
                      ? 'bg-[#0A1624]/92 border-2 border-[#38BDF8] shadow-[0_0_25px_rgba(56,189,248,0.35)] px-4 py-2.5'
                      : node.isThreat
                      ? 'bg-[#150D11]/90 border border-[#EF4444]/60 shadow-[0_0_20px_rgba(239,68,68,0.25)] hover:border-[#EF4444]'
                      : isActive
                      ? 'bg-[#0B1A28]/90 border border-[#38BDF8] shadow-[0_0_20px_rgba(56,189,248,0.3)]'
                      : 'bg-[#0B131D]/85 border border-[#1E2D38]/80 hover:border-[#38BDF8]/50 hover:bg-[#111D2B]/90'
                  } ${isHovered ? 'scale-105' : ''}`}
                >
                  {/* Icon badge */}
                  <div
                    className={`w-6 h-6 rounded flex items-center justify-center flex-shrink-0 ${
                      node.isCore
                        ? 'w-7 h-7 bg-[#38BDF8]/20 border border-[#38BDF8]/50'
                        : node.isThreat
                        ? 'bg-[#EF4444]/20 border border-[#EF4444]/40'
                        : 'bg-[#0F1D2A] border border-[#1E2D38]'
                    }`}
                  >
                    {getNodeIcon(node.iconType)}
                  </div>

                  {/* Text labels */}
                  <div>
                    <div
                      className={`text-[11px] font-semibold tracking-tight text-white ${
                        node.isCore ? 'text-[12px] font-bold' : ''
                      }`}
                    >
                      {node.label}
                    </div>
                    <div
                      className={`text-[9px] font-mono leading-tight ${
                        node.isThreat
                          ? 'text-[#FCA5A5]'
                          : node.isCore
                          ? 'text-[#38BDF8]'
                          : 'text-[#94A3B8]'
                      }`}
                    >
                      {node.sublabel}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Layer 5: Hero Headline, Subtitle, CTAs & Tech Row (Left Column) ─ */}
        <div className="absolute inset-y-0 left-0 z-20 flex items-start pointer-events-none pl-8 sm:pl-12 lg:pl-16 pt-8 sm:pt-12 xl:pt-14 max-w-[560px]">
          <div className="pointer-events-auto">
            {/* Eyebrow */}
            <div className="flex items-center gap-2 mb-4">
              <span className="text-[#38BDF8] font-mono text-[11px] font-semibold tracking-[0.2em] uppercase">
                — CONNECTED SECURITY INTELLIGENCE
              </span>
            </div>

            {/* Main Headline */}
            <h1 className="text-[40px] sm:text-[46px] lg:text-[52px] xl:text-[56px] font-bold text-white leading-[1.06] tracking-[-0.03em] mb-5">
              The threat is not<br />
              the alert.<br />
              <span className="text-[#38BDF8]">It's what connects </span>
              <span className="text-[#F59E0B]">it.</span>
            </h1>

            {/* Paragraph Description */}
            <p className="text-[#94A3B8] text-[13.5px] sm:text-[14px] leading-relaxed max-w-[420px] mb-7 font-normal">
              ThreatGraph AI investigates suspicious activity through connected security data, tracing relationships across identities, endpoints, events and resources to assemble evidence-backed incident narratives.
            </p>

            {/* Action Buttons */}
            <div className="flex items-center gap-3.5 mb-7">
              <button
                onClick={handleLaunchInvestigation}
                disabled={isLaunching}
                className="bg-[#38BDF8] hover:bg-[#7DD3FC] text-[#070C13] font-bold text-[13px] px-5 py-2.5 rounded-lg flex items-center gap-2 transition-all shadow-[0_0_20px_rgba(56,189,248,0.35)] hover:shadow-[0_0_30px_rgba(56,189,248,0.55)] hover:-translate-y-0.5 disabled:opacity-75 cursor-pointer"
              >
                {isLaunching ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-[#070C13] border-t-transparent rounded-full animate-spin" />
                    <span>Launching AI Agent...</span>
                  </>
                ) : (
                  <>
                    <span>Launch Investigation</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <button
                onClick={() => handleLaunchApp('/app/graph')}
                className="bg-[#0B131D]/80 hover:bg-[#121E2C] border border-[#1E2D38] hover:border-[#38BDF8]/40 text-[#F3F4F0] font-medium text-[13px] px-5 py-2.5 rounded-lg transition-all cursor-pointer"
              >
                Explore Connected Data
              </button>
            </div>

            {/* Tech Badges Row */}
            <div className="flex flex-wrap items-center gap-5 text-[10px] font-mono text-[#64748B]">
              {/* FalkorDB */}
              <div className="flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-[#38BDF8]" />
                <span className="text-[#F3F4F0] font-medium">FalkorDB Graph</span>
                <span className="text-[#64748B]">{nodeCount} Nodes · {edgeCount} Edges</span>
              </div>

              {/* Gemini Agent */}
              <div className="flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-[#F59E0B]" />
                <span className="text-[#F3F4F0] font-medium">Gemini 2.0 Agent</span>
                <span className="text-[#64748B]">Autonomous Analysis</span>
              </div>

              {/* Cypher Native */}
              <div className="hidden sm:flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-[#D8C99A]" />
                <span className="text-[#F3F4F0] font-medium">Cypher Native</span>
                <span className="text-[#64748B]">Query at Scale</span>
              </div>
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════
            BOTTOM DOCKED ATTACK TIMELINE PROGRESSION & FORENSIC DOSSIER
        ═══════════════════════════════════════════════════════════ */}
        <div className="absolute inset-x-0 bottom-0 z-30 flex flex-col bg-[#070C13]/95 backdrop-blur-2xl border-t border-[#1E2D38]/80 shadow-2xl">
          {/* ── Section A: Timeline Stage Header & Stage Cards ────── */}
          <div className="w-full max-w-[1440px] mx-auto px-6 pt-2.5 pb-2">
            {/* Header row */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <span className="text-[10.5px] font-mono font-bold uppercase tracking-[0.18em] text-white">
                  ATTACK TIMELINE PROGRESSION
                </span>
                <span className="text-[10px] font-mono text-[#64748B]">
                  STAGE <span className="text-[#F59E0B] font-bold">0{activeStageIdx + 1}</span> / 05
                </span>
              </div>

              {/* Controls */}
              <div className="flex items-center gap-4">
                {/* Auto progression toggle */}
                <div className="flex items-center gap-2 text-[10px] font-mono text-[#94A3B8]">
                  <span>Auto progression</span>
                  <button
                    onClick={() => setAutoProgress(!autoProgress)}
                    className={`w-7 h-[16px] rounded-full p-0.5 transition-colors duration-200 ${
                      autoProgress ? 'bg-[#38BDF8]' : 'bg-[#1E2D38]'
                    }`}
                  >
                    <div
                      className={`w-[12px] h-[12px] rounded-full bg-[#070C13] shadow-sm transform transition-transform duration-200 ${
                        autoProgress ? 'translate-x-[11px]' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* Speed selector */}
                <button
                  onClick={cycleSpeed}
                  className="flex items-center gap-1 text-[10px] font-mono text-[#94A3B8] hover:text-white bg-[#0D141C] border border-[#1E2D38] px-2 py-0.5 rounded transition-colors"
                  title="Cycle playback speed"
                >
                  <RotateCcw className="w-2.5 h-2.5" />
                  <span>{speedMultiplier}x ▾</span>
                </button>

                {/* Focus Path button */}
                <button
                  onClick={() => setFocusPath(!focusPath)}
                  className={`flex items-center gap-1.5 text-[10px] font-mono px-2.5 py-0.5 rounded border transition-colors ${
                    focusPath
                      ? 'bg-[#38BDF8] text-[#070C13] border-[#38BDF8] font-bold shadow-[0_0_10px_rgba(56,189,248,0.4)]'
                      : 'bg-[#0D141C] text-[#38BDF8] border-[#38BDF8]/40 hover:bg-[#38BDF8]/10'
                  }`}
                >
                  <Radio className="w-3 h-3" />
                  <span>Focus Path</span>
                </button>
              </div>
            </div>

            {/* 5 Stage Cards Grid */}
            <div className="grid grid-cols-5 gap-2">
              {ATTACK_STAGES.map((stage, idx) => {
                const isActive = activeStageIdx === idx;
                return (
                  <button
                    key={stage.id}
                    onClick={() => {
                      setActiveStageIdx(idx);
                      setAutoProgress(false);
                    }}
                    className={`relative p-2.5 rounded text-left transition-all duration-200 border ${
                      isActive
                        ? 'bg-[#0C1E2E]/90 border-[#38BDF8] shadow-[0_0_16px_rgba(56,189,248,0.25)] ring-1 ring-[#38BDF8]'
                        : 'bg-[#0B131D]/70 border-[#1E2D38]/60 hover:bg-[#121E2C] hover:border-[#1E2D38]'
                    }`}
                  >
                    {/* Stage number */}
                    <div className="text-[10px] font-mono font-bold mb-0.5" style={{ color: stage.numColor }}>
                      {stage.num}
                    </div>

                    {/* Stage Title */}
                    <div className="text-[11px] font-semibold text-white truncate mb-0.5">
                      {stage.label}
                    </div>

                    {/* Mitre tag */}
                    <div className="text-[9px] font-mono text-[#64748B] truncate">
                      {stage.mitre}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Section B: Active Event Detail Dossier Bar ─────────── */}
          <div className="w-full bg-[#05090F]/95 border-t border-[#1E2D38]/60 py-2.5 px-6">
            <div className="w-full max-w-[1440px] mx-auto">
              {/* Event title row */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <FileText className="w-3.5 h-3.5 text-[#64748B]" />
                  <span className="text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded bg-[#38BDF8]/10 border border-[#38BDF8]/30 text-[#38BDF8] font-bold">
                    EVENT
                  </span>
                  <span className="text-[12px] font-bold text-white">
                    {currentStage.eventName}
                  </span>
                  <span className="text-[10px] font-mono text-[#64748B]">
                    [{currentStage.eventCode}]
                  </span>
                  <span className="text-[11px] text-[#94A3B8] font-normal hidden md:inline ml-2 border-l border-[#1E2D38] pl-2.5">
                    {currentStage.summary}
                  </span>
                </div>

                {/* Right Action buttons */}
                <div className="flex items-center gap-2">
                  <button className="flex items-center gap-1 text-[10px] font-mono text-[#38BDF8] bg-[#38BDF8]/10 border border-[#38BDF8]/30 px-2.5 py-1 rounded hover:bg-[#38BDF8]/20 transition-colors">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#38BDF8]" />
                    <span>STAGE 0{activeStageIdx + 1} PIVOT</span>
                  </button>

                  <button
                    onClick={() => handleLaunchApp('/app/investigations/inv-demo-001')}
                    className="flex items-center gap-1.5 text-[10px] font-mono text-white bg-[#0D141C] border border-[#1E2D38] hover:border-[#38BDF8]/40 px-2.5 py-1 rounded transition-colors"
                  >
                    <span>Inspect Dossier</span>
                    <ExternalLink className="w-3 h-3 text-[#94A3B8]" />
                  </button>
                </div>
              </div>

              {/* 3-Column Metadata Anchor Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 border-t border-[#1E2D38]/40 text-[9.5px] font-mono">
                {/* Col 1: Primary Evidence Anchor */}
                <div className="bg-[#080E16] border border-[#1E2D38]/60 rounded p-2">
                  <div className="text-[8px] uppercase tracking-wider text-[#64748B] mb-1">
                    PRIMARY EVIDENCE ANCHOR
                  </div>
                  <div className="text-[#38BDF8] font-mono truncate">
                    {currentStage.evidenceAnchor}
                  </div>
                  <div className="text-[#64748B] text-[8.5px] mt-0.5 truncate">
                    Source: {currentStage.provenance}
                  </div>
                </div>

                {/* Col 2: Connected Neighbors */}
                <div className="bg-[#080E16] border border-[#1E2D38]/60 rounded p-2">
                  <div className="text-[8px] uppercase tracking-wider text-[#64748B] mb-1">
                    CONNECTED NEIGHBORS ({(liveNeighbors.length > 0 ? liveNeighbors : currentStage.relatedEntities).length})
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {(liveNeighbors.length > 0 ? liveNeighbors : currentStage.relatedEntities).map((ent, i) => (
                      <span
                        key={i}
                        className="bg-[#0D141C] border border-[#1E2D38] text-[#D6E0E5] px-2 py-0.5 rounded text-[8.5px]"
                      >
                        {ent}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Col 3: Execution Context */}
                <div className="bg-[#080E16] border border-[#1E2D38]/60 rounded p-2">
                  <div className="text-[8px] uppercase tracking-wider text-[#64748B] mb-1">
                    EXECUTION CONTEXT
                  </div>
                  <div className="flex items-center justify-between text-[8.5px]">
                    <div>User: <span className="text-white font-semibold">{currentStage.context.user}</span></div>
                    <div>Host: <span className="text-white font-semibold">{currentStage.context.host}</span></div>
                    <div className="text-[#64748B]">{currentStage.context.time}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════
          CHAPTER SECTIONS (Challenge, Methodology, Topology, Evidence, Engine, Footer)
      ═══════════════════════════════════════════════════════════ */}
      <BlindSpotSection />
      <MethodologySection />
      <TopologySandboxSection />
      <ForensicDimensionsSection />
      <TechnicalEngineSection backendHealth={backendHealth} />
      <LandingFooter />
    </div>
  );
}
