import { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../lib/api';
import {
  LayoutDashboard, Search, Globe, AlertTriangle,
  FileText, Settings, LogOut, Menu, X,
  Shield, Activity, Database
} from 'lucide-react';

const navItems = [
  { to: '/app', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/app/investigations', label: 'Investigations', icon: Search },
  { to: '/app/graph', label: 'Graph Explorer', icon: Globe },
  { to: '/app/alerts', label: 'Alerts', icon: AlertTriangle },
  { to: '/app/reports', label: 'Reports', icon: FileText },
  { to: '/app/settings', label: 'Settings', icon: Settings },
];

export function AppLayout() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [health, setHealth] = useState<any>(null);

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const h = await api.health();
        setHealth(h);
      } catch {
        setHealth({ status: 'error', services: { api: { status: 'offline' }, falkordb: { status: 'offline' } } });
      }
    };
    checkHealth();
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const apiStatus = health?.services?.api?.status || 'loading';
  const dbStatus = health?.services?.falkordb?.status || 'loading';
  const dbMode = health?.services?.falkordb?.mode || 'live';

  return (
    <div className="min-h-screen w-full bg-[#070C13] text-[#F3F4F0] flex selection:bg-[#83CFE0] selection:text-[#070C13]">
      {/* ── Refined Navigation Rail ─────────────────────────────── */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-56 bg-[#0B1119] border-r border-[#1E2D38] transform transition-transform duration-200 lg:translate-x-0 lg:static ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="h-full flex flex-col justify-between">
          <div>
            {/* Logo */}
            <div className="h-14 px-4 border-b border-[#1E2D38] flex items-center justify-between">
              <NavLink to="/app" className="flex items-center gap-2.5">
                <div className="w-6 h-6 rounded bg-[#101923] border border-[#1E2D38] flex items-center justify-center">
                  <Shield className="w-3.5 h-3.5 text-[#83CFE0]" />
                </div>
                <div className="flex items-center">
                  <span className="font-heading font-semibold text-xs text-[#F3F4F0] tracking-tight">ThreatGraph</span>
                  <span className="font-mono text-[9px] text-[#6B7A85] ml-1 px-1 py-0.2 rounded bg-[#101923] border border-[#1E2D38]">AI</span>
                </div>
              </NavLink>
            </div>

            {/* Navigation Links */}
            <nav className="py-3 px-2 space-y-0.5">
              {navItems.map(({ to, label, icon: Icon, end }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={end}
                  onClick={() => setSidebarOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-2.5 px-3 py-2 rounded text-xs font-mono transition-colors ${
                      isActive
                        ? 'bg-[#101923] text-[#83CFE0] border-l-2 border-l-[#83CFE0] font-semibold'
                        : 'text-[#6B7A85] hover:text-[#F3F4F0] hover:bg-[#101923]/60 border-l-2 border-l-transparent'
                    }`
                  }
                >
                  <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                  {label}
                </NavLink>
              ))}
            </nav>
          </div>

          {/* Bottom Telemetry & User Session */}
          <div className="p-3 border-t border-[#1E2D38] space-y-2.5 font-mono text-xs">
            {/* Engine Status Indicators */}
            <div className="bg-[#101923] p-2 rounded border border-[#1E2D38] space-y-1 text-[11px]">
              <div className="flex items-center justify-between">
                <span className="text-[#6B7A85]">API Gateway</span>
                <span className={`flex items-center gap-1 font-medium ${apiStatus === 'running' ? 'text-[#83CFE0]' : 'text-[#DC666B]'}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${apiStatus === 'running' ? 'bg-[#83CFE0]' : 'bg-[#DC666B]'}`} />
                  {apiStatus}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#6B7A85]">FalkorDB</span>
                <span className={`flex items-center gap-1 font-medium ${dbStatus === 'connected' ? 'text-[#D8C99A]' : 'text-[#DC666B]'}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${dbStatus === 'connected' ? 'bg-[#D8C99A]' : 'bg-[#DC666B]'}`} />
                  {dbMode === 'live' ? 'Live' : 'Ready'}
                </span>
              </div>
            </div>

            {/* Analyst User */}
            <div className="flex items-center gap-2 pt-0.5">
              <div className="w-6 h-6 rounded bg-[#101923] border border-[#1E2D38] flex items-center justify-center font-mono text-xs text-[#83CFE0] font-semibold">
                {user?.email?.[0]?.toUpperCase() || 'A'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] text-[#F3F4F0] truncate">{user?.email || 'guest-analyst@threatgraph.ai'}</p>
                <span className="text-[10px] text-[#6B7A85] block">SOC Analyst</span>
              </div>
              <button
                onClick={handleSignOut}
                className="p-1 rounded text-[#6B7A85] hover:text-[#DC666B] transition-colors"
                title="Sign out"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
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
              <span className="text-[#F3F4F0] font-semibold uppercase">
                {navItems.find((n) => n.to === location.pathname)?.label || 'Console'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono">
            <div className="hidden sm:flex items-center gap-2 px-2 py-0.5 rounded bg-[#101923] border border-[#1E2D38] text-[#83CFE0]">
              <Database className="w-3 h-3 text-[#83CFE0]" />
              <span className="text-[11px]">FALKORDB KNOWLEDGE GRAPH</span>
            </div>
            <div className="flex items-center gap-1.5 text-[#6B7A85] text-[11px]">
              <Activity className="w-3 h-3" />
              <span>{health?.timestamp ? new Date(health.timestamp).toLocaleTimeString() : '--:--:--'}</span>
            </div>
          </div>
        </header>

        {/* Page Content Work Surface */}
        <main className="flex-1 p-5 lg:p-7 overflow-auto w-full max-w-[1780px] mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
