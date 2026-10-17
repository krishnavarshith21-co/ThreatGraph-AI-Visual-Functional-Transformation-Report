import { useState } from 'react';
import {
  Clock, CheckCircle2, GitBranch, ChevronRight
} from 'lucide-react';

type DossierCategory = 'ALL' | 'FACTS' | 'EVIDENCE' | 'CONTRADICTIONS' | 'GAPS' | 'ACTIONS';

interface DossierRecord {
  id: string;
  category: 'FACTS' | 'EVIDENCE' | 'CONTRADICTIONS' | 'GAPS' | 'ACTIONS';
  categoryLabel: string;
  title: string;
  timestamp: string;
  source: string;
  statusBadge: string;
  confidence: string;
  summary: string;
  technicalDetails: Record<string, string>;
  graphPivot: string;
  associatedStage: string;
  contradictionNote: string;
  accent: string;
}

const DOSSIER_RECORDS: DossierRecord[] = [
  {
    id: 'DOSSIER-001',
    category: 'FACTS',
    categoryLabel: 'Observed Telemetry Fact',
    title: 'Adversary Initiated TLS Handshake from Known TOR Exit Node',
    timestamp: '2026-03-24T08:14:02.148Z',
    source: 'Edge Firewall Flow #FW-88192 (Palo Alto PA-5250)',
    statusBadge: 'VERIFIED TELEMETRY FACT',
    confidence: '100% Deterministic Fact',
    summary: 'Direct TCP connection established on port 443 from external IP 185.220.101.42 into perimeter NAT gateway. Session established with Marcus Chen’s assigned workstation.',
    technicalDetails: {
      'Source IP / ASN': '185.220.101.42 (AS208294 - Tor Exit Relay)',
      'Destination Host': 'LAPTOP-MCHEN (10.0.1.45)',
      'Protocol / Port': 'TCP / 443 (TLS 1.3)',
      'Total Egress Payload': '1,420 bytes negotiated',
    },
    graphPivot: '(ip-c2-tor)-[:CONNECTED_TO]->(dev-laptop-mchen)',
    associatedStage: 'Stage 01: Initial Ingress',
    contradictionNote: 'No sanctioned external VPN or remote maintenance session matches this IP.',
    accent: '#DC666B',
  },
  {
    id: 'DOSSIER-002',
    category: 'FACTS',
    categoryLabel: 'Observed Telemetry Fact',
    title: 'procdump.exe Spawned with Memory Read Handle against lsass.exe',
    timestamp: '2026-03-24T08:22:15.891Z',
    source: 'CrowdStrike Falcon Sensor (LAPTOP-MCHEN, Agent v7.14)',
    statusBadge: 'VERIFIED TELEMETRY FACT',
    confidence: '100% Deterministic Fact',
    summary: 'Procdump utility executed with administrative token to dump Local Security Authority Subsystem Service (LSASS) memory to C:\\Temp\\lsass.dmp.',
    technicalDetails: {
      'Command Line': 'procdump.exe -accepteula -ma lsass.exe C:\\Temp\\lsass.dmp',
      'Target Process': 'lsass.exe (PID: 724)',
      'Parent Process': 'powershell.exe (PID: 4180)',
      'Granted Access Mask': '0x1FFFFF (PROCESS_ALL_ACCESS)',
    },
    graphPivot: '(evt-lsass-dump)-[:TARGETS]->(proc-lsass)',
    associatedStage: 'Stage 02: LSASS Memory Dump',
    contradictionNote: 'Engineering troubleshooting policy explicitly restricts procdump usage on domain workstations.',
    accent: '#DC666B',
  },
  {
    id: 'DOSSIER-003',
    category: 'EVIDENCE',
    categoryLabel: 'Cryptographic Supporting Evidence',
    title: 'Binary Hash & Kerberos Ticket Extraction Provenance',
    timestamp: '2026-03-24T08:24:30.002Z',
    source: 'Windows Sysmon Event ID 1 (LAPTOP-MCHEN)',
    statusBadge: 'CRYPTOGRAPHIC EVIDENCE ANCHOR',
    confidence: 'Cryptographically Anchored Evidence',
    summary: 'The execution artifact is verified through cryptographic SHA-256 matching. Extracted credentials mapped directly to service principal admin-service.',
    technicalDetails: {
      'Binary SHA-256': 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      'Extracted Ticket ID': 'TGT-Kerberos-admin-service (SPN: cifs/SRV-ADMIN-01)',
      'Ticket Validity Period': '2026-03-24T08:24:00Z to 2026-03-24T18:24:00Z',
      'Kerberos Encryption': 'AES256-CTS-HMAC-SHA1-96',
    },
    graphPivot: '(usr-admin-svc)-[:POSSESSES_TGT]->(tgt-admin)',
    associatedStage: 'Stage 02: Credential Harvest',
    contradictionNote: 'Ticket request originated outside normal service account authentication hours.',
    accent: '#38BDF8',
  },
  {
    id: 'DOSSIER-004',
    category: 'CONTRADICTIONS',
    categoryLabel: 'Contradiction Audit & False Positive Elimination',
    title: 'Verification Against Scheduled Engineering Maintenance Baselines',
    timestamp: '2026-03-24T08:37:11.412Z',
    source: 'Jira Service Management + Active Directory Change Log',
    statusBadge: 'CONTRADICTION AUDITED: NEGATIVE (MALICIOUS)',
    confidence: 'Audited & Confirmed Malicious',
    summary: 'Autonomous agent cross-referenced the RDP session into SRV-ADMIN-01 against scheduled maintenance windows. No change ticket or approved maintenance matched this timestamp.',
    technicalDetails: {
      'Audit Rule Checked': 'CheckSanctionedChangeWindow(host=SRV-ADMIN-01, time=08:35 UTC)',
      'Scheduled Crons Found': 'Daily Backup Cron (02:00 UTC) — 6.5 hours out of window',
      'Approval Ticket Status': 'NO CHANGE TICKET FILED',
      'Conclusion': 'Activity confirmed adversarial; not operational maintenance',
    },
    graphPivot: '(srv-admin-01)-[:CHECKED_AGAINST]->(policy-maintenance)',
    associatedStage: 'Stage 03: Lateral RDP to Bastion',
    contradictionNote: 'Definitively disproves operational false alarm hypothesis.',
    accent: '#C68A69',
  },
  {
    id: 'DOSSIER-005',
    category: 'GAPS',
    categoryLabel: 'Documented Telemetry Gap',
    title: 'Workstation Staging Directory Pruned Prior to Forensic Acquisition',
    timestamp: '2026-03-24T08:45:00.000Z',
    source: 'Forensic Disk Agent (LAPTOP-MCHEN)',
    statusBadge: 'EXPLICIT INFORMATION GAP',
    confidence: 'Documented Uncertainty (Zero Hallucination)',
    summary: 'Adversary issued rimraf command on C:\\Temp\\lsass.dmp. File was unlinked from MFT before raw disk capture was finalized. Agent explicitly documents this uncertainty.',
    technicalDetails: {
      'Missing Artifact': 'C:\\Temp\\lsass.dmp (Physical file contents)',
      'Available Metadata': 'USN Journal records confirming allocation and deletion at 08:23:10 UTC',
      'Agent Handling': 'Uncertainty preserved in report; conclusion derived from Sysmon logs instead',
    },
    graphPivot: '(dev-laptop-mchen)-[:HAS_TELEMETRY_GAP]->(gap-mft)',
    associatedStage: 'Stage 02: Evidence Preservation',
    contradictionNote: 'Agent preserves uncertainty rather than hallucinating binary payload content.',
    accent: '#D9C18A',
  },
  {
    id: 'ACTIONS',
    category: 'ACTIONS',
    categoryLabel: 'Recommended Containment Runbook',
    title: 'Prioritized Containment & Blast-Radius Remediation Protocol',
    timestamp: '2026-03-24T08:48:30.000Z',
    source: 'ThreatGraph AI Autonomous Response Synthesizer',
    statusBadge: 'ACTIONABLE RUNBOOK',
    confidence: 'Actionable Containment Protocol',
    summary: 'Three discrete containment actions ordered by blast radius mitigation. Designed for immediate execution via integrated SOAR API or human approval gate.',
    technicalDetails: {
      'Action 1 (Immediate)': 'Revoke Kerberos TGT and reset credentials for admin-service in Active Directory',
      'Action 2 (Network)': 'Push perimeter firewall block rule for external IP 91.219.236.18 and 185.220.101.42',
      'Action 3 (Host)': 'Isolate LAPTOP-MCHEN from enterprise network via CrowdStrike API containment',
    },
    graphPivot: '(res-containment)-[:TARGETS_ALL]->(blast-radius-cluster)',
    associatedStage: 'Stage 05: Blast-Radius Containment',
    contradictionNote: 'Containment actions preserve forensic acquisition states for legal audit.',
    accent: '#DC666B',
  },
];

export function ForensicDimensionsSection() {
  const [activeCategory, setActiveCategory] = useState<DossierCategory>('ALL');
  const [selectedRecordId, setSelectedRecordId] = useState<string>('DOSSIER-001');

  const filteredRecords = DOSSIER_RECORDS.filter((r) => {
    if (activeCategory === 'ALL') return true;
    return r.category === activeCategory;
  });

  const selectedRecord =
    filteredRecords.find((r) => r.id === selectedRecordId) ||
    filteredRecords[0] ||
    DOSSIER_RECORDS[0];

  return (
    <section id="evidence" className="py-20 lg:py-28 bg-[#070B14] relative border-t border-[#1E2D38] overflow-hidden scroll-mt-16">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 right-1/4 w-[550px] h-[550px] bg-[#DC666B]/[0.015] rounded-full blur-[180px] pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-[500px] h-[500px] bg-[#38BDF8]/[0.02] rounded-full blur-[170px] pointer-events-none" />

      <div className="max-w-[1780px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header */}
        <div className="max-w-3xl mb-12 lg:mb-16">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-[11px] font-mono uppercase tracking-[0.2em] text-[#38BDF8] font-semibold flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#38BDF8] animate-pulse" />
              Chapter 04 / Forensic Evidence Dossier
            </span>
            <div className="w-12 h-[1px] bg-[#1E2D38]" />
          </div>
          <h2 className="font-heading text-3xl sm:text-4xl lg:text-[2.75rem] font-bold text-[#F3F4F0] leading-[1.12] mb-5 tracking-tight">
            Evidence-grounded reasoning.<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#38BDF8] via-[#818CF8] to-[#DC666B]">
              Facts, contradictions, and containment.
            </span>
          </h2>
          <p className="text-[#94A3B8] text-sm sm:text-base leading-relaxed font-body">
            Every investigation finding is strictly categorized into observed facts, cryptographic evidence anchors, contradictory benign signals, documented telemetry gaps, and prioritized containment actions. The agent never claims certainty without verifiable evidence.
          </p>
        </div>

        {/* Dossier Filter Bar */}
        <div className="flex flex-wrap items-center gap-2 mb-8 font-mono text-xs">
          {[
            { key: 'ALL' as DossierCategory, label: 'All Records', count: 6 },
            { key: 'FACTS' as DossierCategory, label: 'Observed Facts', count: 2 },
            { key: 'EVIDENCE' as DossierCategory, label: 'Supporting Evidence', count: 1 },
            { key: 'CONTRADICTIONS' as DossierCategory, label: 'Contradiction Audits', count: 1 },
            { key: 'GAPS' as DossierCategory, label: 'Telemetry Gaps', count: 1 },
            { key: 'ACTIONS' as DossierCategory, label: 'Containment Runbook', count: 1 },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => {
                setActiveCategory(tab.key);
                const matched = tab.key === 'ALL' ? DOSSIER_RECORDS : DOSSIER_RECORDS.filter(r => r.category === tab.key);
                if (matched.length > 0 && !matched.some(r => r.id === selectedRecordId)) {
                  setSelectedRecordId(matched[0].id);
                }
              }}
              className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-2 ${
                activeCategory === tab.key
                  ? 'bg-[#122338] text-[#38BDF8] border border-[#38BDF8]/50 font-semibold shadow-[0_0_12px_rgba(56,189,248,0.15)]'
                  : 'bg-[#0B1525]/70 text-[#64748B] border border-[#1E2D38] hover:text-[#94A3B8] hover:border-[#1E2D38]/90'
              }`}
            >
              <span>{tab.label}</span>
              <span className="text-[10px] opacity-60">({tab.count})</span>
            </button>
          ))}
        </div>

        {/* Forensic Workspace: Split Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left Column: Dossier Findings Rail (5 cols on lg) */}
          <div className="lg:col-span-5 space-y-3.5">
            {filteredRecords.map((record) => {
              const isSelected = selectedRecord.id === record.id;
              return (
                <div
                  key={record.id}
                  onClick={() => setSelectedRecordId(record.id)}
                  className={`p-4.5 rounded-xl border transition-all cursor-pointer font-mono space-y-2.5 relative overflow-hidden shadow-md ${
                    isSelected
                      ? 'bg-[#102034] border-[#38BDF8] shadow-[0_0_20px_rgba(56,189,248,0.15)]'
                      : 'bg-[#0A1320] border-[#1E2D38] hover:border-[#1E2D38]/90 hover:bg-[#0E1A2C]'
                  }`}
                >
                  {/* Left accent marker notch */}
                  <div
                    className="absolute top-0 bottom-0 left-0 w-[4px]"
                    style={{ backgroundColor: record.accent }}
                  />

                  <div className="flex items-center justify-between text-[10px] pl-1.5">
                    <span className="font-semibold tracking-wider uppercase" style={{ color: record.accent }}>
                      {record.categoryLabel}
                    </span>
                    <span className="text-[#64748B]">{record.id}</span>
                  </div>

                  <div className="font-heading font-semibold text-xs sm:text-sm text-[#F3F4F0] pl-1.5 leading-snug">
                    {record.title}
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-[#64748B] pt-2 pl-1.5 border-t border-[#1E2D38]/60">
                    <span className="flex items-center gap-1.5 truncate max-w-[220px]">
                      <Clock className="w-3 h-3 text-[#64748B] flex-shrink-0" />
                      {record.timestamp}
                    </span>
                    <span className="text-[#38BDF8] font-medium">{record.confidence}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right Column: Deep-Dive Forensic Inspection Ledger (7 cols on lg) */}
          <div className="lg:col-span-7 bg-[#0A1320] border border-[#1E2D38] rounded-xl p-6 sm:p-7 space-y-6 font-mono text-xs shadow-2xl">
            
            {/* Header */}
            <div className="space-y-3.5 pb-4 border-b border-[#1E2D38]">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span
                  className="text-[10px] font-bold px-2.5 py-0.5 rounded border"
                  style={{
                    backgroundColor: `${selectedRecord.accent}15`,
                    borderColor: `${selectedRecord.accent}40`,
                    color: selectedRecord.accent,
                  }}
                >
                  {selectedRecord.statusBadge}
                </span>
                <span className="text-[11px] text-[#64748B]">
                  Record: <strong className="text-white">{selectedRecord.id}</strong>
                </span>
              </div>

              <h3 className="font-heading text-lg sm:text-xl font-bold text-[#F3F4F0] leading-snug">
                {selectedRecord.title}
              </h3>

              <div className="flex flex-wrap items-center gap-4 text-[11px] text-[#64748B]">
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-[#38BDF8]" />
                  <span>{selectedRecord.timestamp}</span>
                </div>
                <span>&bull;</span>
                <div className="truncate text-[#94A3B8]">
                  Source: {selectedRecord.source}
                </div>
              </div>
            </div>

            {/* Narrative Summary */}
            <div className="space-y-2">
              <span className="text-[10px] uppercase font-bold text-[#64748B] tracking-wider block">
                Forensic Finding Synthesis
              </span>
              <p className="text-sm text-[#94A3B8] font-body leading-relaxed bg-[#070D16] p-4 rounded-lg border border-[#1E2D38] shadow-inner">
                {selectedRecord.summary}
              </p>
            </div>

            {/* Structured Telemetry Anchors */}
            <div className="space-y-2">
              <span className="text-[10px] uppercase font-bold text-[#64748B] tracking-wider block">
                Immutable Telemetry &amp; System Parameters
              </span>
              <div className="bg-[#070D16] rounded-lg border border-[#1E2D38] divide-y divide-[#1E2D38]/70 text-[11px] shadow-inner">
                {Object.entries(selectedRecord.technicalDetails).map(([key, val]) => (
                  <div key={key} className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <span className="text-[#64748B] font-medium">{key}:</span>
                    <span className="text-[#38BDF8] font-mono break-all text-left sm:text-right">{val}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Contradiction & Uncertainty Audit */}
            <div className="space-y-2">
              <span className="text-[10px] uppercase font-bold text-[#64748B] tracking-wider block">
                Contradiction Audit &amp; Uncertainty Analysis
              </span>
              <div className="p-3 rounded-lg bg-[#0F1E32] border border-[#1E2D38] text-[11px] text-[#D9C18A] flex items-start gap-2 shadow-sm">
                <CheckCircle2 className="w-4 h-4 text-[#38BDF8] flex-shrink-0 mt-0.5" />
                <span>{selectedRecord.contradictionNote}</span>
              </div>
            </div>

            {/* Graph Pivot Relationship */}
            <div className="pt-3.5 border-t border-[#1E2D38] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-[11px]">
              <div className="flex items-center gap-2 text-[#64748B]">
                <GitBranch className="w-4 h-4 text-[#38BDF8] flex-shrink-0" />
                <span className="truncate">Topology Edge: <strong className="text-[#F3F4F0]">{selectedRecord.graphPivot}</strong></span>
              </div>
              <a
                href="#topology"
                className="text-[#38BDF8] hover:text-white flex items-center gap-1.5 font-semibold transition-colors self-start sm:self-auto cursor-pointer"
              >
                <span>Locate in 3D Topology</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
