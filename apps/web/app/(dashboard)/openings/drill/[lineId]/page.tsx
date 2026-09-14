'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Chess, Square } from '@chesswise/chess-core';
import ChessBoard from '@/components/chess/chess-board';
import { cn } from '@/lib/utils';

interface OpeningLine {
  id: string;
  eco: string;
  name: string;
  moves: string;
}

export default function DrillPage() {
  const params = useParams();
  const router = useRouter();
  const lineId = params?.lineId as string;

  const [line, setLine] = useState<OpeningLine | null>(null);
  const [loading, setLoading] = useState(true);
  const [fen, setFen] = useState('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');

  const [repMoves, setRepMoves] = useState<string[]>([]);
  const [plyIndex, setPlyIndex] = useState(0);
  const [status, setStatus] = useState<'IDLE' | 'CORRECT' | 'WRONG' | 'DONE'>('IDLE');
  const [wrongSan, setWrongSan] = useState<string | null>(null);

  // We maintain an internal chess.js instance just for validation
  const chessRef = useRef(new Chess());

  useEffect(() => {
    fetch(`/api/openings/${lineId}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.line) {
          setLine(d.line);
          const moves = d.line.moves.split(' ').filter(Boolean);
          setRepMoves(moves);

          // Determine if first move is by the opponent (e.g. if we want to practice as Black)
          // For now, we assume the user is practicing from the start of the line.
          // If the repertoire line was played by White, user is White.
          // In drill mode, we just alternate. 0 = User, 1 = Opponent, etc.
          // Wait, this assumes the user always plays White!
          // If the user wants to practice a Black response (e.g. "e4 e5"), they need the board flipped
          // and auto-play the first move.
          // How do we know user color?
          // Heuristic: If we auto-play the first move, user is black. But how do we decide?
          // For now, we assume the user is White unless they toggle it.
        }
        setLoading(false);
      });
  }, [lineId]);

  const reset = () => {
    chessRef.current.reset();
    setFen(chessRef.current.fen());
    setPlyIndex(0);
    setStatus('IDLE');
    setWrongSan(null);
  };

  const handleMove = (from: Square, to: Square, promotion?: string) => {
    if (status === 'DONE' || status === 'WRONG') return;

    const expectedSan = repMoves[plyIndex];
    if (!expectedSan) return;

    const chess = chessRef.current;

    // Try the move
    try {
      const move = chess.move({ from, to, promotion });
      const playedSan = move.san;

      if (playedSan === expectedSan) {
        // Correct!
        setFen(chess.fen());
        setPlyIndex((prev) => prev + 1);
        setStatus('CORRECT');

        // Auto-play opponent's next move after a short delay
        if (plyIndex + 1 < repMoves.length) {
          setTimeout(() => {
            const oppMove = repMoves[plyIndex + 1];
            if (!oppMove) return;
            chess.move(oppMove);
            setFen(chess.fen());
            setPlyIndex((prev) => prev + 1);
            setStatus('IDLE');

            if (plyIndex + 2 >= repMoves.length) {
              setStatus('DONE');
            }
          }, 600);
        } else {
          setStatus('DONE');
        }
      } else {
        // Wrong move!
        chess.undo(); // revert
        setWrongSan(playedSan);
        setStatus('WRONG');
      }
    } catch {
      // Invalid move
    }
  };

  const retryPly = () => {
    setStatus('IDLE');
    setWrongSan(null);
  };

  if (loading) return <div className="animate-pulse">Loading drill...</div>;
  if (!line) return <div>Line not found</div>;

  const expectedMove = repMoves[plyIndex];
  const orientation = 'white'; // Hardcoded to white for now, can add toggle

  return (
    <div className="max-w-4xl space-y-6 pb-20">
      <div>
        <button
          onClick={() => router.push('/openings')}
          className="mb-4 text-xs text-muted-foreground hover:text-foreground"
        >
          ← Back to Repertoire
        </button>
        <h1 className="font-serif text-2xl font-bold text-foreground">Drill: {line.name}</h1>
        <p className="mt-1 font-mono text-sm text-muted-foreground">
          {line.eco} · {line.moves}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
        <div className="md:col-span-2">
          <div className="relative overflow-hidden rounded-xl border border-border shadow-2xl">
            <ChessBoard
              fen={fen}
              orientation={orientation}
              onMove={handleMove}
              interactive={status === 'IDLE' || status === 'CORRECT'}
            />

            {/* Status overlay */}
            {status === 'DONE' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 p-6 text-center backdrop-blur-sm duration-300 animate-in fade-in zoom-in">
                <div className="mb-4 rounded-full bg-good/20 p-4">
                  <span className="text-4xl">🏆</span>
                </div>
                <h3 className="text-2xl font-bold text-good">Line Completed!</h3>
                <p className="mt-2 text-muted-foreground">
                  You successfully played all {repMoves.length} plies.
                </p>
                <button
                  onClick={reset}
                  className="mt-6 rounded-lg bg-primary px-6 py-2 font-semibold text-primary-foreground hover:bg-primary/90"
                >
                  Drill Again
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="mb-4 font-semibold text-foreground">Progress</h3>

            <div className="flex flex-col gap-2">
              {repMoves.map((m, i) => {
                const isCurrent = i === plyIndex;
                const isPast = i < plyIndex;
                return (
                  <div key={i} className="flex items-center gap-3">
                    <div
                      className={cn(
                        'flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold transition-colors',
                        isPast
                          ? 'text-good-foreground bg-good'
                          : isCurrent && status === 'WRONG'
                            ? 'bg-destructive text-destructive-foreground'
                            : isCurrent
                              ? 'bg-primary text-primary-foreground ring-2 ring-primary/30 ring-offset-2 ring-offset-background'
                              : 'bg-muted text-muted-foreground',
                      )}
                    >
                      {isPast ? '✓' : Math.floor(i / 2) + 1}
                    </div>
                    <span
                      className={cn(
                        'font-mono text-sm',
                        isPast
                          ? 'text-good'
                          : isCurrent && status === 'WRONG'
                            ? 'font-bold text-destructive'
                            : isCurrent
                              ? 'font-bold text-primary'
                              : 'text-muted-foreground',
                      )}
                    >
                      {i % 2 === 0 ? 'White' : 'Black'}: {m}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {status === 'WRONG' && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-5 animate-in slide-in-from-right">
              <h3 className="flex items-center gap-2 font-semibold text-destructive">
                <span>❌</span> Incorrect Move
              </h3>
              <p className="mt-2 text-sm text-foreground/80">
                You played <strong className="font-mono">{wrongSan}</strong>, but your repertoire
                line is <strong className="font-mono">{expectedMove}</strong>.
              </p>
              <button
                onClick={retryPly}
                className="mt-4 w-full rounded-lg bg-destructive px-4 py-2 text-sm font-semibold text-destructive-foreground hover:bg-destructive/90"
              >
                Try Again
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
