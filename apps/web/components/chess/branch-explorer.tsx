'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Chess } from '@chesswise/chess-core';
import type { Square } from '@chesswise/chess-core';
import ChessBoard from '@/components/chess/chess-board';
import { useEngine } from '@/hooks/use-engine';
import { cn } from '@/lib/utils';

interface BranchExplorerProps {
  startFen: string;
  moveLabel: string; // e.g. "15. Nxe5"
  onClose: () => void;
}

export default function BranchExplorer({ startFen, moveLabel, onClose }: BranchExplorerProps) {
  const chessRef = useRef(new Chess());
  const [fen, setFen] = useState(startFen);
  const [branchHistory, setBranchHistory] = useState<string[]>([]);
  const engine = useEngine({ depth: 16, skillLevel: 20 });

  // Load starting position + trigger engine on mount
  useEffect(() => {
    chessRef.current.load(startFen);
    engine.analyzePosition(startFen);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startFen]);

  const handleMove = useCallback(
    (from: Square, to: Square, promotion?: string) => {
      try {
        const move = chessRef.current.move({
          from,
          to,
          promotion: promotion as 'q' | 'r' | 'b' | 'n' | undefined,
        });
        const newFen = chessRef.current.fen();
        setFen(newFen);
        setBranchHistory((h) => [...h, move.san]);
        engine.analyzePosition(newFen);
      } catch {
        // illegal move
      }
    },
    [engine],
  );

  const handleUndo = () => {
    chessRef.current.undo();
    const newFen = chessRef.current.fen();
    setFen(newFen);
    setBranchHistory((h) => h.slice(0, -1));
    engine.analyzePosition(newFen);
  };

  const handleReset = () => {
    chessRef.current.load(startFen);
    setFen(startFen);
    setBranchHistory([]);
    engine.analyzePosition(startFen);
  };

  // Format evaluation for display
  const evalStr = engine.evaluation
    ? engine.evaluation.type === 'mate'
      ? `M${engine.evaluation.value}`
      : `${(engine.evaluation.value / 100).toFixed(2)}`
    : '—';

  const evalColor =
    engine.evaluation && engine.evaluation.type === 'cp'
      ? engine.evaluation.value > 50
        ? 'text-good'
        : engine.evaluation.value < -50
          ? 'text-destructive'
          : 'text-muted-foreground'
      : 'text-muted-foreground';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm">
      <div className="w-full max-w-4xl overflow-hidden rounded-2xl border border-border bg-card shadow-2xl duration-200 animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-border px-5 py-4">
          <span className="text-lg">🔀</span>
          <div className="flex-1">
            <h3 className="font-semibold text-foreground">What-if Explorer</h3>
            <p className="text-xs text-muted-foreground">
              Branching from <span className="font-mono text-[#C9A24B]">{moveLabel}</span>
              {branchHistory.length > 0 && <span> → {branchHistory.join(' ')}</span>}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded p-1.5 text-muted-foreground hover:text-foreground"
          >
            ✕
          </button>
        </div>

        <div className="grid grid-cols-1 gap-0 md:grid-cols-2">
          {/* Board */}
          <div className="p-4">
            <div className="overflow-hidden rounded-xl border border-border shadow-lg">
              <ChessBoard fen={fen} orientation="white" onMove={handleMove} interactive={true} />
            </div>
          </div>

          {/* Analysis panel */}
          <div className="flex flex-col gap-4 p-5">
            {/* Engine eval */}
            <div className="space-y-3 rounded-xl border border-border bg-muted/20 p-4">
              <div className="flex items-baseline justify-between">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Engine Evaluation
                </span>
                <span className={cn('font-mono text-xl font-bold', evalColor)}>
                  {engine.thinking ? <span className="animate-pulse text-sm">…</span> : evalStr}
                </span>
              </div>

              {engine.bestMove && (
                <div className="text-xs text-muted-foreground">
                  Best move:{' '}
                  <span className="font-mono font-medium text-foreground">{engine.bestMove}</span>
                </div>
              )}

              {engine.pv.length > 0 && (
                <div className="text-xs text-muted-foreground">
                  <span className="mb-1 block">Best line:</span>
                  <span className="font-mono leading-relaxed text-foreground/70">
                    {engine.pv.slice(0, 6).join(' ')}
                  </span>
                </div>
              )}
            </div>

            {/* Instructions */}
            <div className="space-y-1.5 rounded-xl border border-border bg-muted/10 p-4 text-sm text-muted-foreground">
              <p>
                🖱 <strong className="text-foreground">Click pieces</strong> to play moves on the
                branch board.
              </p>
              <p>🤖 Engine evaluates every position as you explore.</p>
              <p>💡 Try the move you actually played vs. the engine's suggestion.</p>
            </div>

            {/* Controls */}
            <div className="mt-auto flex gap-2">
              <button
                onClick={handleUndo}
                disabled={branchHistory.length === 0}
                className="flex-1 rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted/40 disabled:opacity-40"
              >
                ← Undo
              </button>
              <button
                onClick={handleReset}
                disabled={branchHistory.length === 0}
                className="flex-1 rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted/40 disabled:opacity-40"
              >
                Reset
              </button>
              <button
                onClick={onClose}
                className="flex-1 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
