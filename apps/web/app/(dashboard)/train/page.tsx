'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Square } from '@chesswise/chess-core';
import { useChess } from '@/hooks/use-chess';
import ChessBoard from '@/components/chess/chess-board';
import { cn } from '@/lib/utils';

type MoveQuality = 'BRILLIANT' | 'EXCELLENT' | 'GOOD' | 'INACCURACY' | 'MISTAKE' | 'BLUNDER';

interface PuzzleGameMove {
  san: string;
  quality: MoveQuality | null;
  tacticTag: string | null;
  bestMoveSan: string | null;
  explanation: string | null;
  fenBefore: string;
}

interface PuzzleGame {
  headers: Record<string, string>;
  id: string;
}

interface Puzzle {
  id: string;
  fen: string;
  solution: string; // best move UCI e.g. "e2e4"
  quality: MoveQuality;
  gameMove: PuzzleGameMove;
  game: PuzzleGame;
}

type PuzzleState = 'thinking' | 'correct' | 'wrong' | 'revealed';

function uciToFromTo(uci: string): { from: Square; to: Square; promotion?: string } {
  return {
    from: uci.slice(0, 2) as Square,
    to: uci.slice(2, 4) as Square,
    promotion: uci[4],
  };
}

// Progress ring SVG
function ProgressRing({ done, total }: { done: number; total: number }) {
  const r = 28;
  const circumference = 2 * Math.PI * r;
  const pct = total === 0 ? 0 : done / total;
  const offset = circumference * (1 - pct);

  return (
    <svg width={70} height={70} viewBox="0 0 70 70">
      <circle cx={35} cy={35} r={r} fill="none" stroke="#1D2229" strokeWidth={6} />
      <circle
        cx={35}
        cy={35}
        r={r}
        fill="none"
        stroke="#C9A24B"
        strokeWidth={6}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform="rotate(-90 35 35)"
        className="transition-all duration-500"
      />
      <text
        x={35}
        y={35}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={13}
        fill="#EDE6D6"
        fontWeight="bold"
      >
        {done}/{total}
      </text>
    </svg>
  );
}

export default function TrainPage() {
  const router = useRouter();
  const [puzzles, setPuzzles] = useState<Puzzle[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [state, setState] = useState<PuzzleState>('thinking');
  const [solvedCount, setSolvedCount] = useState(0);
  const [stats, setStats] = useState<{ dueToday: number; streak: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<string>('');
  const [showExplanation, setShowExplanation] = useState(false);

  const chess = useChess();

  useEffect(() => {
    Promise.all([
      fetch('/api/puzzles').then((r) => r.json()),
      fetch('/api/puzzles/stats').then((r) => r.json()),
    ])
      .then(([puzzleData, statsData]) => {
        setPuzzles(puzzleData.puzzles ?? []);
        setStats(statsData);
        if (puzzleData.puzzles?.length > 0) {
          chess.loadFen(puzzleData.puzzles[0].fen);
        }
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const currentPuzzle = puzzles[currentIdx];

  const handleMove = useCallback(
    async (from: Square, to: Square, promotion?: string) => {
      if (!currentPuzzle || state !== 'thinking') return;

      const playedUci = `${from}${to}${promotion ?? ''}`;
      const solutionUci = currentPuzzle.solution;

      // Normalise: solution may or may not have promotion suffix
      const isCorrect =
        playedUci === solutionUci || playedUci.slice(0, 4) === solutionUci.slice(0, 4);

      // Apply the move visually
      const result = chess.makeMove(from, to, promotion as any);
      if (!result) return; // illegal move

      if (isCorrect) {
        setState('correct');
        setSolvedCount((c) => c + 1);
        setFeedback('✅ Correct! Well played.');
        setShowExplanation(true);
        await submitSolve(currentPuzzle.id, true);
      } else {
        setState('wrong');
        setFeedback('❌ Not quite — that was the mistake. Try again or reveal the answer.');
        // Undo the wrong move after a moment
        setTimeout(() => {
          chess.loadFen(currentPuzzle.fen);
          setState('thinking');
        }, 1200);
        await submitSolve(currentPuzzle.id, false);
      }
    },
    [currentPuzzle, state, chess],
  );

  const submitSolve = async (puzzleId: string, correct: boolean) => {
    await fetch(`/api/puzzles/${puzzleId}/solve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ correct }),
    });
  };

  const revealSolution = () => {
    if (!currentPuzzle) return;
    const { from, to, promotion } = uciToFromTo(currentPuzzle.solution);
    chess.makeMove(from, to, promotion as any);
    setState('revealed');
    setFeedback(
      `💡 The answer was: ${currentPuzzle.gameMove.bestMoveSan ?? currentPuzzle.solution}`,
    );
    setShowExplanation(true);
  };

  const nextPuzzle = () => {
    const next = currentIdx + 1;
    if (next >= puzzles.length) {
      setCurrentIdx(puzzles.length); // trigger done screen
    } else {
      setCurrentIdx(next);
      setState('thinking');
      setFeedback('');
      setShowExplanation(false);
      chess.loadFen(puzzles[next]!.fen);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 animate-pulse items-center justify-center text-muted-foreground">
        Loading your puzzles...
      </div>
    );
  }

  // Done screen
  if (puzzles.length === 0 || currentIdx >= puzzles.length) {
    return (
      <div className="flex flex-col items-center justify-center gap-6 py-20 text-center">
        <div className="text-6xl">{puzzles.length === 0 ? '♟' : '🏆'}</div>
        <h2 className="font-serif text-2xl font-bold text-foreground">
          {puzzles.length === 0 ? 'No puzzles due today!' : 'All done for today!'}
        </h2>
        <p className="max-w-sm text-muted-foreground">
          {puzzles.length === 0
            ? 'Analyze a game to generate puzzles from your blunders, or come back tomorrow for new reviews.'
            : `You solved ${solvedCount} of ${puzzles.length} puzzles. Your next review will be scheduled automatically.`}
        </p>
        {stats && (
          <div className="mt-2 flex gap-6 text-center">
            <div>
              <p className="text-2xl font-bold text-[#C9A24B]">{stats.streak}</p>
              <p className="text-xs text-muted-foreground">Day Streak</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-[#C9A24B]">{solvedCount}</p>
              <p className="text-xs text-muted-foreground">Solved Today</p>
            </div>
          </div>
        )}
        <div className="flex gap-3">
          <button
            onClick={() => router.push('/import')}
            className="rounded-lg border border-border px-5 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Import a Game
          </button>
          <button
            onClick={() => router.push('/dashboard')}
            className="rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (!currentPuzzle) return null;

  const h = currentPuzzle.game.headers as Record<string, string>;
  const colorToPlay = currentPuzzle.fen.split(' ')[1] === 'w' ? 'White' : 'Black';

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      {/* Header bar */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-xl font-bold text-foreground">Daily Training</h1>
          <p className="mt-0.5 text-xs text-muted-foreground">
            From: {h['White'] ?? '?'} vs {h['Black'] ?? '?'} ·{' '}
            <button
              onClick={() => router.push(`/report/${currentPuzzle.game.id}`)}
              className="text-[#C9A24B] hover:underline"
            >
              View full game →
            </button>
          </p>
        </div>
        <div className="flex items-center gap-4">
          {stats && (
            <div className="text-center">
              <p className="text-lg font-bold text-[#C9A24B]">{stats.streak} 🔥</p>
              <p className="text-[10px] text-muted-foreground">streak</p>
            </div>
          )}
          <ProgressRing done={solvedCount} total={puzzles.length} />
        </div>
      </div>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[auto_1fr]">
        {/* Board */}
        <div className="space-y-3">
          <ChessBoard
            fen={chess.fen}
            orientation={colorToPlay === 'White' ? 'white' : 'black'}
            interactive={state === 'thinking'}
            onMove={handleMove}
          />
          {/* Orientation hint */}
          <p className="text-center text-xs text-muted-foreground">
            {colorToPlay} to move — find the best move
          </p>
        </div>

        {/* Right panel */}
        <div className="space-y-4">
          {/* Puzzle quality badge */}
          <div className="flex items-center gap-2">
            <span
              className={cn(
                'rounded px-2 py-0.5 text-xs font-bold uppercase tracking-wide',
                currentPuzzle.quality === 'BLUNDER'
                  ? 'bg-destructive/20 text-destructive'
                  : 'bg-[#9B3B3B]/20 text-[#C9A24B]',
              )}
            >
              {currentPuzzle.quality === 'BLUNDER' ? '?? Blunder to fix' : '? Mistake to fix'}
            </span>
            {currentPuzzle.gameMove.tacticTag && (
              <span className="rounded bg-muted px-2 py-0.5 text-xs capitalize text-muted-foreground">
                {currentPuzzle.gameMove.tacticTag.replace(/_/g, ' ')}
              </span>
            )}
          </div>

          {/* Instructions */}
          {state === 'thinking' && (
            <div className="space-y-2 rounded-lg border border-border bg-card p-4">
              <p className="text-sm font-medium text-foreground">
                In this position, {colorToPlay} played{' '}
                <span className="font-mono text-destructive">{currentPuzzle.gameMove.san}</span>,
                which was a {currentPuzzle.quality.toLowerCase()}.
              </p>
              <p className="text-sm text-muted-foreground">Find the best move that was missed.</p>
            </div>
          )}

          {/* Feedback */}
          {feedback && (
            <div
              className={cn(
                'rounded-lg border px-4 py-3 text-sm font-medium',
                state === 'correct'
                  ? 'border-good/40 bg-good/10 text-good'
                  : state === 'revealed'
                    ? 'border-[#C9A24B]/40 bg-[#C9A24B]/10 text-[#C9A24B]'
                    : 'border-destructive/40 bg-destructive/10 text-destructive',
              )}
            >
              {feedback}
            </div>
          )}

          {/* Coach explanation */}
          {showExplanation && currentPuzzle.gameMove.explanation && (
            <div className="space-y-2 rounded-lg border border-border bg-card p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Coach Note
              </p>
              <p className="text-sm leading-relaxed text-foreground/80">
                {currentPuzzle.gameMove.explanation}
              </p>
              <p className="text-[10px] text-muted-foreground/50">
                AI-generated — verify with a coach
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-wrap gap-3">
            {state === 'thinking' && (
              <button
                onClick={revealSolution}
                className="rounded-lg border border-border px-4 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                Reveal Answer
              </button>
            )}
            {(state === 'correct' || state === 'revealed') && (
              <button
                onClick={nextPuzzle}
                className="rounded-lg bg-primary px-6 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
              >
                {currentIdx + 1 < puzzles.length ? 'Next Puzzle →' : 'Finish Session'}
              </button>
            )}
          </div>

          {/* Progress dots */}
          <div className="flex flex-wrap gap-1.5">
            {puzzles.map((_, i) => (
              <div
                key={i}
                className={cn(
                  'h-2 w-2 rounded-full transition-colors',
                  i < currentIdx ? 'bg-[#C9A24B]' : i === currentIdx ? 'bg-foreground' : 'bg-muted',
                )}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
