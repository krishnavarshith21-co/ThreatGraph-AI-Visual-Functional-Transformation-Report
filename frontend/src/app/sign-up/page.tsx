'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import {
  Shield, Lock, Mail, Eye, EyeOff, ArrowRight,
  AlertCircle, CheckCircle2
} from 'lucide-react';

export default function SignUpPage() {
  const { signUp, configured } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      const res = await signUp(email, password);
      if (res?.error) {
        setError(res.error);
      } else {
        setSuccess(true);
        setTimeout(() => router.push('/app'), 1500);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to create account');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#070A10] text-[#F3F4F0] flex flex-col lg:flex-row selection:bg-[#83D5E4] selection:text-[#070A10]">
      {/* ── Left Editorial Column (approx 52%) ─────────────────────── */}
      <div className="hidden lg:flex lg:w-[52%] bg-[#0B111A] border-r border-[#1A2732] p-12 xl:p-16 flex-col justify-between relative overflow-hidden">
        <div className="relative z-10 space-y-8">
          <Link href="/" className="inline-flex items-center gap-3 group">
            <div className="w-8 h-8 rounded bg-[#111B26] border border-[#1A2732] flex items-center justify-center group-hover:border-[#83D5E4] transition-colors">
              <Shield className="w-4 h-4 text-[#83D5E4]" />
            </div>
            <div>
              <span className="font-heading font-semibold text-sm tracking-tight text-[#F3F4F0]">ThreatGraph</span>
              <span className="font-mono text-[10px] text-[#83D5E4] uppercase ml-1.5 px-1 py-0.5 rounded bg-[#111B26] border border-[#1A2732]">AI</span>
            </div>
          </Link>

          <div className="space-y-4 max-w-lg pt-8">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded bg-[#111B26] border border-[#1A2732] text-[11px] font-mono text-[#83D5E4]">
              <span className="w-2 h-2 rounded-full bg-[#83D5E4] animate-pulse" />
              NEW OPERATIONAL ACCOUNT
            </div>

            <h1 className="font-heading text-4xl xl:text-5xl font-bold tracking-tight text-[#F3F4F0] leading-tight">
              Join the graph-powered <span className="text-[#83D5E4]">SOC revolution.</span>
            </h1>

            <p className="text-[#B4C0C8] text-sm leading-relaxed font-body">
              Provision your analyst credentials with role-based access to FalkorDB enterprise clusters, investigation workflows, and verifiable threat reports.
            </p>
          </div>
        </div>

        <div className="relative z-10 font-mono text-[11px] text-[#7D8B96]">
          Graph Hacks 2026 &mdash; Track 1: Agents That Act on Connected Data
        </div>
      </div>

      {/* ── Right Registration Panel (approx 48%) ─────────────────── */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10 lg:p-16">
        <div className="w-full max-w-md space-y-6">
          <div className="lg:hidden text-center space-y-2 mb-6">
            <Link href="/" className="inline-flex items-center gap-2">
              <Shield className="w-5 h-5 text-[#83D5E4]" />
              <span className="font-heading font-bold text-base text-[#F3F4F0]">ThreatGraph AI</span>
            </Link>
          </div>

          <div className="space-y-1">
            <h2 className="font-heading text-2xl font-bold text-[#F3F4F0]">Register Analyst Account</h2>
            <p className="text-[#7D8B96] text-xs font-mono">
              Create your credentials to access the SOC operations platform
            </p>
          </div>

          {error && (
            <div className="bg-[#DC666B]/10 border border-[#DC666B]/35 text-[#DC666B] text-xs p-3 rounded flex items-center gap-2 font-mono">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="bg-[#83D5E4]/10 border border-[#83D5E4]/35 text-[#83D5E4] text-xs p-3 rounded flex items-center gap-2 font-mono">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>Account provisioned! Redirecting to SOC console...</span>
            </div>
          )}

          {!configured && (
            <div className="text-[11px] text-[#C68A69] font-mono bg-[#C68A69]/10 border border-[#C68A69]/30 p-2.5 rounded">
              Note: Supabase credentials not set in .env. Account creation will register a local evaluation session.
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-mono text-[#7D8B96] mb-1.5">
                Work Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#7D8B96] absolute left-3 top-3 pointer-events-none" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="analyst@threatgraph.ai"
                  className="pl-9 w-full bg-[#0B111A] border border-[#1A2732] rounded py-2 px-3 text-xs text-[#F3F4F0] placeholder-[#7D8B96] focus:outline-none focus:border-[#83D5E4]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono text-[#7D8B96] mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#7D8B96] absolute left-3 top-3 pointer-events-none" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="pl-9 pr-10 w-full bg-[#0B111A] border border-[#1A2732] rounded py-2 px-3 text-xs text-[#F3F4F0] placeholder-[#7D8B96] focus:outline-none focus:border-[#83D5E4]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-[#7D8B96] hover:text-[#F3F4F0] p-0.5 cursor-pointer"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono text-[#7D8B96] mb-1.5">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#7D8B96] absolute left-3 top-3 pointer-events-none" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="pl-9 w-full bg-[#0B111A] border border-[#1A2732] rounded py-2 px-3 text-xs text-[#F3F4F0] placeholder-[#7D8B96] focus:outline-none focus:border-[#83D5E4]"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full text-xs py-2.5 mt-2 flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>{loading ? 'Creating Account...' : configured ? 'Register with Supabase' : 'Register (Evaluation / Demo Mode)'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>

          <div className="pt-4 border-t border-[#1A2732] flex items-center justify-between text-xs text-[#7D8B96] font-mono">
            <span>Already have an account?</span>
            <Link href="/sign-in" className="text-[#83D5E4] hover:underline">
              Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
