import { useState } from 'react';
import { Layers, Search, CheckCircle2, FileText, ArrowRight, Code2, ChevronRight } from 'lucide-react';

const STAGES = [
  {
    num: '01',
    label: 'INGEST & MODEL',
    title: 'Ingest and model raw telemetry',
    shortDesc: 'Converts unstructured logs, identities, endpoints, and network flows into a normalized FalkorDB property graph schema with typed, bidirectional relationships.',
    inputs: ['Syslog & CEF Network Flows', 'CrowdStrike / Defender EDR Telemetry', 'Okta / Active Directory Auth Logs', 'AWS CloudTrail & Database DLP Events'],
    operation: 'Deterministic schema parsing & graph node upsertion with index-free adjacency.',
    output: 'Normalized FalkorDB Subgraph (Typed Nodes & Edges)',
    Icon: Layers,
    accent: '#D9C18A',
    sampleSnippet: `// Ingestion Schema Normalization
CREATE (u:User {id: 'usr-mchen', name: 'Marcus Chen', role: 'DevOps Engineer'})
CREATE (d:Device {id: 'dev-laptop-mchen', hostname: 'LAPTOP-MCHEN', os: 'Win11 Enterprise'})
CREATE (u)-[:USES_DEVICE {last_seen: '2026-03-24T08:14:00Z'}]->(d)`,
  },
  {
    num: '02',
    label: 'TRACE RELATIONSHIPS',
    title: 'Trace multi-hop relationship geometry',
    shortDesc: 'Autonomous Gemini agent executes bounded multi-hop graph traversals (1–4 hops) to discover lateral pivots, shared infrastructure, and hidden exfiltration channels.',
    inputs: ['Seed Alert Node (e.g. Outbound TOR Handshake)', 'Configured Traversal Depth (1 to 4 Hops)', 'Edge Whitelist (AUTHENTICATED_TO, ACCESSED, EGRESS)'],
    operation: 'Breadth-first search graph traversal with cycle prevention and temporal bounds.',
    output: 'Causal Attack Trajectory (Chronologically Sorted Subgraph)',
    Icon: Search,
    accent: '#38BDF8',
    sampleSnippet: `// Autonomous Bounded Traversal
MATCH path = (root:Event {id: 'evt-alert-4091'})-[*1..4]-(target)
WHERE ALL(r IN relationships(path) WHERE r.timestamp >= '2026-03-24T08:00:00Z')
RETURN path, [n IN nodes(path) | n.type] AS path_types
ORDER BY length(path) ASC`,
  },
  {
    num: '03',
    label: 'EVALUATE EVIDENCE',
    title: 'Evaluate evidence and audit contradictions',
    shortDesc: 'Cross-references suspicious activity against contradictory benign signals (cron maintenance windows, sanctioned admin scripts) to definitively eliminate false alarms.',
    inputs: ['Observed Candidate Attack Path', 'Scheduled Maintenance Calendar', 'Sanctioned Service Account Baselines', 'Historical Telemetry Distributions'],
    operation: 'Contradiction testing and Bayesian evidence weighting by agent.',
    output: 'Verified Forensic Findings (Distinguishing Facts vs Hypotheses)',
    Icon: CheckCircle2,
    accent: '#C68A69',
    sampleSnippet: `// Contradiction Verification Query
MATCH (e:Event)-[:TARGETS]->(r:Resource {name: 'customers_pii'})
WHERE e.timestamp >= '2026-03-24T08:40:00Z'
  AND NOT EXISTS((e)-[:MATCHES_POLICY]->(:Policy {type: 'ScheduledBackup'}))
RETURN e.id, e.payload, 'UNSCHEDULED_ANOMALY' AS classification`,
  },
  {
    num: '04',
    label: 'PRODUCE REPORT',
    title: 'Produce audit-defensible incident dossier',
    shortDesc: 'Synthesizes an executive incident dossier citing immutable evidence anchors, cryptographic hashes, affected blast radius, and prioritized containment runbooks.',
    inputs: ['Corroborated Attack Trajectory Subgraph', 'Extracted MITRE ATT&CK Technique Mappings', 'Identified Compromised Credentials & Hosts'],
    operation: 'Deterministic dossier generation with Markdown & PDF export readiness.',
    output: 'Executive & Technical Incident Dossier (Audit-Ready)',
    Icon: FileText,
    accent: '#DC666B',
    sampleSnippet: `// Incident Dossier Anchor Synthesis
RETURN {
  incident_id: 'INV-2026-0324-001',
  confidence_score: 0.98,
  blast_radius: ['usr-mchen', 'dev-laptop-mchen', 'srv-admin-01', 'db-customers'],
  recommended_actions: ['Revoke Kerberos TGT', 'Isolate LAPTOP-MCHEN', 'Block IP 91.219.236.18']
}`,
  },
];

export function MethodologySection() {
  const [activeStageIndex, setActiveStageIndex] = useState<number>(1);
  const currentStage = STAGES[activeStageIndex];

  return (
    <section id="methodology" className="py-20 lg:py-28 bg-[#070B14] relative border-t border-[#1E2D38] overflow-hidden scroll-mt-16">
      {/* Background ambient lighting */}
      <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-[#38BDF8]/[0.02] rounded-full blur-[180px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[500px] h-[500px] bg-[#D9C18A]/[0.015] rounded-full blur-[160px] pointer-events-none" />

      <div className="max-w-[1780px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header */}
        <div className="max-w-3xl mb-12 lg:mb-16">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-[11px] font-mono uppercase tracking-[0.2em] text-[#38BDF8] font-semibold flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#38BDF8] animate-pulse" />
              Chapter 02 / Autonomous Investigation Methodology
            </span>
            <div className="w-12 h-[1px] bg-[#1E2D38]" />
          </div>
          <h2 className="font-heading text-3xl sm:text-4xl lg:text-[2.75rem] font-bold text-[#F3F4F0] leading-[1.12] mb-5 tracking-tight">
            Follow the evidence.<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#38BDF8] via-[#818CF8] to-[#D9C18A]">
              From raw telemetry to audit-ready containment.
            </span>
          </h2>
          <p className="text-[#94A3B8] text-sm sm:text-base leading-relaxed font-body">
            Every investigation executes through an evidence-grounded, four-stage analytical sequence. Rather than summarizing unanchored alerts, the autonomous agent traverses the knowledge graph to verify causal connections.
          </p>
        </div>

        {/* Connected Four-Stage Progression Rail with Continuous Dynamic Conduit */}
        <div className="relative mb-10">
          
          {/* Continuous Glowing Conduit Rail (Desktop) */}
          <div className="hidden lg:block absolute top-[38px] left-[7%] right-[7%] h-[2px] bg-gradient-to-r from-[#D9C18A]/40 via-[#38BDF8]/60 to-[#DC666B]/50 z-0 shadow-[0_0_12px_rgba(56,189,248,0.3)]" />

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 relative z-10">
            {STAGES.map((stage, idx) => {
              const isActive = activeStageIndex === idx;
              return (
                <button
                  key={stage.num}
                  onClick={() => setActiveStageIndex(idx)}
                  className={`text-left p-5 rounded-xl border transition-all duration-300 cursor-pointer relative overflow-hidden group shadow-lg ${
                    isActive
                      ? 'bg-[#0F1E32]/95 border-[#38BDF8] shadow-[0_0_25px_rgba(56,189,248,0.25)] -translate-y-1'
                      : 'bg-[#0B1525]/70 border-[#1E2D38] hover:border-[#1E2D38]/90 hover:bg-[#0E1A2C]/80'
                  }`}
                >
                  {/* Top illuminated stage accent line */}
                  <div
                    className="absolute top-0 left-0 right-0 h-[3px] transition-all"
                    style={{ backgroundColor: isActive ? stage.accent : 'transparent' }}
                  />

                  {/* Stage Header */}
                  <div className="flex items-center justify-between mb-3.5">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center font-mono text-xs font-bold transition-all shadow-inner"
                        style={{
                          backgroundColor: isActive ? `${stage.accent}25` : '#070D16',
                          border: `1px solid ${isActive ? stage.accent : '#1E2D38'}`,
                          color: stage.accent,
                        }}
                      >
                        {stage.num}
                      </div>
                      <span className="text-[10px] font-mono tracking-wider font-semibold uppercase text-[#64748B]">
                        {stage.label}
                      </span>
                    </div>
                    <stage.Icon className="w-4 h-4 transition-transform group-hover:scale-110" style={{ color: stage.accent }} />
                  </div>

                  <h3 className="font-heading font-semibold text-sm text-[#F3F4F0] mb-2 group-hover:text-white transition-colors">
                    {stage.title}
                  </h3>
                  <p className="text-xs text-[#94A3B8] font-body line-clamp-2 leading-relaxed">
                    {stage.shortDesc}
                  </p>

                  <div className="pt-3 mt-3.5 border-t border-[#1E2D38]/60 flex items-center justify-between text-[10px] font-mono">
                    <span className="text-[#38BDF8] truncate max-w-[200px]">{stage.output}</span>
                    <ChevronRight className="w-3.5 h-3.5 text-[#64748B] flex-shrink-0 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Technical Execution Inspector Instrument */}
        <div className="rounded-xl border border-[#1E2D38] bg-[#0A1320] shadow-2xl overflow-hidden">
          
          {/* Instrument HUD Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between px-6 py-3.5 border-b border-[#1E2D38] gap-2 bg-[#0E1B2C]">
            <div className="flex items-center gap-2.5 font-mono text-xs">
              <span className="font-bold uppercase tracking-wider flex items-center gap-2" style={{ color: currentStage.accent }}>
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: currentStage.accent }} />
                STAGE {currentStage.num} EXECUTION SPECIFICATION
              </span>
              <span className="text-[#64748B] hidden md:inline">|</span>
              <span className="text-[#94A3B8] hidden md:inline">{currentStage.title}</span>
            </div>
            <div className="flex items-center gap-2 font-mono text-[11px] text-[#64748B]">
              <span className="text-[10px] font-bold text-[#38BDF8] bg-[#38BDF8]/10 px-2 py-0.5 rounded border border-[#38BDF8]/30 uppercase">
                ACTIVE PIPELINE OPERATOR
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-0">
            
            {/* Left Column: Structured Inputs, Operations & Artifact (lg:col-span-6) */}
            <div className="lg:col-span-6 p-6 sm:p-7 space-y-5 border-b lg:border-b-0 lg:border-r border-[#1E2D38] font-mono text-xs">
              
              {/* Structured Inputs */}
              <div>
                <span className="text-[10px] uppercase font-bold text-[#64748B] tracking-wider block mb-2.5">
                  1. Structured Ingest Inputs
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {currentStage.inputs.map((input, idx) => (
                    <div key={idx} className="p-2.5 rounded-lg bg-[#070D16] border border-[#1E2D38] text-[#94A3B8] text-[11px] flex items-center gap-2 shadow-inner">
                      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: currentStage.accent }} />
                      <span className="truncate">{input}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Engine Operator Function */}
              <div>
                <span className="text-[10px] uppercase font-bold text-[#64748B] tracking-wider block mb-2">
                  2. Engine Operator Function
                </span>
                <div className="p-3.5 rounded-lg bg-[#070D16] border border-[#1E2D38] text-[#F3F4F0] text-[11px] leading-relaxed shadow-inner">
                  {currentStage.operation}
                </div>
              </div>

              {/* Generated Investigation Artifact */}
              <div>
                <span className="text-[10px] uppercase font-bold text-[#64748B] tracking-wider block mb-2">
                  3. Generated Investigation Artifact
                </span>
                <div
                  className="p-3.5 rounded-lg border flex items-center justify-between gap-3 shadow-md"
                  style={{
                    borderColor: `${currentStage.accent}40`,
                    backgroundColor: `${currentStage.accent}12`,
                  }}
                >
                  <span className="text-[#F3F4F0] font-semibold text-xs">{currentStage.output}</span>
                  <span
                    className="text-[10px] font-bold uppercase px-2.5 py-0.5 rounded shadow-sm"
                    style={{ backgroundColor: currentStage.accent, color: '#070C13' }}
                  >
                    VERIFIED
                  </span>
                </div>
              </div>
            </div>

            {/* Right Column: Real Cypher Engine Query & Tool Calling Snippet (lg:col-span-6) */}
            <div className="lg:col-span-6 p-6 sm:p-7 bg-[#070D16] flex flex-col justify-between font-mono text-xs">
              <div className="space-y-3.5">
                <div className="flex items-center justify-between text-[11px] text-[#64748B]">
                  <span className="flex items-center gap-2 text-[#F3F4F0] font-semibold">
                    <Code2 className="w-3.5 h-3.5 text-[#38BDF8]" />
                    FalkorDB / Gemini Execution Loop
                  </span>
                  <span className="text-[#38BDF8] text-[10px]">Deterministic Primitive</span>
                </div>

                <div className="bg-[#0A1422] p-4 rounded-lg border border-[#1E2D38] text-[11px] text-[#38BDF8] overflow-x-auto leading-relaxed shadow-inner">
                  <pre className="whitespace-pre font-mono">
                    {currentStage.sampleSnippet}
                  </pre>
                </div>
              </div>

              <div className="pt-4 mt-4 border-t border-[#1E2D38] flex items-center justify-between text-[11px] text-[#64748B]">
                <span>Stage 0{activeStageIndex + 1} of 04</span>
                <button
                  onClick={() => setActiveStageIndex((prev) => (prev + 1) % 4)}
                  className="text-[#38BDF8] hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer font-semibold"
                >
                  <span>Next Stage</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
