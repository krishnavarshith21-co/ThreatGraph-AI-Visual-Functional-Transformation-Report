'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import {
  Shield, Mail, ArrowRight, AlertCircle, CheckCircle2
} from 'lucide-react';

export default function ResetPasswordPage() {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await resetPassword(email);
      if (res?.error) {
        setError(res.error);
      } else {
        setSuccess(true);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to dispatch password recovery link');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#070C13] text-[#F3F4F0] flex flex-col lg:flex-row selection:bg-[#83CFE0] selection:text-[#070C13]">
      {/* ── Left Editorial Column (approx 52%) ─────────────────────── */}
      <div className="hidden lg:flex lg:w-[52%] bg-[#101923] border-r border-[#1E2D38] p-12 xl:p-16 flex-col justify-between relative overflow-hidden">
        <div className="relative z-10 space-y-8">
          <Link href="/" className="inline-flex items-center gap-3 group">
            <div className="w-8 h-8 rounded-sm bg-[#1A2732] border border-[#1E2D38] flex items-center justify-center group-hover:border-[#83CFE0] transition-colors">
              <Shield className="w-4 h-4 text-[#83CFE0]" />
            </div>
            <div>
              <span className="font-heading font-semibold text-sm tracking-tight text-[#F3F4F0]">ThreatGraph</span>
              <span className="font-mono text-[10px] text-[#83CFE0] uppercase ml-1.5 px-1 py-0.5 rounded-sm bg-[#1A2732] border border-[#1E2D38]">AI</span>
            </div>
          </Link>

          <div className="space-y-4 max-w-lg pt-8">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-sm bg-[#1A2732] border border-[#1E2D38] text-[11px] font-mono text-[#83CFE0]">
              <span className="w-2 h-2 rounded-full bg-[#83CFE0] animate-pulse" />
              IDENTITY RECOVERY PROTOCOL
            </div>

            <h1 className="font-heading text-4xl xl:text-5xl font-bold tracking-tight text-[#F3F4F0] leading-tight">
              Restore security <span className="text-[#83CFE0]">operations access.</span>
            </h1>

            <p className="text-[#8A99A8] text-sm leading-relaxed font-body">
              Provide your authorized enterprise email to receive encrypted authentication recovery instructions via Supabase identity verification.
            </p>
          </div>
        </div>

        <div className="relative z-10 font-mono text-[11px] text-[#6B7A85]">
          Graph Hacks 2026 &mdash; Track 1: Agents That Act on Connected Data
        </div>
      </div>

      {/* ── Right Recovery Panel (approx 48%) ─────────────────────── */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10 lg:p-16">
        <div className="w-full max-w-md space-y-6">
          <div className="lg:hidden text-center space-y-2 mb-6">
            <Link href="/" className="inline-flex items-center gap-2">
              <Shield className="w-5 h-5 text-[#83CFE0]" />
              <span className="font-heading font-bold text-base text-[#F3F4F0]">ThreatGraph AI</span>
            </Link>
          </div>

          <div className="space-y-1">
            <h2 className="font-heading text-2xl font-bold text-[#F3F4F0]">Reset Credentials</h2>
            <p className="text-[#8A99A8] text-xs font-mono">
              Enter your work email to receive password recovery instructions
            </p>
          </div>

          {error && (
            <div className="bg-[#DC666B]/10 border border-[#DC666B]/35 text-[#DC666B] text-xs p-3 rounded-sm flex items-center gap-2 font-mono">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="bg-[#83CFE0]/10 border border-[#83CFE0]/35 text-[#83CFE0] text-xs p-3 rounded-sm flex items-center gap-2 font-mono">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>Recovery instructions dispatched! Check your email.</span>
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
                  className="pl-9 w-full bg-[#101923] border border-[#1E2D38] rounded-sm py-2 px-3 text-xs text-[#F3F4F0] placeholder-[#6B7A85] focus:outline-none focus:border-[#83CFE0]"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full text-xs py-2.5 mt-2 flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>{loading ? 'Dispatching...' : 'Send Recovery Instructions'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>

          <div className="pt-4 border-t border-[#1E2D38] flex items-center justify-between text-xs text-[#8A99A8] font-mono">
            <span>Remembered your password?</span>
            <Link href="/sign-in" className="text-[#83CFE0] hover:underline">
              Back to Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
