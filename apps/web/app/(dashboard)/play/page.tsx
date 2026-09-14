'use client';

import { useState, useEffect, useCallback } from 'react';
import { Square } from '@chesswise/chess-core';
import { useChess } from '@/hooks/use-chess';
import { useEngine } from '@/hooks/use-engine';
import ChessBoard from '@/components/chess/chess-board';
import MoveList from '@/components/chess/move-list';
import { cn } from '@/lib/utils';

const DIFFICULTY_LEVELS = [
  { label: 'Beginner', elo: '~600', skillLevel: 0, depth: 5 },
  { label: 'Casual', elo: '~900', skillLevel: 5, depth: 8 },
  { label: 'Club', elo: '~1400', skillLevel: 10, depth: 12 },
  { label: 'Advanced', elo: '~1800', skillLevel: 15, depth: 16 },
  { label: 'Master', elo: '~2200+', skillLevel: 20, depth: 20 },
];

type DifficultyLevel = { label: string; elo: string; skillLevel: number; depth: number };

export default function PlayPage() {
  const [difficulty, setDifficulty] = useState<DifficultyLevel>(
    DIFFICULTY_LEVELS[2] as DifficultyLevel,
  );
  const [orientation, setOrientation] = useState<'white' | 'black'>('white');
  const [gameStatus, setGameStatus] = useState<string>('');
  const [engineColor, setEngineColor] = useState<'w' | 'b'>('b');

  const chess = useChess();
  const engine = useEngine({ skillLevel: difficulty!.skillLevel, depth: difficulty!.depth });

  // Find the checked king square
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

  // Update game status message
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
  }, [chess.isCheckmate, chess.isStalemate, chess.isDraw, chess.isCheck, chess.turn]);

  // Engine makes its move when it's its turn
  useEffect(() => {
    if (!chess.isGameOver && chess.turn === engineColor && engine.isReady) {
      engine.analyzePosition(chess.fen);
    }
  }, [chess.fen, chess.turn, chess.isGameOver, engineColor, engine]);

  // Apply engine bestMove to the board
  useEffect(() => {
    if (engine.bestMove && chess.turn === engineColor && !chess.isGameOver) {
      const from = engine.bestMove.slice(0, 2) as Square;
      const to = engine.bestMove.slice(2, 4) as Square;
      const promotion = engine.bestMove[4] as 'q' | 'r' | 'b' | 'n' | undefined;
      setTimeout(() => {
        chess.makeMove(from, to, promotion);
      }, 200); // slight delay for natural feel
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engine.bestMove]);

  const handlePlayerMove = useCallback(
    (from: Square, to: Square, promotion?: string) => {
      if (chess.turn === engineColor) return; // not player's turn
      chess.makeMove(from, to, promotion as 'q' | 'r' | 'b' | 'n' | undefined);
    },
    [chess, engineColor],
  );

  const handleNewGame = () => {
    chess.resetGame();
    engine.stopAnalysis();
    setGameStatus('');
    // Optionally keep same orientation
  };

  const handleFlipBoard = () => {
    setOrientation((o) => (o === 'white' ? 'black' : 'white'));
    setEngineColor((c) => (c === 'w' ? 'b' : 'w'));
  };

  const handleDifficultyChange = (d: (typeof DIFFICULTY_LEVELS)[number]) => {
    setDifficulty(d);
    engine.setSkillLevel(d.skillLevel);
    engine.setDepth(d.depth);
  };

  const lastMove =
    chess.history.length > 0
      ? {
          from: chess.history[chess.history.length - 1]!.from as Square,
          to: chess.history[chess.history.length - 1]!.to as Square,
        }
      : null;

  return (
    <div className="flex h-full flex-col gap-6 lg:flex-row">
      {/* Board area */}
      <div className="flex flex-1 items-center justify-center">
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

        {/* Engine thinking */}
        {engine.thinking && chess.turn === engineColor && (
          <div className="animate-pulse text-center text-xs text-muted-foreground">
            Engine thinking...
          </div>
        )}

        {/* Difficulty selector */}
        <div className="space-y-2 rounded-lg border border-border bg-card p-4">
          <h3 className="text-sm font-semibold text-foreground">Difficulty</h3>
          <div className="grid grid-cols-1 gap-1">
            {DIFFICULTY_LEVELS.map((d) => (
              <button
                key={d.label}
                onClick={() => handleDifficultyChange(d)}
                className={cn(
                  'flex items-center justify-between rounded px-3 py-1.5 text-sm transition-colors',
                  difficulty.label === d.label
                    ? 'bg-[#C9A24B]/20 font-semibold text-[#C9A24B]'
                    : 'text-muted-foreground hover:bg-muted/40 hover:text-foreground',
                )}
              >
                <span>{d.label}</span>
                <span className="text-xs opacity-60">{d.elo}</span>
              </button>
            ))}
          </div>
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
