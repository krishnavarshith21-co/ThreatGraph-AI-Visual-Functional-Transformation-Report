import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../lib/api';
import type { Investigation, GraphNode } from '../types';
import { CytoscapeGraph } from '../components/graph/CytoscapeGraph';
import {
  ShieldAlert, CheckCircle2, Clock, Terminal, AlertTriangle,
  Download, ArrowLeft, RefreshCw, Layers,
  HelpCircle, UserCheck, Activity, Shield, X
} from 'lucide-react';

export function InvestigationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [investigation, setInvestigation] = useState<Investigation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'graph' | 'report' | 'steps'>('graph');
  const [selectedGraphNode, setSelectedGraphNode] = useState<GraphNode | null>(null);

  // Outcome decision recording modal
  const [showOutcomeModal, setShowOutcomeModal] = useState(false);
  const [selectedOutcome, setSelectedOutcome] = useState<string>('containment');
  const [outcomeReason, setOutcomeReason] = useState<string>('');
  const [outcomeSubmitting, setOutcomeSubmitting] = useState(false);

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
  }, [id, investigation?.status]);

  async function loadInvestigation(invId: string) {
    try {
      const data = await api.getInvestigation(invId);
      setInvestigation(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load investigation');
    } finally {
      setLoading(false);
    }
  }

  const handleRecordOutcome = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !outcomeReason) return;
    setOutcomeSubmitting(true);

    try {
      await api.recordOutcome(id, selectedOutcome, outcomeReason, investigation?.report?.recommended_action);
      setShowOutcomeModal(false);
      loadInvestigation(id);
    } catch (err: any) {
      alert(err.message || 'Failed to record outcome');
    } finally {
      setOutcomeSubmitting(false);
    }
  };

  const handleExportMarkdown = async () => {
    if (!id) return;
    try {
      const res = await api.exportReport(id, 'markdown');
      const blob = new Blob([typeof res === 'string' ? res : JSON.stringify(res, null, 2)], {
        type: 'text/markdown',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `threatgraph-${id}.md`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert('Failed to export markdown');
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center space-y-3 font-mono text-xs">
          <div className="w-7 h-7 border-2 border-[#83CFE0] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-[#8A99A8]">Retrieving investigation dossier &amp; FalkorDB subgraph...</p>
        </div>
      </div>
    );
  }

  if (error || !investigation) {
    return (
      <div className="border border-[#1E2D38] bg-[#101923] p-10 text-center max-w-lg mx-auto space-y-4 my-12 rounded-sm shadow-xl">
        <AlertTriangle className="w-8 h-8 text-[#DC666B] mx-auto" />
        <h2 className="font-heading font-bold text-lg text-[#F3F4F0]">Investigation Not Found</h2>
        <p className="text-xs text-[#8A99A8] font-mono">{error || `Could not locate investigation ID: ${id}`}</p>
        <Link to="/app/investigations" className="btn-secondary text-xs inline-flex items-center gap-2">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Investigations
        </Link>
      </div>
    );
  }

  const report = investigation.report;
  const graphData = report?.graph_data || { nodes: [], edges: [] };
  const attackPath = report?.attack_path || [];
  const steps = report?.agent_steps || [];

  return (
    <div className="space-y-5 w-full max-w-[1780px] mx-auto pb-14">
      {/* ── Top Breadcrumbs & Actions ─────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-3 border-b border-[#1E2D38]">
        <Link
          to="/app/investigations"
          className="text-xs font-mono text-[#8A99A8] hover:text-[#F3F4F0] flex items-center gap-1.5 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Investigation Queue
        </Link>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => id && loadInvestigation(id)}
            className="p-1.5 text-[#8A99A8] hover:text-[#F3F4F0] hover:bg-[#1A2732] rounded-sm border border-[#1E2D38] transition-colors"
            title="Refresh dossier"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleExportMarkdown}
            className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5 text-[#83CFE0]" />
            <span>Export Dossier (MD)</span>
          </button>
          <button
            onClick={() => setShowOutcomeModal(true)}
            className="btn-primary text-xs py-1.5 px-3.5 flex items-center gap-1.5"
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>Record Analyst Decision</span>
          </button>
        </div>
      </div>

      {/* ── Prominent Investigation Dossier Header ────────────────── */}
      <div className="border border-[#1E2D38] bg-[#101923] p-5 space-y-3.5 rounded-sm shadow-md">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
          <div className="space-y-1.5 min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs text-[#83CFE0] font-semibold">{investigation.id}</span>
              <span
                className={`text-[10px] uppercase font-mono px-2 py-0.5 rounded-sm font-semibold ${
                  investigation.status === 'completed'
                    ? 'bg-[#83CFE0]/10 text-[#83CFE0] border border-[#83CFE0]/30'
                    : investigation.status === 'running'
                    ? 'bg-[#C68A69]/10 text-[#C68A69] border border-[#C68A69]/30 animate-pulse'
                    : 'bg-[#DC666B]/10 text-[#DC666B] border border-[#DC666B]/30'
                }`}
              >
                {investigation.status}
              </span>
              <span className="text-xs font-mono text-[#6B7A85]">Target:</span>
              <span className="text-xs font-mono text-[#F3F4F0] font-semibold">{investigation.alert_id}</span>
            </div>
            <h1 className="font-heading font-bold text-lg sm:text-xl text-[#F3F4F0] break-words">
              {report?.summary ? report.summary.slice(0, 160) : investigation.description || `Investigation ${investigation.id}`}
            </h1>
          </div>

          {investigation.outcome && (
            <div className="bg-[#1A2732] border border-[#1E2D38] rounded-sm p-3 text-left lg:text-right flex-shrink-0">
              <span className="text-[10px] uppercase font-mono tracking-widest text-[#8A99A8] block">
                Analyst Determination
              </span>
              <span className="font-heading font-bold text-sm text-[#D8C99A] capitalize">
                {investigation.outcome.replace('_', ' ')}
              </span>
              {investigation.outcome_reason && (
                <p className="text-[11px] text-[#8A99A8] max-w-sm truncate mt-0.5 font-mono">
                  "{investigation.outcome_reason}"
                </p>
              )}
            </div>
          )}
        </div>

        {/* Telemetry Bar */}
        <div className="flex flex-wrap items-center gap-6 pt-3 border-t border-[#1E2D38] text-xs font-mono text-[#8A99A8]">
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-[#83CFE0]" />
            <span>Started: {new Date(investigation.created_at).toLocaleTimeString()}</span>
          </div>
          {investigation.completed_at && (
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#D8C99A]" />
              <span>Completed: {new Date(investigation.completed_at).toLocaleTimeString()}</span>
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <Terminal className="w-3.5 h-3.5 text-[#C68A69]" />
            <span>{steps.length} Autonomous Tool Actions</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-[#83CFE0]" />
            <span>{graphData.nodes.length} Connected Subgraph Nodes</span>
          </div>
        </div>
      </div>

      {/* ── Refined Navigation Tabs ───────────────────────────────── */}
      <div className="border-b border-[#1E2D38] flex items-center gap-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('graph')}
          className={`px-4 py-2 text-xs font-mono border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'graph'
              ? 'border-[#83CFE0] text-[#83CFE0] font-semibold'
              : 'border-transparent text-[#8A99A8] hover:text-[#F3F4F0]'
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          <span>Attack Graph Canvas ({graphData.nodes.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('report')}
          className={`px-4 py-2 text-xs font-mono border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'report'
              ? 'border-[#83CFE0] text-[#83CFE0] font-semibold'
              : 'border-transparent text-[#8A99A8] hover:text-[#F3F4F0]'
          }`}
        >
          <ShieldAlert className="w-3.5 h-3.5" />
          <span>Evidence &amp; Findings ({report?.findings?.length || 0})</span>
        </button>
        <button
          onClick={() => setActiveTab('steps')}
          className={`px-4 py-2 text-xs font-mono border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'steps'
              ? 'border-[#83CFE0] text-[#83CFE0] font-semibold'
              : 'border-transparent text-[#8A99A8] hover:text-[#F3F4F0]'
          }`}
        >
          <Terminal className="w-3.5 h-3.5" />
          <span>Agent Reasoning Trace ({steps.length})</span>
        </button>
      </div>

      {/* ── Tab 1: Interactive Attack Graph Canvas with Docked Inspector ── */}
      {activeTab === 'graph' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
          {/* Main Cytoscape Canvas (8 cols on lg) */}
          <div className="lg:col-span-8 xl:col-span-9 h-[640px] w-full rounded-sm overflow-hidden border border-[#1E2D38] shadow-md">
            <CytoscapeGraph
              data={graphData}
              attackPath={attackPath}
              highlightAttackPath={true}
              onNodeSelect={(node) => setSelectedGraphNode(node)}
            />
          </div>

          {/* Context-Sensitive Inspector (4 cols on lg) */}
          <div className="lg:col-span-4 xl:col-span-3 border border-[#1E2D38] bg-[#101923] p-4 flex flex-col justify-between space-y-4 font-mono text-xs rounded-sm shadow-md">
            <div className="space-y-4">
              {/* Selected Entity Inspector */}
              <div className="space-y-2 border-b border-[#1E2D38] pb-3">
                <span className="text-[10px] uppercase text-[#6B7A85] tracking-wider block">
                  SELECTED ENTITY
                </span>
                {selectedGraphNode ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="badge-tag border border-[#83CFE0]/30 bg-[#83CFE0]/10 text-[#83CFE0]">
                        {selectedGraphNode._label || 'Node'}
                      </span>
                      <span className="text-[#F3F4F0] font-semibold truncate">
                        {(selectedGraphNode.hostname as string) || (selectedGraphNode.name as string) || (selectedGraphNode.title as string) || (selectedGraphNode.address as string) || selectedGraphNode.id}
                      </span>
                    </div>
                    <div className="bg-[#070C13] p-2.5 rounded-sm border border-[#1E2D38] space-y-1 text-[11px]">
                      <div className="flex justify-between">
                        <span className="text-[#8A99A8]">ID:</span>
                        <span className="text-[#F3F4F0] font-medium">{selectedGraphNode.id}</span>
                      </div>
                      {Object.entries(selectedGraphNode)
                        .filter(([k]) => !k.startsWith('_') && k !== 'id')
                        .slice(0, 4)
                        .map(([k, v]) => (
                          <div key={k} className="flex justify-between gap-2">
                            <span className="text-[#8A99A8] capitalize">{k}:</span>
                            <span className="text-[#F3F4F0] truncate max-w-[140px]">{String(v)}</span>
                          </div>
                        ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-[#6B7A85] text-xs">Click any node on the graph canvas to inspect attributes.</p>
                )}
              </div>

              {/* Reconstructed Attack Path Chain */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[10px] text-[#8A99A8] uppercase tracking-wider">
                  <span>ATTACK TRAJECTORY</span>
                  <span className="text-[#DC666B] font-semibold">{attackPath.length} Pivots</span>
                </div>
                {attackPath.length > 0 ? (
                  <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
                    {attackPath.map((ap, idx) => (
                      <div key={idx} className="bg-[#070C13] p-2 rounded-sm border border-[#1E2D38] text-[11px] space-y-0.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[#F3F4F0] font-semibold">{ap.source}</span>
                          <span className="text-[#DC666B] text-[10px] font-mono">{ap.relationship}</span>
                        </div>
                        <div className="text-[#8A99A8] text-[10px]">↳ {ap.target}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[#6B7A85] text-xs">No multi-hop lateral pivots identified in this subgraph.</p>
                )}
              </div>

              {/* Recommended Next Action */}
              <div className="space-y-1.5 border-t border-[#1E2D38] pt-3">
                <span className="text-[10px] uppercase text-[#6B7A85] tracking-wider block">
                  RECOMMENDED ACTION
                </span>
                <p className="text-[#D8C99A] text-xs leading-relaxed font-body">
                  {report?.recommended_action || 'Revoke compromised credentials and isolate LAPTOP-MCHEN.'}
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowOutcomeModal(true)}
              className="btn-primary w-full text-xs py-2 justify-center flex items-center gap-1.5"
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>Commit Decision</span>
            </button>
          </div>
        </div>
      )}

      {/* ── Tab 2: Evidence & Findings Dossier Report ─────────────── */}
      {activeTab === 'report' && (
        <div className="grid lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-8 space-y-5 min-w-0">
            {/* Executive Summary */}
            <div className="border border-[#1E2D38] bg-[#101923] p-5 space-y-2.5 rounded-sm shadow-sm">
              <h2 className="font-heading font-semibold text-sm uppercase tracking-wider text-[#8A99A8]">
                Incident Narrative &amp; Scope
              </h2>
              <p className="text-[#F3F4F0] text-sm leading-relaxed font-body">
                {report?.summary || 'No summary available.'}
              </p>
            </div>

            {/* Confirmed Findings with Provenance */}
            <div className="border border-[#1E2D38] bg-[#101923] p-5 space-y-3.5 rounded-sm shadow-sm">
              <div className="flex items-center justify-between border-b border-[#1E2D38] pb-2.5">
                <h2 className="font-heading font-semibold text-sm uppercase tracking-wider text-[#8A99A8] flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#83CFE0]" />
                  Verified Evidence Findings
                </h2>
                <span className="text-xs font-mono text-[#83CFE0] font-semibold">
                  {report?.findings?.length || 0} Anchored Points
                </span>
              </div>
              <div className="space-y-2.5">
                {report?.findings?.map((f, i) => (
                  <div key={i} className="flex items-start gap-3 bg-[#070C13] p-3 rounded-sm border border-[#1E2D38]">
                    <span className="w-4 h-4 rounded-sm bg-[#83CFE0]/10 text-[#83CFE0] font-mono text-xs flex items-center justify-center flex-shrink-0 mt-0.5 font-bold">
                      {i + 1}
                    </span>
                    <p className="text-xs text-[#D6E0E5] font-body leading-relaxed">{f}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Contradictions & Benign Disclosures */}
            <div className="border border-[#1E2D38] bg-[#101923] p-5 space-y-3.5 rounded-sm shadow-sm">
              <div className="flex items-center gap-2 text-[#C68A69] border-b border-[#1E2D38] pb-2.5">
                <AlertTriangle className="w-4 h-4" />
                <h2 className="font-heading font-semibold text-sm uppercase tracking-wider">
                  Contradiction Analysis &amp; Benign Cross-Check
                </h2>
              </div>
              {report?.contradictions && report.contradictions.length > 0 ? (
                <div className="space-y-2">
                  {report.contradictions.map((c, i) => (
                    <div key={i} className="bg-[#C68A69]/10 border border-[#C68A69]/20 p-3 rounded-sm text-xs text-[#F3F4F0] font-body leading-relaxed">
                      {c}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-[#6B7A85] font-mono">No contradictory benign signals identified in this trajectory.</p>
              )}
            </div>

            {/* Missing Information & Uncertainties */}
            <div className="border border-[#1E2D38] bg-[#101923] p-5 space-y-3.5 rounded-sm shadow-sm">
              <div className="flex items-center gap-2 text-[#8A99A8] border-b border-[#1E2D38] pb-2.5">
                <HelpCircle className="w-4 h-4 text-[#83CFE0]" />
                <h2 className="font-heading font-semibold text-sm uppercase tracking-wider">
                  Information Gaps &amp; Uncertainties
                </h2>
              </div>
              <ul className="space-y-2 text-xs text-[#8A99A8] font-mono">
                {report?.missing_information?.map((m, i) => (
                  <li key={i} className="flex items-start gap-2 bg-[#070C13] p-2.5 rounded-sm border border-[#1E2D38]">
                    <span className="text-[#83CFE0] font-bold">&bull;</span>
                    <span className="text-[#D6E0E5]">{m}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Right Column: Actions & Containment */}
          <div className="lg:col-span-4 space-y-5 min-w-0">
            <div className="border border-[#1E2D38] bg-[#101923] p-5 space-y-3 rounded-sm shadow-sm">
              <h3 className="font-heading font-semibold text-xs uppercase tracking-wider text-[#8A99A8] flex items-center gap-2">
                <Shield className="w-4 h-4 text-[#DC666B]" />
                Priority Assessment
              </h3>
              <p className="text-xs text-[#D6E0E5] font-body leading-relaxed">
                {report?.priority_rationale || 'Critical evaluation based on confirmed data extraction to external IP.'}
              </p>
            </div>

            <div className="border border-[#1E2D38] bg-[#101923] p-5 space-y-3 rounded-sm shadow-sm">
              <h3 className="font-heading font-semibold text-xs uppercase tracking-wider text-[#8A99A8]">
                Recommended Containment
              </h3>
              <div className="text-xs text-[#F3F4F0] font-mono whitespace-pre-line leading-relaxed bg-[#070C13] p-3 rounded-sm border border-[#1E2D38]">
                {report?.recommended_action || 'Revoke credentials and isolate endpoints.'}
              </div>
            </div>

            {/* Analyst Sign-off */}
            <div className="border border-[#1E2D38] bg-[#101923] p-5 space-y-3 rounded-sm shadow-sm">
              <h4 className="font-heading font-semibold text-xs text-[#8A99A8] uppercase tracking-wider">
                Analyst Determination
              </h4>
              <p className="text-xs text-[#6B7A85] leading-relaxed font-body">
                Record your operational conclusion to commit this investigation into the permanent audit ledger.
              </p>
              <button
                onClick={() => setShowOutcomeModal(true)}
                className="btn-primary w-full text-xs py-2 flex items-center justify-center gap-2"
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>Record Determination</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Tab 3: Agent Reasoning Trace ──────────────────────────── */}
      {activeTab === 'steps' && (
        <div className="space-y-3.5">
          <div className="border border-[#1E2D38] bg-[#101923] p-3.5 flex items-center justify-between rounded-sm shadow-sm">
            <span className="text-xs font-mono text-[#8A99A8]">
              Autonomous execution trace against FalkorDB graph engine:
            </span>
            <span className="text-xs font-mono text-[#83CFE0] font-semibold">
              {steps.length} Tool Invocations
            </span>
          </div>

          <div className="space-y-2.5">
            {steps.map((st) => (
              <div key={st.step} className="border border-[#1E2D38] bg-[#101923] p-4 font-mono text-xs space-y-2 rounded-sm shadow-sm">
                <div className="flex items-center justify-between text-[#8A99A8]">
                  <div className="flex items-center gap-2">
                    <span className="px-1.5 py-0.5 rounded-sm bg-[#83CFE0]/10 text-[#83CFE0] font-bold text-[10px] border border-[#83CFE0]/20">
                      STEP {st.step}
                    </span>
                    <span className="text-[#F3F4F0] font-semibold">{st.tool}</span>
                  </div>
                  <span className="text-[10px] text-[#6B7A85]">
                    {new Date(st.timestamp).toLocaleTimeString()}
                  </span>
                </div>

                <div className="bg-[#070C13] p-2.5 rounded-sm border border-[#1E2D38] text-[11px] text-[#8A99A8]">
                  Arguments: <span className="text-[#F3F4F0]">{JSON.stringify(st.arguments)}</span>
                </div>

                <div className="text-[11px] text-[#8A99A8] pt-0.5">
                  &gt; Result: <span className="text-[#83CFE0]">{st.result_summary}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Record Outcome Modal ──────────────────────────────────── */}
      {showOutcomeModal && (
        <div className="fixed inset-0 z-50 bg-[#070C13]/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="border border-[#1E2D38] bg-[#101923] p-6 max-w-lg w-full space-y-5 rounded-sm shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-[#1E2D38] pb-3">
              <div className="flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-[#83CFE0]" />
                <h2 className="font-heading font-bold text-base text-[#F3F4F0]">Record Analyst Decision</h2>
              </div>
              <button
                onClick={() => setShowOutcomeModal(false)}
                className="text-[#8A99A8] hover:text-[#F3F4F0] transition-colors p-1"
                aria-label="Close modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleRecordOutcome} className="space-y-4 font-mono text-xs">
              <div className="space-y-1.5">
                <label className="text-[#8A99A8] block">Triage Determination:</label>
                <select
                  value={selectedOutcome}
                  onChange={(e) => setSelectedOutcome(e.target.value)}
                  className="w-full bg-[#070C13] border border-[#1E2D38] rounded-sm px-3 py-2 text-[#F3F4F0] outline-none focus:border-[#83CFE0] cursor-pointer"
                >
                  <option value="containment">Containment Executed (Confirmed Breach)</option>
                  <option value="false_positive">False Positive (Benign Maintenance)</option>
                  <option value="escalation">Escalate to Tier 3 CIRT</option>
                  <option value="monitoring">Active Monitoring &amp; Telemetry Retention</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[#8A99A8] block">Analyst Rationale &amp; Evidence Basis:</label>
                <textarea
                  value={outcomeReason}
                  onChange={(e) => setOutcomeReason(e.target.value)}
                  placeholder="Detail the graph traversal evidence, affected hosts, and containment actions..."
                  rows={4}
                  required
                  className="w-full bg-[#070C13] border border-[#1E2D38] rounded-sm p-3 text-[#F3F4F0] outline-none focus:border-[#83CFE0] placeholder-[#6B7A85]"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2 border-t border-[#1E2D38]">
                <button
                  type="button"
                  onClick={() => setShowOutcomeModal(false)}
                  className="btn-secondary text-xs py-2 px-4"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={outcomeSubmitting || !outcomeReason}
                  className="btn-primary text-xs py-2 px-5"
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
