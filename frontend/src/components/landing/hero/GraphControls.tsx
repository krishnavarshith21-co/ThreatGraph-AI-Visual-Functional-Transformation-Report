'use client';

import { Play, Pause, RotateCcw, ZoomIn, ZoomOut, Maximize2, Shield } from 'lucide-react';

interface GraphControlsProps {
  isPlaying: boolean;
  onTogglePlay: () => void;
  onReplay: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetView: () => void;
  className?: string;
}

export function GraphControls({
  isPlaying,
  onTogglePlay,
  onReplay,
  onZoomIn,
  onZoomOut,
  onResetView,
  className = '',
}: GraphControlsProps) {
  return (
    <div className={`flex items-center gap-1.5 bg-[#070C13]/85 backdrop-blur-md border border-[#1A2732] p-1 rounded font-mono z-20 shadow-lg ${className}`}>
      {/* Play / Pause Toggle */}
      <button
        onClick={onTogglePlay}
        aria-label={isPlaying ? 'Pause Investigation Animation' : 'Resume Investigation Animation'}
        title={isPlaying ? 'Pause Animation' : 'Resume Animation'}
        className="p-1.5 rounded hover:bg-[#1A2732] text-[#83CFE0] transition-colors cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#83CFE0]"
      >
        {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
      </button>

      {/* Replay */}
      <button
        onClick={onReplay}
        aria-label="Replay Investigation Sequence"
        title="Replay from Stage 01"
        className="p-1.5 rounded hover:bg-[#1A2732] text-[#D6E0E5] transition-colors cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#83CFE0]"
      >
        <RotateCcw className="w-3.5 h-3.5" />
      </button>

      <div className="w-[1px] h-3.5 bg-[#1A2732] mx-0.5" />

      {/* Zoom In */}
      <button
        onClick={onZoomIn}
        aria-label="Zoom In"
        title="Zoom In"
        className="p-1.5 rounded hover:bg-[#1A2732] text-[#D6E0E5] transition-colors cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#83CFE0]"
      >
        <ZoomIn className="w-3.5 h-3.5" />
      </button>

      {/* Zoom Out */}
      <button
        onClick={onZoomOut}
        aria-label="Zoom Out"
        title="Zoom Out"
        className="p-1.5 rounded hover:bg-[#1A2732] text-[#D6E0E5] transition-colors cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#83CFE0]"
      >
        <ZoomOut className="w-3.5 h-3.5" />
      </button>

      {/* Reset / Center Framing */}
      <button
        onClick={onResetView}
        aria-label="Reset Camera Framing"
        title="Reset & Center View"
        className="p-1.5 rounded hover:bg-[#1A2732] text-[#D6E0E5] transition-colors cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#83CFE0]"
      >
        <Maximize2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
