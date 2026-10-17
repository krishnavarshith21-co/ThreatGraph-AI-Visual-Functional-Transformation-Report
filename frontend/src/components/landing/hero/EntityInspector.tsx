'use client';

import { ExternalLink, FileCode, ShieldAlert, Cpu, User, Network, Database } from 'lucide-react';
import type { HeroNode } from './heroTypes';
import { HERO_NODES, HERO_EDGES, HERO_INVESTIGATION_STAGES } from './heroData';

interface EntityInspectorProps {
  selectedNode: HeroNode | null;
  activeStage: 1 | 2 | 3 | 4 | 5;
  onSelectNode: (node: HeroNode) => void;
  onInspectDossier: () => void;
  className?: string;
}

export function EntityInspector({
  selectedNode,
  activeStage,
  onSelectNode,
  onInspectDossier,
  className = '',
}: EntityInspectorProps) {
  const currentStage = HERO_INVESTIGATION_STAGES.find((s) => s.stageNumber === activeStage)!;
  const node = selectedNode || HERO_NODES.find((n) => n.id === currentStage.anchorNodeId) || HERO_NODES[0];

  // Derive connected neighbors
  const connectedNodeIds = new Set<string>();
  HERO_EDGES.forEach((e) => {
    if (e.source === node.id) connectedNodeIds.add(e.target);
    if (e.target === node.id) connectedNodeIds.add(e.source);
  });
  const neighborNodes = HERO_NODES.filter((n) => connectedNodeIds.has(n.id));

  // Fallback default neighbors matching reference image if none
  const defaultNeighbors = [
    { id: 'admin-service', label: 'admin-service' },
    { id: 'SRV-ADMIN-01', label: 'SRV-ADMIN-01' },
    { id: 'bastion-host', label: 'bastion-host' },
  ];

  const displayNeighbors = neighborNodes.length > 0
    ? neighborNodes.slice(0, 4)
    : defaultNeighbors;

  return (
    <div className={`w-full bg-[#080E17]/95 backdrop-blur-md border-t border-[#1A2732] px-4 sm:px-6 py-3 font-mono text-xs ${className}`}>
      {/* ── Top Row: Event Header, Pivot Badge, Dossier Action ────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-2.5 border-b border-[#1A2732]/60">
        <div className="flex items-start sm:items-center gap-3 min-w-0">
          <div className="w-7 h-7 rounded-md bg-[#111B26] border border-[#1A2732] flex items-center justify-center flex-shrink-0 text-[#C68A69]">
            <FileCode className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#111B26] border border-[#1A2732] text-[#46D7F5]">
                {node.type === 'Event' ? 'EVENT' : node.type.toUpperCase()}
              </span>
              <span className="text-[13px] font-semibold text-[#F3F5F7] tracking-tight">
                {currentStage.anchorEventLabel || node.label}
              </span>
              <span className="text-[11px] text-[#788B99]">
                [{node.id}]
              </span>
            </div>
            <div className="text-[11px] text-[#B2C0CA] mt-0.5 font-sans">
              {currentStage.summary || node.meta.summary || 'Interactive RDP session established from workstation to DMZ bastion jump host.'}
            </div>
          </div>
        </div>

        {/* Right Status Pill & Inspect Dossier Button */}
        <div className="flex items-center gap-3 flex-shrink-0 self-stretch sm:self-auto justify-between sm:justify-end">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#46D7F5]/10 border border-[#46D7F5]/30 text-[#46D7F5] text-[10px] font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-[#46D7F5] shadow-[0_0_8px_#46D7F5] animate-pulse" />
            <span>STAGE 0{activeStage} PIVOT</span>
          </div>

          <button
            onClick={onInspectDossier}
            className="flex items-center gap-1.5 px-3 py-1 rounded bg-[#111B26] border border-[#1A2732] hover:border-[#46D7F5] text-[#F3F5F7] hover:text-[#46D7F5] transition-colors cursor-pointer text-[11px]"
          >
            <span>Inspect Dossier</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ── Bottom Row: 3 Columns (Primary Evidence, Connected Neighbors, Execution Context) ── */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 pt-2.5 text-[11px]">
        {/* Column 1: Primary Evidence Anchor (~45% / 5.5 cols) */}
        <div className="md:col-span-5 flex flex-col justify-center">
          <span className="text-[10px] text-[#788B99] uppercase font-semibold mb-1">
            PRIMARY EVIDENCE ANCHOR
          </span>
          <div className="text-[#F3F5F7] font-mono leading-relaxed text-[11px]">
            {node.meta.evidenceAnchor || currentStage.evidenceAnchor}
          </div>
          <div className="text-[10px] text-[#788B99] mt-0.5">
            Source: {node.meta.provenance || currentStage.provenance}
          </div>
        </div>

        {/* Column 2: Connected Neighbors (~30% / 3.5 cols) */}
        <div className="md:col-span-4 flex flex-col justify-center">
          <span className="text-[10px] text-[#788B99] uppercase font-semibold mb-1">
            CONNECTED NEIGHBORS ({displayNeighbors.length})
          </span>
          <div className="flex flex-wrap gap-1.5">
            {displayNeighbors.map((nb) => (
              <button
                key={nb.id}
                onClick={() => {
                  const target = HERO_NODES.find((n) => n.id === nb.id);
                  if (target) onSelectNode(target);
                }}
                className="px-2 py-0.5 rounded bg-[#111B26] border border-[#1A2732] text-[#B2C0CA] hover:text-[#46D7F5] hover:border-[#46D7F5]/50 transition-colors text-[10px] cursor-pointer"
              >
                {nb.label}
              </button>
            ))}
          </div>
        </div>

        {/* Column 3: Execution Context (~25% / 3 cols) */}
        <div className="md:col-span-3 flex flex-col justify-center border-l md:border-[#1A2732] md:pl-4">
          <span className="text-[10px] text-[#788B99] uppercase font-semibold mb-1">
            EXECUTION CONTEXT
          </span>
          <div className="space-y-0.5 text-[10px] font-mono">
            <div className="text-[#B2C0CA]">User: <span className="text-[#F3F5F7]">{node.meta.technique ? 'MARCUS_CHEN' : 'MARCUS_CHEN'}</span></div>
            <div className="text-[#B2C0CA]">Host: <span className="text-[#F3F5F7]">LAPTOP-MCHEN</span></div>
            <div className="text-[#788B99]">Time: <span className="text-[#788B99]">2024-10-14T18:22:31Z</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}
