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

  return (
    <div className="relative inline-block">
      <div
        className="grid select-none"
        style={{
          gridTemplateColumns: `repeat(8, 1fr)`,
          gridTemplateRows: `repeat(8, 1fr)`,
          width: 'min(80vw, 80vh, 560px)',
          height: 'min(80vw, 80vh, 560px)',
          maxWidth: '560px',
          maxHeight: '560px',
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
                  'transition-colors duration-100',
                  isLight ? 'bg-[#EDE6D6]' : 'bg-[#4a3728]',
                  isSelected && 'ring-2 ring-inset ring-[#C9A24B]',
                  isLastMove && 'bg-[#C9A24B]/40',
                  isCheckedKing && 'bg-[#9B3B3B]',
                )}
                style={{ aspectRatio: '1' }}
              >
                {/* Coordinate labels */}
                {showCoordinates && fileIdx === 0 && (
                  <span
                    className={cn(
                      'absolute left-1 top-0.5 select-none text-[10px] font-bold leading-none',
                      isLight ? 'text-[#4a3728]' : 'text-[#EDE6D6]',
                    )}
                  >
                    {rank}
                  </span>
                )}
                {showCoordinates && rankIdx === 7 && (
                  <span
                    className={cn(
                      'absolute bottom-0.5 right-1 select-none text-[10px] font-bold leading-none',
                      isLight ? 'text-[#4a3728]' : 'text-[#EDE6D6]',
                    )}
                  >
                    {file}
                  </span>
                )}

                {/* Legal move indicator */}
                {isLegalTarget && !piece && (
                  <div className="pointer-events-none h-[30%] w-[30%] rounded-full bg-[#C9A24B]/60" />
                )}
                {isLegalTarget && piece && (
                  <div className="pointer-events-none absolute inset-0 rounded-sm ring-4 ring-inset ring-[#C9A24B]/70" />
                )}

                {/* Chess piece */}
                {piece && (
                  <span
                    className={cn(
                      'z-10 select-none text-[min(6vw,42px)] leading-none',
                      piece === piece.toUpperCase()
                        ? 'text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]'
                        : 'text-black drop-shadow-[0_1px_2px_rgba(255,255,255,0.4)]',
                    )}
                    style={{ fontSize: 'min(6vw, 6vh, 42px)' }}
                  >
                    {PIECE_UNICODE[piece]}
                  </span>
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
