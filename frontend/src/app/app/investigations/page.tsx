'use client';

import { Suspense, useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import type { Investigation, Alert } from '@/lib/types';
import {
  Search, Plus, Filter,
  ArrowRight, Zap, X
} from 'lucide-react';

function InvestigationsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [investigations, setInvestigations] = useState<Investigation[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // New Investigation Modal State
  const [showModal, setShowModal] = useState(false);
  const [selectedAlertId, setSelectedAlertId] = useState<string>('');
  const [customDescription, setCustomDescription] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function loadData() {
      try {
        setLoading(true);
        const [invsRes, alertsRes] = await Promise.all([
          api.getInvestigations(),
          api.getAlerts(),
        ]);
        if (mounted) {
          setInvestigations(invsRes.investigations || []);
          setAlerts(alertsRes.alerts || []);
          const alertParam = searchParams.get('alert');
          if (alertParam) {
            setSelectedAlertId(alertParam);
            setShowModal(true);
          } else if (!selectedAlertId && alertsRes.alerts?.length > 0) {
            setSelectedAlertId(alertsRes.alerts[0].id);
          }
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }
    loadData();
    return () => {
      mounted = false;
    };
  }, [searchParams]);

  const handleStartInvestigation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAlertId) return;

    setSubmitting(true);
    setSubmitError(null);

    try {
      const res = await api.startInvestigation(selectedAlertId, customDescription);
      setShowModal(false);
      router.push(`/app/investigations/${res.id}`);
    } catch (err: any) {
      setSubmitError(err.message || 'Failed to start investigation');
      setSubmitting(false);
    }
  };

  const filteredInvestigations = statusFilter === 'all'
    ? investigations
    : investigations.filter((i) => i.status === statusFilter);

  return (
    <div className="space-y-6 w-full max-w-[1780px] mx-auto pb-14">
      {/* ── Top Header ────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#1E2D38]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-[#83CFE0] animate-pulse" />
            <span className="text-[11px] font-mono uppercase tracking-widest text-[#83CFE0]">
              Autonomous Investigation Engine
            </span>
            <span className="text-[#344451]">|</span>
            <span className="text-[11px] font-mono text-[#8A99A8]">Gemini Multi-Hop Reasoning</span>
          </div>
          <h1 className="font-heading font-bold text-2xl lg:text-3xl text-[#F3F4F0]">
            Security Investigations
          </h1>
          <p className="text-[#8A99A8] text-xs font-mono mt-1">
            Review completed triage dossiers, inspect multi-hop evidence, or launch fresh agent analyses.
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="btn-primary text-xs py-2 px-4 flex items-center gap-2 self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Start New Investigation</span>
        </button>
      </div>

      {/* ── Filter Tabs ───────────────────────────────────────────── */}
      <div className="flex items-center gap-2 border-b border-[#1E2D38] pb-3 font-mono text-xs">
        <Filter className="w-3.5 h-3.5 text-[#6B7A85] mr-1" />
        {['all', 'completed', 'running', 'failed'].map((st) => (
          <button
            key={st}
            onClick={() => setStatusFilter(st)}
            className={`px-3 py-1 rounded-sm capitalize transition-all cursor-pointer ${
              statusFilter === st
                ? 'bg-[#83CFE0]/15 text-[#83CFE0] border border-[#83CFE0]/40 font-semibold'
                : 'text-[#8A99A8] hover:text-[#F3F4F0] hover:bg-[#1A2732] border border-transparent'
            }`}
          >
            {st}
          </button>
        ))}
      </div>

      {/* ── Investigations List ───────────────────────────────────── */}
      {loading ? (
        <div className="border border-[#1E2D38] bg-[#101923] p-16 text-center text-[#8A99A8] text-xs font-mono rounded-sm">
          <div className="w-6 h-6 border-2 border-[#83CFE0] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          Loading investigations from database...
        </div>
      ) : filteredInvestigations.length === 0 ? (
        <div className="border border-[#1E2D38] bg-[#101923] p-16 text-center space-y-3 rounded-sm">
          <Search className="w-8 h-8 text-[#6B7A85] mx-auto opacity-70" />
          <h3 className="font-heading font-semibold text-[#F3F4F0] text-base">No Investigations Found</h3>
          <p className="text-[#8A99A8] text-xs font-mono max-w-md mx-auto">
            No investigations match the current filter. Launch a new autonomous investigation on an active security alert to begin.
          </p>
          <button onClick={() => setShowModal(true)} className="btn-primary text-xs py-2 px-4 mt-2 cursor-pointer">
            Start Investigation
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredInvestigations.map((inv) => (
            <Link
              key={inv.id}
              href={`/app/investigations/${inv.id}`}
              className="border border-[#1E2D38] bg-[#101923] p-4 lg:p-5 rounded-sm flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-[#344451] transition-all group shadow-sm"
            >
              <div className="space-y-2 flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="font-mono text-xs text-[#83CFE0] font-semibold">{inv.id}</span>
                  <span
                    className={`text-[10px] uppercase font-mono px-2 py-0.5 rounded-sm font-semibold ${
                      inv.status === 'completed'
                        ? 'bg-[#83CFE0]/10 text-[#83CFE0] border border-[#83CFE0]/30'
                        : inv.status === 'running'
                        ? 'bg-[#C68A69]/10 text-[#C68A69] border border-[#C68A69]/30 animate-pulse'
                        : 'bg-[#DC666B]/10 text-[#DC666B] border border-[#DC666B]/30'
                    }`}
                  >
                    {inv.status}
                  </span>
                  <span className="text-xs font-mono text-[#8A99A8]">Target Alert: {inv.alert_id}</span>
                </div>

                <h3 className="font-heading font-semibold text-sm lg:text-base text-[#F3F4F0] group-hover:text-[#83CFE0] transition-colors truncate">
                  {inv.report?.summary
                    ? inv.report.summary.slice(0, 140) + '...'
                    : inv.description || `AI Investigation on security alert ${inv.alert_id}`}
                </h3>

                <div className="flex flex-wrap items-center gap-4 text-[11px] text-[#8A99A8] font-mono">
                  <span>Created: {new Date(inv.created_at).toLocaleString()}</span>
                  {inv.report?.agent_steps && (
                    <span>&bull; {inv.report.agent_steps.length} Tool Actions</span>
                  )}
                  {inv.report?.findings && (
                    <span>&bull; {inv.report.findings.length} Anchored Findings</span>
                  )}
                  {inv.outcome && (
                    <span className="text-[#D8C99A] font-semibold capitalize">
                      &bull; Decision: {inv.outcome.replace('_', ' ')}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 self-end md:self-center flex-shrink-0">
                <span className="text-xs font-mono text-[#83CFE0] group-hover:translate-x-1 transition-transform flex items-center gap-1 font-semibold">
                  <span>Inspect Dossier</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* ── Start New Investigation Modal ─────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-[#070C13]/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="border border-[#1E2D38] bg-[#101923] p-6 max-w-lg w-full space-y-5 rounded-sm shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#1E2D38] pb-3">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-[#83CFE0]" />
                <h2 className="font-heading font-bold text-base text-[#F3F4F0]">Dispatch Investigation Agent</h2>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-[#8A99A8] hover:text-[#F3F4F0] p-1 transition-colors cursor-pointer"
                aria-label="Close modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {submitError && (
              <div className="bg-[#DC666B]/10 border border-[#DC666B]/30 text-[#DC666B] text-xs p-3 rounded-sm font-mono">
                {submitError}
              </div>
            )}

            <form onSubmit={handleStartInvestigation} className="space-y-4 font-mono text-xs">
              <div className="space-y-1.5">
                <label className="block text-[#8A99A8]">
                  Target Security Alert
                </label>
                <select
                  required
                  value={selectedAlertId}
                  onChange={(e) => setSelectedAlertId(e.target.value)}
                  className="w-full bg-[#070C13] border border-[#1E2D38] rounded-sm px-3 py-2 text-[#F3F4F0] outline-none focus:border-[#83CFE0] cursor-pointer"
                >
                  {alerts.map((alt) => (
                    <option key={alt.id} value={alt.id}>
                      [{alt.severity.toUpperCase()}] {alt.id} &mdash; {alt.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[#8A99A8]">
                  Analyst Guidance / Context (Optional)
                </label>
                <textarea
                  rows={3}
                  value={customDescription}
                  onChange={(e) => setCustomDescription(e.target.value)}
                  placeholder="e.g. Focus on lateral movement from Engineering VLAN to production database servers..."
                  className="w-full bg-[#070C13] border border-[#1E2D38] rounded-sm p-3 text-[#F3F4F0] placeholder-[#6B7A85] outline-none focus:border-[#83CFE0]"
                />
              </div>

              <div className="bg-[#070C13] p-3 rounded-sm border border-[#1E2D38] text-[11px] text-[#8A99A8] space-y-1">
                <span className="text-[#83CFE0] font-semibold block">Autonomous Workflow Strategy:</span>
                <p>1. Query FalkorDB graph for alert entity &amp; source event.</p>
                <p>2. Traverse 3-hop neighborhood across Users, Devices, IPs &amp; Resources.</p>
                <p>3. Synthesize findings, contradictory maintenance jobs, and attack trajectory.</p>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3 border-t border-[#1E2D38]">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn-secondary text-xs py-2 px-4 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary text-xs py-2 px-4 flex items-center gap-1.5 cursor-pointer"
                >
                  <span>{submitting ? 'Dispatching Agent...' : 'Start Investigation'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function InvestigationsPage() {
  return (
    <Suspense fallback={<div className="p-10 font-mono text-xs text-[#8A99A8]">Loading investigations...</div>}>
      <InvestigationsContent />
    </Suspense>
  );
}
