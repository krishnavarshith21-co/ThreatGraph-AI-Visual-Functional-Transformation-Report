'use client';

import { CinematicCyberScene } from './CinematicCyberScene';
import type { HeroNode } from './heroTypes';

interface ThreatGraphCanvasProps {
  selectedNode: HeroNode | null;
  onSelectNode: (node: HeroNode | null) => void;
  hoveredNode: HeroNode | null;
  onHoverNode: (node: HeroNode | null) => void;
  activeStage: 1 | 2 | 3 | 4 | 5;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onResetViewRef?: (fn: () => void) => void;
  onZoomInRef?: (fn: () => void) => void;
  onZoomOutRef?: (fn: () => void) => void;
  className?: string;
}

export function ThreatGraphCanvas(props: ThreatGraphCanvasProps) {
  return <CinematicCyberScene {...props} />;
}
