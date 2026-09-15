'use client';

import { useState, useEffect } from 'react';

export default function PricingPage() {
  const [isPro, setIsPro] = useState(false);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState(false);

  useEffect(() => {
    fetch('/api/checkout')
      .then((r) => r.json())
      .then((d) => setIsPro(d.isPro))
      .finally(() => setLoading(false));
  }, []);

  const handleUpgrade = async () => {
    setUpgrading(true);
    // Simulate Dodo Payments checkout flow
    setTimeout(async () => {
      const res = await fetch('/api/checkout', { method: 'POST' });
      if (res.ok) setIsPro(true);
      setUpgrading(false);
    }, 1500);
  };

  if (loading) return <div className="animate-pulse text-muted-foreground">Loading pricing...</div>;

  return (
    <div className="mx-auto max-w-5xl space-y-12 pb-10">
      <div className="space-y-4 pt-10 text-center">
        <h1 className="font-serif text-4xl font-bold text-foreground">Upgrade to Chesswise Pro</h1>
        <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
          Unlock unlimited AI coaching, deep multi-variation analysis, and exclusive Mirror Bot
          personalities.
        </p>
      </div>

      <div className="mx-auto grid max-w-4xl gap-8 md:grid-cols-2">
        {/* Basic Tier */}
        <div className="flex flex-col rounded-2xl border border-border bg-card p-8">
          <div className="mb-6">
            <h3 className="text-2xl font-bold text-foreground">Basic</h3>
            <div className="mt-4 text-4xl font-bold text-foreground">
              $0<span className="text-lg font-normal text-muted-foreground">/month</span>
            </div>
          </div>
          <ul className="mb-8 flex-1 space-y-4">
            <li className="flex items-start gap-3">
              <span className="text-muted-foreground">✓</span>
              <span className="text-foreground/80">Play vs AI (Standard difficulties)</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-muted-foreground">✓</span>
              <span className="text-foreground/80">3 AI Coach questions per day</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-muted-foreground">✓</span>
              <span className="text-foreground/80">Basic Game Analysis</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-muted-foreground">✓</span>
              <span className="text-foreground/80">Earn XP and Level Up</span>
            </li>
          </ul>
          <button
            disabled
            className="w-full rounded-lg bg-muted px-4 py-3 font-semibold text-muted-foreground"
          >
            Current Plan
          </button>
        </div>

        {/* Pro Tier */}
        <div className="relative flex flex-col rounded-2xl border-2 border-primary bg-primary/5 p-8">
          <div className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary px-3 py-1 text-xs font-bold uppercase tracking-wider text-primary-foreground">
            Recommended
          </div>
          <div className="mb-6">
            <h3 className="text-2xl font-bold text-primary">Pro</h3>
            <div className="mt-4 text-4xl font-bold text-foreground">
              $9<span className="text-lg font-normal text-muted-foreground">/month</span>
            </div>
          </div>
          <ul className="mb-8 flex-1 space-y-4">
            <li className="flex items-start gap-3">
              <span className="text-primary">✓</span>
              <span className="font-medium text-foreground">Unlimited AI Coach questions</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-primary">✓</span>
              <span className="font-medium text-foreground">
                Deep Cloud Engine Analysis (Stockfish 16)
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-primary">✓</span>
              <span className="font-medium text-foreground">
                Mirror Bot (Personalized weaknesses)
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-primary">✓</span>
              <span className="font-medium text-foreground">Priority PvP Matchmaking</span>
            </li>
          </ul>

          {isPro ? (
            <button
              disabled
              className="w-full rounded-lg border border-[#C9A24B]/30 bg-[#C9A24B]/20 px-4 py-3 font-semibold text-[#C9A24B]"
            >
              You are Pro!
            </button>
          ) : (
            <button
              onClick={handleUpgrade}
              disabled={upgrading}
              className="w-full rounded-lg bg-primary px-4 py-3 font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              {upgrading ? 'Processing...' : 'Upgrade Now (Dodo Payments)'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
