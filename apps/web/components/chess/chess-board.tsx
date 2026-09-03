'use client';

import { useState, useCallback, useMemo } from 'react';
import { Chessboard } from 'react-chessboard';
import { Square, Chess, fenToPieceMap, getLegalMovesForSquare } from '@chesswise/chess-core';
import { cn } from '@/lib/utils';
import PromotionModal from './promotion-modal';

interface ChessBoardProps {
  fen: string;
  orientation?: 'white' | 'black';
  lastMove?: { from: Square; to: Square } | null;
  onMove?: (from: Square, to: Square, promotion?: string) => void;
  interactive?: boolean;
  showCoordinates?: boolean;
  inCheck?: boolean;
  checkedKingSquare?: Square | null;
}

export default function ChessBoard({
  fen,
  orientation = 'white',
  lastMove,
  onMove,
  interactive = true,
  showCoordinates = true,
  checkedKingSquare,
}: ChessBoardProps) {
  const [selected, setSelected] = useState<Square | null>(null);
  const [legalTargets, setLegalTargets] = useState<Square[]>([]);
  const [promotionPending, setPromotionPending] = useState<{
    from: Square;
    to: Square;
  } | null>(null);

  const game = useMemo(() => new Chess(fen), [fen]);
  const pieceMap = useMemo(() => fenToPieceMap(fen), [fen]);

  const handleSquareClick = useCallback(
    ({ square }: { square: string }) => {
      if (!interactive) return;

      const sq = square as Square;
      const pieceStr = pieceMap[sq]; // our internal state

      if (selected && legalTargets.includes(sq)) {
        const movingPiece = pieceMap[selected];
        const isPromotion =
          movingPiece && movingPiece.toUpperCase() === 'P' && (sq[1] === '8' || sq[1] === '1');

        if (isPromotion) {
          setPromotionPending({ from: selected, to: sq });
          setSelected(null);
          setLegalTargets([]);
          return;
        }

        onMove?.(selected, sq);
        setSelected(null);
        setLegalTargets([]);
        return;
      }

      const currentTurn = game.turn();
      const isOwnPiece =
        pieceStr &&
        (currentTurn === 'w'
          ? pieceStr === pieceStr.toUpperCase()
          : pieceStr === pieceStr.toLowerCase());

      if (pieceStr && isOwnPiece) {
        setSelected(sq);
        setLegalTargets(getLegalMovesForSquare(game, sq));
        return;
      }

      setSelected(null);
      setLegalTargets([]);
    },
    [selected, legalTargets, pieceMap, game, interactive, onMove],
  );

  const handlePieceDrop = ({ sourceSquare, targetSquare, piece }: any) => {
    if (!interactive) return false;
    if (!targetSquare) return false;

    const moves = getLegalMovesForSquare(game, sourceSquare as Square);
    if (!moves.includes(targetSquare as Square)) return false;

    const pieceStr = piece.pieceType || '';
    const isPromotion =
      pieceStr.toUpperCase().includes('P') && (targetSquare[1] === '8' || targetSquare[1] === '1');

    if (isPromotion) {
      setPromotionPending({ from: sourceSquare as Square, to: targetSquare as Square });
      return false;
    }

    onMove?.(sourceSquare as Square, targetSquare as Square);
    setSelected(null);
    setLegalTargets([]);
    return true;
  };

  const handlePromotion = useCallback(
    (piece: string) => {
      if (promotionPending) {
        onMove?.(promotionPending.from, promotionPending.to, piece);
        setPromotionPending(null);
      }
    },
    [promotionPending, onMove],
  );

  const customPieces = useMemo(() => {
    const piecesList = ['wP', 'wN', 'wB', 'wR', 'wQ', 'wK', 'bP', 'bN', 'bB', 'bR', 'bQ', 'bK'];
    const comps: any = {};
    piecesList.forEach((p) => {
      comps[p] = ({ squareWidth }: any) => (
        <img
          src={`/pieces/${p}.svg`}
          alt={p}
          style={{ width: squareWidth, height: squareWidth }}
          className="pointer-events-none select-none drop-shadow-[0_2px_3px_rgba(0,0,0,0.3)]"
          draggable={false}
        />
      );
    });
    return comps;
  }, []);

  const customSquareStyles = useMemo(() => {
    const styles: Record<string, React.CSSProperties> = {};

    if (lastMove) {
      styles[lastMove.from] = { backgroundColor: 'rgba(245, 246, 130, 0.6)' };
      styles[lastMove.to] = { backgroundColor: 'rgba(245, 246, 130, 0.6)' };
    }

    if (selected) {
      styles[selected] = { ...styles[selected], backgroundColor: 'rgba(245, 246, 130, 0.6)' };
    }

    if (checkedKingSquare) {
      styles[checkedKingSquare] = {
        ...styles[checkedKingSquare],
        backgroundColor: 'rgba(220, 38, 38, 0.6)',
      };
    }

    legalTargets.forEach((sq) => {
      const isOccupied = pieceMap[sq];
      if (isOccupied) {
        styles[sq] = {
          ...styles[sq],
          boxShadow: 'inset 0 0 0 6px rgba(0,0,0,0.15)',
          borderRadius: '50%',
        };
      } else {
        styles[sq] = {
          ...styles[sq],
          background: 'radial-gradient(circle, rgba(0,0,0,0.15) 15%, transparent 16%)',
        };
      }
    });

    return styles;
  }, [lastMove, selected, checkedKingSquare, legalTargets, pieceMap]);

  return (
    <div className="relative inline-block rounded-sm ring-4 ring-[#333]">
      <div
        style={{
          width: 'min(90vw, 85vh, 760px)',
          height: 'min(90vw, 85vh, 760px)',
          maxWidth: '760px',
          maxHeight: '760px',
        }}
      >
        <Chessboard
          options={{
            position: fen,
            boardOrientation: orientation,
            onPieceDrop: handlePieceDrop,
            onSquareClick: handleSquareClick,
            darkSquareStyle: { backgroundColor: '#739552' },
            lightSquareStyle: { backgroundColor: '#EBECD0' },
            squareStyles: customSquareStyles,
            pieces: customPieces,
            showNotation: showCoordinates,
            animationDurationInMs: 300,
            canDragPiece: ({ piece }) => {
              if (!interactive) return false;
              const turn = game.turn();
              return piece.pieceType.startsWith(turn);
            },
          }}
        />
      </div>

      {promotionPending && (
        <PromotionModal
          color={game.turn()}
          onSelect={handlePromotion}
          onCancel={() => setPromotionPending(null)}
        />
      )}
    </div>
  );
}
