'use client';

import { useState, useEffect, useCallback } from 'react';
import { Square } from '@chesswise/chess-core';
import { useChess } from '@/hooks/use-chess';
import { useEngine } from '@/hooks/use-engine';
import ChessBoard from '@/components/chess/chess-board';
import MoveList from '@/components/chess/move-list';
import { cn } from '@/lib/utils';
import { getMirrorBotConfig, type SkillProfile } from '@/lib/mirror-bot';

const STATIC_DIFFICULTY_LEVELS = [
  { label: 'Beginner', elo: '~600', skillLevel: 0, depth: 5 },
  { label: 'Casual', elo: '~900', skillLevel: 5, depth: 8 },
  { label: 'Club', elo: '~1400', skillLevel: 10, depth: 12 },
  { label: 'Advanced', elo: '~1800', skillLevel: 15, depth: 16 },
  { label: 'Master', elo: '~2200+', skillLevel: 20, depth: 20 },
  { label: '🪞 Mirror', elo: 'Your nemesis', skillLevel: 10, depth: 14 },
] as const;

type DifficultyLevel = { label: string; elo: string; skillLevel: number; depth: number };

// Whisper hint levels
function getHint(bestMove: string | null, level: 1 | 2 | 3): string {
  if (!bestMove) return 'Engine still thinking…';
  const from = bestMove.slice(0, 2);
  const to = bestMove.slice(2, 4);
  const files = 'abcdefgh';
  const fromFile = files.indexOf(from[0]!);
  const toFile = files.indexOf(to[0]!);
  const fileDiff = Math.abs(fromFile - toFile);
  const rankDiff = Math.abs(parseInt(from[1]!) - parseInt(to[1]!));

  if (level === 1) {
    if (fileDiff === 1 && rankDiff === 2) return 'A knight move looks strong here.';
    if (fileDiff === 0) return 'Consider moving along that file.';
    if (rankDiff === 0) return 'A horizontal move could improve your position.';
    return 'Look for an active move that improves a piece.';
  }
  if (level === 2) {
    return `The piece on ${from} has a better square available.`;
  }
  // Level 3: reveal exact move
  return `Best move: ${from}→${to}`;
}

export default function PlayPage() {
  const [difficulty, setDifficulty] = useState<DifficultyLevel>(
    STATIC_DIFFICULTY_LEVELS[2] as DifficultyLevel,
  );
  const [orientation, setOrientation] = useState<'white' | 'black'>('white');
  const [gameStatus, setGameStatus] = useState<string>('');
  const [engineColor, setEngineColor] = useState<'w' | 'b'>('b');

  // Mirror Bot
  const [mirrorProfile, setMirrorProfile] = useState<SkillProfile | null>(null);
  const [mirrorInfo, setMirrorInfo] = useState<string>('');

  // Whisper Coach
  const [hintLevel, setHintLevel] = useState<0 | 1 | 2 | 3>(0);
  const [hintText, setHintText] = useState<string>('');
  const [xp, setXp] = useState<number | null>(null);

  const chess = useChess();
  const engine = useEngine({ skillLevel: difficulty.skillLevel, depth: difficulty.depth });

  // Load profile for Mirror Bot
  useEffect(() => {
    fetch('/api/profile')
      .then((r) => r.json())
      .then((d) => {
        if (d.profile) setMirrorProfile(d.profile);
      })
      .catch(() => null);
    // Load user XP for hint display
    fetch('/api/settings')
      .then((r) => r.json())
      .then((d) => {
        if (d.settings) setXp(d.settings.xp);
      })
      .catch(() => null);
  }, []);

  // Find checked king square
  const checkedKingSquare = chess.isCheck
    ? (() => {
        const board = chess.game.board();
        for (let r = 0; r < 8; r++) {
          for (let f = 0; f < 8; f++) {
            const p = board[r]?.[f];
            if (p && p.type === 'k' && p.color === chess.turn) {
              const file = String.fromCharCode(97 + f);
              const rank = 8 - r;
              return `${file}${rank}` as Square;
            }
          }
        }
        return null;
      })()
    : null;

  // Update game status
  useEffect(() => {
    if (chess.isCheckmate) {
      const winner = chess.turn === 'w' ? 'Black' : 'White';
      setGameStatus(`Checkmate! ${winner} wins.`);
    } else if (chess.isStalemate) {
      setGameStatus("Stalemate! It's a draw.");
    } else if (chess.isDraw) {
      setGameStatus('Draw!');
    } else if (chess.isCheck) {
      setGameStatus('Check!');
    } else {
      setGameStatus('');
    }
    // Reset hints on each move
    setHintLevel(0);
    setHintText('');
  }, [chess.isCheckmate, chess.isStalemate, chess.isDraw, chess.isCheck, chess.turn]);

  useEffect(() => {
    if (!chess.isGameOver && chess.turn === engineColor && engine.isReady) {
      engine.analyzePosition(chess.fen);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    chess.fen,
    chess.turn,
    chess.isGameOver,
    engineColor,
    engine.isReady,
    engine.analyzePosition,
  ]);

  // Apply engine bestMove
  useEffect(() => {
    if (engine.bestMove && chess.turn === engineColor && !chess.isGameOver) {
      const from = engine.bestMove.slice(0, 2) as Square;
      const to = engine.bestMove.slice(2, 4) as Square;
      const promotion = engine.bestMove[4] as 'q' | 'r' | 'b' | 'n' | undefined;
      const timer = setTimeout(() => {
        chess.makeMove(from, to, promotion);
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [engine.bestMove, chess.turn, chess.isGameOver, engineColor, chess.makeMove]);

  const handlePlayerMove = useCallback(
    (from: Square, to: Square, promotion?: string) => {
      if (chess.turn === engineColor) return;
      chess.makeMove(from, to, promotion as 'q' | 'r' | 'b' | 'n' | undefined);
    },
    [chess, engineColor],
  );

  const handleNewGame = () => {
    chess.resetGame();
    engine.stopAnalysis();
    setGameStatus('');
    setHintLevel(0);
    setHintText('');
  };

  const handleFlipBoard = () => {
    setOrientation((o) => (o === 'white' ? 'black' : 'white'));
    setEngineColor((c) => (c === 'w' ? 'b' : 'w'));
  };

  const handleDifficultyChange = (d: DifficultyLevel) => {
    if (d.label === '🪞 Mirror' && mirrorProfile) {
      const config = getMirrorBotConfig(mirrorProfile);
      setDifficulty({ ...d, skillLevel: config.skillLevel, depth: config.depth });
      engine.setSkillLevel(config.skillLevel);
      engine.setDepth(config.depth);
      setMirrorInfo(config.description);
    } else {
      setDifficulty(d);
      engine.setSkillLevel(d.skillLevel);
      engine.setDepth(d.depth);
      setMirrorInfo('');
    }
  };

  // Whisper Coach: request a hint
  const handleHint = async () => {
    const nextLevel = Math.min(3, hintLevel + 1) as 1 | 2 | 3;

    // Spend 5 XP per hint request
    try {
      const res = await fetch('/api/xp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: 5, reason: 'whisper_hint' }),
      });
      if (res.ok) {
        const data = await res.json();
        setXp(data.xp);
      }
    } catch {
      /* continue even if XP deduction fails */
    }

    // Run engine analysis on current position for the player
    engine.analyzePosition(chess.fen);
    // Give engine a moment then show hint
    setTimeout(() => {
      const hint = getHint(engine.bestMove, nextLevel);
      setHintText(hint);
      setHintLevel(nextLevel);
    }, 800);
  };

  const lastMove =
    chess.history.length > 0
      ? {
          from: chess.history[chess.history.length - 1]!.from as Square,
          to: chess.history[chess.history.length - 1]!.to as Square,
        }
      : null;

  const isPlayerTurn = chess.turn !== engineColor && !chess.isGameOver;

  return (
    <div className="flex h-full flex-col gap-6 lg:flex-row">
      {/* Board area */}
      <div className="flex flex-1 items-start justify-center pt-2">
        <ChessBoard
          fen={chess.fen}
          orientation={orientation}
          lastMove={lastMove}
          onMove={handlePlayerMove}
          interactive={!chess.isGameOver && chess.turn !== engineColor}
          checkedKingSquare={checkedKingSquare}
        />
      </div>

      {/* Side panel */}
      <div className="flex w-full flex-col gap-4 lg:w-72">
        {/* Status */}
        {gameStatus && (
          <div
            className={cn(
              'rounded-lg border px-4 py-3 text-center text-sm font-semibold',
              chess.isCheckmate
                ? 'border-[#9B3B3B] bg-[#9B3B3B]/10 text-[#9B3B3B]'
                : 'border-[#C9A24B] bg-[#C9A24B]/10 text-[#C9A24B]',
            )}
          >
            {gameStatus}
          </div>
        )}

        {/* Engine Status */}
        {!engine.isReady && (
          <div className="flex flex-col gap-2 rounded border border-[#C9A24B]/30 bg-[#C9A24B]/10 px-3 py-2 text-xs text-[#C9A24B]">
            <div className="animate-pulse text-center font-bold">Engine loading...</div>
            <div className="max-h-32 overflow-y-auto text-[10px] opacity-70">
              {engine.debugLogs.map((log, i) => (
                <div key={i}>{log}</div>
              ))}
            </div>
          </div>
        )}
        {engine.isReady && engine.thinking && chess.turn === engineColor && (
          <div className="animate-pulse text-center text-xs text-muted-foreground">
            Engine thinking...
          </div>
        )}

        {/* Whisper Coach Hint */}
        {isPlayerTurn && (
          <div className="space-y-2 rounded-lg border border-border bg-card p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-foreground">💡 Whisper Coach</span>
              {xp !== null && <span className="text-[10px] text-muted-foreground">{xp} XP</span>}
            </div>
            {hintText ? (
              <p className="text-xs leading-relaxed text-foreground/80">{hintText}</p>
            ) : (
              <p className="text-[11px] text-muted-foreground">
                Stuck? Ask for a hint (costs 5 XP)
              </p>
            )}
            <button
              onClick={handleHint}
              disabled={hintLevel >= 3}
              className="w-full rounded-md bg-muted/40 px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted/60 disabled:opacity-40"
            >
              {hintLevel === 0 && 'Get Hint (5 XP)'}
              {hintLevel === 1 && 'More specific (5 XP)'}
              {hintLevel === 2 && 'Show move (5 XP)'}
              {hintLevel === 3 && 'Full hint revealed'}
            </button>
          </div>
        )}

        {/* Mirror Bot info */}
        {mirrorInfo && (
          <div className="rounded-lg border border-[#C9A24B]/30 bg-[#C9A24B]/5 px-3 py-2 text-xs text-[#C9A24B]">
            🪞 {mirrorInfo}
          </div>
        )}

        {/* Difficulty selector */}
        <div className="space-y-2 rounded-lg border border-border bg-card p-4">
          <h3 className="text-sm font-semibold text-foreground">Difficulty</h3>
          <div className="grid grid-cols-1 gap-1">
            {STATIC_DIFFICULTY_LEVELS.map((d) => (
              <button
                key={d.label}
                onClick={() => handleDifficultyChange(d as DifficultyLevel)}
                disabled={d.label === '🪞 Mirror' && !mirrorProfile}
                className={cn(
                  'flex items-center justify-between rounded px-3 py-1.5 text-sm transition-colors',
                  difficulty.label === d.label ||
                    (difficulty.label === '🪞 Mirror' && d.label === '🪞 Mirror')
                    ? 'bg-[#C9A24B]/20 font-semibold text-[#C9A24B]'
                    : 'text-muted-foreground hover:bg-muted/40 hover:text-foreground',
                  d.label === '🪞 Mirror' && !mirrorProfile && 'cursor-not-allowed opacity-40',
                )}
              >
                <span>{d.label}</span>
                <span className="text-xs opacity-60">{d.elo}</span>
              </button>
            ))}
          </div>
          {!mirrorProfile && (
            <p className="text-[10px] text-muted-foreground">
              Import &amp; analyze a game to unlock Mirror Bot.
            </p>
          )}
        </div>

        {/* Move list */}
        <div className="flex flex-1 flex-col overflow-hidden rounded-lg border border-border bg-card">
          <h3 className="border-b border-border px-4 py-2 text-sm font-semibold text-foreground">
            Moves
          </h3>
          <MoveList
            history={chess.history}
            currentIndex={chess.historyIndex}
            className="flex-1 p-2"
          />
        </div>

        {/* Controls */}
        <div className="flex gap-2">
          <button
            onClick={handleNewGame}
            className="flex-1 rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            New Game
          </button>
          <button
            onClick={handleFlipBoard}
            className="rounded-md border border-border px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted/40"
          >
            Flip
          </button>
          <button
            onClick={chess.undoMove}
            disabled={chess.history.length < 2}
            className="rounded-md border border-border px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted/40 disabled:opacity-40"
          >
            Undo
          </button>
        </div>
      </div>
    </div>
  );
}
