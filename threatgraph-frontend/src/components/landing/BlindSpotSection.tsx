import { useState } from 'react';
import { Eye, GitBranch, ShieldAlert, CheckCircle2, Terminal, Activity } from 'lucide-react';

interface SiloAlert {
  id: string;
  sensor: string;
  category: 'OBSERVED RECORD' | 'INFERRED HYPOTHESIS' | 'VERIFIED RELATIONSHIP';
  timestamp: string;
  title: string;
  rawPayload: string;
  analystTriage: string;
  accent: string;
}

const SILO_ALERTS: SiloAlert[] = [
  {
    id: 'AL-902',
    sensor: 'PERIMETER FIREWALL',
    category: 'OBSERVED RECORD',
    timestamp: '2026-03-24 08:14:02 UTC',
    title: 'Outbound TLS Handshake to Untrusted CIDR',
    rawPayload: 'dst_ip=185.220.101.42:443 proto=TCP bytes_out=1420',
    analystTriage: 'Queued (Low Severity) — no local process or host mapped',
    accent: '#DC666B',
  },
  {
    id: 'EV-411',
    sensor: 'CROWDSTRIKE EDR',
    category: 'OBSERVED RECORD',
    timestamp: '2026-03-24 08:22:15 UTC',
    title: 'procdump.exe Memory Extraction on lsass.exe',
    rawPayload: 'proc=procdump.exe -ma lsass.exe host=LAPTOP-MCHEN pid=8412',
    analystTriage: 'Isolated Alert — no network session or subsequent auth mapped',
    accent: '#C68A69',
  },
  {
    id: 'ID-108',
    sensor: 'OKTA / ACTIVE DIRECTORY',
    category: 'OBSERVED RECORD',
    timestamp: '2026-03-24 08:35:48 UTC',
    title: 'Service Principal Interactive Login via RDP',
    rawPayload: 'account=admin-service dst_host=SRV-ADMIN-01 logon_type=10 (RDP)',
    analystTriage: 'Routine Admin — valid Kerberos TGT certificate presented',
    accent: '#38BDF8',
  },
  {
    id: 'DL-703',
    sensor: 'POSTGRESQL AUDIT / DLP',
    category: 'OBSERVED RECORD',
    timestamp: '2026-03-24 08:41:09 UTC',
    title: '14,820 Customer PII Rows Read in Single Query',
    rawPayload: 'table=customers_pii query="SELECT * FROM customers" rows=14820',
    analystTriage: 'Normal Export — originated from internal Bastion Jump host IP',
    accent: '#D9C18A',
  },
];

const TRAJECTORY_STAGES = [
  {
    step: '01',
    phase: 'INITIAL INGRESS',
    entity: '185.220.101.42 → Marcus Chen',
    technique: 'MITRE T1566.001 (Spearphishing Attachment)',
    evidence: 'Malformed Word macro spawned PowerShell execution on LAPTOP-MCHEN.',
    status: 'CAUSAL ROOT',
    color: '#DC666B',
    relationship: 'DELIVERED_PAYLOAD_TO',
  },
  {
    step: '02',
    phase: 'CREDENTIAL HARVEST',
    entity: 'LAPTOP-MCHEN → admin-service',
    technique: 'MITRE T1003.001 (LSASS Memory Dump)',
    evidence: 'procdump.exe dumped LSASS; Kerberos tickets extracted into memory.',
    status: 'LATERAL PIVOT',
    color: '#C68A69',
    relationship: 'HARVESTED_TICKET_FOR',
  },
  {
    step: '03',
    phase: 'PRIVILEGE ESCALATION',
    entity: 'admin-service → SRV-ADMIN-01',
    technique: 'MITRE T1021.001 (Remote Desktop Protocol)',
    evidence: 'Interactive RDP session established on port 3389 into primary bastion.',
    status: 'INFRASTRUCTURE ACCESS',
    color: '#38BDF8',
    relationship: 'AUTHENTICATED_VIA_RDP',
  },
  {
    step: '04',
    phase: 'DATA EXFILTRATION',
    entity: 'Customer PII → 91.219.236.18',
    technique: 'MITRE T1048.002 (Encrypted TLS Egress)',
    evidence: '4.2GB bulk database export encrypted with AES-256 and pushed to remote drop.',
    status: 'OBJECTIVE ACHIEVED',
    color: '#DC666B',
    relationship: 'EXFILTRATED_STREAM_TO',
  },
];

export function BlindSpotSection() {
  const [activeMode, setActiveMode] = useState<'silos' | 'graph'>('graph');
  const [selectedTrajectoryStep, setSelectedTrajectoryStep] = useState<number>(0);

  return (
    <section id="challenge" className="py-20 lg:py-28 bg-[#070B14] relative border-t border-[#1E2D38] overflow-hidden scroll-mt-16">
      {/* Background ambient depth */}
      <div className="absolute top-1/4 right-0 w-[550px] h-[550px] bg-[#38BDF8]/[0.025] rounded-full blur-[170px] pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-[450px] h-[450px] bg-[#DC666B]/[0.015] rounded-full blur-[150px] pointer-events-none" />

      <div className="max-w-[1780px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Editorial Section Header */}
        <div className="max-w-3xl mb-12 lg:mb-16">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-[11px] font-mono uppercase tracking-[0.2em] text-[#38BDF8] font-semibold flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#38BDF8] animate-pulse" />
              Chapter 01 / The Correlation Void
            </span>
            <div className="w-12 h-[1px] bg-[#1E2D38]" />
          </div>
          <h2 className="font-heading text-3xl sm:text-4xl lg:text-[2.75rem] font-bold text-[#F3F4F0] leading-[1.12] mb-5 tracking-tight">
            Security signals are connected.<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#38BDF8] via-[#818CF8] to-[#C68A69]">
              Investigations should be too.
            </span>
          </h2>
          <p className="text-[#94A3B8] text-sm sm:text-base leading-relaxed font-body">
            In enterprise perimeters, adversaries never move in isolated alerts. They chain initial access across email, extract identities via memory dumps, hop through internal bastions, and exfiltrate encrypted crown jewels. When SOC tools fragment this telemetry across separate dashboards, the causal attack trajectory remains invisible.
          </p>
        </div>

        {/* Signal Resolution Comparison Studio */}
        <div className="rounded-xl border border-[#1E2D38] bg-[#0A1320] shadow-2xl overflow-hidden mb-16">
          
          {/* Studio HUD Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between px-5 sm:px-7 py-3.5 border-b border-[#1E2D38] gap-3 bg-[#0E1B2C]">
            <div className="flex items-center gap-2.5">
              <Eye className="w-4 h-4 text-[#38BDF8]" />
              <span className="font-heading font-semibold text-xs sm:text-sm text-[#F3F4F0]">
                Telemetry Resolution Laboratory
              </span>
              <span className="text-[10px] font-mono text-[#64748B] hidden md:inline">
                &mdash; Synthetic Incident Scenario #AL-4091
              </span>
            </div>

            {/* Mode Switcher */}
            <div className="flex items-center gap-1 bg-[#070D16] p-1 border border-[#1E2D38] rounded-lg self-start sm:self-auto font-mono text-xs shadow-inner">
              <button
                onClick={() => setActiveMode('silos')}
                className={`px-3.5 py-1.5 rounded-md transition-all cursor-pointer ${
                  activeMode === 'silos'
                    ? 'bg-[#1E2D38] text-[#DC666B] font-semibold border border-[#DC666B]/40 shadow-sm'
                    : 'text-[#64748B] hover:text-[#94A3B8]'
                }`}
              >
                Disconnected Silos
              </button>
              <button
                onClick={() => setActiveMode('graph')}
                className={`px-3.5 py-1.5 rounded-md transition-all cursor-pointer ${
                  activeMode === 'graph'
                    ? 'bg-[#122338] text-[#38BDF8] font-semibold border border-[#38BDF8]/40 shadow-[0_0_12px_rgba(56,189,248,0.2)]'
                    : 'text-[#64748B] hover:text-[#94A3B8]'
                }`}
              >
                FalkorDB Unified Graph
              </button>
            </div>
          </div>

          {/* Interactive Workspace */}
          <div className="p-6 sm:p-8">
            {activeMode === 'silos' ? (
              <div className="space-y-6">
                
                {/* 4 Unlinked Silo Records in Isolated Titanium Pods */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                  {SILO_ALERTS.map((alert) => (
                    <div
                      key={alert.id}
                      className="bg-[#070D16] p-5 rounded-xl border border-[#1E2D38] hover:border-[#DC666B]/50 transition-all flex flex-col justify-between space-y-3.5 relative shadow-md group"
                    >
                      <div
                        className="absolute top-0 left-0 bottom-0 w-[3px] rounded-l"
                        style={{ backgroundColor: alert.accent }}
                      />

                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between text-[10px] font-mono">
                          <span className="font-semibold tracking-wider uppercase" style={{ color: alert.accent }}>
                            {alert.sensor}
                          </span>
                          <span className="text-[#64748B]">{alert.id}</span>
                        </div>

                        <span className="inline-block text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#121B24] text-[#64748B] border border-[#1E2D38]">
                          {alert.category}
                        </span>

                        <div className="font-heading font-semibold text-xs sm:text-[13px] text-[#F3F4F0] leading-snug">
                          {alert.title}
                        </div>

                        <div className="text-[10px] font-mono text-[#64748B] truncate">
                          {alert.timestamp}
                        </div>

                        <div className="bg-[#0A1422] p-2.5 rounded-lg text-[10px] font-mono text-[#38BDF8] break-all border border-[#1E2D38]/80 shadow-inner">
                          {alert.rawPayload}
                        </div>
                      </div>

                      <div className="pt-2.5 border-t border-[#1E2D38] text-[10px] font-mono text-[#DC666B]/90 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#DC666B]" />
                        <span className="truncate">{alert.analystTriage}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Status Quo Risk Diagnostic */}
                <div className="bg-[#DC666B]/10 border border-[#DC666B]/30 p-4 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs font-mono shadow-md">
                  <div className="flex items-center gap-2.5 text-[#DC666B]">
                    <ShieldAlert className="w-4 h-4 flex-shrink-0" />
                    <span>
                      <strong>SOC Failure Mode:</strong> 4 disparate alerts in 4 separate consoles. No tool detects the recursive causality spanning endpoints, credentials, and exfiltration.
                    </span>
                  </div>
                  <span className="text-[10px] uppercase font-bold text-[#DC666B] px-2.5 py-1 rounded bg-[#DC666B]/20 border border-[#DC666B]/40 flex-shrink-0">
                    MTTR: ~6.4 Hours
                  </span>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                
                {/* Unified Causal Graph Trajectory Pipeline with SVG Relationship Nexus */}
                <div className="bg-[#070D16] p-6 rounded-xl border border-[#38BDF8]/40 space-y-6 shadow-2xl relative overflow-hidden">
                  
                  {/* Pipeline Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3.5 border-b border-[#1E2D38]">
                    <div className="flex items-center gap-2 text-[#38BDF8] font-mono text-xs font-semibold">
                      <GitBranch className="w-4 h-4 text-[#38BDF8]" />
                      <span>UNIFIED CAUSAL ATTACK TRAJECTORY (FALKORDB CYPHER)</span>
                    </div>
                    <div className="flex items-center gap-3 text-[11px] font-mono">
                      <span className="text-[#D9C18A] font-medium flex items-center gap-1.5">
                        <Activity className="w-3.5 h-3.5 text-[#D9C18A]" />
                        Traversed in ~1.8ms (Kernel Benchmark)
                      </span>
                      <span className="text-[#64748B]">|</span>
                      <span className="text-[#38BDF8] font-semibold">4 Hops Resolved</span>
                    </div>
                  </div>

                  {/* Connected Step Cards with Illuminated Visual Conduits */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 font-mono relative">
                    {TRAJECTORY_STAGES.map((stage, idx) => {
                      const isSelected = selectedTrajectoryStep === idx;
                      return (
                        <div
                          key={stage.step}
                          onClick={() => setSelectedTrajectoryStep(idx)}
                          className={`p-4 rounded-xl border transition-all cursor-pointer space-y-2.5 relative ${
                            isSelected
                              ? 'bg-[#102034] border-[#38BDF8] shadow-[0_0_20px_rgba(56,189,248,0.2)]'
                              : 'bg-[#0B1525]/80 border-[#1E2D38] hover:border-[#1E2D38]/90'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold" style={{ color: stage.color }}>
                              STEP {stage.step} &bull; {stage.phase}
                            </span>
                            <span className="text-[9px] uppercase px-1.5 py-0.2 rounded bg-[#070D16] text-[#64748B] border border-[#1E2D38]">
                              {stage.status}
                            </span>
                          </div>

                          <div className="text-xs font-semibold text-[#F3F4F0] truncate">
                            {stage.entity}
                          </div>

                          <div className="text-[10px] text-[#38BDF8] truncate flex items-center gap-1">
                            <span className="w-1 h-1 rounded-full bg-[#38BDF8]" />
                            {stage.technique}
                          </div>

                          <p className="text-[11px] text-[#94A3B8] font-sans leading-relaxed">
                            {stage.evidence}
                          </p>

                          <div className="pt-2 border-t border-[#1E2D38]/60 text-[9px] text-[#64748B] flex items-center justify-between">
                            <span className="text-[#D9C18A] font-semibold">{stage.relationship}</span>
                            <span>Hop 0{idx + 1}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* ThreatGraph Resolution Banner */}
                <div className="bg-[#38BDF8]/10 border border-[#38BDF8]/30 p-4 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs font-mono shadow-md">
                  <div className="flex items-center gap-2.5 text-[#38BDF8]">
                    <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                    <span>
                      <strong>Deterministic Proof:</strong> All 4 stages verified into an immutable incident dossier with cryptographic file hashes and UTC-anchored event causality.
                    </span>
                  </div>
                  <span className="text-[10px] uppercase font-bold text-[#070C13] bg-[#38BDF8] px-2.5 py-1 rounded shadow-md flex-shrink-0">
                    MTTR: &lt; 45 Seconds
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Asymmetric Editorial Storytelling: Breakdown of the Problem & The Graph Shift */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start pt-4">
          
          {/* Left Narrative Pillar (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            <div className="flex items-center gap-2.5 text-xs font-mono uppercase text-[#38BDF8] tracking-wider font-semibold">
              <span className="w-2 h-2 rounded-full bg-[#38BDF8] animate-pulse" />
              THE STRUCTURAL IMPASSE IN MODERN SOC ARCHITECTURE
            </div>

            <h3 className="font-heading text-2xl sm:text-3xl font-bold text-[#F3F4F0] leading-tight">
              Relational databases fail at multi-hop lateral pivots. Graph databases excel at them.
            </h3>

            <p className="text-[#94A3B8] text-sm sm:text-[15px] leading-relaxed font-body">
              Legacy SIEMs and security data lakes store telemetry in flat tabular formats (SQL tables, OpenSearch indexes). When an analyst needs to answer: <em>&ldquo;Did the workstation that received the phishing email authenticate to an account that later pivoted to the database jump host?&rdquo;</em>, a relational engine must perform recursive JOINs with exponential latency $O(n^k)$.
            </p>

            <p className="text-[#94A3B8] text-sm sm:text-[15px] leading-relaxed font-body">
              FalkorDB treats identities, endpoints, IP addresses, and database resources as first-class connected graph nodes. Traversing 1 to 4 hops takes <strong>low-latency pointer indirection</strong>, allowing autonomous AI agents to explore lateral pivot paths in real-time.
            </p>

            {/* Architecture Comparison T-Chart */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 font-mono text-xs">
              <div className="p-4 rounded-xl bg-[#0B1525]/80 border border-[#1E2D38] space-y-2">
                <span className="text-[10px] text-[#DC666B] uppercase font-bold tracking-wider block">
                  TRADITIONAL RELATIONAL SIEM
                </span>
                <div className="text-sm font-semibold text-[#F3F4F0]">Recursive Table JOINs</div>
                <div className="text-[#64748B] text-[11px] leading-relaxed">
                  Query latency balloons exponentially with each network hop. 3-hop traversal exceeds 4,500ms or times out.
                </div>
              </div>
              
              <div className="p-4 rounded-xl bg-[#0B1525]/80 border border-[#38BDF8]/50 space-y-2 shadow-[0_0_20px_rgba(56,189,248,0.12)]">
                <span className="text-[10px] text-[#38BDF8] uppercase font-bold tracking-wider block">
                  FALKORDB KNOWLEDGE GRAPH
                </span>
                <div className="text-sm font-semibold text-[#F3F4F0]">Native Graph Pointer Traversal</div>
                <div className="text-[#94A3B8] text-[11px] leading-relaxed">
                  Index-free adjacency resolves multi-hop paths in ~1.8ms graph kernel time, allowing continuous agentic verification loops.
                </div>
              </div>
            </div>
          </div>

          {/* Right Verification Pillar (5 cols) */}
          <div className="lg:col-span-5 bg-[#0A1320] border border-[#1E2D38] rounded-xl p-6 sm:p-7 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3.5 border-b border-[#1E2D38]">
              <span className="text-xs font-mono font-semibold text-[#F3F4F0] flex items-center gap-2">
                <Terminal className="w-4 h-4 text-[#38BDF8]" />
                Grounding AI in Graph Invariants
              </span>
              <span className="text-[9px] font-mono text-[#D9C18A] uppercase px-2 py-0.5 rounded bg-[#D9C18A]/10 border border-[#D9C18A]/20">
                ZERO HALLUCINATIONS
              </span>
            </div>

            <p className="text-xs text-[#94A3B8] font-body leading-relaxed">
              Generic LLMs hallucinate security narratives because they predict tokens without structural validation. ThreatGraph AI binds Gemini 2.0 strictly to validated FalkorDB Cypher queries:
            </p>

            <div className="space-y-3 font-mono text-xs">
              <div className="p-3 bg-[#070D16] rounded-lg border border-[#1E2D38] space-y-1">
                <div className="text-[10px] text-[#38BDF8] font-semibold">1. Deterministic Cypher Queries</div>
                <div className="text-[#64748B] text-[11px]">
                  Agent reasonings are generated exclusively from nodes and edges verified to exist in the database.
                </div>
              </div>

              <div className="p-3 bg-[#070D16] rounded-lg border border-[#1E2D38] space-y-1">
                <div className="text-[10px] text-[#C68A69] font-semibold">2. Contradiction Analysis</div>
                <div className="text-[#64748B] text-[11px]">
                  Actively queries for contradictory benign operations (cron schedules, maintenance windows) to prevent false positives.
                </div>
              </div>

              <div className="p-3 bg-[#070D16] rounded-lg border border-[#1E2D38] space-y-1">
                <div className="text-[10px] text-[#D9C18A] font-semibold">3. Audit-Defensible Provenance</div>
                <div className="text-[#64748B] text-[11px]">
                  Every paragraph in the final report cites specific node IDs and event hashes.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
