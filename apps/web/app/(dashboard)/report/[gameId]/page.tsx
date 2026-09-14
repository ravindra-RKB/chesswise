'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Square } from '@chesswise/chess-core';
import { useChess } from '@/hooks/use-chess';
import ChessBoard from '@/components/chess/chess-board';
import { AnnotationGlyph } from '@/components/chess/annotation-glyph';
import { cn } from '@/lib/utils';

type MoveQuality = 'BRILLIANT' | 'EXCELLENT' | 'GOOD' | 'INACCURACY' | 'MISTAKE' | 'BLUNDER';

const QUALITY_GLYPH: Record<MoveQuality, '!!' | '!' | '!?' | '?!' | '?' | '??'> = {
  BRILLIANT: '!!',
  EXCELLENT: '!',
  GOOD: '!?',
  INACCURACY: '?!',
  MISTAKE: '?',
  BLUNDER: '??',
};

interface GameMove {
  id: string;
  moveNumber: number;
  color: string;
  san: string;
  uci: string;
  fenBefore: string;
  evalBefore: number | null;
  evalAfter: number | null;
  evalDelta: number | null;
  quality: MoveQuality | null;
  tacticTag: string | null;
  bestMoveSan: string | null;
  explanation: string | null;
}

interface Game {
  id: string;
  pgn: string;
  headers: Record<string, string>;
  status: string;
  accuracy: number | null;
  moves: GameMove[];
}

// SVG Eval Graph
function EvalGraph({
  moves,
  currentIdx,
  onSeek,
}: {
  moves: GameMove[];
  currentIdx: number;
  onSeek: (idx: number) => void;
}) {
  const W = 100,
    H = 60;
  const points = moves.map((m, i) => {
    const cp = m.evalAfter ?? 0;
    const clamped = Math.max(-800, Math.min(800, cp));
    const x = (i / Math.max(1, moves.length - 1)) * W;
    const y = H / 2 - (clamped / 800) * (H / 2);
    return { x, y, move: m, idx: i };
  });

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaWhiteD =
    points.length > 1
      ? `M 0 ${H / 2} ${points.map((p) => `L ${p.x} ${Math.min(p.y, H / 2)}`).join(' ')} L ${W} ${H / 2} Z`
      : '';
  const areaBlackD =
    points.length > 1
      ? `M 0 ${H / 2} ${points.map((p) => `L ${p.x} ${Math.max(p.y, H / 2)}`).join(' ')} L ${W} ${H / 2} Z`
      : '';

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="h-24 w-full overflow-hidden rounded-lg border border-border"
      preserveAspectRatio="none"
    >
      {/* Background */}
      <rect width={W} height={H} fill="#1D2229" />
      {/* Centre line */}
      <line x1={0} y1={H / 2} x2={W} y2={H / 2} stroke="#4a3728" strokeWidth="0.5" />
      {/* White advantage area */}
      <path d={areaWhiteD} fill="#EDE6D650" />
      {/* Black advantage area */}
      <path d={areaBlackD} fill="#12151a80" />
      {/* Eval line */}
      <path d={pathD} fill="none" stroke="#C9A24B" strokeWidth="0.8" />
      {/* Blunder dots */}
      {points
        .filter((p) => p.move.quality === 'BLUNDER')
        .map((p) => (
          <circle key={p.idx} cx={p.x} cy={p.y} r={1.5} fill="#9B3B3B" />
        ))}
      {/* Current position indicator */}
      {points[currentIdx] && (
        <line
          x1={points[currentIdx]!.x}
          y1={0}
          x2={points[currentIdx]!.x}
          y2={H}
          stroke="#C9A24B"
          strokeWidth="0.5"
          strokeDasharray="2"
        />
      )}
      {/* Click zones */}
      {points.map((p) => (
        <rect
          key={p.idx}
          x={p.x - W / moves.length / 2}
          y={0}
          width={W / moves.length}
          height={H}
          fill="transparent"
          className="cursor-pointer"
          onClick={() => onSeek(p.idx)}
        />
      ))}
    </svg>
  );
}

// Mistake Card
function MistakeCard({ move, onTryIt }: { move: GameMove; onTryIt: (fen: string) => void }) {
  const glyph = move.quality ? QUALITY_GLYPH[move.quality] : null;

  return (
    <div className="space-y-2 rounded-lg border border-border bg-card p-4">
      <div className="flex items-center gap-2">
        {glyph && <AnnotationGlyph type={glyph} />}
        <span className="font-mono text-sm font-semibold text-foreground">
          {Math.ceil(move.moveNumber)}
          {move.color === 'w' ? '.' : '...'} {move.san}
        </span>
        {move.tacticTag && (
          <span className="ml-auto rounded bg-muted px-2 py-0.5 text-[10px] capitalize text-muted-foreground">
            {move.tacticTag.replace(/_/g, ' ')}
          </span>
        )}
      </div>

      {move.bestMoveSan && (
        <p className="text-xs text-muted-foreground">
          Best: <span className="font-mono text-foreground">{move.bestMoveSan}</span>
          {move.evalDelta != null && (
            <span className="ml-2 text-destructive">
              ({(move.evalDelta / 100).toFixed(2)} eval swing)
            </span>
          )}
        </p>
      )}

      {move.explanation && (
        <p className="text-sm leading-relaxed text-foreground/80">{move.explanation}</p>
      )}

      <button
        onClick={() => onTryIt(move.fenBefore)}
        className="text-xs text-[#C9A24B] hover:underline"
      >
        Try it in Analysis →
      </button>
    </div>
  );
}

export default function ReportPage() {
  const params = useParams();
  const router = useRouter();
  const gameId = params?.gameId as string;

  const [game, setGame] = useState<Game | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentMoveIdx, setCurrentMoveIdx] = useState(-1);

  const chess = useChess();

  useEffect(() => {
    if (!gameId) return;
    fetch(`/api/games/${gameId}`)
      .then((r) => r.json())
      .then((data) => {
        setGame(data.game);
        if (data.game?.pgn) {
          chess.loadPgn(data.game.pgn);
          setCurrentMoveIdx(data.game.moves.length - 1);
        }
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameId]);

  const seekToMove = useCallback(
    (idx: number) => {
      setCurrentMoveIdx(idx);
      chess.seekTo(idx);
    },
    [chess],
  );

  const handleTryIt = (fen: string) => {
    router.push(`/analyze?fen=${encodeURIComponent(fen)}`);
  };

  if (loading) {
    return (
      <div className="flex h-64 animate-pulse items-center justify-center text-muted-foreground">
        Loading report...
      </div>
    );
  }

  if (!game) {
    return (
      <div className="mt-20 text-center text-muted-foreground">
        Game not found or not yet analyzed.
      </div>
    );
  }

  const h = game.headers;
  const mistakes = game.moves.filter((m) => m.quality === 'MISTAKE' || m.quality === 'BLUNDER');
  const currentMove = game.moves[currentMoveIdx];
  const lastMove =
    currentMoveIdx >= 0 && game.moves[currentMoveIdx]
      ? {
          from: game.moves[currentMoveIdx]!.uci.slice(0, 2) as Square,
          to: game.moves[currentMoveIdx]!.uci.slice(2, 4) as Square,
        }
      : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-serif text-xl font-bold text-foreground">
            {h['White'] ?? '?'} <span className="text-base text-muted-foreground">vs</span>{' '}
            {h['Black'] ?? '?'}
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {h['Date'] ?? ''} · {h['Result'] ?? ''} · {h['Event'] ?? 'Game'}
          </p>
        </div>
        {game.accuracy != null && (
          <div className="text-right">
            <p className="font-mono text-2xl font-bold text-[#C9A24B]">
              {game.accuracy.toFixed(1)}%
            </p>
            <p className="text-xs text-muted-foreground">Accuracy</p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[auto_1fr]">
        {/* Left: Board */}
        <div className="flex flex-col items-center gap-3">
          <ChessBoard fen={chess.fen} lastMove={lastMove} interactive={false} />
          {/* Move navigation */}
          <div className="flex items-center gap-2 text-sm">
            <button
              onClick={() => seekToMove(-1)}
              className="rounded border border-border px-2 py-1 text-muted-foreground hover:text-foreground"
            >
              ⏮
            </button>
            <button
              onClick={() => seekToMove(Math.max(-1, currentMoveIdx - 1))}
              className="rounded border border-border px-2 py-1 text-muted-foreground hover:text-foreground"
            >
              ◀
            </button>
            <span className="w-20 text-center text-xs text-muted-foreground">
              {currentMoveIdx >= 0 && currentMove
                ? `Move ${currentMove.moveNumber}${currentMove.color === 'b' ? '...' : '.'}`
                : 'Start'}
            </span>
            <button
              onClick={() => seekToMove(Math.min(game.moves.length - 1, currentMoveIdx + 1))}
              className="rounded border border-border px-2 py-1 text-muted-foreground hover:text-foreground"
            >
              ▶
            </button>
            <button
              onClick={() => seekToMove(game.moves.length - 1)}
              className="rounded border border-border px-2 py-1 text-muted-foreground hover:text-foreground"
            >
              ⏭
            </button>
          </div>
        </div>

        {/* Right: Analysis */}
        <div className="space-y-4">
          {/* Eval Graph */}
          {game.moves.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Evaluation Graph
              </p>
              <EvalGraph moves={game.moves} currentIdx={currentMoveIdx} onSeek={seekToMove} />
            </div>
          )}

          {/* Move list (compact inline scoresheet) */}
          <div className="overflow-hidden rounded-lg border border-border bg-card">
            <div className="border-b border-border px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Moves
            </div>
            <div className="max-h-48 overflow-y-auto p-2 font-mono text-sm">
              {Array.from({ length: Math.ceil(game.moves.length / 2) }).map((_, pairIdx) => {
                const wMove = game.moves[pairIdx * 2];
                const bMove = game.moves[pairIdx * 2 + 1];
                return (
                  <span key={pairIdx} className="inline">
                    <span className="text-muted-foreground">{pairIdx + 1}. </span>
                    {wMove && (
                      <button
                        onClick={() => seekToMove(pairIdx * 2)}
                        className={cn(
                          'rounded px-0.5 transition-colors',
                          currentMoveIdx === pairIdx * 2
                            ? 'bg-[#C9A24B]/20 text-[#C9A24B]'
                            : 'hover:bg-muted/40',
                        )}
                      >
                        {wMove.san}
                        {wMove.quality &&
                          wMove.quality !== 'EXCELLENT' &&
                          wMove.quality !== 'GOOD' && (
                            <sup className="ml-0.5 text-[9px]">{QUALITY_GLYPH[wMove.quality]}</sup>
                          )}
                      </button>
                    )}{' '}
                    {bMove && (
                      <button
                        onClick={() => seekToMove(pairIdx * 2 + 1)}
                        className={cn(
                          'rounded px-0.5 transition-colors',
                          currentMoveIdx === pairIdx * 2 + 1
                            ? 'bg-[#C9A24B]/20 text-[#C9A24B]'
                            : 'hover:bg-muted/40',
                        )}
                      >
                        {bMove.san}
                        {bMove.quality &&
                          bMove.quality !== 'EXCELLENT' &&
                          bMove.quality !== 'GOOD' && (
                            <sup className="ml-0.5 text-[9px]">{QUALITY_GLYPH[bMove.quality]}</sup>
                          )}
                      </button>
                    )}{' '}
                  </span>
                );
              })}
            </div>
          </div>

          {/* Mistake cards */}
          {mistakes.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Mistakes & Blunders ({mistakes.length})
              </p>
              <div className="max-h-96 space-y-2 overflow-y-auto">
                {mistakes.map((m) => (
                  <MistakeCard key={m.id} move={m} onTryIt={handleTryIt} />
                ))}
              </div>
            </div>
          )}

          {mistakes.length === 0 && game.status === 'PROFILE_UPDATED' && (
            <div className="rounded-lg border border-good/30 bg-good/10 px-4 py-3 text-sm text-good">
              🎉 No significant mistakes found. Excellent game!
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
