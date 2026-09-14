'use client';

import { cn } from '@/lib/utils';

interface EvalBarProps {
  type: 'cp' | 'mate';
  value: number; // positive = white advantage
  orientation?: 'white' | 'black';
  className?: string;
}

export default function EvalBar({ type, value, orientation = 'white', className }: EvalBarProps) {
  // Convert evaluation to a 0–100 percentage for white's advantage
  let whitePercent: number;

  if (type === 'mate') {
    whitePercent = value > 0 ? 95 : 5;
  } else {
    // Sigmoid: maps cp to 0–100, clamped
    const k = 0.004;
    whitePercent = 100 / (1 + Math.exp(-k * value));
    whitePercent = Math.max(5, Math.min(95, whitePercent));
  }

  const blackPercent = 100 - whitePercent;
  const displayWhite = orientation === 'white' ? whitePercent : blackPercent;

  // Label to show
  const label =
    type === 'mate'
      ? `M${Math.abs(value)}`
      : Math.abs(value) >= 100
        ? `${(value / 100).toFixed(1)}`
        : `${(value / 100).toFixed(2)}`;

  return (
    <div
      className={cn(
        'flex flex-col-reverse overflow-hidden rounded border border-border',
        'relative w-6',
        className,
      )}
      style={{ height: '100%' }}
      title={`Evaluation: ${type === 'mate' ? 'M' : ''}${value}`}
    >
      {/* White portion (bottom) */}
      <div
        className="flex w-full items-end justify-center bg-[#EDE6D6] pb-1 transition-all duration-500 ease-out"
        style={{ height: `${displayWhite}%` }}
      >
        {displayWhite > 20 && (
          <span className="writing-mode-vertical rotate-180 text-[9px] font-bold text-[#1D2229]">
            {value > 0 ? label : ''}
          </span>
        )}
      </div>

      {/* Black portion (top) */}
      <div
        className="flex w-full items-start justify-center bg-[#1D2229] pt-1 transition-all duration-500 ease-out"
        style={{ height: `${100 - displayWhite}%` }}
      >
        {100 - displayWhite > 20 && (
          <span className="text-[9px] font-bold text-[#EDE6D6]">{value < 0 ? label : ''}</span>
        )}
      </div>
    </div>
  );
}
