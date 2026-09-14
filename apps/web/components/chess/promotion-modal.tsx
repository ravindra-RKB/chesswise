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
      className="absolute inset-0 z-50 flex items-center justify-center rounded bg-black/70"
      onClick={onCancel}
    >
      <div
        className="flex gap-2 rounded-lg border border-border bg-card p-3 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="absolute -top-6 left-0 whitespace-nowrap text-xs text-muted-foreground">
          Choose promotion piece
        </p>
        {pieces.map((p) => (
          <button
            key={p.value}
            onClick={() => onSelect(p.value)}
            className={cn(
              'flex h-14 w-14 flex-col items-center justify-center rounded-md',
              'border border-border hover:border-[#C9A24B] hover:bg-[#C9A24B]/10',
              'cursor-pointer text-4xl transition-colors',
            )}
            title={p.name}
          >
            {p.symbol}
            <span className="mt-1 text-[9px] text-muted-foreground">{p.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
