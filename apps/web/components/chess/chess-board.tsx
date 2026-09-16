'use client';

import { useState, useCallback } from 'react';
import { Square } from '@chesswise/chess-core';
import { fenToPieceMap, getLegalMovesForSquare, PIECE_UNICODE } from '@chesswise/chess-core';
import { Chess } from '@chesswise/chess-core';
import { cn } from '@/lib/utils';
import PromotionModal from './promotion-modal';

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const RANKS = [8, 7, 6, 5, 4, 3, 2, 1];

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

  const pieceMap = fenToPieceMap(fen);
  const game = new Chess(fen);

  const displayFiles = orientation === 'white' ? FILES : [...FILES].reverse();
  const displayRanks = orientation === 'white' ? RANKS : [...RANKS].reverse();

  const handleSquareClick = useCallback(
    (square: Square) => {
      if (!interactive) return;

      const piece = pieceMap[square];

      // If clicking a legal target — make the move
      if (selected && legalTargets.includes(square)) {
        // Check for pawn promotion
        const movingPiece = pieceMap[selected];
        const isPromotion =
          movingPiece &&
          movingPiece.toUpperCase() === 'P' &&
          (square[1] === '8' || square[1] === '1');

        if (isPromotion) {
          setPromotionPending({ from: selected, to: square });
          setSelected(null);
          setLegalTargets([]);
          return;
        }

        onMove?.(selected, square);
        setSelected(null);
        setLegalTargets([]);
        return;
      }

      // If clicking own piece — select it
      const currentTurn = game.turn();
      const isOwnPiece =
        piece &&
        (currentTurn === 'w' ? piece === piece.toUpperCase() : piece === piece.toLowerCase());

      if (piece && isOwnPiece) {
        setSelected(square);
        setLegalTargets(getLegalMovesForSquare(game, square));
        return;
      }

      // Clicked empty square or enemy piece without selection — deselect
      setSelected(null);
      setLegalTargets([]);
    },
    [selected, legalTargets, pieceMap, game, interactive, onMove],
  );

  const handlePromotion = useCallback(
    (piece: string) => {
      if (promotionPending) {
        onMove?.(promotionPending.from, promotionPending.to, piece);
        setPromotionPending(null);
      }
    },
    [promotionPending, onMove],
  );

  const getPieceFileName = (p: string) => {
    const color = p === p.toUpperCase() ? 'w' : 'b';
    return `${color}${p.toUpperCase()}`;
  };

  return (
    <div className="relative inline-block overflow-hidden rounded-sm ring-4 ring-[#333]">
      <div
        className="grid select-none"
        style={{
          gridTemplateColumns: `repeat(8, 1fr)`,
          gridTemplateRows: `repeat(8, 1fr)`,
          width: 'min(90vw, 85vh, 760px)',
          height: 'min(90vw, 85vh, 760px)',
          maxWidth: '760px',
          maxHeight: '760px',
        }}
      >
        {displayRanks.map((rank, rankIdx) =>
          displayFiles.map((file, fileIdx) => {
            const square = `${file}${rank}` as Square;
            const piece = pieceMap[square];
            const isLight = (rankIdx + fileIdx) % 2 === 0;
            const isSelected = selected === square;
            const isLegalTarget = legalTargets.includes(square);
            const isLastMove = lastMove && (lastMove.from === square || lastMove.to === square);
            const isCheckedKing = checkedKingSquare === square;

            return (
              <div
                key={square}
                onClick={() => handleSquareClick(square)}
                className={cn(
                  'relative flex cursor-pointer items-center justify-center',
                  isLight ? 'bg-[#EBECD0]' : 'bg-[#739552]',
                )}
                style={{ aspectRatio: '1' }}
              >
                {/* Last Move & Selected Highlight */}
                {(isLastMove || isSelected) && (
                  <div className="pointer-events-none absolute inset-0 bg-[#F5F682]/60 mix-blend-multiply" />
                )}

                {/* Check Highlight */}
                {isCheckedKing && (
                  <div className="pointer-events-none absolute inset-0 rounded-full bg-red-600/60 mix-blend-multiply blur-[2px]" />
                )}

                {/* Coordinate labels */}
                {showCoordinates && fileIdx === 0 && (
                  <span
                    className={cn(
                      'absolute left-1 top-1 select-none text-[11px] font-bold leading-none',
                      isLight ? 'text-[#739552]' : 'text-[#EBECD0]',
                    )}
                  >
                    {rank}
                  </span>
                )}
                {showCoordinates && rankIdx === 7 && (
                  <span
                    className={cn(
                      'absolute bottom-1 right-1.5 select-none text-[11px] font-bold leading-none',
                      isLight ? 'text-[#739552]' : 'text-[#EBECD0]',
                    )}
                  >
                    {file}
                  </span>
                )}

                {/* Legal move indicator */}
                {isLegalTarget && !piece && (
                  <div className="pointer-events-none z-10 h-[32%] w-[32%] rounded-full bg-black/15" />
                )}
                {isLegalTarget && piece && (
                  <div className="pointer-events-none absolute inset-0 z-20 m-auto h-[90%] w-[90%] rounded-full border-[6px] border-black/15" />
                )}

                {/* Chess piece */}
                {piece && (
                  <img
                    src={`/pieces/${getPieceFileName(piece)}.svg`}
                    alt={piece}
                    className={cn(
                      'pointer-events-none z-10 h-[95%] w-[95%] select-none',
                      // Add a very subtle drop shadow to give depth to the SVGs
                      'drop-shadow-[0_2px_3px_rgba(0,0,0,0.3)]',
                    )}
                    draggable={false}
                  />
                )}
              </div>
            );
          }),
        )}
      </div>

      {/* Promotion modal */}
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
