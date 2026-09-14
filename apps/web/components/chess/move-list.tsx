'use client';

import { Move } from '@chesswise/chess-core';
import { cn } from '@/lib/utils';

interface MoveListProps {
  history: Move[];
  currentIndex?: number;
  onSeek?: (index: number) => void;
  className?: string;
}

export default function MoveList({ history, currentIndex = -1, onSeek, className }: MoveListProps) {
  // Group moves into pairs: [[white, black?], ...]
  const pairs: [Move, Move | null][] = [];
  for (let i = 0; i < history.length; i += 2) {
    pairs.push([history[i]!, history[i + 1] ?? null]);
  }

  if (pairs.length === 0) {
    return (
      <div
        className={cn(
          'flex items-center justify-center p-4 text-sm text-muted-foreground',
          className,
        )}
      >
        No moves yet
      </div>
    );
  }

  return (
    <div className={cn('overflow-y-auto font-mono text-sm', className)}>
      <table className="w-full">
        <tbody>
          {pairs.map(([white, black], pairIdx) => {
            const whiteIdx = pairIdx * 2;
            const blackIdx = pairIdx * 2 + 1;

            return (
              <tr key={pairIdx} className="border-b border-border/30 hover:bg-muted/20">
                {/* Move number */}
                <td className="w-8 px-2 py-1 text-right text-muted-foreground">{pairIdx + 1}.</td>

                {/* White move */}
                <td
                  className={cn(
                    'cursor-pointer rounded px-2 py-1 transition-colors',
                    whiteIdx === currentIndex
                      ? 'bg-[#C9A24B]/20 font-semibold text-[#C9A24B]'
                      : 'text-foreground hover:bg-muted/40',
                  )}
                  onClick={() => onSeek?.(whiteIdx)}
                >
                  {white.san}
                </td>

                {/* Black move */}
                <td
                  className={cn(
                    'cursor-pointer rounded px-2 py-1 transition-colors',
                    black
                      ? blackIdx === currentIndex
                        ? 'bg-[#C9A24B]/20 font-semibold text-[#C9A24B]'
                        : 'text-foreground hover:bg-muted/40'
                      : 'text-muted-foreground',
                  )}
                  onClick={() => black && onSeek?.(blackIdx)}
                >
                  {black?.san ?? ''}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
