'use client';

import { cn } from '@/lib/utils';

interface PromotionModalProps {
  color: 'w' | 'b';
  onSelect: (piece: string) => void;
  onCancel: () => void;
}

const WHITE_PIECES = [
  { symbol: '♕', value: 'q', name: 'Queen' },
  { symbol: '♖', value: 'r', name: 'Rook' },
  { symbol: '♗', value: 'b', name: 'Bishop' },
  { symbol: '♘', value: 'n', name: 'Knight' },
];

const BLACK_PIECES = [
  { symbol: '♛', value: 'q', name: 'Queen' },
  { symbol: '♜', value: 'r', name: 'Rook' },
  { symbol: '♝', value: 'b', name: 'Bishop' },
  { symbol: '♞', value: 'n', name: 'Knight' },
];

export default function PromotionModal({ color, onSelect, onCancel }: PromotionModalProps) {
  const pieces = color === 'w' ? WHITE_PIECES : BLACK_PIECES;

  return (
    <div
      className="absolute inset-0 z-50 flex items-center justify-center rounded bg-black/60 backdrop-blur-sm"
      onClick={onCancel}
    >
      <div
        className="relative flex flex-col items-center gap-3 rounded-xl border border-border bg-card p-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-sm font-medium text-muted-foreground">Choose promotion piece</p>
        <div className="flex gap-2">
          {pieces.map((p) => (
            <button
              key={p.value}
              onClick={() => onSelect(p.value)}
              className={cn(
                'flex h-20 w-20 flex-col items-center justify-center gap-1 rounded-lg',
                'border-2 border-transparent bg-background/50 hover:border-[#C9A24B] hover:bg-[#C9A24B]/10',
                'cursor-pointer transition-all',
              )}
              title={p.name}
            >
              <span
                className={cn(
                  'text-5xl leading-none drop-shadow-md',
                  color === 'w' ? 'text-white' : 'text-black',
                )}
              >
                {p.symbol}
              </span>
              <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                {p.name}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
