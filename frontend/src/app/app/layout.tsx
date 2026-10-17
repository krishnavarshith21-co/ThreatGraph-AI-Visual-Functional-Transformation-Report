'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import {
  LayoutDashboard, Search, Globe, AlertTriangle,
  FileText, Settings, LogOut, Menu, X,
  Shield, Activity, Database
} from 'lucide-react';

const navItems = [
  { href: '/app', label: 'Overview', icon: LayoutDashboard, exact: true },
  { href: '/app/investigations', label: 'Investigations', icon: Search, exact: false },
  { href: '/app/graph', label: 'Graph Explorer', icon: Globe, exact: false },
  { href: '/app/alerts', label: 'Alerts', icon: AlertTriangle, exact: false },
  { href: '/app/reports', label: 'Reports', icon: FileText, exact: false },
  { href: '/app/settings', label: 'Settings', icon: Settings, exact: false },
];

export default function AppConsoleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [health, setHealth] = useState<any>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/sign-in?redirect=' + encodeURIComponent(pathname));
    }
  }, [user, loading, router, pathname]);

  useEffect(() => {
    let mounted = true;
    const checkHealth = async () => {
      try {
        const h = await api.health();
        if (mounted) setHealth(h);
      } catch {
        if (mounted) {
          setHealth({ status: 'error', services: { api: { status: 'offline' }, falkordb: { status: 'offline' } } });
        }
      }
    };
    checkHealth();
    const interval = setInterval(checkHealth, 20000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  const handleSignOut = async () => {
    await signOut();
    router.push('/');
  };

  const apiStatus = health?.services?.api?.status || 'loading';
  const dbStatus = health?.services?.falkordb?.status || 'loading';
  const dbMode = health?.services?.falkordb?.mode || 'live';
  const dbNodes = health?.services?.falkordb?.nodes;

  const currentLabel = navItems.find((n) =>
    n.exact ? pathname === n.href : pathname.startsWith(n.href)
  )?.label || 'Console';

  if (loading) {
    return (
      <div className="min-h-screen w-full bg-[#070A10] flex items-center justify-center font-mono text-xs text-[#83D5E4]">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-[#83D5E4] border-t-transparent rounded-full animate-spin" />
          <span>Verifying Analyst Session...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen w-full bg-[#070A10] text-[#F3F4F0] flex selection:bg-[#83D5E4] selection:text-[#070A10]">
      {/* ── Refined Navigation Rail ─────────────────────────────── */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-60 bg-[#0B111A] border-r border-[#1A2732] transform transition-transform duration-200 lg:translate-x-0 lg:static flex flex-col justify-between ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div>
          {/* Logo */}
          <div className="h-14 px-4 border-b border-[#1A2732] flex items-center justify-between">
            <Link href="/app" className="flex items-center gap-2.5 group">
              <div className="w-7 h-7 rounded bg-[#111B26] border border-[#1A2732] flex items-center justify-center group-hover:border-[#83D5E4]/40 transition-colors">
                <Shield className="w-4 h-4 text-[#83D5E4]" />
              </div>
              <div className="flex items-center">
                <span className="font-heading font-semibold text-sm text-[#F3F4F0] tracking-tight">ThreatGraph</span>
                <span className="font-mono text-[9px] text-[#83D5E4] ml-1.5 px-1 py-0.5 rounded bg-[#111B26] border border-[#1A2732]">AI</span>
              </div>
            </Link>
          </div>

          {/* Navigation Links */}
          <nav className="py-3 px-2 space-y-1">
            {navItems.map(({ href, label, icon: Icon, exact }) => {
              const isActive = exact ? pathname === href : pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded text-xs font-mono transition-colors ${
                    isActive
                      ? 'bg-[#111B26] text-[#83D5E4] border-l-2 border-l-[#83D5E4] font-semibold shadow-sm'
                      : 'text-[#7D8B96] hover:text-[#F3F4F0] hover:bg-[#111B26]/60 border-l-2 border-l-transparent'
                  }`}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span>{label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Bottom Telemetry & User Session */}
        <div className="p-3 border-t border-[#1A2732] space-y-3 font-mono text-xs">
          {/* Engine Status Indicators */}
          <div className="bg-[#111B26] p-2.5 rounded border border-[#1A2732] space-y-1.5 text-[11px]">
            <div className="flex items-center justify-between">
              <span className="text-[#7D8B96]">API Gateway</span>
              <span className={`flex items-center gap-1.5 font-medium ${apiStatus === 'running' ? 'text-[#83D5E4]' : 'text-[#DC666B]'}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${apiStatus === 'running' ? 'bg-[#83D5E4] animate-pulse' : 'bg-[#DC666B]'}`} />
                {apiStatus}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#7D8B96]">FalkorDB</span>
              <span className={`flex items-center gap-1.5 font-medium ${dbStatus === 'connected' ? 'text-[#D9C18A]' : 'text-[#DC666B]'}`}>
                {dbStatus === 'connected' ? (dbNodes ? `${dbNodes} Nodes (Dev)` : 'Cloud (Dev)') : dbMode === 'in_memory_fallback' ? 'In-Memory Fallback' : 'Offline'}
              </span>
            </div>
          </div>

          {/* Analyst User */}
          <div className="flex items-center gap-2.5 pt-1">
            <div className="w-7 h-7 rounded bg-[#111B26] border border-[#1A2732] flex items-center justify-center font-mono text-xs text-[#83D5E4] font-semibold">
              {user?.email?.[0]?.toUpperCase() || 'A'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] text-[#F3F4F0] truncate font-medium">{user?.email || 'analyst@threatgraph.ai'}</p>
              <span className="text-[10px] text-[#7D8B96] block font-mono">SOC Analyst</span>
            </div>
            <button
              onClick={handleSignOut}
              className="p-1.5 rounded text-[#7D8B96] hover:text-[#DC666B] hover:bg-[#111B26] transition-colors"
              title="Sign out"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-[#070C13]/80 z-30 lg:hidden backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Main Workspace Surface ───────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        {/* Top Header Bar */}
        <header className="h-14 bg-[#070C13]/95 backdrop-blur-md border-b border-[#1E2D38] flex items-center justify-between px-5 sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <button
              className="lg:hidden p-1.5 -ml-1 text-[#6B7A85] hover:text-[#F3F4F0]"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              aria-label="Toggle navigation"
            >
              {sidebarOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>

            <div className="flex items-center gap-2 font-mono text-xs">
              <span className="text-[#6B7A85] hidden sm:inline">WORKSPACE /</span>
              <span className="text-[#F3F4F0] font-semibold uppercase tracking-wider">
                {currentLabel}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono">
            <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded bg-[#101923] border border-[#1E2D38] text-[#83CFE0]">
              <Database className="w-3 h-3 text-[#83CFE0]" />
              <span className="text-[11px] font-medium tracking-wide">FALKORDB GRAPH</span>
            </div>
            <div className="flex items-center gap-1.5 text-[#6B7A85] text-[11px]">
              <Activity className="w-3 h-3 text-[#83CFE0]" />
              <span>{health?.timestamp ? new Date(health.timestamp).toLocaleTimeString() : '--:--:--'}</span>
            </div>
          </div>
        </header>

        {/* Page Content Work Surface */}
        <main className="flex-1 p-5 lg:p-7 overflow-auto w-full max-w-[1780px] mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
