'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import {
  Shield, ArrowRight,
  ExternalLink, Zap, Database, Cpu,
  Pause, Play, RotateCcw, ZoomIn, ZoomOut,
  FileText, Globe, Server
} from 'lucide-react';

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

const ATTACK_STAGES: AttackStage[] = [
  {
    id: 'stage-1',
    num: '01',
    label: 'Spear Phishing Ingress',
    mitre: 'MITRE T1566.001',
    numColor: '#DC666B',
    nodeId: 'threat-actor',
    alertId: 'alert-001',
    entityType: 'Device',
    entityId: 'dev-001',
    eventName: 'Phishing email received',
    eventCode: 'EVT-101',
    summary: 'Adversary delivered malicious payload spoofing internal HR invoice to Marcus Chen endpoint.',
    evidenceAnchor: 'Attachment: quarterly_invoice_review.pdf.exe',
    provenance: 'Proofpoint Email Gateway',
    relatedEntities: ['185.220.101.42', 'marcus.chen@acme.corp', 'LAPTOP-MCHEN'],
    context: {
      user: 'MARCUS_CHEN',
      host: 'LAPTOP-MCHEN',
      time: '2026-10-11T14:00:00Z',
    },
  },
  {
    id: 'stage-2',
    num: '02',
    label: 'LSASS Memory Dump',
    mitre: 'MITRE T1003.001',
    numColor: '#DC666B',
    nodeId: 'workstation',
    alertId: 'alert-002',
    entityType: 'User',
    entityId: 'user-003',
    eventName: 'Credential harvesting detected',
    eventCode: 'EVT-104',
    summary: 'Adversary dumped LSASS process memory to harvest elevated administrative service tickets.',
    evidenceAnchor: 'Memory read: lsass.exe via procdump64.exe',
    provenance: 'CrowdStrike Falcon Sensor EDR',
    relatedEntities: ['LAPTOP-MCHEN', 'admin-service', 'PID: 8412'],
    context: {
      user: 'SYSTEM / ELEVATED',
      host: 'LAPTOP-MCHEN',
      time: '2026-10-11T14:08:00Z',
    },
  },
  {
    id: 'stage-3',
    num: '03',
    label: 'Lateral RDP to Bastion',
    mitre: 'MITRE T1021.001',
    numColor: '#38BDF8',
    nodeId: 'network',
    alertId: 'alert-003',
    entityType: 'Device',
    entityId: 'dev-003',
    eventName: 'Lateral movement — RDP',
    eventCode: 'EVT-106',
    summary: 'Adversary leveraged harvested admin-service credentials to establish interactive RDP tunnel from compromised workstation into administrative bastion jump host.',
    evidenceAnchor: 'MITRE T1021.001: mstsc.exe connection from 10.0.1.45 to 10.0.2.15:3389',
    provenance: 'Network Security Monitor Flow Session #1092',
    relatedEntities: ['admin-service', 'SRV-ADMIN-01 (Bastion)'],
    context: {
      user: 'MARCUS_CHEN',
      host: 'LAPTOP-MCHEN',
      time: '2024-10-14T18:22:31Z',
    },
  },
  {
    id: 'stage-4',
    num: '04',
    label: 'Bulk Database Query',
    mitre: 'MITRE T1530',
    numColor: '#F59E0B',
    nodeId: 'database',
    alertId: 'alert-004',
    entityType: 'Resource',
    entityId: 'res-001',
    eventName: 'Database query — bulk export',
    eventCode: 'EVT-108',
    summary: 'Adversary executed unindexed wildcard query selecting 15,000 sensitive records from production Customer Database.',
    evidenceAnchor: 'Query: SELECT * FROM customers_pii LIMIT 15000',
    provenance: 'PostgreSQL Audit Extension (pgaudit)',
    relatedEntities: ['SRV-ADMIN-01', 'pg-prod-cluster-01', 'res-001 (Customer DB)'],
    context: {
      user: 'ADMIN-SERVICE (SVC)',
      host: 'SRV-ADMIN-01',
      time: '2026-10-11T14:35:00Z',
    },
  },
  {
    id: 'stage-5',
    num: '05',
    label: '4.2GB Encrypted Egress',
    mitre: 'MITRE T1048.002',
    numColor: '#EF4444',
    nodeId: 'threat-actor',
    alertId: 'alert-005',
    entityType: 'IPAddress',
    entityId: 'ip-006',
    eventName: 'Large file transfer',
    eventCode: 'EVT-109',
    summary: 'Adversary compressed stolen customer database into an AES-256 archive and streamed 4.2GB across an encrypted tunnel to an external drop node.',
    evidenceAnchor: 'Encrypted TLS egress: 4.2 GB transmitted to 91.219.236.18:443',
    provenance: 'Perimeter NextGen Firewall Session Log #8831',
    relatedEntities: ['SRV-ADMIN-01', '91.219.236.18', 'res-001'],
    context: {
      user: 'ADMIN-SERVICE',
      host: 'SRV-ADMIN-01',
      time: '2026-10-11T14:40:00Z',
    },
  },
];

interface DatacenterHeroProps {
  backendHealth: any;
  onLaunchApp?: (dest?: string) => void;
}

export function DatacenterHero({ backendHealth, onLaunchApp }: DatacenterHeroProps) {
  const { user, signInAsGuest } = useAuth();
  const router = useRouter();

  const [activeStageIdx, setActiveStageIdx] = useState<number>(2);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [speedMultiplier, setSpeedMultiplier] = useState<number>(2.4);
  const [zoomLevel, setZoomLevel] = useState<number>(1.0);
  const [liveNeighbors, setLiveNeighbors] = useState<string[]>([]);
  const [isLaunching, setIsLaunching] = useState<boolean>(false);
  const [tilt, setTilt] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const currentStage = ATTACK_STAGES[activeStageIdx];

  const handleLaunchApp = useCallback((dest = '/app') => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('threatgraph_guest_session', 'true');
    }
    if (!user) signInAsGuest();
    if (onLaunchApp) onLaunchApp(dest);
    else router.push(dest);
  }, [user, signInAsGuest, onLaunchApp, router]);

  const handleLaunchInvestigation = async () => {
    setIsLaunching(true);
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('threatgraph_guest_session', 'true');
      }
      if (!user) signInAsGuest();
      const current = ATTACK_STAGES[activeStageIdx];
      const res = await api.startInvestigation(
        current.alertId,
        `Investigation for ${current.label} initiated from ThreatGraph AI Hero`
      );
      router.push(`/app/investigations/${res.id}`);
    } catch {
      router.push('/app/investigations');
    } finally {
      setIsLaunching(false);
    }
  };

  useEffect(() => {
    if (!isPlaying) return;
    const baseInterval = 4000;
    const interval = setInterval(() => {
      setActiveStageIdx((prev) => (prev + 1) % ATTACK_STAGES.length);
    }, baseInterval / speedMultiplier);
    return () => clearInterval(interval);
  }, [isPlaying, speedMultiplier]);

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

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setTilt({ x: x * 1.5, y: y * 1.5 });
  }, []);

  const cycleSpeed = () => {
    if (speedMultiplier === 1.0) setSpeedMultiplier(1.5);
    else if (speedMultiplier === 1.5) setSpeedMultiplier(2.4);
    else if (speedMultiplier === 2.4) setSpeedMultiplier(3.0);
    else setSpeedMultiplier(1.0);
  };

  const nodeCount = backendHealth?.services?.falkordb?.nodes ?? 49;
  const edgeCount = backendHealth?.services?.falkordb?.edges ?? 49;

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      className="relative w-full h-[calc(100vh-68px)] min-h-[660px] max-h-[920px] overflow-hidden flex flex-col flex-shrink-0 select-none font-sans"
    >
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
        <div className="absolute inset-0 bg-gradient-to-r from-[#070A10] via-[#070A10]/75 to-transparent" style={{ width: '45%' }} />
        <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-[#070A10]/60 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#070A10] to-transparent" />
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
          <linearGradient id="cyanConduitGradNext" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#818CF8" stopOpacity="0.8" />
          </linearGradient>
          <linearGradient id="redConduitGradNext" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#EF4444" stopOpacity="0.9" />
          </linearGradient>
          <filter id="glowCyanNext" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <path
          d="M 410 360 L 530 310 L 640 270"
          fill="none"
          stroke="url(#cyanConduitGradNext)"
          strokeWidth="3"
          filter="url(#glowCyanNext)"
          strokeDasharray="6 4"
          className="opacity-90"
        />
        <circle r="4.5" fill="#38BDF8">
          <animateMotion path="M 410 360 L 530 310 L 640 270" dur="2.4s" repeatCount="indefinite" />
        </circle>

        <path
          d="M 640 270 L 690 320 L 730 400"
          fill="none"
          stroke="url(#cyanConduitGradNext)"
          strokeWidth="3.5"
          filter="url(#glowCyanNext)"
          strokeDasharray="8 4"
          className="opacity-95"
        />
        <circle r="5.5" fill="#7DD3FC">
          <animateMotion path="M 640 270 L 690 320 L 730 400" dur="2.8s" repeatCount="indefinite" />
        </circle>

        <path
          d="M 730 400 L 620 480 L 540 520"
          fill="none"
          stroke="url(#redConduitGradNext)"
          strokeWidth="3.5"
          strokeDasharray="5 3"
          className="opacity-95"
        />
        <circle r="5" fill="#EF4444">
          <animateMotion path="M 730 400 L 620 480 L 540 520" dur="2.1s" repeatCount="indefinite" />
        </circle>
      </svg>

      {/* ── Layer 3: Interactive Floating Cyber Infrastructure Badges ─ */}
      <div
        className="absolute inset-0 pointer-events-none z-20 transition-transform duration-700 ease-out"
        style={{
          transform: `scale(${zoomLevel}) translate3d(${tilt.x * 18}px, ${tilt.y * 18}px, 0)`,
          transformOrigin: 'center center'
        }}
      >
        <div className="absolute top-[21%] left-[45%] pointer-events-auto bg-[#070D15]/85 backdrop-blur-md border border-[#1E2D38] hover:border-[#38BDF8]/60 rounded-lg px-3 py-1.5 flex items-center gap-2.5 shadow-xl transition-all hover:scale-105 cursor-pointer">
          <div className="w-5 h-5 rounded bg-[#38BDF8]/10 border border-[#38BDF8]/30 flex items-center justify-center">
            <Key className="w-3 h-3 text-[#38BDF8]" />
          </div>
          <div>
            <div className="text-[10px] font-bold text-white leading-tight">Identity Provider</div>
            <div className="text-[8.5px] font-mono text-[#64748B]">Okta • IAM</div>
          </div>
        </div>

        <div className="absolute top-[37%] left-[48%] pointer-events-auto bg-[#070D15]/90 backdrop-blur-md border border-[#38BDF8]/50 shadow-[0_0_25px_rgba(56,189,248,0.3)] rounded-lg px-3.5 py-2 flex items-center gap-3 transition-all hover:scale-105 cursor-pointer">
          <div className="w-6 h-6 rounded-md bg-[#38BDF8]/20 border border-[#38BDF8] flex items-center justify-center shadow-[0_0_10px_#38BDF8]">
            <Shield className="w-3.5 h-3.5 text-[#38BDF8]" />
          </div>
          <div>
            <div className="text-[11px] font-extrabold text-white tracking-wide">ThreatGraph AI</div>
            <div className="text-[9px] font-mono text-[#38BDF8]">Graph Intelligence Core</div>
          </div>
        </div>

        <div className="absolute top-[28%] left-[64%] pointer-events-auto bg-[#070D15]/85 backdrop-blur-md border border-[#1E2D38] hover:border-[#38BDF8]/60 rounded-lg px-3 py-1.5 flex items-center gap-2.5 shadow-xl transition-all hover:scale-105 cursor-pointer">
          <div className="w-5 h-5 rounded bg-[#38BDF8]/10 border border-[#38BDF8]/30 flex items-center justify-center">
            <Server className="w-3 h-3 text-[#38BDF8]" />
          </div>
          <div>
            <div className="text-[10px] font-bold text-white leading-tight">Corporate Network</div>
            <div className="text-[8.5px] font-mono text-[#64748B]">Internal Resources</div>
          </div>
        </div>

        <div className="absolute top-[58%] left-[68%] pointer-events-auto bg-[#070D15]/85 backdrop-blur-md border border-[#1E2D38] hover:border-[#38BDF8]/60 rounded-lg px-3 py-1.5 flex items-center gap-2.5 shadow-xl transition-all hover:scale-105 cursor-pointer">
          <div className="w-5 h-5 rounded bg-[#38BDF8]/10 border border-[#38BDF8]/30 flex items-center justify-center">
            <Database className="w-3 h-3 text-[#38BDF8]" />
          </div>
          <div>
            <div className="text-[10px] font-bold text-white leading-tight">Database Cluster</div>
            <div className="text-[8.5px] font-mono text-[#64748B]">PostgreSQL • Production</div>
          </div>
        </div>

        <div className="absolute top-[75%] left-[53%] pointer-events-auto bg-[#180A0E]/90 backdrop-blur-md border border-[#EF4444]/60 shadow-[0_0_20px_rgba(239,68,68,0.25)] rounded-lg px-3 py-1.5 flex items-center gap-2.5 transition-all hover:scale-105 cursor-pointer">
          <div className="w-5 h-5 rounded bg-[#EF4444]/20 border border-[#EF4444] flex items-center justify-center">
            <Globe className="w-3 h-3 text-[#EF4444]" />
          </div>
          <div>
            <div className="text-[10px] font-bold text-[#FCA5A5] leading-tight">External Threat</div>
            <div className="text-[8.5px] font-mono text-[#EF4444]">TOR Exit Node</div>
          </div>
        </div>
      </div>

      {/* ── Layer 4: Top-Right Floating Camera & Animation Controls ─ */}
      <div className="absolute top-4 right-6 z-30 flex items-center gap-1.5 bg-[#070D15]/90 backdrop-blur-md border border-[#1E2D38] rounded-lg p-1 text-[#94A3B8] shadow-2xl">
        <button
          onClick={() => setIsPlaying(!isPlaying)}
          className="p-1.5 rounded hover:bg-[#1E2D38] hover:text-white transition-colors"
          title={isPlaying ? 'Pause auto-progression' : 'Resume auto-progression'}
        >
          {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 text-[#38BDF8]" />}
        </button>
        <button
          onClick={() => { setActiveStageIdx(2); setZoomLevel(1.0); }}
          className="p-1.5 rounded hover:bg-[#1E2D38] hover:text-white transition-colors"
          title="Reset stage view"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => setZoomLevel((z) => Math.max(0.8, z - 0.1))}
          className="p-1.5 rounded hover:bg-[#1E2D38] hover:text-white transition-colors"
          title="Zoom out"
        >
          <ZoomOut className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => setZoomLevel((z) => Math.min(1.4, z + 0.1))}
          className="p-1.5 rounded hover:bg-[#1E2D38] hover:text-white transition-colors"
          title="Zoom in"
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* ── Layer 5: Left Editorial Content (Typography + Actions) ── */}
      <div className="relative z-30 w-full max-w-[1560px] mx-auto px-4 sm:px-6 lg:px-8 flex-1 flex flex-col justify-start pt-6 sm:pt-8 pointer-events-none">
        <div className="max-w-xl pointer-events-auto space-y-4">
          <div className="flex items-center gap-2.5">
            <span className="w-2 h-2 rounded-full bg-[#38BDF8] animate-pulse" />
            <span className="text-[10.5px] font-mono uppercase tracking-[0.2em] text-[#38BDF8] font-semibold">
              CONNECTED SECURITY INTELLIGENCE
            </span>
            <div className="w-8 h-[1px] bg-[#1E2D38]" />
          </div>

          <h1 className="font-heading text-[2.75rem] sm:text-[3.25rem] lg:text-[3.65rem] font-bold tracking-tight text-white leading-[1.06]">
            The threat is not<br />
            the alert.<br />
            <span className="text-[#C68A69]">
              It&apos;s what connects it.
            </span>
          </h1>

          <p className="text-[#94A3B8] text-[13.5px] sm:text-[14.5px] leading-relaxed font-body max-w-lg">
            ThreatGraph AI investigates suspicious activity through connected security data, tracing relationships across identities, endpoints, events and resources to assemble evidence-backed incident narratives.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <button
              onClick={handleLaunchInvestigation}
              disabled={isLaunching}
              className="btn-primary text-xs sm:text-[13px] px-5 py-2.5"
            >
              {isLaunching ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-[#050811] border-t-transparent rounded-full animate-spin" />
                  <span>Traversing Graph...</span>
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
              className="btn-secondary text-xs sm:text-[13px] px-5 py-2.5"
            >
              Explore Connected Data
            </button>
          </div>

          <div className="pt-2 flex flex-wrap items-center gap-3 sm:gap-4 text-[11px] font-mono text-[#64748B]">
            <div className="flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-[#38BDF8]" />
              <span className="text-white font-semibold">FalkorDB Graph</span>
              <span className="text-[10px] text-[#7D8B96]">({nodeCount} Nodes · {edgeCount} Edges)</span>
            </div>
            <div className="w-[1px] h-3 bg-[#1E2D38] hidden sm:block" />
            <div className="flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-[#38BDF8]" />
              <span className="text-white font-semibold">Gemini 2.0 Agent</span>
              <span className="text-[10px] text-[#7D8B96]">Autonomous</span>
            </div>
            <div className="w-[1px] h-3 bg-[#1E2D38] hidden sm:block" />
            <div className="flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-[#C68A69]" />
              <span className="text-white font-semibold">Cypher Native</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Layer 6: Docked Attack Timeline Progression & Evidence Console ── */}
      <div className="relative z-30 w-full px-4 sm:px-6 lg:px-8 pb-3 pt-2 mt-auto">
        <div className="max-w-[1560px] mx-auto">
          <div className="bg-[#070D15]/95 backdrop-blur-xl border border-[#1E2D38] rounded-xl overflow-hidden shadow-2xl">
            {/* Upper Timeline Row */}
            <div className="px-5 py-2.5 border-b border-[#1E2D38]/80 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 bg-[#09111A]/80">
              <div className="flex items-center gap-2 text-[10px] font-mono tracking-wider text-[#64748B]">
                <span className="uppercase text-[#94A3B8] font-bold">Attack Timeline Progression</span>
                <span className="text-[#38BDF8] font-bold">STAGE 0{activeStageIdx + 1} / 05</span>
              </div>

              <div className="flex items-center gap-4 text-[11px] font-mono">
                <div className="flex items-center gap-2 text-[#94A3B8]">
                  <span>Auto progression</span>
                  <button
                    onClick={() => setIsPlaying(!isPlaying)}
                    className={`w-9 h-5 rounded-full transition-colors p-0.5 flex items-center ${
                      isPlaying ? 'bg-[#38BDF8] justify-end' : 'bg-[#1E2D38] justify-start'
                    }`}
                  >
                    <div className="w-4 h-4 rounded-full bg-white shadow-md" />
                  </button>
                </div>

                <button
                  onClick={cycleSpeed}
                  className="bg-[#0D141C] border border-[#1E2D38] hover:border-[#38BDF8]/40 text-[#94A3B8] hover:text-white px-2.5 py-1 rounded text-[10.5px] transition-colors"
                >
                  {speedMultiplier}x
                </button>

                <button
                  onClick={() => { setActiveStageIdx(2); setZoomLevel(1.0); }}
                  className="flex items-center gap-1.5 text-[#38BDF8] hover:text-white transition-colors"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Focus Path</span>
                </button>
              </div>
            </div>

            {/* 5-Stage Interactive Tabs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 divide-y sm:divide-y-0 sm:divide-x divide-[#1E2D38]/60 bg-[#070D15]">
              {ATTACK_STAGES.map((stg, idx) => {
                const isActive = activeStageIdx === idx;
                return (
                  <button
                    key={stg.id}
                    onClick={() => setActiveStageIdx(idx)}
                    className={`p-3 text-left transition-all relative flex flex-col justify-between ${
                      isActive
                        ? 'bg-[#0E1A27] border-b-2 border-b-[#38BDF8] shadow-inner'
                        : 'hover:bg-[#0A121C]/60'
                    }`}
                  >
                    <div>
                      <div className="text-[10px] font-mono font-bold mb-0.5" style={{ color: stg.numColor }}>
                        {stg.num}
                      </div>
                      <div className="text-[12px] font-bold text-white leading-tight">
                        {stg.label}
                      </div>
                    </div>
                    <div className="text-[9.5px] font-mono text-[#64748B] mt-1.5">
                      {stg.mitre}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Evidence Console */}
            <div className="px-5 py-3 border-t border-[#1E2D38] bg-[#070D15]/95 space-y-2.5">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-2">
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

              {/* 3-Column Metadata Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 border-t border-[#1E2D38]/40 text-[9.5px] font-mono">
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
    </div>
  );
}

// Icon helper
function Key(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 0 1 2 2m4 0a6 6 0 0 1-7.743 5.743L11 17H9v2H7v2H4a1 1 0 0 1-1-1v-2.586a1 1 0 0 1 .293-.707l5.964-5.964A6 6 0 1 1 21 9z" />
    </svg>
  );
}
