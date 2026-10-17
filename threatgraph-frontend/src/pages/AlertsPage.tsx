import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import type { Alert } from '../types';
import {
  Search, Filter, ShieldAlert,
  Clock, RefreshCw, Zap, Globe,
  AlertTriangle, Shield, Radio
} from 'lucide-react';

export function AlertsPage() {
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadAlerts();
  }, []);

  async function loadAlerts() {
    try {
      setLoading(true);
      const res = await api.getAlerts();
      setAlerts(res.alerts || []);
    } finally {
      setLoading(false);
    }
  }

  const criticalCount = alerts.filter(a => a.severity === 'critical').length;
  const highCount = alerts.filter(a => a.severity === 'high').length;
  const mediumCount = alerts.filter(a => a.severity === 'medium' || a.severity === 'low').length;

  const filteredAlerts = alerts.filter((alert) => {
    const matchesSeverity = severityFilter === 'all' || alert.severity === severityFilter;
    const matchesSearch =
      alert.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      alert.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (alert.description && alert.description.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesSeverity && matchesSearch;
  });

  return (
    <div className="space-y-6 w-full max-w-[1780px] mx-auto pb-14">
      {/* ── Top Header ────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#1E2D38]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-[#DC666B] animate-pulse" />
            <span className="text-[11px] font-mono uppercase tracking-widest text-[#DC666B]">
              Real-time Telemetry Ingestion
            </span>
            <span className="text-[#344451]">|</span>
            <span className="text-[11px] font-mono text-[#8A99A8]">Connected Graph Signals</span>
          </div>
          <h1 className="font-heading font-bold text-2xl lg:text-3xl text-[#F3F4F0]">
            Security Alert Queue
          </h1>
          <p className="text-[#8A99A8] text-xs font-mono mt-1">
            Ingested threat detections correlated across FalkorDB knowledge graph topology.
          </p>
        </div>

        <button
          onClick={loadAlerts}
          disabled={loading}
          className="btn-secondary text-xs py-2 px-3.5 flex items-center gap-2 self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#83CFE0]' : ''}`} />
          <span>Refresh Feed</span>
        </button>
      </div>

      {/* ── Threat Telemetry Strip ─────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <div className="bg-[#101923] border border-[#1E2D38] p-3.5 rounded-sm space-y-1">
          <div className="flex items-center justify-between text-xs font-mono text-[#8A99A8]">
            <span>TOTAL SIGNALS</span>
            <Radio className="w-3.5 h-3.5 text-[#83CFE0]" />
          </div>
          <div className="font-mono text-2xl font-bold text-[#F3F4F0]">
            {loading ? '--' : alerts.length}
          </div>
          <p className="text-[11px] text-[#6B7A85] font-mono">Continuous FalkorDB ingest</p>
        </div>

        <div className="bg-[#101923] border border-[#1E2D38] p-3.5 rounded-sm space-y-1">
          <div className="flex items-center justify-between text-xs font-mono text-[#8A99A8]">
            <span>CRITICAL SEVERITY</span>
            <ShieldAlert className="w-3.5 h-3.5 text-[#DC666B]" />
          </div>
          <div className="font-mono text-2xl font-bold text-[#DC666B]">
            {loading ? '--' : criticalCount}
          </div>
          <p className="text-[11px] text-[#DC666B]/80 font-mono">Immediate agent triage</p>
        </div>

        <div className="bg-[#101923] border border-[#1E2D38] p-3.5 rounded-sm space-y-1">
          <div className="flex items-center justify-between text-xs font-mono text-[#8A99A8]">
            <span>HIGH SEVERITY</span>
            <AlertTriangle className="w-3.5 h-3.5 text-[#C68A69]" />
          </div>
          <div className="font-mono text-2xl font-bold text-[#C68A69]">
            {loading ? '--' : highCount}
          </div>
          <p className="text-[11px] text-[#8A99A8] font-mono">Privilege &amp; C2 anomalies</p>
        </div>

        <div className="bg-[#101923] border border-[#1E2D38] p-3.5 rounded-sm space-y-1">
          <div className="flex items-center justify-between text-xs font-mono text-[#8A99A8]">
            <span>MEDIUM / LOW</span>
            <Shield className="w-3.5 h-3.5 text-[#D8C99A]" />
          </div>
          <div className="font-mono text-2xl font-bold text-[#D8C99A]">
            {loading ? '--' : mediumCount}
          </div>
          <p className="text-[11px] text-[#8A99A8] font-mono">Correlated reconnaissance</p>
        </div>
      </div>

      {/* ── Filter and Search Bar ─────────────────────────────────── */}
      <div className="border border-[#1E2D38] bg-[#101923] p-3.5 rounded-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3.5 shadow-sm">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[#6B7A85] absolute left-3 top-2.5 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search alerts by title, canonical ID, or trigger pattern..."
            className="w-full bg-[#070C13] border border-[#1E2D38] rounded-sm pl-9 pr-3 py-1.5 text-xs text-[#F3F4F0] font-mono placeholder-[#6B7A85] focus:outline-none focus:border-[#83CFE0] transition-colors"
          />
        </div>

        <div className="flex items-center gap-1.5 font-mono text-xs flex-wrap">
          <Filter className="w-3.5 h-3.5 text-[#6B7A85] mr-1" />
          <span className="text-[#8A99A8]">Filter:</span>
          {[
            { id: 'all', label: 'All', count: alerts.length },
            { id: 'critical', label: 'Critical', count: criticalCount },
            { id: 'high', label: 'High', count: highCount },
            { id: 'medium', label: 'Medium', count: mediumCount },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setSeverityFilter(item.id)}
              className={`px-2.5 py-1 rounded-sm text-xs capitalize transition-all flex items-center gap-1.5 ${
                severityFilter === item.id
                  ? 'bg-[#83CFE0]/15 text-[#83CFE0] border border-[#83CFE0]/40 font-semibold'
                  : 'text-[#8A99A8] hover:text-[#F3F4F0] hover:bg-[#1A2732] border border-transparent'
              }`}
            >
              <span>{item.label}</span>
              <span className="text-[10px] px-1 py-0.2 rounded bg-[#070C13]/60 opacity-80">
                {item.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Alerts Table / Dossier Cards ──────────────────────────── */}
      {loading ? (
        <div className="border border-[#1E2D38] bg-[#101923] p-16 text-center text-[#8A99A8] text-xs font-mono rounded-sm space-y-3">
          <div className="w-6 h-6 border-2 border-[#83CFE0] border-t-transparent rounded-full animate-spin mx-auto" />
          <p>Querying FalkorDB graph alert node projections...</p>
        </div>
      ) : filteredAlerts.length === 0 ? (
        <div className="border border-[#1E2D38] bg-[#101923] p-16 text-center space-y-3 rounded-sm">
          <ShieldAlert className="w-8 h-8 text-[#6B7A85] mx-auto opacity-70" />
          <h3 className="font-heading font-semibold text-[#F3F4F0] text-base">No Matching Alert Vectors</h3>
          <p className="text-[#8A99A8] text-xs font-mono">
            All telemetry criteria resolved or filtered out. Try resetting severity filters.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredAlerts.map((alert) => {
            const isCritical = alert.severity === 'critical';
            const isHigh = alert.severity === 'high';
            const accentBorderColor = isCritical 
              ? 'border-l-[#DC666B]' 
              : isHigh 
              ? 'border-l-[#C68A69]' 
              : 'border-l-[#D8C99A]';

            return (
              <div
                key={alert.id}
                className={`border border-[#1E2D38] border-l-4 ${accentBorderColor} bg-[#101923] p-4 lg:p-5 rounded-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:border-r-[#344451] hover:border-y-[#344451] transition-all shadow-sm`}
              >
                <div className="space-y-2 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span
                      className={`badge-tag ${
                        isCritical
                          ? 'badge-critical'
                          : isHigh
                          ? 'badge-high'
                          : 'badge-medium'
                      }`}
                    >
                      {alert.severity}
                    </span>
                    <span className="text-xs font-mono text-[#83CFE0] font-semibold tracking-wide">
                      {alert.id}
                    </span>
                    {alert.source_event_id && (
                      <span className="text-[11px] font-mono text-[#8A99A8] bg-[#070C13] px-2 py-0.5 rounded border border-[#1E2D38]">
                        Source: <span className="text-[#F3F4F0] font-medium">{alert.source_event_id}</span>
                      </span>
                    )}
                    <span className="text-[11px] font-mono text-[#6B7A85] flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(alert.timestamp).toLocaleString()}
                    </span>
                  </div>

                  <h3 className="font-heading font-bold text-base text-[#F3F4F0]">
                    {alert.title}
                  </h3>

                  {alert.description && (
                    <p className="text-xs text-[#D6E0E5] font-body leading-relaxed max-w-4xl">
                      {alert.description}
                    </p>
                  )}
                </div>

                {/* Tactical Actions */}
                <div className="flex items-center gap-2.5 self-start lg:self-center flex-shrink-0 pt-2 lg:pt-0">
                  <button
                    onClick={() => navigate('/app/graph')}
                    className="btn-secondary text-xs py-2 px-3 flex items-center gap-1.5 whitespace-nowrap"
                    title="Examine neighborhood graph in FalkorDB Navigator"
                  >
                    <Globe className="w-3.5 h-3.5 text-[#83CFE0]" />
                    <span>View Graph</span>
                  </button>
                  <button
                    onClick={() => navigate(`/app/investigations?alert=${alert.id}`)}
                    className="btn-primary text-xs py-2 px-4 flex items-center gap-1.5 whitespace-nowrap"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    <span>Launch AI Triage</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
