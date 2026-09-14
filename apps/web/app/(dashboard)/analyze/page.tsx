'use client';

import { useState, useEffect } from 'react';
import { Square } from '@chesswise/chess-core';
import { useChess } from '@/hooks/use-chess';
import { useEngine } from '@/hooks/use-engine';
import ChessBoard from '@/components/chess/chess-board';
import EvalBar from '@/components/chess/eval-bar';
import MoveList from '@/components/chess/move-list';

export default function AnalyzePage() {
  const chess = useChess();
  const engine = useEngine({ depth: 20 });

  const [fenInput, setFenInput] = useState('');
  const [pgnInput, setPgnInput] = useState('');
  const [inputError, setInputError] = useState('');
  const [orientation, setOrientation] = useState<'white' | 'black'>('white');

  // Continuously analyze whenever position changes
  useEffect(() => {
    if (engine.isReady) {
      engine.analyzePosition(chess.fen);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chess.fen, engine.isReady]);

  const handleLoadFen = () => {
    setInputError('');
    const ok = chess.loadFen(fenInput.trim());
    if (!ok) setInputError('Invalid FEN string');
    else setFenInput('');
  };

  const handleLoadPgn = () => {
    setInputError('');
    const ok = chess.loadPgn(pgnInput.trim());
    if (!ok) setInputError('Invalid PGN string');
    else setPgnInput('');
  };

  const lastMove =
    chess.history.length > 0
      ? {
          from: chess.history[chess.history.length - 1]!.from as Square,
          to: chess.history[chess.history.length - 1]!.to as Square,
        }
      : null;

  const evalLabel = engine.evaluation
    ? engine.evaluation.type === 'mate'
      ? `M${Math.abs(engine.evaluation.value)}`
      : (engine.evaluation.value / 100).toFixed(2)
    : '0.00';

  return (
    <div className="flex h-full flex-col gap-6 lg:flex-row">
      {/* Board + Eval Bar */}
      <div className="flex flex-1 items-start justify-center gap-3">
        <EvalBar
          type={engine.evaluation?.type ?? 'cp'}
          value={engine.evaluation?.value ?? 0}
          orientation={orientation}
          className="h-[min(80vw,80vh,560px)] self-center"
        />
        <ChessBoard
          fen={chess.fen}
          orientation={orientation}
          lastMove={lastMove}
          onMove={(from, to, promotion) =>
            chess.makeMove(
              from as Square,
              to as Square,
              promotion as 'q' | 'r' | 'b' | 'n' | undefined,
            )
          }
          interactive
        />
      </div>

      {/* Side panel */}
      <div className="flex w-full flex-col gap-4 lg:w-80">
        {/* Eval display */}
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">Evaluation</h3>
            {engine.thinking && (
              <span className="animate-pulse text-xs text-muted-foreground">thinking...</span>
            )}
          </div>
          <p className="mt-1 font-mono text-3xl font-bold text-[#C9A24B]">{evalLabel}</p>

          {/* Top engine lines */}
          {engine.pv.length > 0 && (
            <div className="mt-3 space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Best line
              </p>
              <p className="break-words font-mono text-xs leading-relaxed text-foreground/70">
                {engine.pv.slice(0, 8).join(' ')}
              </p>
            </div>
          )}
        </div>

        {/* FEN / PGN input */}
        <div className="space-y-3 rounded-lg border border-border bg-card p-4">
          <h3 className="text-sm font-semibold text-foreground">Load Position</h3>

          <div className="space-y-2">
            <label className="text-xs text-muted-foreground">FEN</label>
            <div className="flex gap-2">
              <input
                value={fenInput}
                onChange={(e) => setFenInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleLoadFen()}
                placeholder="Paste FEN string..."
                className="flex-1 rounded border border-border bg-background px-2 py-1 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              />
              <button
                onClick={handleLoadFen}
                className="rounded bg-primary px-2 py-1 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
              >
                Load
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs text-muted-foreground">PGN</label>
            <textarea
              value={pgnInput}
              onChange={(e) => setPgnInput(e.target.value)}
              placeholder="Paste PGN string..."
              rows={3}
              className="w-full resize-none rounded border border-border bg-background px-2 py-1 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
            <button
              onClick={handleLoadPgn}
              className="w-full rounded bg-muted px-2 py-1 text-xs font-semibold text-foreground hover:bg-muted/80"
            >
              Load PGN
            </button>
          </div>

          {inputError && <p className="text-xs text-[#9B3B3B]">{inputError}</p>}
        </div>

        {/* Move list + controls */}
        <div className="flex flex-1 flex-col overflow-hidden rounded-lg border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-4 py-2">
            <h3 className="text-sm font-semibold text-foreground">Moves</h3>
            <div className="flex gap-2">
              <button
                onClick={() => setOrientation((o) => (o === 'white' ? 'black' : 'white'))}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Flip
              </button>
              <button
                onClick={() => chess.resetGame()}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Reset
              </button>
            </div>
          </div>
          <MoveList
            history={chess.history}
            currentIndex={chess.historyIndex}
            onSeek={chess.seekTo}
            className="flex-1 p-2"
          />
        </div>
      </div>
    </div>
  );
}
