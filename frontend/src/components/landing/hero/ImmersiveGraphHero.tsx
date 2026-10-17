'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { CinematicCyberScene } from './CinematicCyberScene';
import { InvestigationTimeline } from './InvestigationTimeline';
import { EntityInspector } from './EntityInspector';
import { HERO_NODES, HERO_INVESTIGATION_STAGES, HERO_PALETTE } from './heroData';
import type { HeroNode } from './heroTypes';
import { ArrowRight, Database, Zap, ShieldCheck, Layers } from 'lucide-react';

interface ImmersiveGraphHeroProps {
  backendHealth?: any;
  onLaunchApp?: (destination?: string) => void;
  className?: string;
}

export function ImmersiveGraphHero({
  backendHealth,
  onLaunchApp,
  className = '',
}: ImmersiveGraphHeroProps) {
  const router = useRouter();
  const { user, signInAsGuest } = useAuth();

  // Unified State Model — Default to Stage 03 (Lateral RDP to Bastion) matching reference image
  const [activeStage, setActiveStage] = useState<1 | 2 | 3 | 4 | 5>(3);
  const [selectedNode, setSelectedNode] = useState<HeroNode | null>(
    HERO_NODES.find((n) => n.id === 'evt-rdp-lateral') || HERO_NODES[4]
  );
  const [hoveredNode, setHoveredNode] = useState<HeroNode | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);

  // Function refs for camera controls
  const resetViewFnRef = useRef<(() => void) | null>(null);
  const zoomInFnRef = useRef<(() => void) | null>(null);
  const zoomOutFnRef = useRef<(() => void) | null>(null);

  const handleLaunch = useCallback(
    (destination = '/app/investigations') => {
      if (onLaunchApp) {
        onLaunchApp(destination);
      } else {
        if (!user) signInAsGuest();
        router.push(destination);
      }
    },
    [onLaunchApp, user, signInAsGuest, router]
  );

  // Synchronize stage selection: updates active stage and selects its anchor node
  const handleSelectStage = useCallback((stageNumber: 1 | 2 | 3 | 4 | 5) => {
    setActiveStage(stageNumber);
    const stage = HERO_INVESTIGATION_STAGES.find((s) => s.stageNumber === stageNumber);
    if (stage) {
      const anchorNode = HERO_NODES.find((n) => n.id === stage.anchorNodeId);
      if (anchorNode) {
        setSelectedNode(anchorNode);
      }
    }
  }, []);

  // Synchronize node selection: updates selected node, and if node has a stageNumber, updates active stage
  const handleSelectNode = useCallback((node: HeroNode | null) => {
    setSelectedNode(node);
    if (node && node.isAttackPath && node.stageNumber) {
      setActiveStage(node.stageNumber);
    }
  }, []);

  // Automatic timeline progression when playing
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      setActiveStage((prev) => {
        if (prev >= 5) {
          return 1; // Loop back smoothly
        }
        const next = (prev + 1) as 1 | 2 | 3 | 4 | 5;
        const stage = HERO_INVESTIGATION_STAGES.find((s) => s.stageNumber === next);
        if (stage) {
          const anchorNode = HERO_NODES.find((n) => n.id === stage.anchorNodeId);
          if (anchorNode) {
            setSelectedNode(anchorNode);
          }
        }
        return next;
      });
    }, 7000);

    return () => clearInterval(interval);
  }, [isPlaying]);

  // Navigate to full investigation dossier
  const handleInspectDossier = useCallback(() => {
    if (!user) {
      signInAsGuest();
    }
    router.push('/app/investigations/inv-001');
  }, [user, signInAsGuest, router]);

  const handleTogglePlay = useCallback(() => {
    setIsPlaying((prev) => !prev);
  }, []);

  const handleFocusPath = useCallback(() => {
    if (resetViewFnRef.current) resetViewFnRef.current();
  }, []);

  const isDbLive = backendHealth?.services?.falkordb?.status === 'connected';
  const nodeCount = backendHealth?.services?.falkordb?.nodes ?? 49;
  const edgeCount = backendHealth?.services?.falkordb?.edges ?? 49;

  return (
    <div className={`relative w-full flex flex-col bg-[#070A10] ${className}`}>
      {/* ── Main Panoramic Hero Space (3D Scene + Left Editorial Overlay) ── */}
      <div className="relative w-full h-[500px] sm:h-[540px] lg:h-[580px] overflow-hidden">
        {/* 3D WebGL Canvas Layer spanning the full background & right area */}
        <div className="absolute inset-0 z-0">
          <CinematicCyberScene
            selectedNode={selectedNode}
            onSelectNode={handleSelectNode}
            hoveredNode={hoveredNode}
            onHoverNode={setHoveredNode}
            activeStage={activeStage}
            isPlaying={isPlaying}
            onTogglePlay={handleTogglePlay}
            onResetViewRef={(fn) => { resetViewFnRef.current = fn; }}
            onZoomInRef={(fn) => { zoomInFnRef.current = fn; }}
            onZoomOutRef={(fn) => { zoomOutFnRef.current = fn; }}
          />
        </div>

        {/* Ambient Dark Gradient on Left for Razor-Sharp Typography Contrast */}
        <div className="absolute inset-0 pointer-events-none z-10 bg-gradient-to-r from-[#070A10] via-[#070A10]/85 via-40% to-transparent" />

        {/* ── Left Editorial Narrative Layer (Floating ~35% width) ── */}
        <div className="relative z-20 max-w-[1780px] mx-auto px-4 sm:px-6 lg:px-8 h-full flex flex-col justify-center pointer-events-none py-12 lg:py-16">
          <div className="max-w-xl pointer-events-auto space-y-6">
            {/* Eyebrow */}
            <div className="flex items-center gap-3">
              <div className="w-6 h-[1.5px] bg-[#46D7F5]" />
              <span className="text-[11px] font-mono uppercase tracking-[0.22em] text-[#46D7F5] font-semibold">
                CONNECTED SECURITY INTELLIGENCE
              </span>
            </div>

            {/* Dominant Headline matching Reference Image */}
            <h1 className="font-heading text-[2.75rem] sm:text-[3.25rem] lg:text-[3.85rem] font-bold tracking-tight text-[#F3F5F7] leading-[1.05]">
              The threat is not<br />
              the alert.<br />
              <span className="text-[#C68A69]">
                It&apos;s what connects it.
              </span>
            </h1>

            {/* Concise Supporting Copy */}
            <p className="text-[#B2C0CA] text-base lg:text-[16px] leading-relaxed font-body max-w-lg">
              ThreatGraph AI investigates suspicious activity through connected security data, tracing relationships across identities, endpoints, events and resources to assemble evidence-backed incident narratives.
            </p>

            {/* Action Buttons matching Reference Image */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5 pt-1">
              <button
                onClick={() => handleLaunch('/app/investigations')}
                className="text-sm font-semibold py-3 px-6 rounded bg-[#46D7F5] hover:bg-[#83DCE8] text-[#070A10] flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-[#46D7F5]/20 hover:shadow-[#46D7F5]/35 transition-all"
              >
                <span>Launch Investigation</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <a
                href="#topology"
                className="text-sm font-medium py-3 px-6 rounded bg-[#09121D]/80 hover:bg-[#111B26] text-[#F3F5F7] border border-[#1A2732] hover:border-[#46D7F5]/60 flex items-center justify-center transition-colors cursor-pointer"
              >
                Explore Connected Data
              </a>
            </div>

            {/* Technical Status Row matching Reference: FalkorDB Graph | Gemini 2.0 Agent | Cypher Native */}
            <div className="pt-4 flex flex-wrap items-center gap-4 text-[11px] font-mono text-[#788B99]">
              <div className="flex items-center gap-2">
                <Layers className="w-3.5 h-3.5 text-[#46D7F5]" />
                <div className="flex flex-col">
                  <span className="text-[#F3F5F7] font-semibold">FalkorDB Graph</span>
                  <span className="text-[10px] text-[#788B99]">{nodeCount} Nodes &bull; {edgeCount} Edges</span>
                </div>
              </div>

              <div className="w-[1px] h-7 bg-[#1A2732]" />

              <div className="flex items-center gap-2">
                <Zap className="w-3.5 h-3.5 text-[#46D7F5]" />
                <div className="flex flex-col">
                  <span className="text-[#F3F5F7] font-semibold">Gemini 2.0 Agent</span>
                  <span className="text-[10px] text-[#788B99]">Autonomous Analysis</span>
                </div>
              </div>

              <div className="w-[1px] h-7 bg-[#1A2732]" />

              <div className="flex items-center gap-2">
                <Database className="w-3.5 h-3.5 text-[#D8AE69]" />
                <div className="flex flex-col">
                  <span className="text-[#F3F5F7] font-semibold">Cypher Native</span>
                  <span className="text-[10px] text-[#788B99]">Query at Scale</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Docked Attack Timeline Progression & Evidence Console ───── */}
      <div className="relative z-30 w-full max-w-[1780px] mx-auto px-4 sm:px-6 lg:px-8 -mt-8 sm:-mt-12 mb-4">
        <div className="rounded-xl border border-[#1A2732] bg-[#080E17]/95 backdrop-blur-md overflow-hidden shadow-2xl">
          <InvestigationTimeline
            activeStage={activeStage}
            onSelectStage={handleSelectStage}
            isPlaying={isPlaying}
            onTogglePlay={handleTogglePlay}
            onFocusPath={handleFocusPath}
          />
          <EntityInspector
            selectedNode={selectedNode}
            activeStage={activeStage}
            onSelectNode={handleSelectNode}
            onInspectDossier={handleInspectDossier}
          />
        </div>
      </div>
    </div>
  );
}
