'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Shield, ArrowRight } from 'lucide-react';

export function LandingFooter() {
  const { user, signInAsGuest } = useAuth();
  const router = useRouter();

  const handleLaunchApp = (destination = '/app') => {
    if (!user) {
      signInAsGuest();
    }
    router.push(destination);
  };

  return (
    <>
      {/* ── Final Call to Action ──────────────────────────────────── */}
      <section className="py-16 sm:py-20 lg:py-24 bg-[#070A10] relative overflow-hidden border-t border-[#162332]">
        {/* Radial accent glow */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[650px] h-[650px] rounded-full bg-[#38BDF8] opacity-[0.025] blur-[160px]" />
        </div>

        <div className="max-w-[1560px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10 flex flex-col items-center text-center">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-[1px] bg-[#38BDF8] opacity-40" />
            <span className="text-[11px] font-mono uppercase tracking-[0.2em] text-[#38BDF8] font-semibold">
              Begin Autonomous Triage
            </span>
            <div className="w-8 h-[1px] bg-[#38BDF8] opacity-40" />
          </div>

          <h2 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-bold text-[#F3F4F0] tracking-tight leading-[1.1] max-w-2xl mb-4">
            Follow the evidence<br />beyond the alert.
          </h2>

          <p className="text-[#94A3B8] text-sm sm:text-base max-w-xl mx-auto leading-relaxed font-body mb-8">
            Examine connected relationships across identities, workstations, server bastions, and exfiltration endpoints to build verifiable attack dossiers.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3.5">
            <button
              onClick={() => handleLaunchApp('/app/investigations')}
              className="btn-primary text-xs sm:text-sm py-3 px-6 sm:px-8 flex items-center gap-2 cursor-pointer shadow-lg shadow-[#38BDF8]/15"
            >
              <span>Launch Investigation</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleLaunchApp('/app/graph')}
              className="btn-secondary text-xs sm:text-sm py-3 px-6 sm:px-8 cursor-pointer"
            >
              Explore Knowledge Graph
            </button>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 mt-10 text-xs font-mono text-[#64748B]">
            <span>FalkorDB Knowledge Graph</span>
            <span className="text-[#162332]">&bull;</span>
            <span>Gemini 2.0 Reasoning Loop</span>
            <span className="text-[#162332]">&bull;</span>
            <span>Supabase SOC Auth</span>
            <span className="text-[#162332]">&bull;</span>
            <span>Native In-Memory Traversal</span>
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────── */}
      <footer className="bg-[#070A10] border-t border-[#162332] py-6 font-mono text-xs text-[#64748B]">
        <div className="max-w-[1560px] mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 rounded bg-[#0A1320] border border-[#162332] flex items-center justify-center">
              <Shield className="w-3.5 h-3.5 text-[#38BDF8]" />
            </div>
            <span className="text-[#F3F4F0] font-semibold">ThreatGraph AI</span>
            <span>&bull;</span>
            <span>Graph Hacks 2026 &mdash; Track 1: Agents That Act on Connected Data</span>
          </div>
          <div className="flex items-center gap-5 text-[11px]">
            <span>Engine: <strong className="text-[#38BDF8]">FalkorDB</strong></span>
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
