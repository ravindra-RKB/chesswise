'use client';

import { useState, useCallback } from 'react';
import { Chess, Square, Move, PieceSymbol } from '@chesswise/chess-core';

export interface UseChessReturn {
  game: Chess;
  fen: string;
  history: Move[];
  turn: 'w' | 'b';
  isCheck: boolean;
  isCheckmate: boolean;
  isStalemate: boolean;
  isDraw: boolean;
  isGameOver: boolean;
  makeMove: (from: Square, to: Square, promotion?: PieceSymbol) => Move | null;
  undoMove: () => void;
  resetGame: (fen?: string) => void;
  loadPgn: (pgn: string) => boolean;
  loadFen: (fen: string) => boolean;
  seekTo: (index: number) => void;
  historyIndex: number;
}

export function useChess(startFen?: string): UseChessReturn {
  const [game, setGame] = useState<Chess>(() => (startFen ? new Chess(startFen) : new Chess()));
  const [historyIndex, setHistoryIndex] = useState<number>(-1);

  const update = useCallback((fn: (g: Chess) => void) => {
    setGame((prev) => {
      const next = new Chess(prev.fen());
      // Replay all history onto fresh instance to preserve full history
      const history = prev.history({ verbose: true }) as Move[];
      const fresh = new Chess();
      for (const m of history) {
        fresh.move(m);
      }
      fn(fresh);
      setHistoryIndex(fresh.history().length - 1);
      return fresh;
    });
  }, []);

  const makeMove = useCallback((from: Square, to: Square, promotion?: PieceSymbol): Move | null => {
    let result: Move | null = null;
    setGame((prev) => {
      const next = new Chess(prev.fen());
      try {
        result = next.move({ from, to, promotion: promotion ?? 'q' });
        setHistoryIndex(next.history().length - 1);
        return result ? next : prev;
      } catch {
        return prev;
      }
    });
    return result;
  }, []);

  const undoMove = useCallback(() => {
    setGame((prev) => {
      const next = new Chess(prev.fen());
      next.undo();
      setHistoryIndex(next.history().length - 1);
      return next;
    });
  }, []);

  const resetGame = useCallback((fen?: string) => {
    const fresh = fen ? new Chess(fen) : new Chess();
    setGame(fresh);
    setHistoryIndex(-1);
  }, []);

  const loadPgn = useCallback((pgn: string): boolean => {
    try {
      const next = new Chess();
      next.loadPgn(pgn);
      setGame(next);
      setHistoryIndex(next.history().length - 1);
      return true;
    } catch {
      return false;
    }
  }, []);

  const loadFen = useCallback((fen: string): boolean => {
    try {
      const next = new Chess(fen);
      setGame(next);
      setHistoryIndex(-1);
      return true;
    } catch {
      return false;
    }
  }, []);

  const seekTo = useCallback((index: number) => {
    setGame((prev) => {
      const allMoves = prev.history({ verbose: true }) as Move[];
      const fresh = new Chess();
      for (let i = 0; i <= index && i < allMoves.length; i++) {
        fresh.move(allMoves[i]!);
      }
      setHistoryIndex(index);
      return fresh;
    });
  }, []);

  return {
    game,
    fen: game.fen(),
    history: game.history({ verbose: true }) as Move[],
    turn: game.turn(),
    isCheck: game.inCheck(),
    isCheckmate: game.isCheckmate(),
    isStalemate: game.isStalemate(),
    isDraw: game.isDraw(),
    isGameOver: game.isGameOver(),
    makeMove,
    undoMove,
    resetGame,
    loadPgn,
    loadFen,
    seekTo,
    historyIndex,
  };
}
