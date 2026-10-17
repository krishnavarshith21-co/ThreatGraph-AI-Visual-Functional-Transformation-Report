'use client';

import { useState } from 'react';
import { HERO_INVESTIGATION_STAGES, HERO_PALETTE } from './heroData';
import type { InvestigationStage } from './heroTypes';
import { Crosshair, ChevronDown } from 'lucide-react';

interface InvestigationTimelineProps {
  activeStage: 1 | 2 | 3 | 4 | 5;
  onSelectStage: (stage: 1 | 2 | 3 | 4 | 5) => void;
  isPlaying?: boolean;
  onTogglePlay?: () => void;
  onFocusPath?: () => void;
  className?: string;
}

export function InvestigationTimeline({
  activeStage,
  onSelectStage,
  isPlaying = true,
  onTogglePlay,
  onFocusPath,
  className = '',
}: InvestigationTimelineProps) {
  const [speed, setSpeed] = useState<'1.0x' | '2.4x' | '4.0x'>('2.4x');

  return (
    <div className={`w-full bg-[#080E17]/95 backdrop-blur-md border-t border-[#1A2732] px-4 sm:px-6 py-3 font-mono ${className}`}>
      {/* ── Top Header Controls ───────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-2.5">
        <div className="flex items-center gap-2.5">
          <span className="text-[11px] font-semibold tracking-wider text-[#788B99] uppercase">
            ATTACK TIMELINE PROGRESSION
          </span>
          <span className="text-[11px] font-bold text-[#D8AE69]">
            STAGE 0{activeStage} / 05
          </span>
        </div>

        {/* Right Action Controls: Auto progression [toggle] | 2.4x [v] | [Focus Path] */}
        <div className="flex items-center gap-3 text-[11px]">
          {/* Auto progression toggle */}
          <div className="flex items-center gap-2 text-[#788B99]">
            <span>Auto progression</span>
            <button
              onClick={onTogglePlay}
              className={`w-8 h-4 rounded-full transition-colors relative cursor-pointer ${
                isPlaying ? 'bg-[#46D7F5]' : 'bg-[#1A2732]'
              }`}
              aria-label="Toggle auto progression"
            >
              <span
                className={`absolute top-0.5 w-3 h-3 rounded-full bg-[#070A10] transition-transform ${
                  isPlaying ? 'left-4.5' : 'left-0.5'
                }`}
              />
            </button>
          </div>

          {/* Speed Selector */}
          <button
            onClick={() => {
              setSpeed((prev) => (prev === '1.0x' ? '2.4x' : prev === '2.4x' ? '4.0x' : '1.0x'));
            }}
            className="flex items-center gap-1 px-2 py-0.5 rounded bg-[#111B26] border border-[#1A2732] text-[#B2C0CA] hover:text-white transition-colors cursor-pointer"
          >
            <span>{speed}</span>
            <ChevronDown className="w-3 h-3 text-[#788B99]" />
          </button>

          {/* Focus Path Button */}
          <button
            onClick={onFocusPath}
            className="flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-[#111B26] border border-[#1A2732] hover:border-[#46D7F5]/60 text-[#B2C0CA] hover:text-[#46D7F5] transition-colors cursor-pointer"
          >
            <Crosshair className="w-3 h-3 text-[#46D7F5]" />
            <span>Focus Path</span>
          </button>
        </div>
      </div>

      {/* ── 5 Stage Horizontal Cards Grid ─────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {HERO_INVESTIGATION_STAGES.map((stage: InvestigationStage) => {
          const isActive = activeStage === stage.stageNumber;
          const isPast = activeStage > stage.stageNumber;

          // Number accent colors: 01 red, 02 gold, 03 cyan, 04/05 muted
          const numColor =
            stage.stageNumber === 1
              ? '#F05261'
              : stage.stageNumber === 2
              ? '#D8AE69'
              : stage.stageNumber === 3
              ? '#46D7F5'
              : '#788B99';

          return (
            <button
              key={stage.stageNumber}
              onClick={() => onSelectStage(stage.stageNumber)}
              className={`text-left p-3 rounded-lg border transition-all duration-200 cursor-pointer relative overflow-hidden group ${
                isActive
                  ? 'bg-[#0B1824] border-[#46D7F5] shadow-[0_0_16px_rgba(70,215,245,0.22)]'
                  : 'bg-[#09121D]/80 border-[#1A2732] hover:border-[#344451]'
              }`}
            >
              <div className="text-[12px] font-bold mb-1" style={{ color: numColor }}>
                0{stage.stageNumber}
              </div>

              <div className="text-[12px] font-semibold text-[#F3F5F7] tracking-tight truncate group-hover:text-white">
                {stage.anchorEventLabel}
              </div>

              <div className="text-[10px] text-[#788B99] truncate mt-0.5">
                {stage.tactic}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
