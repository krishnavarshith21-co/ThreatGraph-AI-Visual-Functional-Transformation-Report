export type SecurityNodeType = 'User' | 'Device' | 'IPAddress' | 'Event' | 'Resource' | 'Alert';

export interface HeroNode {
  id: string;
  label: string;
  type: SecurityNodeType;
  position: [number, number, number];
  color: string;
  isAttackPath: boolean;
  stageNumber?: 1 | 2 | 3 | 4 | 5;
  attackOrder?: number;
  meta: {
    classification?: string;
    threatLevel?: string;
    technique?: string;
    tactic?: string;
    role?: string;
    department?: string;
    os?: string;
    internalIp?: string;
    srcPort?: string;
    dstPort?: string;
    query?: string;
    protocol?: string;
    outboundBytes?: string;
    evidenceAnchor?: string;
    provenance?: string;
    summary?: string;
    [key: string]: string | undefined;
  };
}

export interface HeroEdge {
  id: string;
  source: string;
  target: string;
  label: string;
  isAttackPath: boolean;
  stageNumber?: 1 | 2 | 3 | 4 | 5;
  attackOrder?: number;
}

export interface InvestigationStage {
  stageNumber: 1 | 2 | 3 | 4 | 5;
  title: string;
  shortLabel: string;
  tactic: string;
  anchorNodeId: string;
  anchorEventLabel: string;
  timestamp: string;
  summary: string;
  evidenceAnchor: string;
  provenance: string;
  severity: 'critical' | 'high' | 'medium';
  color: string;
}

export interface HeroSelectionState {
  selectedNode: HeroNode | null;
  hoveredNode: HeroNode | null;
  activeStage: 1 | 2 | 3 | 4 | 5;
  isPlaying: boolean;
  playbackProgress: number; // 0.0 to 1.0
  cameraTarget: [number, number, number] | null;
}
