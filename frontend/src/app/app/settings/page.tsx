'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import {
  Settings, Database, Cpu, RefreshCw,
  CheckCircle2, User, LogOut, AlertTriangle
} from 'lucide-react';

export default function SettingsPage() {
  const { user, configured, signOut } = useAuth();
  const [health, setHealth] = useState<any>(null);

  useEffect(() => {
    checkHealth();
  }, []);

  async function checkHealth() {
    try {
      const res = await api.health();
      setHealth(res);
    } catch {
      setHealth({ status: 'error', services: { api: { status: 'offline' }, falkordb: { status: 'offline' } } });
    }
  }

  const dbStatus = health?.services?.falkordb?.status || 'unknown';
  const dbMode = health?.services?.falkordb?.mode || 'falkordb';
  const fdb = health?.services?.falkordb;

  return (
    <div className="space-y-6 w-full max-w-[1400px] mx-auto pb-14">
      {/* ── Header ────────────────────────────────────────────────── */}
      <div className="pb-4 border-b border-[#1E2D38]">
        <div className="flex items-center gap-2 mb-1">
          <span className="w-2 h-2 rounded-full bg-[#83CFE0]" />
          <span className="text-[11px] font-mono uppercase tracking-widest text-[#83CFE0]">
            System Diagnostics &bull; Platform Config
          </span>
        </div>
        <h1 className="font-heading font-bold text-2xl lg:text-3xl text-[#F3F4F0] flex items-center gap-2.5">
          <Settings className="w-6 h-6 text-[#83CFE0]" />
          System Settings &amp; Telemetry
        </h1>
        <p className="text-[#8A99A8] text-xs font-mono mt-1">
          Manage database connections, autonomous agent models, and analyst security credentials.
        </p>
      </div>

      {/* ── Services Health / Connected Graph Diagnostics ────────── */}
      <div className="border border-[#1E2D38] bg-[#101923] p-6 space-y-4 rounded-sm shadow-md">
        <div className="flex items-center justify-between border-b border-[#1E2D38] pb-3">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-[#83CFE0]" />
            <h2 className="font-heading font-semibold text-xs uppercase tracking-wider text-[#8A99A8]">
              Connected Graph Engine &bull; Admin Diagnostics
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#EAB308]/10 text-[#EAB308] border border-[#EAB308]/30 font-semibold uppercase">
              Development / Unencrypted
            </span>
            <button
              onClick={checkHealth}
              className="p-1.5 text-[#8A99A8] hover:text-[#F3F4F0] hover:bg-[#1A2732] rounded-sm border border-[#1E2D38] transition-colors cursor-pointer"
              title="Refresh Health"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs font-mono">
          <div className="bg-[#070C13] p-4 rounded-sm border border-[#1E2D38] space-y-1">
            <span className="text-[#6B7A85] block text-[10px] uppercase">Service &amp; Mode</span>
            <span className="text-[#F3F4F0] font-bold text-sm">
              {fdb?.is_cloud ? 'FalkorDB Cloud' : 'FalkorDB Engine'}
            </span>
            <p className="text-[11px] text-[#8A99A8] pt-1 truncate" title={fdb?.target || 'Cloud Instance'}>
              Target: <span className="text-[#83CFE0]">{fdb?.target ? fdb.target.split('.')[0] + '...cloud' : 'falkordb_cloud'}</span>
            </p>
          </div>

          <div className="bg-[#070C13] p-4 rounded-sm border border-[#1E2D38] space-y-1">
            <span className="text-[#6B7A85] block text-[10px] uppercase">Connection &amp; Environment</span>
            <div className="flex items-center gap-2 pt-0.5">
              <span className={`w-2 h-2 rounded-full ${dbStatus === 'connected' ? 'bg-[#83CFE0] animate-pulse' : 'bg-[#DC666B]'}`} />
              <span className="text-[#F3F4F0] font-bold uppercase">{dbStatus}</span>
              <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#1A2732] text-[#83CFE0] font-semibold uppercase">DEV</span>
            </div>
            <p className="text-[11px] text-[#8A99A8] pt-1">
              Graph: <span className="text-[#F3F4F0] font-semibold">{fdb?.graph || 'threatgraph'}</span>
            </p>
          </div>

          <div className="bg-[#070C13] p-4 rounded-sm border border-[#1E2D38] space-y-1">
            <span className="text-[#6B7A85] block text-[10px] uppercase">Security Classification</span>
            <span className="text-[#EAB308] font-bold text-xs block">
              {fdb?.security_label || 'DEVELOPMENT / UNENCRYPTED'}
            </span>
            <p className="text-[10px] text-[#8A99A8] pt-1">
              Transport: <span className="text-[#DC666B] font-semibold">{fdb?.encryption || 'none (plain_tcp)'}</span> (TLS: {fdb?.tls_enabled ? 'Active' : 'Disabled'})
            </p>
          </div>

          <div className="bg-[#070C13] p-4 rounded-sm border border-[#1E2D38] space-y-1">
            <span className="text-[#6B7A85] block text-[10px] uppercase">Dataset &amp; Topology</span>
            <span className="text-[#F3F4F0] font-bold text-xs block">
              {fdb?.nodes ?? 49} Nodes &bull; {fdb?.edges ?? 57} Edges
            </span>
            <p className="text-[10px] text-[#10B981] pt-1 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
              100% Synthetic Telemetry
            </p>
          </div>
        </div>

        {/* Security Warning Notice */}
        <div className="p-3 bg-[#17130A] border border-[#EAB308]/30 rounded-sm text-xs font-mono flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 text-[#EAB308] flex-shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <p className="text-[#EAB308] font-semibold text-[11px] tracking-wide">
              SECURITY NOTICE: UNENCRYPTED DEVELOPMENT TRANSPORT (PLAIN TCP)
            </p>
            <p className="text-[#A39268] text-[10px] leading-relaxed font-body">
              The database connection is established over plain TCP without TLS transport encryption (standard for FalkorDB Cloud Free Tier). Safe for synthetic benchmark and development testing only. Real customer telemetry, production secrets, or sensitive credentials must never be ingested over this channel.
            </p>
          </div>
        </div>
      </div>

      {/* ── AI Agent Configuration ────────────────────────────────── */}
      <div className="border border-[#1E2D38] bg-[#101923] p-6 space-y-4 rounded-sm shadow-md">
        <div className="flex items-center gap-2 border-b border-[#1E2D38] pb-3">
          <Cpu className="w-4 h-4 text-[#D8C99A]" />
          <h2 className="font-heading font-semibold text-xs uppercase tracking-wider text-[#8A99A8]">
            Investigation Agent Configuration
          </h2>
        </div>

        <div className="grid sm:grid-cols-3 gap-4 text-xs font-mono">
          <div className="bg-[#070C13] p-4 rounded-sm border border-[#1E2D38] space-y-1">
            <span className="text-[#6B7A85] block text-[10px] uppercase">LLM Model</span>
            <span className="text-[#F3F4F0] font-bold">Google Gemini 2.0 Flash</span>
            <p className="text-[10px] text-[#8A99A8] pt-0.5">Autonomous function calling</p>
          </div>

          <div className="bg-[#070C13] p-4 rounded-sm border border-[#1E2D38] space-y-1">
            <span className="text-[#6B7A85] block text-[10px] uppercase">Max Traversal Depth</span>
            <span className="text-[#83CFE0] font-bold text-sm">4 Hops</span>
            <p className="text-[10px] text-[#8A99A8] pt-0.5">Bounded graph search</p>
          </div>

          <div className="bg-[#070C13] p-4 rounded-sm border border-[#1E2D38] space-y-1">
            <span className="text-[#6B7A85] block text-[10px] uppercase">Max Tool Steps</span>
            <span className="text-[#D8C99A] font-bold text-sm">15 Actions</span>
            <p className="text-[10px] text-[#8A99A8] pt-0.5">Cycle runaway prevention</p>
          </div>
        </div>
      </div>

      {/* ── Analyst Profile ───────────────────────────────────────── */}
      <div className="border border-[#1E2D38] bg-[#101923] p-6 space-y-4 rounded-sm shadow-md">
        <div className="flex items-center gap-2 border-b border-[#1E2D38] pb-3">
          <User className="w-4 h-4 text-[#83CFE0]" />
          <h2 className="font-heading font-semibold text-xs uppercase tracking-wider text-[#8A99A8]">
            Active Analyst Session
          </h2>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-xs font-mono text-[#83CFE0] font-semibold">
              {user?.email || 'analyst@threatgraph.ai'}
            </span>
            <p className="text-xs text-[#8A99A8] font-body">
              Role: Senior Incident Responder &bull; Permissions: Read, Traverse, Outcome Commit
            </p>
            <div className="flex items-center gap-2 pt-1 text-[11px] font-mono text-[#6B7A85]">
              <span className="text-[#83CFE0] flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {configured ? 'Supabase Authenticated' : 'Guest Analyst Session Active'}
              </span>
            </div>
          </div>

          <button
            onClick={() => signOut()}
            className="btn-danger text-xs py-2 px-4 flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </div>
  );
}
