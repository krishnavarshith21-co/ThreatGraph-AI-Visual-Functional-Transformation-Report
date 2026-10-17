'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { api } from '@/lib/api';
import type { Investigation, GraphNode, GraphEdge } from '@/lib/types';
import {
  ShieldAlert, CheckCircle2, Clock, Terminal, AlertTriangle,
  Download, ArrowLeft, RefreshCw, Layers,
  HelpCircle, UserCheck, Activity, Shield, X,
  ChevronLeft, ChevronRight, Play, Pause,
  Search, ArrowUpRight, Check,
  Info, FileJson, FileText, CornerDownRight, Database
} from 'lucide-react';

const CytoscapeGraph = dynamic(
  () => import('@/components/graph/CytoscapeGraph').then((mod) => mod.CytoscapeGraph),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full min-h-[560px] flex items-center justify-center bg-[#080B10] text-[#8A99A8] font-mono text-xs">
        <div className="text-center space-y-3">
          <div className="w-7 h-7 border-2 border-[#79D8D0] border-t-transparent rounded-full animate-spin mx-auto" />
          <p>Initializing ThreatGraph 3D Spatial Intelligence Engine...</p>
        </div>
      </div>
    ),
  }
);

interface ParsedAction {
  id: number;
  raw: string;
  title: string;
  priority: 'critical' | 'high' | 'medium';
  affectedEntities: string[];
  rationale: string;
}

// ── Security Redaction Helper ───────────────────────────────────
function redactSensitiveData(key: string, value: unknown): string {
  const sensitiveKeys = ['password', 'secret', 'token', 'key', 'auth', 'cred'];
  if (sensitiveKeys.some((s) => key.toLowerCase().includes(s))) {
    return '••••••••[REDACTED]';
  }
  const str = typeof value === 'object' ? JSON.stringify(value) : String(value);
  if (/falkor.*:[a-zA-Z0-9_\-]+@/i.test(str)) {
    return str.replace(/:[^:@]+@/, ':••••••••@');
  }
  return str;
}

export default function InvestigationDetailPage() {
  const params = useParams();
  const id = typeof params?.id === 'string' ? params.id : Array.isArray(params?.id) ? params.id[0] : '';

  // Core state
  const [investigation, setInvestigation] = useState<Investigation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'workspace' | 'evidence' | 'trace' | 'decisions'>('workspace');

  // Graph and Trajectory Synchronization
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [focusNodeId, setFocusNodeId] = useState<string | null>(null);
  const [focusTimestamp, setFocusTimestamp] = useState<number>(0);
  const [activePivotIndex, setActivePivotIndex] = useState<number>(0);
  const [isTrajectoryPlaying, setIsTrajectoryPlaying] = useState<boolean>(false);

  // Evidence Workspace Filters
  const [evidenceSearch, setEvidenceSearch] = useState<string>('');
  const [evidenceFilter, setEvidenceFilter] = useState<'all' | 'findings' | 'telemetry' | 'contradictions' | 'gaps'>('all');

  // Action Items Triage State (Accept / Defer / Reject per action)
  const [actionDecisions, setActionDecisions] = useState<Record<number, 'accepted' | 'deferred' | 'rejected'>>({});

  // Decision Modal State (Valid backend enums: containment, further_investigation, accepted, false_positive)
  const [showOutcomeModal, setShowOutcomeModal] = useState(false);
  const [selectedOutcome, setSelectedOutcome] = useState<'containment' | 'further_investigation' | 'accepted' | 'false_positive'>('containment');
  const [outcomeReason, setOutcomeReason] = useState<string>('');
  const [outcomeSubmitting, setOutcomeSubmitting] = useState(false);
  const [outcomeError, setOutcomeError] = useState<string | null>(null);

  // Load investigation data
  const loadInvestigation = useCallback(async (invId: string) => {
    try {
      setError(null);
      const data = await api.getInvestigation(invId);
      setInvestigation(data);
      if (data.outcome && (data.outcome === 'containment' || data.outcome === 'further_investigation' || data.outcome === 'accepted' || data.outcome === 'false_positive')) {
        setSelectedOutcome(data.outcome);
      }
      if (data.outcome_reason) {
        setOutcomeReason(data.outcome_reason);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load investigation');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!id) return;
    loadInvestigation(id);

    // Poll if investigation is still running
    const interval = setInterval(() => {
      if (investigation?.status === 'running') {
        loadInvestigation(id);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [id, investigation?.status, loadInvestigation]);

  const report = investigation?.report;
  const graphData = useMemo(() => report?.graph_data || { nodes: [], edges: [] }, [report?.graph_data]);
  const attackPath = useMemo(() => report?.attack_path || [], [report?.attack_path]);
  const steps = useMemo(() => report?.agent_steps || [], [report?.agent_steps]);
  const evidenceRecords = useMemo(() => (report?.evidence as Array<Record<string, any>>) || [], [report?.evidence]);

  // Derived Selected Node
  const selectedGraphNode = useMemo(() => {
    if (!selectedNodeId) return null;
    return graphData.nodes.find((n) => n.id === selectedNodeId) || null;
  }, [selectedNodeId, graphData.nodes]);

  // Derived Connected Neighbors
  const connectedNeighbors = useMemo(() => {
    if (!selectedGraphNode) return [];
    const nodeId = selectedGraphNode.id;
    const results: Array<{
      edge: GraphEdge;
      neighbor: GraphNode;
      direction: 'outbound' | 'inbound';
    }> = [];

    graphData.edges.forEach((edge) => {
      if (edge.source === nodeId) {
        const neighbor = graphData.nodes.find((n) => n.id === edge.target);
        if (neighbor) {
          results.push({ edge, neighbor, direction: 'outbound' });
        }
      } else if (edge.target === nodeId) {
        const neighbor = graphData.nodes.find((n) => n.id === edge.source);
        if (neighbor) {
          results.push({ edge, neighbor, direction: 'inbound' });
        }
      }
    });

    return results;
  }, [selectedGraphNode, graphData.edges, graphData.nodes]);

  // Derived Associated Findings for Selected Node (Evidence <-> Graph Bidirectional Linking)
  const nodeRelatedFindings = useMemo(() => {
    if (!selectedGraphNode || !report?.findings) return [];
    const n = selectedGraphNode;
    const targets = [
      n.id,
      String(n.hostname || ''),
      String(n.name || ''),
      String(n.address || ''),
    ].filter((s) => s.length > 2);

    return report.findings.filter((f) =>
      targets.some((t) => f.toLowerCase().includes(t.toLowerCase()))
    );
  }, [selectedGraphNode, report?.findings]);

  // Derived Supporting Findings for Active Trajectory Pivot (Trajectory <-> Evidence Linking)
  const activePivotFindings = useMemo(() => {
    if (!attackPath[activePivotIndex] || !report?.findings) return [];
    const pivot = attackPath[activePivotIndex];
    return report.findings.filter(
      (f) =>
        f.toLowerCase().includes(pivot.source.toLowerCase()) ||
        f.toLowerCase().includes(pivot.target.toLowerCase())
    );
  }, [attackPath, activePivotIndex, report?.findings]);

  // Trajectory Auto-Playback Timer
  useEffect(() => {
    if (!isTrajectoryPlaying || attackPath.length <= 1) return;
    const timer = setInterval(() => {
      setActivePivotIndex((prev) => {
        const next = prev >= attackPath.length - 1 ? 0 : prev + 1;
        const pivot = attackPath[next];
        if (pivot) {
          setSelectedNodeId(pivot.target);
          setFocusNodeId(pivot.target);
          setFocusTimestamp(Date.now());
        }
        return next;
      });
    }, 2800);

    return () => clearInterval(timer);
  }, [isTrajectoryPlaying, attackPath]);

  // Parse discrete recommended actions
  const parsedActions = useMemo<ParsedAction[]>(() => {
    if (!report?.recommended_action) return [];
    const rawText = report.recommended_action;
    const lines = rawText
      .split(/(?:^|\n)\s*\d+\.\s+/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    const items = lines.length > 0 ? lines : [rawText];

    return items.map((actionText, idx) => {
      const lower = actionText.toLowerCase();
      let priority: 'critical' | 'high' | 'medium' = 'medium';
      if (lower.includes('isolate') || lower.includes('revoke') || lower.includes('breach') || lower.includes('contain')) {
        priority = 'critical';
      } else if (lower.includes('block') || lower.includes('rotate') || lower.includes('lock') || lower.includes('restrict')) {
        priority = 'high';
      }

      const affected = graphData.nodes
        .filter((n) => {
          const name = String(n.hostname || n.name || n.title || n.address || n.id);
          return actionText.includes(name) || actionText.includes(n.id);
        })
        .map((n) => String(n.hostname || n.name || n.title || n.address || n.id));

      return {
        id: idx + 1,
        raw: actionText,
        title: actionText.split('.')[0] || actionText.slice(0, 80),
        priority,
        affectedEntities: Array.from(new Set(affected)),
        rationale: actionText,
      };
    });
  }, [report?.recommended_action, graphData.nodes]);

  // Investigation Duration Calculation
  const investigationDuration = useMemo(() => {
    if (!investigation?.created_at) return null;
    const start = new Date(investigation.created_at).getTime();
    const end = investigation.completed_at ? new Date(investigation.completed_at).getTime() : Date.now();
    const diffSec = Math.max(1, Math.round((end - start) / 1000));
    if (diffSec < 60) return `${diffSec}s`;
    const mins = Math.floor(diffSec / 60);
    const secs = diffSec % 60;
    return `${mins}m ${secs}s`;
  }, [investigation?.created_at, investigation?.completed_at]);

  // Derived Severity
  const derivedSeverity = useMemo<'critical' | 'high' | 'medium' | 'low'>(() => {
    const alertNode = graphData.nodes.find((n) => n._label === 'Alert' || n._label === 'Incident');
    if (alertNode?.severity) return String(alertNode.severity).toLowerCase() as any;
    if (alertNode?.priority) return String(alertNode.priority).toLowerCase() as any;
    if (report?.priority_rationale?.toLowerCase().includes('critical')) return 'critical';
    if (report?.priority_rationale?.toLowerCase().includes('high')) return 'high';
    return 'high';
  }, [graphData.nodes, report?.priority_rationale]);

  // Handle select pivot
  const handleSelectPivot = (index: number) => {
    if (index < 0 || index >= attackPath.length) return;
    setActivePivotIndex(index);
    const pivot = attackPath[index];
    if (pivot) {
      setSelectedNodeId(pivot.target);
      setFocusNodeId(pivot.target);
      setFocusTimestamp(Date.now());
    }
  };

  // Handle node selection from graph or list
  const handleNodeSelect = (node: GraphNode | null) => {
    if (!node) {
      setSelectedNodeId(null);
      setFocusNodeId(null);
    } else {
      setSelectedNodeId(node.id);
      setFocusNodeId(node.id);
      setFocusTimestamp(Date.now());
    }
  };

  // Navigate to an entity from evidence or neighbor
  const handleNavigateToEntity = (nodeId: string) => {
    setSelectedNodeId(nodeId);
    setFocusNodeId(nodeId);
    setFocusTimestamp(Date.now());
    setActiveTab('workspace');
  };

  // Submit outcome decision to backend
  const handleRecordOutcome = async (e: React.FormEvent) => {
    e.preventDefault();
    if (outcomeSubmitting) return;
    if (!id) return;
    if (!outcomeReason.trim()) {
      setOutcomeError('Analyst rationale is required to record an auditable determination.');
      return;
    }
    setOutcomeSubmitting(true);
    setOutcomeError(null);

    try {
      const actionSummary = parsedActions
        .map((a) => `[${actionDecisions[a.id] || 'pending'}] ${a.title}`)
        .join('; ');

      await api.recordOutcome(id, selectedOutcome, outcomeReason.trim(), actionSummary);
      setShowOutcomeModal(false);
      setOutcomeError(null);
      await loadInvestigation(id);
    } catch (err: any) {
      setOutcomeError(err.message || 'Failed to record outcome determination');
    } finally {
      setOutcomeSubmitting(false);
    }
  };

  // Export Markdown dossier
  const handleExportMarkdown = async () => {
    if (!id) return;
    try {
      const res = await api.exportReport(id, 'markdown');
      const textContent = typeof res === 'string' ? res : JSON.stringify(res, null, 2);
      const blob = new Blob([textContent], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `threatgraph-${id}.md`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert('Failed to export markdown dossier');
    }
  };

  // Export JSON telemetry dossier
  const handleExportJSON = async () => {
    if (!id || !investigation) return;
    try {
      const blob = new Blob([JSON.stringify(investigation, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `threatgraph-${id}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert('Failed to export JSON telemetry dossier');
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="text-center space-y-4 font-mono text-xs">
          <div className="w-9 h-9 border-2 border-[#79D8D0] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-[#8A99A8] tracking-wide">
            Retrieving autonomous investigation dossier &amp; FalkorDB subgraph...
          </p>
        </div>
      </div>
    );
  }

  // Error / Disconnected / Not Found state
  if (error || !investigation) {
    return (
      <div className="border border-[#1E2D38] bg-[#101923] p-10 text-center max-w-lg mx-auto space-y-5 my-12 rounded-sm shadow-xl">
        <AlertTriangle className="w-8 h-8 text-[#D85E61] mx-auto" />
        <div className="space-y-1.5">
          <h2 className="font-heading font-bold text-lg text-[#EDF0ED]">Investigation Unavailable</h2>
          <p className="text-xs text-[#8A99A8] font-mono leading-relaxed">
            {error || `Could not locate investigation ID: ${id}. The backend service may be starting or temporarily disconnected.`}
          </p>
        </div>
        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            onClick={() => loadInvestigation(id)}
            className="btn-primary text-xs py-2 px-4 flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Retry Connection</span>
          </button>
          <Link href="/app/investigations" className="btn-secondary text-xs py-2 px-4 inline-flex items-center gap-1.5">
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Queue</span>
          </Link>
        </div>
      </div>
    );
  }

  // Key incident entity anchors for quick empty-state navigation
  const quickAnchors = graphData.nodes
    .filter((n) => n._label === 'Alert' || n._label === 'Incident' || n._label === 'User' || n._label === 'Device' || n._label === 'IPAddress')
    .slice(0, 4);

  return (
    <div className="space-y-5 w-full max-w-[1780px] mx-auto pb-16 px-2 sm:px-4">
      {/* ── Top Utility Breadcrumb & Export Actions Bar ───────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#1E2D38]">
        <Link
          href="/app/investigations"
          className="text-xs font-mono text-[#8A99A8] hover:text-[#EDF0ED] flex items-center gap-1.5 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5 text-[#79D8D0]" />
          <span>Back to Investigation Queue</span>
        </Link>

        <div className="flex items-center gap-2">
          <button
            onClick={() => id && loadInvestigation(id)}
            className="p-1.5 text-[#8A99A8] hover:text-[#EDF0ED] hover:bg-[#1A2732] rounded-sm border border-[#1E2D38] transition-colors cursor-pointer"
            title="Refresh investigation dossier"
            aria-label="Refresh dossier"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>

          {/* Export Dropdown Group */}
          <div className="flex items-center rounded-sm border border-[#1E2D38] bg-[#101923] p-0.5">
            <button
              onClick={handleExportMarkdown}
              className="px-2.5 py-1 text-xs font-mono text-[#8A99A8] hover:text-[#EDF0ED] hover:bg-[#1A2732] flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Download Markdown Report"
            >
              <FileText className="w-3 h-3 text-[#79D8D0]" />
              <span className="hidden sm:inline">Export MD</span>
            </button>
            <span className="text-[#1E2D38]">|</span>
            <button
              onClick={handleExportJSON}
              className="px-2.5 py-1 text-xs font-mono text-[#8A99A8] hover:text-[#EDF0ED] hover:bg-[#1A2732] flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Download JSON Telemetry"
            >
              <FileJson className="w-3 h-3 text-[#D8C99A]" />
              <span className="hidden sm:inline">Export JSON</span>
            </button>
          </div>

          {/* Record Decision Action */}
          <button
            onClick={() => setShowOutcomeModal(true)}
            className="btn-primary text-xs py-1.5 px-3.5 flex items-center gap-1.5 cursor-pointer shadow-md"
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>{investigation.outcome ? 'Update Decision' : 'Record Decision'}</span>
          </button>
        </div>
      </div>

      {/* ── Rebuilt Investigation Header ──────────────────────────── */}
      <div className="border border-[#1E2D38] bg-[#101923] p-5 rounded-sm shadow-md space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
          <div className="space-y-2 min-w-0 flex-1">
            {/* Top Metadata Badges */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs text-[#79D8D0] font-semibold tracking-wider">
                #{investigation.id}
              </span>

              {/* Status Badge */}
              <span
                className={`text-[10px] uppercase font-mono px-2 py-0.5 rounded-sm font-semibold tracking-wider ${
                  investigation.status === 'completed'
                    ? 'bg-[#79D8D0]/10 text-[#79D8D0] border border-[#79D8D0]/30'
                    : investigation.status === 'running'
                    ? 'bg-[#CC805E]/10 text-[#CC805E] border border-[#CC805E]/30 animate-pulse'
                    : 'bg-[#D85E61]/10 text-[#D85E61] border border-[#D85E61]/30'
                }`}
              >
                {investigation.status}
              </span>

              {/* Severity Badge */}
              <span
                className={`text-[10px] uppercase font-mono px-2 py-0.5 rounded-sm font-semibold tracking-wider ${
                  derivedSeverity === 'critical'
                    ? 'bg-[#D85E61]/15 text-[#D85E61] border border-[#D85E61]/40'
                    : derivedSeverity === 'high'
                    ? 'bg-[#CC805E]/15 text-[#CC805E] border border-[#CC805E]/40'
                    : 'bg-[#79D8D0]/15 text-[#79D8D0] border border-[#79D8D0]/40'
                }`}
              >
                {derivedSeverity} Severity
              </span>

              {/* Target Alert */}
              <span className="text-xs font-mono text-[#8A99A8] flex items-center gap-1">
                <span>Target:</span>
                <span className="text-[#EDF0ED] font-semibold">{investigation.alert_id}</span>
              </span>
            </div>

            {/* Natural Wrapping Investigation Title (No artificial truncation) */}
            <h1 className="font-heading font-bold text-lg sm:text-xl md:text-2xl text-[#EDF0ED] break-words leading-tight">
              {report?.summary || investigation.description || `Autonomous Investigation of ${investigation.alert_id}`}
            </h1>
          </div>

          {/* Analyst Determination Status Box */}
          {investigation.outcome ? (
            <div className="bg-[#1A2732] border border-[#1E2D38] rounded-sm p-3.5 flex-shrink-0 min-w-[240px] max-w-sm space-y-1">
              <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-widest text-[#8A99A8]">
                <span>Analyst Determination</span>
                <Check className="w-3.5 h-3.5 text-[#79D8D0]" />
              </div>
              <div className="font-heading font-bold text-sm text-[#D8C99A] capitalize">
                {investigation.outcome.replace('_', ' ')}
              </div>
              {investigation.outcome_reason && (
                <p className="text-[11px] text-[#8A99A8] font-mono leading-relaxed line-clamp-2">
                  &ldquo;{investigation.outcome_reason}&rdquo;
                </p>
              )}
            </div>
          ) : (
            <div className="bg-[#080B10] border border-[#1E2D38]/80 rounded-sm p-3 text-left lg:text-right flex-shrink-0 min-w-[200px]">
              <span className="text-[10px] uppercase font-mono tracking-wider text-[#8A99A8] block">
                Determination Status
              </span>
              <span className="font-mono text-xs text-[#CC805E] flex items-center gap-1.5 lg:justify-end mt-0.5">
                <Clock className="w-3 h-3 text-[#CC805E]" />
                Awaiting Operational Sign-Off
              </span>
            </div>
          )}
        </div>

        {/* Telemetry Information Row */}
        <div className="flex flex-wrap items-center gap-5 pt-3 border-t border-[#1E2D38] text-xs font-mono text-[#8A99A8]">
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-[#79D8D0]" />
            <span>Started: {new Date(investigation.created_at).toLocaleTimeString()}</span>
            {investigationDuration && (
              <span className="text-[#6B7A85]">({investigationDuration})</span>
            )}
          </div>
          {investigation.completed_at && (
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#D8C99A]" />
              <span>Completed: {new Date(investigation.completed_at).toLocaleTimeString()}</span>
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <Terminal className="w-3.5 h-3.5 text-[#CC805E]" />
            <span>{steps.length} Tool Actions</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-[#79D8D0]" />
            <span>{graphData.nodes.length} Nodes</span>
            <span className="text-[#6B7A85]">/ {graphData.edges.length} Edges</span>
          </div>
          <div className="flex items-center gap-1.5">
            <ShieldAlert className="w-3.5 h-3.5 text-[#D85E61]" />
            <span>{attackPath.length} Pivot Hops</span>
          </div>
        </div>
      </div>

      {/* ── Professional Workspace Navigation Tabs ───────────────── */}
      <div className="border-b border-[#1E2D38] flex items-center gap-1 sm:gap-2 overflow-x-auto select-none">
        <button
          onClick={() => setActiveTab('workspace')}
          className={`px-3.5 sm:px-4 py-2.5 text-xs font-mono border-b-2 transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'workspace'
              ? 'border-[#79D8D0] text-[#79D8D0] font-semibold bg-[#79D8D0]/5'
              : 'border-transparent text-[#8A99A8] hover:text-[#EDF0ED]'
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          <span>Investigation Workspace</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-sm bg-[#1E2D38] text-[#EDF0ED]">
            {graphData.nodes.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('evidence')}
          className={`px-3.5 sm:px-4 py-2.5 text-xs font-mono border-b-2 transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'evidence'
              ? 'border-[#79D8D0] text-[#79D8D0] font-semibold bg-[#79D8D0]/5'
              : 'border-transparent text-[#8A99A8] hover:text-[#EDF0ED]'
          }`}
        >
          <ShieldAlert className="w-3.5 h-3.5" />
          <span>Evidence &amp; Findings Dossier</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-sm bg-[#1E2D38] text-[#EDF0ED]">
            {(report?.findings?.length || 0) + (report?.contradictions?.length || 0)}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('trace')}
          className={`px-3.5 sm:px-4 py-2.5 text-xs font-mono border-b-2 transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'trace'
              ? 'border-[#79D8D0] text-[#79D8D0] font-semibold bg-[#79D8D0]/5'
              : 'border-transparent text-[#8A99A8] hover:text-[#EDF0ED]'
          }`}
        >
          <Terminal className="w-3.5 h-3.5" />
          <span>Agent Reasoning Trace</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-sm bg-[#1E2D38] text-[#EDF0ED]">
            {steps.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('decisions')}
          className={`px-3.5 sm:px-4 py-2.5 text-xs font-mono border-b-2 transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'decisions'
              ? 'border-[#79D8D0] text-[#79D8D0] font-semibold bg-[#79D8D0]/5'
              : 'border-transparent text-[#8A99A8] hover:text-[#EDF0ED]'
          }`}
        >
          <UserCheck className="w-3.5 h-3.5" />
          <span>Decision &amp; Remediation Support</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-sm bg-[#1E2D38] text-[#EDF0ED]">
            {parsedActions.length}
          </span>
        </button>
      </div>

      {/* ── TAB 1: Advanced Investigation Workspace ───────────────── */}
      {activeTab === 'workspace' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
            {/* Primary Viewport: Graph Canvas + Stepper (8 cols on lg, 9 on xl) */}
            <div className="lg:col-span-8 xl:col-span-9 flex flex-col space-y-3">
              {/* Main Graph Canvas */}
              <div className="h-[620px] w-full rounded-sm overflow-hidden border border-[#1E2D38] shadow-md relative bg-[#080B10]">
                <CytoscapeGraph
                  data={graphData}
                  attackPath={attackPath}
                  highlightAttackPath={true}
                  selectedNodeId={selectedNodeId}
                  focusNodeId={focusNodeId}
                  focusTimestamp={focusTimestamp}
                  activePivotIndex={activePivotIndex}
                  onPivotSelect={handleSelectPivot}
                  onNodeSelect={handleNodeSelect}
                />
              </div>

              {/* ── Interactive Attack Trajectory Stepper & Timeline ──── */}
              <div className="border border-[#1E2D38] bg-[#101923] p-4 rounded-sm shadow-md space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#1E2D38] pb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#D85E61] animate-pulse" />
                    <span className="text-xs font-heading font-semibold uppercase tracking-wider text-[#EDF0ED]">
                      Attack Trajectory Navigation
                    </span>
                    <span className="text-xs font-mono text-[#D85E61] font-semibold bg-[#D85E61]/10 px-2 py-0.5 rounded-sm border border-[#D85E61]/20">
                      {attackPath.length} Lateral Pivots
                    </span>
                  </div>

                  {/* Stepper Controls */}
                  <div className="flex items-center gap-2 font-mono text-xs">
                    <button
                      onClick={() => handleSelectPivot(activePivotIndex - 1)}
                      disabled={activePivotIndex <= 0}
                      className="p-1.5 rounded-sm border border-[#1E2D38] bg-[#080B10] text-[#8A99A8] hover:text-[#EDF0ED] hover:border-[#79D8D0] disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                      title="Previous Stage"
                      aria-label="Previous Stage"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => setIsTrajectoryPlaying((p) => !p)}
                      className="px-2.5 py-1.5 rounded-sm border border-[#1E2D38] bg-[#080B10] text-[#8A99A8] hover:text-[#EDF0ED] hover:border-[#79D8D0] flex items-center gap-1.5 transition-colors cursor-pointer"
                      title={isTrajectoryPlaying ? 'Pause Trajectory' : 'Play Trajectory'}
                    >
                      {isTrajectoryPlaying ? (
                        <>
                          <Pause className="w-3.5 h-3.5 text-[#D8C99A]" />
                          <span>Pause</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-3.5 h-3.5 text-[#79D8D0]" />
                          <span>Auto-Play</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => handleSelectPivot(activePivotIndex + 1)}
                      disabled={activePivotIndex >= attackPath.length - 1}
                      className="p-1.5 rounded-sm border border-[#1E2D38] bg-[#080B10] text-[#8A99A8] hover:text-[#EDF0ED] hover:border-[#79D8D0] disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                      title="Next Stage"
                      aria-label="Next Stage"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>

                    <span className="text-[#8A99A8] text-xs pl-2">
                      Stage <strong className="text-[#79D8D0]">{activePivotIndex + 1}</strong> of {attackPath.length}
                    </span>
                  </div>
                </div>

                {/* Horizontal Scrubbing Stage Indicator */}
                {attackPath.length > 0 && (
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-0.5 scrollbar-thin">
                    {attackPath.map((ap, idx) => {
                      const isActive = idx === activePivotIndex;
                      return (
                        <button
                          key={idx}
                          onClick={() => handleSelectPivot(idx)}
                          className={`flex-shrink-0 px-2.5 py-1 rounded-sm border text-[11px] font-mono transition-all cursor-pointer ${
                            isActive
                              ? 'bg-[#D85E61]/20 border-[#D85E61] text-[#EDF0ED] shadow-sm'
                              : 'bg-[#080B10] border-[#1E2D38] text-[#8A99A8] hover:text-[#EDF0ED] hover:border-[#2B3941]'
                          }`}
                        >
                          <span className="font-semibold mr-1">{idx + 1}:</span>
                          <span>{ap.source}</span>
                          <span className="text-[#D85E61] mx-1">&rarr;</span>
                          <span>{ap.target}</span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Active Pivot Inspection Card with Supporting Evidence Linking */}
                {attackPath[activePivotIndex] && (
                  <div className="bg-[#080B10] border border-[#1E2D38] p-3 rounded-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[10px] text-[#8A99A8] uppercase tracking-wider">Active Pivot Hop:</span>
                      <button
                        onClick={() => handleNavigateToEntity(attackPath[activePivotIndex].source)}
                        className="text-[#79D8D0] font-semibold hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        {attackPath[activePivotIndex].source}
                      </button>
                      <span className="text-[#D85E61] bg-[#D85E61]/10 px-1.5 py-0.5 rounded-sm border border-[#D85E61]/30 text-[10px]">
                        [:{attackPath[activePivotIndex].relationship}]
                      </span>
                      <button
                        onClick={() => handleNavigateToEntity(attackPath[activePivotIndex].target)}
                        className="text-[#EDF0ED] font-semibold hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        {attackPath[activePivotIndex].target}
                      </button>
                    </div>

                    <div className="flex items-center gap-3">
                      {activePivotFindings.length > 0 && (
                        <button
                          onClick={() => {
                            setEvidenceSearch(attackPath[activePivotIndex].target);
                            setActiveTab('evidence');
                          }}
                          className="text-[11px] text-[#79D8D0] hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <CheckCircle2 className="w-3 h-3 text-[#79D8D0]" />
                          <span>{activePivotFindings.length} Supporting Findings &rarr;</span>
                        </button>
                      )}
                      <button
                        onClick={() => handleNavigateToEntity(attackPath[activePivotIndex].target)}
                        className="text-[11px] text-[#EDF0ED] hover:text-[#79D8D0] flex items-center gap-1 cursor-pointer"
                      >
                        <span>Focus Destination</span>
                        <ArrowUpRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Supporting Area: Contextual Selected-Entity Inspector (4 cols on lg, 3 on xl) */}
            <div className="lg:col-span-4 xl:col-span-3 border border-[#1E2D38] bg-[#101923] p-4 flex flex-col justify-between space-y-4 font-mono text-xs rounded-sm shadow-md overflow-hidden">
              <div className="space-y-4 overflow-y-auto max-h-[780px] pr-1">
                {/* Header & Quick Action */}
                <div className="flex items-center justify-between border-b border-[#1E2D38] pb-2.5">
                  <span className="text-[10px] uppercase text-[#8A99A8] tracking-widest font-semibold flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-[#79D8D0]" />
                    Entity Inspector
                  </span>
                  {selectedGraphNode && (
                    <button
                      onClick={() => handleNodeSelect(null)}
                      className="text-[11px] text-[#8A99A8] hover:text-[#EDF0ED] transition-colors cursor-pointer"
                    >
                      Deselect
                    </button>
                  )}
                </div>

                {/* Selected Node Details or Guided Empty State */}
                {selectedGraphNode ? (
                  <div className="space-y-3.5">
                    {/* Entity Identification Banner */}
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="badge-tag border border-[#79D8D0]/30 bg-[#79D8D0]/10 text-[#79D8D0] text-[10px] font-bold">
                          {selectedGraphNode._label || 'Entity'}
                        </span>
                        <span className="text-[#EDF0ED] font-bold truncate text-sm">
                          {(selectedGraphNode.hostname as string) ||
                            (selectedGraphNode.name as string) ||
                            (selectedGraphNode.title as string) ||
                            (selectedGraphNode.address as string) ||
                            selectedGraphNode.id}
                        </span>
                      </div>
                      <div className="text-[11px] text-[#8A99A8]">
                        ID: <span className="text-[#EDF0ED]">{selectedGraphNode.id}</span>
                      </div>
                    </div>

                    {/* Camera Focus Action */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setFocusNodeId(selectedGraphNode.id);
                          setFocusTimestamp(Date.now());
                        }}
                        className="btn-secondary text-[11px] py-1 px-2.5 flex items-center gap-1.5 cursor-pointer w-full justify-center"
                      >
                        <Activity className="w-3 h-3 text-[#79D8D0]" />
                        <span>Center Camera on Entity</span>
                      </button>
                    </div>

                    {/* Node Attributes Table */}
                    <div className="space-y-1.5">
                      <span className="text-[10px] uppercase text-[#6B7A85] tracking-wider block">
                        RECORDED TELEMETRY ATTRIBUTES
                      </span>
                      <div className="bg-[#080B10] p-2.5 rounded-sm border border-[#1E2D38] space-y-1.5 text-[11px]">
                        {Object.entries(selectedGraphNode)
                          .filter(([k]) => !k.startsWith('_') && k !== 'id')
                          .map(([k, v]) => (
                            <div key={k} className="flex justify-between items-start gap-2 border-b border-[#1E2D38]/50 pb-1 last:border-0 last:pb-0">
                              <span className="text-[#8A99A8] capitalize flex-shrink-0">{k.replace('_', ' ')}:</span>
                              <span className="text-[#EDF0ED] text-right break-all">
                                {redactSensitiveData(k, v)}
                              </span>
                            </div>
                          ))}
                      </div>
                    </div>

                    {/* Dynamic Connected Neighbors */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-[10px] uppercase text-[#6B7A85] tracking-wider">
                        <span>CONNECTED TOPOLOGY ({connectedNeighbors.length})</span>
                      </div>
                      {connectedNeighbors.length > 0 ? (
                        <div className="space-y-1.5 max-h-[190px] overflow-y-auto pr-0.5">
                          {connectedNeighbors.map((conn, idx) => (
                            <button
                              key={idx}
                              onClick={() => handleNavigateToEntity(conn.neighbor.id)}
                              className="w-full text-left bg-[#080B10] hover:bg-[#1A2732] p-2 rounded-sm border border-[#1E2D38] hover:border-[#79D8D0]/50 transition-colors cursor-pointer group"
                            >
                              <div className="flex items-center justify-between text-[10px]">
                                <span className="text-[#8A99A8] font-mono">
                                  {conn.direction === 'outbound' ? '->' : '<-'} {conn.edge.type}
                                </span>
                                <span className="text-[9px] px-1 py-0.2 rounded-sm bg-[#1E2D38] text-[#79D8D0]">
                                  {conn.neighbor._label}
                                </span>
                              </div>
                              <div className="text-[#EDF0ED] font-semibold text-[11px] truncate mt-0.5 group-hover:text-[#79D8D0]">
                                {(conn.neighbor.hostname as string) ||
                                  (conn.neighbor.name as string) ||
                                  (conn.neighbor.title as string) ||
                                  (conn.neighbor.address as string) ||
                                  conn.neighbor.id}
                              </div>
                            </button>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[#6B7A85] text-[11px]">No immediate graph neighbors discovered.</p>
                      )}
                    </div>

                    {/* Bidirectional Associated Evidence Findings */}
                    <div className="space-y-1.5 pt-1 border-t border-[#1E2D38]/60">
                      <div className="flex items-center justify-between text-[10px] uppercase text-[#6B7A85] tracking-wider">
                        <span>ASSOCIATED FINDINGS ({nodeRelatedFindings.length})</span>
                      </div>
                      {nodeRelatedFindings.length > 0 ? (
                        <div className="space-y-1.5 max-h-[140px] overflow-y-auto pr-0.5">
                          {nodeRelatedFindings.map((finding, idx) => (
                            <div key={idx} className="bg-[#080B10] p-2 rounded-sm border border-[#1E2D38] text-[11px] text-[#EDF0ED] space-y-1">
                              <p className="line-clamp-2">{finding}</p>
                              <button
                                onClick={() => {
                                  setEvidenceSearch(selectedGraphNode.id);
                                  setActiveTab('evidence');
                                }}
                                className="text-[10px] text-[#79D8D0] hover:underline flex items-center gap-1 cursor-pointer"
                              >
                                <span>Inspect in Dossier</span>
                                <ArrowUpRight className="w-2.5 h-2.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[#6B7A85] text-[11px]">No explicit findings directly name this entity.</p>
                      )}
                    </div>
                  </div>
                ) : (
                  /* Guided Empty State */
                  <div className="space-y-4 py-2">
                    <div className="bg-[#080B10] p-3 rounded-sm border border-[#1E2D38] text-center space-y-2">
                      <Info className="w-5 h-5 text-[#79D8D0] mx-auto opacity-70" />
                      <p className="text-xs text-[#EDF0ED] font-semibold">No Entity Selected</p>
                      <p className="text-[11px] text-[#8A99A8] leading-relaxed">
                        Click any node in the 3D topology canvas or select a pivot from the attack trajectory to inspect recorded telemetry and connected graph neighbors.
                      </p>
                    </div>

                    {/* Quick Investigation Anchors */}
                    <div className="space-y-2">
                      <span className="text-[10px] uppercase text-[#6B7A85] tracking-wider block">
                        INCIDENT ANCHORS
                      </span>
                      <div className="space-y-1.5">
                        {quickAnchors.map((node) => (
                          <button
                            key={node.id}
                            onClick={() => handleNavigateToEntity(node.id)}
                            className="w-full text-left bg-[#080B10] hover:bg-[#1A2732] p-2 rounded-sm border border-[#1E2D38] hover:border-[#79D8D0]/50 transition-colors flex items-center justify-between text-xs cursor-pointer"
                          >
                            <div className="min-w-0 pr-2">
                              <span className="text-[#EDF0ED] font-medium block truncate text-[11px]">
                                {(node.hostname as string) || (node.name as string) || (node.title as string) || (node.address as string) || node.id}
                              </span>
                              <span className="text-[10px] text-[#8A99A8]">{node._label}</span>
                            </div>
                            <ArrowUpRight className="w-3.5 h-3.5 text-[#79D8D0] flex-shrink-0" />
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Bottom Decision Action Button */}
              <div className="pt-3 border-t border-[#1E2D38]">
                <button
                  onClick={() => setShowOutcomeModal(true)}
                  className="btn-primary w-full text-xs py-2 justify-center flex items-center gap-1.5 cursor-pointer shadow-md"
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>Record Analyst Determination</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 2: Evidence & Findings Dossier Review ─────────────── */}
      {activeTab === 'evidence' && (
        <div className="space-y-5">
          {/* Search & Filter Bar */}
          <div className="border border-[#1E2D38] bg-[#101923] p-4 rounded-sm shadow-md flex flex-col md:flex-row md:items-center justify-between gap-3 font-mono text-xs">
            <div className="relative flex-1 max-w-md">
              <Search className="w-3.5 h-3.5 text-[#8A99A8] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={evidenceSearch}
                onChange={(e) => setEvidenceSearch(e.target.value)}
                placeholder="Search findings by host, IP, account, or MITRE technique..."
                className="w-full bg-[#080B10] border border-[#1E2D38] rounded-sm pl-8 pr-3 py-1.5 text-[#EDF0ED] placeholder-[#6B7A85] outline-none focus:border-[#79D8D0]"
              />
            </div>

            <div className="flex items-center gap-1 overflow-x-auto">
              <button
                onClick={() => setEvidenceFilter('all')}
                className={`px-3 py-1 rounded-sm text-[11px] transition-colors cursor-pointer ${
                  evidenceFilter === 'all'
                    ? 'bg-[#79D8D0]/15 text-[#79D8D0] border border-[#79D8D0]/40 font-semibold'
                    : 'text-[#8A99A8] hover:text-[#EDF0ED]'
                }`}
              >
                All Evidence
              </button>
              <button
                onClick={() => setEvidenceFilter('findings')}
                className={`px-3 py-1 rounded-sm text-[11px] transition-colors cursor-pointer ${
                  evidenceFilter === 'findings'
                    ? 'bg-[#79D8D0]/15 text-[#79D8D0] border border-[#79D8D0]/40 font-semibold'
                    : 'text-[#8A99A8] hover:text-[#EDF0ED]'
                }`}
              >
                Verified Facts ({report?.findings?.length || 0})
              </button>
              <button
                onClick={() => setEvidenceFilter('telemetry')}
                className={`px-3 py-1 rounded-sm text-[11px] transition-colors cursor-pointer ${
                  evidenceFilter === 'telemetry'
                    ? 'bg-[#79D8D0]/15 text-[#79D8D0] border border-[#79D8D0]/40 font-semibold'
                    : 'text-[#8A99A8] hover:text-[#EDF0ED]'
                }`}
              >
                Graph Telemetry ({evidenceRecords.length})
              </button>
              <button
                onClick={() => setEvidenceFilter('contradictions')}
                className={`px-3 py-1 rounded-sm text-[11px] transition-colors cursor-pointer ${
                  evidenceFilter === 'contradictions'
                    ? 'bg-[#79D8D0]/15 text-[#79D8D0] border border-[#79D8D0]/40 font-semibold'
                    : 'text-[#8A99A8] hover:text-[#EDF0ED]'
                }`}
              >
                Contradictions ({report?.contradictions?.length || 0})
              </button>
              <button
                onClick={() => setEvidenceFilter('gaps')}
                className={`px-3 py-1 rounded-sm text-[11px] transition-colors cursor-pointer ${
                  evidenceFilter === 'gaps'
                    ? 'bg-[#79D8D0]/15 text-[#79D8D0] border border-[#79D8D0]/40 font-semibold'
                    : 'text-[#8A99A8] hover:text-[#EDF0ED]'
                }`}
              >
                Missing Telemetry ({report?.missing_information?.length || 0})
              </button>
            </div>
          </div>

          {/* Incident Narrative Summary */}
          <div className="border border-[#1E2D38] bg-[#101923] p-5 rounded-sm shadow-md space-y-2">
            <h2 className="font-heading font-semibold text-xs uppercase tracking-wider text-[#8A99A8]">
              Executive Threat Narrative
            </h2>
            <p className="text-[#EDF0ED] text-sm leading-relaxed font-body">
              {report?.summary || 'No narrative report available.'}
            </p>
          </div>

          {/* Verified Evidence Findings */}
          {(evidenceFilter === 'all' || evidenceFilter === 'findings') && (
            <div className="border border-[#1E2D38] bg-[#101923] p-5 rounded-sm shadow-md space-y-3.5">
              <div className="flex items-center justify-between border-b border-[#1E2D38] pb-2.5">
                <h3 className="font-heading font-semibold text-xs uppercase tracking-wider text-[#EDF0ED] flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#79D8D0]" />
                  Verified Evidence Findings ({report?.findings?.length || 0})
                </h3>
                <span className="text-xs font-mono text-[#79D8D0]">Ground-Truth Anchors</span>
              </div>

              <div className="space-y-2.5">
                {report?.findings
                  ?.filter((f) => !evidenceSearch || f.toLowerCase().includes(evidenceSearch.toLowerCase()))
                  .map((finding, idx) => {
                    const matchedNodes = graphData.nodes.filter((n) => {
                      const name = String(n.hostname || n.name || n.title || n.address || n.id);
                      return finding.includes(name) || finding.includes(n.id);
                    });

                    return (
                      <div key={idx} className="bg-[#080B10] p-3.5 rounded-sm border border-[#1E2D38] space-y-2">
                        <div className="flex items-start gap-3">
                          <span className="w-5 h-5 rounded-sm bg-[#79D8D0]/10 text-[#79D8D0] font-mono text-xs flex items-center justify-center flex-shrink-0 font-bold border border-[#79D8D0]/20">
                            {idx + 1}
                          </span>
                          <p className="text-xs text-[#EDF0ED] font-body leading-relaxed flex-1">
                            {finding}
                          </p>
                        </div>

                        {/* Interactive Entity Links */}
                        {matchedNodes.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-[#1E2D38]/40 pl-8">
                            <span className="text-[10px] text-[#8A99A8] font-mono">Associated Subgraph Entities:</span>
                            {matchedNodes.map((mn) => (
                              <button
                                key={mn.id}
                                onClick={() => handleNavigateToEntity(mn.id)}
                                className="px-1.5 py-0.5 rounded-sm bg-[#1A2732] hover:bg-[#79D8D0]/15 text-[#79D8D0] text-[10px] font-mono border border-[#1E2D38] hover:border-[#79D8D0]/40 transition-colors flex items-center gap-1 cursor-pointer"
                              >
                                <span>{(mn.hostname as string) || (mn.name as string) || mn.id}</span>
                                <ArrowUpRight className="w-2.5 h-2.5" />
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* Graph Telemetry Records (from report.evidence) */}
          {(evidenceFilter === 'all' || evidenceFilter === 'telemetry') && evidenceRecords.length > 0 && (
            <div className="border border-[#1E2D38] bg-[#101923] p-5 rounded-sm shadow-md space-y-3.5">
              <div className="flex items-center justify-between border-b border-[#1E2D38] pb-2.5">
                <h3 className="font-heading font-semibold text-xs uppercase tracking-wider text-[#EDF0ED] flex items-center gap-2">
                  <Database className="w-4 h-4 text-[#D8C99A]" />
                  FalkorDB Graph Evidence Invocations ({evidenceRecords.length})
                </h3>
                <span className="text-xs font-mono text-[#D8C99A]">Autonomous Tool Telemetry</span>
              </div>

              <div className="space-y-3">
                {evidenceRecords.map((ev, idx) => (
                  <div key={idx} className="bg-[#080B10] p-3 rounded-sm border border-[#1E2D38] font-mono text-xs space-y-2">
                    <div className="flex items-center justify-between text-[#8A99A8]">
                      <span className="px-2 py-0.5 rounded-sm bg-[#D8C99A]/10 text-[#D8C99A] font-semibold text-[10px] border border-[#D8C99A]/20">
                        TOOL: {String(ev.source_tool || 'Query')}
                      </span>
                      <span className="text-[10px] text-[#6B7A85]">
                        Record #{idx + 1}
                      </span>
                    </div>

                    {ev.query_args && (
                      <div className="bg-[#101923] p-2 rounded-sm text-[11px] text-[#8A99A8] overflow-x-auto">
                        <span className="text-[#6B7A85]">Query Args: </span>
                        <span className="text-[#EDF0ED]">{JSON.stringify(ev.query_args)}</span>
                      </div>
                    )}

                    {ev.data && (
                      <details className="text-[11px] text-[#8A99A8] cursor-pointer">
                        <summary className="hover:text-[#EDF0ED] transition-colors">
                          View Returned Graph Entities &amp; Payloads
                        </summary>
                        <pre className="mt-2 p-2 bg-[#101923] rounded-sm text-[10px] text-[#79D8D0] overflow-x-auto max-h-48">
                          {JSON.stringify(ev.data, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Contradictions & Benign Cross-Check */}
          {(evidenceFilter === 'all' || evidenceFilter === 'contradictions') && (
            <div className="border border-[#1E2D38] bg-[#101923] p-5 rounded-sm shadow-md space-y-3">
              <div className="flex items-center justify-between border-b border-[#1E2D38] pb-2.5">
                <h3 className="font-heading font-semibold text-xs uppercase tracking-wider text-[#CC805E] flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  Contradiction Analysis &amp; Benign Cross-Check
                </h3>
              </div>
              {report?.contradictions && report.contradictions.length > 0 ? (
                <div className="space-y-2">
                  {report.contradictions.map((c, i) => (
                    <div key={i} className="bg-[#CC805E]/10 border border-[#CC805E]/30 p-3 rounded-sm text-xs text-[#EDF0ED] font-body leading-relaxed">
                      {c}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-[#6B7A85] font-mono">No contradictory benign signals identified in this trajectory.</p>
              )}
            </div>
          )}

          {/* Missing Telemetry & Uncertainties */}
          {(evidenceFilter === 'all' || evidenceFilter === 'gaps') && (
            <div className="border border-[#1E2D38] bg-[#101923] p-5 rounded-sm shadow-md space-y-3">
              <div className="flex items-center justify-between border-b border-[#1E2D38] pb-2.5">
                <h3 className="font-heading font-semibold text-xs uppercase tracking-wider text-[#8A99A8] flex items-center gap-2">
                  <HelpCircle className="w-4 h-4 text-[#79D8D0]" />
                  Information Gaps &amp; Telemetry Deficits
                </h3>
              </div>
              {report?.missing_information && report.missing_information.length > 0 ? (
                <div className="space-y-2">
                  {report.missing_information.map((m, i) => (
                    <div key={i} className="bg-[#080B10] p-3 rounded-sm border border-[#1E2D38] text-xs font-mono text-[#EDF0ED] flex items-start gap-2">
                      <span className="text-[#79D8D0] font-bold">&bull;</span>
                      <span>{m}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-[#6B7A85] font-mono">All anticipated attack-path telemetry was successfully correlated.</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── TAB 3: Auditable Agent Reasoning Trace ────────────────── */}
      {activeTab === 'trace' && (
        <div className="space-y-4">
          <div className="border border-[#1E2D38] bg-[#101923] p-4 rounded-sm shadow-md flex items-center justify-between font-mono text-xs">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-[#79D8D0]" />
              <span className="text-[#EDF0ED] font-semibold">Autonomous Execution History:</span>
              <span className="text-[#8A99A8]">FalkorDB Subgraph Queries &amp; Pattern Traversal</span>
            </div>
            <span className="text-xs font-mono text-[#79D8D0] font-semibold">
              {steps.length} Tool Invocations
            </span>
          </div>

          <div className="space-y-3">
            {steps.map((st) => {
              const argEntries = Object.entries(st.arguments || {});

              // Find any entity in graphData that matches an argument value
              const stepEntities = graphData.nodes
                .filter((n) => argEntries.some(([, val]) => String(val) === n.id))
                .map((n) => n.id);

              return (
                <div key={st.step} className="border border-[#1E2D38] bg-[#101923] p-4 font-mono text-xs space-y-3 rounded-sm shadow-md">
                  <div className="flex items-center justify-between text-[#8A99A8]">
                    <div className="flex items-center gap-2.5">
                      <span className="px-2 py-0.5 rounded-sm bg-[#79D8D0]/10 text-[#79D8D0] font-bold text-[10px] border border-[#79D8D0]/30">
                        STEP {st.step}
                      </span>
                      <span className="text-[#EDF0ED] font-semibold text-sm">{st.tool}</span>
                    </div>
                    <span className="text-[10px] text-[#6B7A85]">
                      {new Date(st.timestamp).toLocaleTimeString()}
                    </span>
                  </div>

                  {/* Tool Arguments Block (With Secrets Redacted) */}
                  <div className="bg-[#080B10] p-2.5 rounded-sm border border-[#1E2D38] space-y-1">
                    <span className="text-[10px] text-[#6B7A85] uppercase tracking-wider block">INVOCATION ARGUMENTS:</span>
                    <div className="flex flex-wrap gap-2 text-[11px]">
                      {argEntries.map(([k, v]) => (
                        <span key={k} className="bg-[#101923] px-2 py-0.5 rounded-sm border border-[#1E2D38] text-[#8A99A8]">
                          <strong className="text-[#79D8D0]">{k}:</strong> {redactSensitiveData(k, v)}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Result Summary */}
                  <div className="text-[12px] text-[#8A99A8] flex items-start gap-1.5">
                    <CornerDownRight className="w-3.5 h-3.5 text-[#79D8D0] flex-shrink-0 mt-0.5" />
                    <span className="text-[#EDF0ED]">{st.result_summary}</span>
                  </div>

                  {/* Referenced Entities Navigation */}
                  {stepEntities.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-[#1E2D38]/40">
                      <span className="text-[10px] text-[#8A99A8]">Referenced Entities:</span>
                      {stepEntities.map((entId) => (
                        <button
                          key={entId}
                          onClick={() => handleNavigateToEntity(entId)}
                          className="px-2 py-0.5 rounded-sm bg-[#1A2732] hover:bg-[#79D8D0]/15 text-[#79D8D0] text-[10px] border border-[#1E2D38] hover:border-[#79D8D0]/40 transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <Activity className="w-2.5 h-2.5" />
                          <span>Locate {entId} in Graph</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── TAB 4: Remediation & Decision Support ─────────────────── */}
      {activeTab === 'decisions' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Parsed Action Items (8 cols on lg) */}
          <div className="lg:col-span-8 space-y-5">
            <div className="border border-[#1E2D38] bg-[#101923] p-5 rounded-sm shadow-md space-y-2.5">
              <h2 className="font-heading font-semibold text-xs uppercase tracking-wider text-[#8A99A8]">
                Priority &amp; Operational Rationale
              </h2>
              <p className="text-[#EDF0ED] text-sm leading-relaxed font-body">
                {report?.priority_rationale || 'High priority evaluation based on multi-hop credential dumping and exfiltration telemetry.'}
              </p>
            </div>

            {/* Structured Action Items */}
            <div className="border border-[#1E2D38] bg-[#101923] p-5 rounded-sm shadow-md space-y-4">
              <div className="flex items-center justify-between border-b border-[#1E2D38] pb-3">
                <h3 className="font-heading font-semibold text-xs uppercase tracking-wider text-[#EDF0ED] flex items-center gap-2">
                  <Shield className="w-4 h-4 text-[#79D8D0]" />
                  Recommended Containment Actions ({parsedActions.length})
                </h3>
                <span className="text-[11px] font-mono text-[#8A99A8]">
                  Analyst Triage Required
                </span>
              </div>

              <div className="space-y-3">
                {parsedActions.map((action) => {
                  const currentDecision = actionDecisions[action.id] || 'pending';

                  return (
                    <div
                      key={action.id}
                      className={`bg-[#080B10] p-4 rounded-sm border transition-all space-y-3 ${
                        currentDecision === 'accepted'
                          ? 'border-[#79D8D0]/50 bg-[#79D8D0]/5'
                          : currentDecision === 'rejected'
                          ? 'border-[#D85E61]/40 bg-[#D85E61]/5'
                          : currentDecision === 'deferred'
                          ? 'border-[#CC805E]/40 bg-[#CC805E]/5'
                          : 'border-[#1E2D38]'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-[10px] font-mono px-2 py-0.5 rounded-sm font-semibold uppercase ${
                                action.priority === 'critical'
                                  ? 'bg-[#D85E61]/15 text-[#D85E61] border border-[#D85E61]/30'
                                  : 'bg-[#CC805E]/15 text-[#CC805E] border border-[#CC805E]/30'
                              }`}
                            >
                              {action.priority}
                            </span>
                            <span className="text-xs font-mono text-[#EDF0ED] font-semibold">
                              Action #{action.id}
                            </span>
                          </div>
                          <p className="text-xs text-[#EDF0ED] font-body leading-relaxed pt-1">
                            {action.raw}
                          </p>
                        </div>

                        {/* Triage Decision Buttons */}
                        <div className="flex items-center gap-1.5 flex-shrink-0 font-mono text-xs">
                          <button
                            onClick={() =>
                              setActionDecisions((prev) => ({
                                ...prev,
                                [action.id]: 'accepted',
                              }))
                            }
                            className={`px-2.5 py-1 rounded-sm border transition-colors cursor-pointer text-[11px] ${
                              currentDecision === 'accepted'
                                ? 'bg-[#79D8D0] text-[#080B10] font-bold border-[#79D8D0]'
                                : 'bg-[#101923] text-[#8A99A8] border-[#1E2D38] hover:text-[#EDF0ED]'
                            }`}
                          >
                            Accept
                          </button>
                          <button
                            onClick={() =>
                              setActionDecisions((prev) => ({
                                ...prev,
                                [action.id]: 'deferred',
                              }))
                            }
                            className={`px-2.5 py-1 rounded-sm border transition-colors cursor-pointer text-[11px] ${
                              currentDecision === 'deferred'
                                ? 'bg-[#CC805E] text-[#080B10] font-bold border-[#CC805E]'
                                : 'bg-[#101923] text-[#8A99A8] border-[#1E2D38] hover:text-[#EDF0ED]'
                            }`}
                          >
                            Defer
                          </button>
                          <button
                            onClick={() =>
                              setActionDecisions((prev) => ({
                                ...prev,
                                [action.id]: 'rejected',
                              }))
                            }
                            className={`px-2.5 py-1 rounded-sm border transition-colors cursor-pointer text-[11px] ${
                              currentDecision === 'rejected'
                                ? 'bg-[#D85E61] text-[#080B10] font-bold border-[#D85E61]'
                                : 'bg-[#101923] text-[#8A99A8] border-[#1E2D38] hover:text-[#EDF0ED]'
                            }`}
                          >
                            Reject
                          </button>
                        </div>
                      </div>

                      {/* Affected Entities Chips */}
                      {action.affectedEntities.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-mono pt-1 border-t border-[#1E2D38]/50">
                          <span className="text-[#8A99A8]">Affected Targets:</span>
                          {action.affectedEntities.map((ent, i) => (
                            <span key={i} className="bg-[#101923] px-2 py-0.5 rounded-sm border border-[#1E2D38] text-[#79D8D0]">
                              {ent}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Column: Decision Commit Ledger (4 cols on lg) */}
          <div className="lg:col-span-4 space-y-5">
            <div className="border border-[#1E2D38] bg-[#101923] p-5 rounded-sm shadow-md space-y-4 font-mono text-xs">
              <div className="border-b border-[#1E2D38] pb-3">
                <span className="text-[10px] uppercase text-[#8A99A8] tracking-widest block font-semibold">
                  AUDITABLE DECISION COMMIT
                </span>
                <h3 className="font-heading font-bold text-base text-[#EDF0ED] mt-0.5">
                  Record Investigation Outcome
                </h3>
              </div>

              <div className="space-y-3">
                <div className="bg-[#080B10] p-3 rounded-sm border border-[#1E2D38] space-y-2 text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-[#8A99A8]">Total Recommended:</span>
                    <span className="text-[#EDF0ED] font-semibold">{parsedActions.length} Actions</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#79D8D0]">Accepted:</span>
                    <span className="text-[#79D8D0] font-semibold">
                      {Object.values(actionDecisions).filter((v) => v === 'accepted').length}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#CC805E]">Deferred:</span>
                    <span className="text-[#CC805E] font-semibold">
                      {Object.values(actionDecisions).filter((v) => v === 'deferred').length}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#D85E61]">Rejected:</span>
                    <span className="text-[#D85E61] font-semibold">
                      {Object.values(actionDecisions).filter((v) => v === 'rejected').length}
                    </span>
                  </div>
                </div>

                <p className="text-[11px] text-[#6B7A85] leading-relaxed font-body">
                  Committing an outcome determination records your operational sign-off into the immutable SOC audit log. No destructive containment commands are executed automatically.
                </p>

                <button
                  onClick={() => setShowOutcomeModal(true)}
                  className="btn-primary w-full text-xs py-2.5 justify-center flex items-center gap-2 cursor-pointer shadow-md"
                >
                  <UserCheck className="w-4 h-4" />
                  <span>{investigation.outcome ? 'Modify Determination' : 'Sign-Off & Commit'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Record Outcome Determination Modal ────────────────────── */}
      {showOutcomeModal && (
        <div className="fixed inset-0 z-50 bg-[#080B10]/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="border border-[#1E2D38] bg-[#101923] p-6 max-w-lg w-full space-y-5 rounded-sm shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-[#1E2D38] pb-3">
              <div className="flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-[#79D8D0]" />
                <h2 className="font-heading font-bold text-base text-[#EDF0ED]">
                  Record Analyst Determination
                </h2>
              </div>
              <button
                onClick={() => {
                  setShowOutcomeModal(false);
                  setOutcomeError(null);
                }}
                className="text-[#8A99A8] hover:text-[#EDF0ED] transition-colors p-1 cursor-pointer"
                aria-label="Close modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Error Message Alert */}
            {outcomeError && (
              <div className="bg-[#D85E61]/10 border border-[#D85E61]/40 p-2.5 rounded-sm text-xs text-[#D85E61] flex items-center gap-2 font-mono">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>{outcomeError}</span>
              </div>
            )}

            <form onSubmit={handleRecordOutcome} className="space-y-4 font-mono text-xs">
              <div className="space-y-1.5">
                <label className="text-[#8A99A8] block font-semibold">Triage Outcome Determination:</label>
                <select
                  value={selectedOutcome}
                  onChange={(e) => setSelectedOutcome(e.target.value as any)}
                  className="w-full bg-[#080B10] border border-[#1E2D38] rounded-sm px-3 py-2 text-[#EDF0ED] outline-none focus:border-[#79D8D0] cursor-pointer"
                >
                  <option value="containment">Containment Executed (Confirmed Breach)</option>
                  <option value="further_investigation">Further Investigation Required (Active Threat Hunting)</option>
                  <option value="accepted">Accepted Risk (Benign True Positive)</option>
                  <option value="false_positive">False Positive (Benign Maintenance / Noise)</option>
                </select>
                <span className="text-[10px] text-[#6B7A85] block">
                  Strictly validates against enterprise SOC audit ledger enums.
                </span>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-[#8A99A8] font-semibold">Analyst Rationale &amp; Evidence Basis:</label>
                  <span className={`text-[10px] ${outcomeReason.length > 900 ? 'text-[#D85E61]' : 'text-[#6B7A85]'}`}>
                    {outcomeReason.length}/1000
                  </span>
                </div>
                <textarea
                  value={outcomeReason}
                  onChange={(e) => setOutcomeReason(e.target.value)}
                  placeholder="Summarize the confirmed lateral movement hops, affected hostnames, and containment actions..."
                  rows={4}
                  maxLength={1000}
                  required
                  className="w-full bg-[#080B10] border border-[#1E2D38] rounded-sm p-3 text-[#EDF0ED] outline-none focus:border-[#79D8D0] placeholder-[#6B7A85]"
                />
              </div>

              <div className="bg-[#080B10] p-2.5 rounded-sm border border-[#1E2D38] text-[11px] text-[#8A99A8]">
                <span>Notice: </span>
                <span className="text-[#EDF0ED]">
                  Sign-off is logged under your current analyst session. Infrastructure orchestration must be validated via standard change-control before isolating production subnets.
                </span>
              </div>

              <div className="flex justify-end gap-3 pt-2 border-t border-[#1E2D38]">
                <button
                  type="button"
                  onClick={() => {
                    setShowOutcomeModal(false);
                    setOutcomeError(null);
                  }}
                  className="btn-secondary text-xs py-2 px-4 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={outcomeSubmitting || !outcomeReason.trim()}
                  className="btn-primary text-xs py-2 px-5 cursor-pointer disabled:opacity-50"
                >
                  {outcomeSubmitting ? 'Recording...' : 'Commit Determination'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
