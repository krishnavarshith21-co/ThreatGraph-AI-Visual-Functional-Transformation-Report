'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import type { Alert, Investigation } from '@/lib/types';
import {
  ShieldAlert, Activity, Search, Globe, ArrowRight,
  Database, Clock, CheckCircle2, Zap
} from 'lucide-react';

export default function DashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<any>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [investigations, setInvestigations] = useState<Investigation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function loadDashboard() {
      try {
        const [statsRes, alertsRes, invsRes] = await Promise.all([
          api.getGraphStats().catch(() => ({ node_counts: {} })),
          api.getAlerts(undefined, 8).catch(() => ({ alerts: [] })),
          api.getInvestigations(undefined).catch(() => ({ investigations: [] })),
        ]);
        if (mounted) {
          setStats(statsRes);
          setAlerts(alertsRes.alerts || []);
          setInvestigations(invsRes.investigations || []);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }
    loadDashboard();
    return () => {
      mounted = false;
    };
  }, []);

  const nodeCounts = stats?.node_counts || {};
  const totalNodes = Object.entries(nodeCounts)
    .filter(([k]) => k !== 'total_relationships')
    .reduce((sum, [, val]) => sum + (Number(val) || 0), 0);

  const criticalAlerts = alerts.filter((a) => a.severity === 'critical');
  const completedInvestigations = investigations.filter((i) => i.status === 'completed');

  return (
    <div className="space-y-6 w-full max-w-[1780px] mx-auto pb-14">
      {/* ── Operational Header & Direct Actions ───────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#1E2D38]">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#83CFE0] animate-pulse" />
            <span className="text-[11px] font-mono uppercase tracking-widest text-[#83CFE0]">
              SOC SITUATION ROOM &bull; OPERATIONAL COMMAND
            </span>
          </div>
          <h1 className="font-heading font-bold text-2xl lg:text-3xl text-[#F3F4F0]">
            Cyber Threat Intelligence Console
          </h1>
          <p className="text-[#8A99A8] text-xs font-mono">
            Connected-data alert queue, FalkorDB graph topology, and autonomous investigation pipeline.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/app/graph"
            className="btn-secondary text-xs py-2 px-3.5 flex items-center gap-2"
          >
            <Globe className="w-3.5 h-3.5 text-[#83CFE0]" />
            <span>Graph Navigator</span>
          </Link>
          <Link
            href="/app/investigations"
            className="btn-primary text-xs py-2 px-4 flex items-center gap-2"
          >
            <Search className="w-3.5 h-3.5" />
            <span>New Investigation</span>
          </Link>
        </div>
      </div>

      {/* ── Restrained Operational Telemetry Bar ──────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <div className="border border-[#1E2D38] bg-[#101923] p-4 space-y-1 rounded-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-xs font-mono text-[#8A99A8]">
            <span>KNOWLEDGE GRAPH</span>
            <Database className="w-3.5 h-3.5 text-[#83CFE0]" />
          </div>
          <div className="font-mono text-2xl font-bold text-[#F3F4F0]">
            {loading ? '--' : totalNodes}
          </div>
          <p className="text-[11px] text-[#6B7A85] font-mono">
            {nodeCounts.total_relationships || 0} active graph relationships
          </p>
        </div>

        <div className="border border-[#1E2D38] bg-[#101923] p-4 space-y-1 rounded-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-xs font-mono text-[#8A99A8]">
            <span>CRITICAL BREACHES</span>
            <ShieldAlert className="w-3.5 h-3.5 text-[#DC666B]" />
          </div>
          <div className="font-mono text-2xl font-bold text-[#DC666B]">
            {loading ? '--' : criticalAlerts.length}
          </div>
          <p className="text-[11px] text-[#DC666B]/80 font-mono">
            {alerts.length} total signals pending triage
          </p>
        </div>

        <div className="border border-[#1E2D38] bg-[#101923] p-4 space-y-1 rounded-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-xs font-mono text-[#8A99A8]">
            <span>INVESTIGATIONS</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-[#D8C99A]" />
          </div>
          <div className="font-mono text-2xl font-bold text-[#F3F4F0]">
            {loading ? '--' : investigations.length}
          </div>
          <p className="text-[11px] text-[#8A99A8] font-mono">
            {completedInvestigations.length} verified dossiers compiled
          </p>
        </div>

        <div className="border border-[#1E2D38] bg-[#101923] p-4 space-y-1 rounded-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-xs font-mono text-[#8A99A8]">
            <span>ENGINE STATUS</span>
            <Activity className="w-3.5 h-3.5 text-[#83CFE0]" />
          </div>
          <div className="font-mono text-base font-bold text-[#83CFE0] pt-1 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#83CFE0] animate-pulse" />
            <span>FalkorDB Online</span>
          </div>
          <p className="text-[11px] text-[#6B7A85] font-mono">
            In-memory Cypher traversal ready
          </p>
        </div>
      </div>

      {/* ── Main Operations Grid ─────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Security Alert Queue for Direct Triage (7 cols) */}
        <div className="lg:col-span-7 space-y-3.5">
          <div className="flex items-center justify-between border-b border-[#1E2D38] pb-2">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs uppercase text-[#8A99A8] tracking-wider font-semibold">
                Security Alert Queue
              </span>
            </div>
            <Link
              href="/app/alerts"
              className="text-xs font-mono text-[#83CFE0] hover:underline flex items-center gap-1"
            >
              <span>View all ({alerts.length})</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="space-y-2.5">
            {loading ? (
              <div className="border border-[#1E2D38] bg-[#101923] p-10 text-center text-[#6B7A85] font-mono text-xs rounded-sm">
                Querying FalkorDB alert nodes...
              </div>
            ) : alerts.length === 0 ? (
              <div className="border border-[#1E2D38] bg-[#101923] p-10 text-center text-[#6B7A85] font-mono text-xs rounded-sm">
                No active security alerts pending triage.
              </div>
            ) : (
              alerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`border border-[#1E2D38] border-l-4 ${
                    alert.severity === 'critical'
                      ? 'border-l-[#DC666B]'
                      : alert.severity === 'high'
                      ? 'border-l-[#C68A69]'
                      : 'border-l-[#D8C99A]'
                  } bg-[#101923] p-4 rounded-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-r-[#344451] hover:border-y-[#344451] transition-all`}
                >
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`badge-tag ${
                          alert.severity === 'critical'
                            ? 'badge-critical'
                            : alert.severity === 'high'
                            ? 'badge-high'
                            : 'badge-medium'
                        }`}
                      >
                        {alert.severity}
                      </span>
                      <span className="font-mono text-xs text-[#83CFE0] font-semibold">{alert.id}</span>
                      {alert.source_event_id && (
                        <span className="font-mono text-[11px] text-[#6B7A85]">
                          Trigger: {alert.source_event_id}
                        </span>
                      )}
                    </div>
                    <h3 className="font-heading font-semibold text-sm text-[#F3F4F0] truncate">
                      {alert.title}
                    </h3>
                    {alert.description && (
                      <p className="text-xs text-[#D6E0E5] font-body line-clamp-1">
                        {alert.description}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-center flex-shrink-0">
                    <button
                      onClick={() => router.push(`/app/investigations?alert=${alert.id}`)}
                      className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
                    >
                      <Zap className="w-3 h-3" />
                      <span>Investigate</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right: Active Investigations & Topology Cluster Breakdown (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Recent Investigations Feed */}
          <div className="space-y-3.5">
            <div className="flex items-center justify-between border-b border-[#1E2D38] pb-2">
              <div className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-[#83CFE0]" />
                <h2 className="font-heading font-semibold text-xs uppercase tracking-wider text-[#8A99A8]">
                  Autonomous Pipeline
                </h2>
              </div>
              <Link href="/app/investigations" className="text-xs font-mono text-[#83CFE0] hover:underline flex items-center gap-1">
                <span>View all ({investigations.length})</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            <div className="space-y-2.5">
              {investigations.length === 0 ? (
                <div className="border border-[#1E2D38] bg-[#101923] p-8 text-center text-[#6B7A85] font-mono text-xs rounded-sm">
                  No investigations executed yet.
                </div>
              ) : (
                investigations.slice(0, 4).map((inv) => (
                  <Link
                    key={inv.id}
                    href={`/app/investigations/${inv.id}`}
                    className="border border-[#1E2D38] bg-[#101923] p-3.5 rounded-sm block hover:border-[#344451] transition-all space-y-2 group shadow-sm"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs text-[#83CFE0] font-semibold">{inv.id}</span>
                      <span
                        className={`badge-tag ${
                          inv.status === 'completed'
                            ? 'badge-low'
                            : 'badge-high'
                        }`}
                      >
                        {inv.status}
                      </span>
                    </div>
                    <p className="text-xs text-[#F3F4F0] font-heading font-medium truncate group-hover:text-[#83CFE0] transition-colors">
                      {inv.report?.summary || inv.description || `Target Alert: ${inv.alert_id}`}
                    </p>
                    <div className="flex items-center justify-between text-[11px] font-mono text-[#6B7A85] pt-0.5">
                      <span>Target: {inv.alert_id}</span>
                      {inv.outcome ? (
                        <span className="text-[#D8C99A] capitalize">{inv.outcome.replace('_', ' ')}</span>
                      ) : (
                        <span className="text-[#8A99A8]">Pending Decision</span>
                      )}
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>

          {/* FalkorDB Knowledge Graph Schema Summary */}
          <div className="border border-[#1E2D38] bg-[#101923] p-4 rounded-sm space-y-3 font-mono text-xs shadow-sm">
            <div className="flex items-center justify-between border-b border-[#1E2D38] pb-2 text-[#8A99A8]">
              <span className="text-[10px] uppercase tracking-wider font-semibold">GRAPH TOPOLOGY ENTITIES</span>
              <span className="text-[#83CFE0]">{totalNodes} Total Nodes</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              {Object.entries(nodeCounts)
                .filter(([k]) => k !== 'total_relationships')
                .map(([label, count]) => (
                  <div key={label} className="bg-[#070C13] p-2.5 rounded-sm border border-[#1E2D38] flex items-center justify-between">
                    <span className="text-[#8A99A8]">{label}:</span>
                    <span className="text-[#F3F4F0] font-semibold">{String(count)}</span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
