import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../lib/api';
import {
  Settings, Database, Cpu, RefreshCw,
  CheckCircle2, User, LogOut
} from 'lucide-react';

export function SettingsPage() {
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

      {/* ── Services Health ───────────────────────────────────────── */}
      <div className="border border-[#1E2D38] bg-[#101923] p-6 space-y-4 rounded-sm shadow-md">
        <div className="flex items-center justify-between border-b border-[#1E2D38] pb-3">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-[#83CFE0]" />
            <h2 className="font-heading font-semibold text-xs uppercase tracking-wider text-[#8A99A8]">
              Connected Graph Engine
            </h2>
          </div>
          <button
            onClick={checkHealth}
            className="p-1.5 text-[#8A99A8] hover:text-[#F3F4F0] hover:bg-[#1A2732] rounded-sm border border-[#1E2D38] transition-colors"
            title="Refresh Health"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid sm:grid-cols-2 gap-4 text-xs font-mono">
          <div className="bg-[#070C13] p-4 rounded-sm border border-[#1E2D38] space-y-1">
            <span className="text-[#6B7A85] block text-[10px] uppercase">Service Name</span>
            <span className="text-[#F3F4F0] font-bold text-sm">FalkorDB Graph Engine</span>
            <p className="text-[11px] text-[#8A99A8] pt-1">
              Mode: <span className="text-[#83CFE0] font-semibold">{dbMode === 'in_memory_fallback' ? 'High-Fidelity Cyber Scenario Graph' : 'Live FalkorDB Connection'}</span>
            </p>
          </div>

          <div className="bg-[#070C13] p-4 rounded-sm border border-[#1E2D38] space-y-1">
            <span className="text-[#6B7A85] block text-[10px] uppercase">Connection Status</span>
            <div className="flex items-center gap-2 pt-0.5">
              <span className={`w-2 h-2 rounded-full ${dbStatus === 'connected' ? 'bg-[#83CFE0] animate-pulse' : 'bg-[#DC666B]'}`} />
              <span className="text-[#F3F4F0] font-bold uppercase">{dbStatus}</span>
            </div>
            <p className="text-[11px] text-[#8A99A8] pt-1">
              Host: localhost:6379 &bull; Graph: threatgraph
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
            className="btn-danger text-xs py-2 px-4 flex items-center gap-1.5 self-start sm:self-auto"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </div>
  );
}
