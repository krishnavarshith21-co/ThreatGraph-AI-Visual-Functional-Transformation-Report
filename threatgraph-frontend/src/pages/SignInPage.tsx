import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  Shield, Lock, Mail, Eye, EyeOff, ArrowRight,
  AlertCircle, Sparkles, CheckCircle2
} from 'lucide-react';

export function SignInPage() {
  const { signIn, signInAsGuest, configured } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await signIn(email, password);
      if (res?.error) {
        setError(res.error);
      } else {
        navigate('/app');
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to authenticate');
    } finally {
      setLoading(false);
    }
  };

  const handleGuestLogin = () => {
    signInAsGuest();
    navigate('/app');
  };

  return (
    <div className="min-h-screen w-full bg-[#070C13] text-[#F3F4F0] flex flex-col lg:flex-row selection:bg-[#83CFE0] selection:text-[#070C13]">
      {/* ── Left Editorial Column (approx 52% on Desktop) ─────────── */}
      <div className="hidden lg:flex lg:w-[52%] bg-[#101923] border-r border-[#1E2D38] p-12 xl:p-16 flex-col justify-between relative overflow-hidden">
        <div className="relative z-10 space-y-8">
          <Link to="/" className="inline-flex items-center gap-3 group">
            <div className="w-8 h-8 rounded-sm bg-[#1A2732] border border-[#1E2D38] flex items-center justify-center group-hover:border-[#83CFE0] transition-colors">
              <Shield className="w-4 h-4 text-[#83CFE0]" />
            </div>
            <div>
              <span className="font-heading font-semibold text-sm tracking-tight text-[#F3F4F0]">ThreatGraph</span>
              <span className="font-mono text-[10px] text-[#8A99A8] uppercase ml-1.5 px-1 py-0.5 rounded-sm bg-[#1A2732] border border-[#1E2D38]">AI</span>
            </div>
          </Link>

          <div className="space-y-4 max-w-lg pt-8">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-sm bg-[#1A2732] border border-[#1E2D38] text-[11px] font-mono text-[#83CFE0]">
              <span className="w-2 h-2 rounded-full bg-[#83CFE0] animate-pulse" />
              ANALYST ACCESS PORTAL
            </div>

            <h1 className="font-heading text-4xl xl:text-5xl font-bold tracking-tight text-[#F3F4F0] leading-tight">
              Investigate threats with <span className="text-[#83CFE0]">connected data.</span>
            </h1>

            <p className="text-[#8A99A8] text-sm leading-relaxed font-body">
              Log in to access your FalkorDB knowledge graph workspace, correlate security entities, trace multi-hop attack trajectories, and execute autonomous investigations.
            </p>
          </div>
        </div>

        {/* Technical Features Checklist */}
        <div className="relative z-10 space-y-3 pt-12 border-t border-[#1E2D38] font-mono text-xs text-[#8A99A8]">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-[#83CFE0] flex-shrink-0" />
            <span>FalkorDB Sub-Millisecond Graph Traversal</span>
          </div>
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-[#D8C99A] flex-shrink-0" />
            <span>Autonomous Tool-Calling Agent Loop (Gemini 2.0)</span>
          </div>
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-[#C68A69] flex-shrink-0" />
            <span>Evidence Provenance &amp; Contradiction Audit Logs</span>
          </div>
        </div>

        <div className="relative z-10 font-mono text-[11px] text-[#6B7A85]">
          Graph Hacks 2026 &mdash; Track 1: Agents That Act on Connected Data
        </div>
      </div>

      {/* ── Right Authentication Panel (approx 48% on Desktop) ────── */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10 lg:p-16">
        <div className="w-full max-w-md space-y-6">
          {/* Mobile Header */}
          <div className="lg:hidden text-center space-y-2 mb-6">
            <Link to="/" className="inline-flex items-center gap-2">
              <Shield className="w-5 h-5 text-[#83CFE0]" />
              <span className="font-heading font-bold text-base text-[#F3F4F0]">ThreatGraph AI</span>
            </Link>
            <p className="text-[#8A99A8] text-xs font-mono">Connected-Data Security Intelligence</p>
          </div>

          <div className="space-y-1">
            <h2 className="font-heading text-2xl font-bold text-[#F3F4F0]">Analyst Portal Access</h2>
            <p className="text-[#8A99A8] text-xs font-mono">
              Sign in with your credentials to access the SOC workspace
            </p>
          </div>

          {/* Guest Mode Evaluation Banner */}
          <div className="border border-[#1E2D38] bg-[#101923] p-4 rounded-sm flex items-center justify-between gap-3 shadow-sm">
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5 text-xs font-mono text-[#83CFE0] font-semibold">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Instant Analyst Access</span>
              </div>
              <p className="text-[11px] text-[#8A99A8]">
                Evaluate the platform directly as a guest analyst.
              </p>
            </div>
            <button
              type="button"
              onClick={handleGuestLogin}
              className="btn-primary text-xs py-1.5 px-3 whitespace-nowrap"
            >
              Guest Analyst
            </button>
          </div>

          {!configured && (
            <div className="text-[11px] text-[#C68A69] font-mono bg-[#C68A69]/10 border border-[#C68A69]/30 p-2.5 rounded-sm">
              Note: Supabase credentials not set in .env. Guest Analyst mode is fully enabled.
            </div>
          )}

          {error && (
            <div className="bg-[#DC666B]/10 border border-[#DC666B]/35 text-[#DC666B] text-xs p-3 rounded-sm flex items-center gap-2 font-mono">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-mono text-[#8A99A8] mb-1.5">
                Work Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#6B7A85] absolute left-3 top-3 pointer-events-none" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="analyst@threatgraph.ai"
                  className="input-cyber pl-9 w-full bg-[#101923] border border-[#1E2D38] rounded-sm py-2 px-3 text-xs text-[#F3F4F0] placeholder-[#6B7A85] focus:outline-none focus:border-[#83CFE0]"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-mono text-[#8A99A8]">
                  Password
                </label>
                <Link to="/reset-password" className="text-[11px] font-mono text-[#83CFE0] hover:underline">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#6B7A85] absolute left-3 top-3 pointer-events-none" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="input-cyber pl-9 pr-10 w-full bg-[#101923] border border-[#1E2D38] rounded-sm py-2 px-3 text-xs text-[#F3F4F0] placeholder-[#6B7A85] focus:outline-none focus:border-[#83CFE0]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-[#6B7A85] hover:text-[#F3F4F0] p-0.5"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full text-xs py-2.5 mt-2 flex items-center justify-center gap-2"
            >
              <span>{loading ? 'Authenticating...' : 'Sign In with Supabase'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>

          <div className="pt-4 border-t border-[#1E2D38] flex items-center justify-between text-xs text-[#8A99A8] font-mono">
            <span>New analyst?</span>
            <Link to="/signup" className="text-[#83CFE0] hover:underline">
              Create an account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
