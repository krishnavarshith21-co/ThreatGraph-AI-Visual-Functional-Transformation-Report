'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import type { InvestigationReport } from '@/lib/types';
import {
  FileText, Download, Copy, Check
} from 'lucide-react';

export default function ReportsPage() {
  const [reports, setReports] = useState<any[]>([]);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [reportDetail, setReportDetail] = useState<InvestigationReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function loadReports() {
      try {
        setLoading(true);
        const res = await api.getReports();
        const list = res.reports || [];
        if (mounted) {
          setReports(list);
          if (list.length > 0) {
            setSelectedReportId(list[0].investigation_id);
          }
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }
    loadReports();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!selectedReportId) return;
    let mounted = true;
    async function loadDetail() {
      try {
        const detail = await api.getReport(selectedReportId!);
        if (mounted) setReportDetail(detail);
      } catch {
        if (mounted) setReportDetail(null);
      }
    }
    loadDetail();
    return () => {
      mounted = false;
    };
  }, [selectedReportId]);

  const handleCopy = () => {
    if (!reportDetail) return;
    const text = reportDetail.full_report_text || JSON.stringify(reportDetail, null, 2);
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = (format: 'markdown' | 'json') => {
    if (!reportDetail) return;
    const content =
      format === 'json'
        ? JSON.stringify(reportDetail, null, 2)
        : reportDetail.full_report_text || `# Investigation Report ${reportDetail.investigation_id}\n\n${reportDetail.summary}`;
    const mime = format === 'json' ? 'application/json' : 'text/markdown';
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `threatgraph-${reportDetail.investigation_id}.${format === 'json' ? 'json' : 'md'}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 w-full max-w-[1780px] mx-auto pb-14">
      {/* ── Top Header ────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#1E2D38]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-[#83CFE0]" />
            <span className="text-[11px] font-mono uppercase tracking-widest text-[#83CFE0]">
              Audit Dossier Ledger
            </span>
            <span className="text-[#344451]">|</span>
            <span className="text-[11px] font-mono text-[#8A99A8]">Regulatory &amp; Executive Export</span>
          </div>
          <h1 className="font-heading font-bold text-2xl lg:text-3xl text-[#F3F4F0]">Investigation Reports</h1>
          <p className="text-[#8A99A8] text-xs font-mono mt-1">
            Evidence-grounded audit dossiers ready for export, compliance verification, and executive briefings.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="border border-[#1E2D38] bg-[#101923] p-16 text-center text-[#8A99A8] text-xs font-mono rounded-sm">
          <div className="w-6 h-6 border-2 border-[#83CFE0] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          Loading investigation reports...
        </div>
      ) : reports.length === 0 ? (
        <div className="border border-[#1E2D38] bg-[#101923] p-16 text-center space-y-3 rounded-sm">
          <FileText className="w-8 h-8 text-[#6B7A85] mx-auto opacity-70" />
          <h3 className="font-heading font-semibold text-[#F3F4F0] text-base">No Completed Reports Available</h3>
          <p className="text-[#8A99A8] text-xs font-mono max-w-md mx-auto">
            Completed investigation dossiers generate formal reports automatically. Start an investigation to generate a report.
          </p>
        </div>
      ) : (
        <div className="grid lg:grid-cols-12 gap-6 items-start">
          {/* Reports Sidebar List */}
          <div className="lg:col-span-4 space-y-2.5 min-w-0">
            <h2 className="text-xs font-mono font-semibold text-[#8A99A8] uppercase tracking-wider mb-2">
              Available Dossiers ({reports.length})
            </h2>
            <div className="space-y-2">
              {reports.map((rep) => (
                <button
                  key={rep.investigation_id}
                  onClick={() => setSelectedReportId(rep.investigation_id)}
                  className={`w-full text-left p-3.5 rounded-sm border transition-all space-y-1.5 cursor-pointer ${
                    selectedReportId === rep.investigation_id
                      ? 'bg-[#1A2732] border-[#83CFE0]/60 shadow-sm'
                      : 'bg-[#101923] border-[#1E2D38] hover:border-[#344451]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-semibold text-[#83CFE0]">
                      {rep.investigation_id}
                    </span>
                    <span className="text-[10px] font-mono text-[#6B7A85]">
                      {new Date(rep.completed_at || rep.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-xs text-[#F3F4F0] font-heading line-clamp-2">
                    {rep.summary || `Investigation on ${rep.alert_id}`}
                  </p>
                  <div className="flex items-center justify-between text-[11px] font-mono text-[#8A99A8] pt-1 border-t border-[#1E2D38]/60">
                    <span>Alert: {rep.alert_id}</span>
                    {rep.outcome && (
                      <span className="text-[#D8C99A] capitalize font-semibold">
                        {rep.outcome.replace('_', ' ')}
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Report Viewer Main Panel */}
          <div className="lg:col-span-8 min-w-0">
            {reportDetail ? (
              <div className="border border-[#1E2D38] bg-[#101923] p-6 space-y-6 rounded-sm shadow-md">
                {/* Actions Toolbar */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#1E2D38] pb-4">
                  <div>
                    <span className="font-mono text-xs text-[#83CFE0] font-semibold block">
                      {reportDetail.investigation_id}
                    </span>
                    <h3 className="font-heading font-bold text-lg text-[#F3F4F0]">
                      Incident Briefing Document
                    </h3>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleCopy}
                      className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5 cursor-pointer"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copied ? 'Copied' : 'Copy Text'}</span>
                    </button>
                    <button
                      onClick={() => handleDownload('markdown')}
                      className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5 text-[#83CFE0]" />
                      <span>Markdown</span>
                    </button>
                    <button
                      onClick={() => handleDownload('json')}
                      className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>JSON</span>
                    </button>
                  </div>
                </div>

                {/* Report Content */}
                <div className="space-y-6 text-xs font-mono">
                  {/* Metadata table */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[#070C13] p-3.5 rounded-sm border border-[#1E2D38]">
                    <div>
                      <span className="text-[10px] text-[#6B7A85] uppercase block">Status</span>
                      <span className="text-[#83CFE0] font-semibold uppercase">{reportDetail.status}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-[#6B7A85] uppercase block">Target Alert</span>
                      <span className="text-[#D8C99A] font-semibold">{reportDetail.alert_id}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-[#6B7A85] uppercase block">Created</span>
                      <span className="text-[#F3F4F0]">{new Date(reportDetail.created_at).toLocaleTimeString()}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-[#6B7A85] uppercase block">Agent Steps</span>
                      <span className="text-[#F3F4F0]">{reportDetail.agent_steps?.length || 0} Tools</span>
                    </div>
                  </div>

                  {/* Executive Summary */}
                  <div className="space-y-2">
                    <h4 className="font-heading text-xs font-semibold text-[#8A99A8] uppercase tracking-wider">
                      1. Executive Summary
                    </h4>
                    <p className="text-[#F3F4F0] font-body leading-relaxed bg-[#070C13] p-4 rounded-sm border border-[#1E2D38] text-xs">
                      {reportDetail.summary}
                    </p>
                  </div>

                  {/* Confirmed Observations */}
                  <div className="space-y-2">
                    <h4 className="font-heading text-xs font-semibold text-[#8A99A8] uppercase tracking-wider">
                      2. Confirmed Threat Indicators
                    </h4>
                    <div className="space-y-2">
                      {reportDetail.findings?.map((f, i) => (
                        <div key={i} className="flex items-start gap-2.5 bg-[#070C13] p-3 rounded-sm border border-[#1E2D38] text-[#F3F4F0]">
                          <span className="text-[#83CFE0] font-bold">&bull;</span>
                          <span className="font-body text-xs">{f}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Contradictions */}
                  <div className="space-y-2">
                    <h4 className="font-heading text-xs font-semibold text-[#C68A69] uppercase tracking-wider">
                      3. False Positive / Contradiction Notes
                    </h4>
                    <div className="bg-[#C68A69]/10 border border-[#C68A69]/20 p-3.5 rounded-sm text-[#F3F4F0] font-body text-xs leading-relaxed">
                      {reportDetail.contradictions?.length
                        ? reportDetail.contradictions.join(' ')
                        : 'No conflicting indicators found.'}
                    </div>
                  </div>

                  {/* Recommended Action */}
                  <div className="space-y-2">
                    <h4 className="font-heading text-xs font-semibold text-[#D8C99A] uppercase tracking-wider">
                      4. Containment &amp; Next Steps
                    </h4>
                    <div className="bg-[#070C13] p-4 rounded-sm border border-[#D8C99A]/30 text-[#D8C99A] leading-relaxed whitespace-pre-line text-xs font-mono">
                      {reportDetail.recommended_action}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="border border-[#1E2D38] bg-[#101923] p-16 text-center text-[#6B7A85] text-xs font-mono rounded-sm">
                Select an investigation report from the list to preview details.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
