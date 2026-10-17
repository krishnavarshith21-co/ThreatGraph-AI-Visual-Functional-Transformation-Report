import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Shield, ArrowRight } from 'lucide-react';

export function LandingFooter() {
  const { user, signInAsGuest } = useAuth();
  const navigate = useNavigate();

  const handleLaunchApp = (destination = '/app') => {
    localStorage.setItem('threatgraph_guest_session', 'true');
    if (!user) {
      signInAsGuest();
    }
    navigate(destination);
  };

  return (
    <>
      {/* ── Final Call to Action ──────────────────────────────────── */}
      <section className="py-24 lg:py-32 bg-[#070A10] relative overflow-hidden border-t border-[#1A2732]">
        {/* Radial accent glow */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full bg-[#83D5E4] opacity-[0.025] blur-[160px]" />
        </div>

        <div className="max-w-[1780px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10 flex flex-col items-center text-center">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-[1px] bg-[#83D5E4] opacity-40" />
            <span className="text-[11px] font-mono uppercase tracking-[0.2em] text-[#83D5E4] font-semibold">
              Begin Autonomous Triage
            </span>
            <div className="w-10 h-[1px] bg-[#83D5E4] opacity-40" />
          </div>

          <h2 className="font-heading text-4xl sm:text-5xl lg:text-[3.25rem] font-bold text-[#F3F4F0] tracking-tight leading-[1.1] max-w-3xl mb-6">
            Follow the evidence<br />beyond the alert.
          </h2>

          <p className="text-[#B4C0C8] text-base sm:text-lg max-w-xl mx-auto leading-relaxed font-body mb-8">
            Examine connected relationships across identities, workstations, server bastions, and exfiltration endpoints to build verifiable attack dossiers.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4">
            <button
              onClick={() => handleLaunchApp('/app/investigations')}
              className="bg-[#38BDF8] hover:bg-[#7DD3FC] text-[#070C13] font-semibold text-sm py-3 px-8 rounded-lg flex items-center gap-2 cursor-pointer shadow-xl shadow-[#38BDF8]/20 transition-all hover:scale-[1.02]"
            >
              <span>Launch Investigation</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleLaunchApp('/app/graph')}
              className="bg-[#0B131D] hover:bg-[#111C28] text-[#F3F4F0] border border-[#1E2D38] hover:border-[#38BDF8]/50 font-medium text-sm py-3 px-8 rounded-lg transition-colors cursor-pointer"
            >
              Explore Knowledge Graph
            </button>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6 mt-12 text-xs font-mono text-[#7D8B96]">
            <span>FalkorDB Knowledge Graph</span>
            <span className="text-[#1A2732]">&bull;</span>
            <span>Gemini 2.0 Reasoning Loop</span>
            <span className="text-[#1A2732]">&bull;</span>
            <span>Supabase SOC Auth</span>
            <span className="text-[#1A2732]">&bull;</span>
            <span>FalkorDB Native In-Memory Traversal</span>
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────── */}
      <footer className="bg-[#070A10] border-t border-[#1A2732] py-8 font-mono text-xs text-[#7D8B96]">
        <div className="max-w-[1780px] mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 rounded bg-[#111B26] border border-[#1A2732] flex items-center justify-center">
              <Shield className="w-3.5 h-3.5 text-[#83D5E4]" />
            </div>
            <span className="text-[#F3F4F0] font-semibold">ThreatGraph AI</span>
            <span>&bull;</span>
            <span>Graph Hacks 2026 &mdash; Track 1: Agents That Act on Connected Data</span>
          </div>
          <div className="flex items-center gap-6 text-[11px]">
            <span>Engine: <strong className="text-[#83D5E4]">FalkorDB</strong></span>
            <span>&bull;</span>
            <span>Agent: <strong className="text-[#F3F4F0]">Google Gemini 2.0</strong></span>
            <span>&bull;</span>
            <span>Mode: <strong className="text-[#D9C18A]">Operational</strong></span>
          </div>
        </div>
      </footer>
    </>
  );
}
