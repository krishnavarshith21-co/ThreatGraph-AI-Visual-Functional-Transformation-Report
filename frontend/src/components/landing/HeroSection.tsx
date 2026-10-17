'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

import { DatacenterHero } from './hero/DatacenterHero';

interface HeroSectionProps {
  backendHealth: any;
}

export function HeroSection({ backendHealth }: HeroSectionProps) {
  const { user, signInAsGuest } = useAuth();
  const router = useRouter();

  const handleLaunchApp = (destination = '/app/investigations') => {
    if (!user) {
      signInAsGuest();
    }
    router.push(destination);
  };

  return (
    <section className="w-full pt-[68px] relative bg-[#070A10] overflow-hidden border-b border-[#162332]">
      {/* ── Ambient Background Lighting ─── */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[10%] left-[25%] w-[600px] h-[600px] bg-[#46D7F5]/[0.03] rounded-full blur-[140px]" />
        <div className="absolute top-[35%] right-[15%] w-[500px] h-[500px] bg-[#C68A69]/[0.02] rounded-full blur-[160px]" />
      </div>

      <DatacenterHero
        backendHealth={backendHealth}
        onLaunchApp={handleLaunchApp}
      />
    </section>
  );
}
