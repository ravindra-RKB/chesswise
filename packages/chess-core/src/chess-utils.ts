import { Chess, Square, Move } from 'chess.js';

/**
 * Returns all legal target squares from a given square for move highlighting.
 */
export function getLegalMovesForSquare(game: Chess, square: Square): Square[] {
  try {
    const moves = game.moves({ square, verbose: true }) as Move[];
    return moves.map((m) => m.to as Square);
  } catch {
    return [];
  }
}

/**
 * Returns 'light' or 'dark' for a given square (e.g. 'e4' → 'light').
 */
export function getSquareColor(square: Square): 'light' | 'dark' {
  const file = square.charCodeAt(0) - 97; // a=0, h=7
  const rank = parseInt(square[1]!) - 1; // 1=0, 8=7
  return (file + rank) % 2 === 0 ? 'dark' : 'light';
}

/**
 * Maps centipawn loss to a move-quality annotation glyph.
 * Thresholds based on common engine classification conventions.
 */
export function classifyMoveQuality(
  prevEvalCp: number,
  newEvalCp: number,
): '!!' | '!' | '!?' | '?!' | '?' | '??' {
  const loss = prevEvalCp - newEvalCp; // positive = player lost centipawns

  if (loss <= -150) return '!!'; // brilliant / best in position, significantly improving eval
  if (loss <= 0) return '!'; // excellent move
  if (loss <= 20) return '!?'; // interesting but slightly inaccurate
  if (loss <= 60) return '?!'; // inaccuracy
  if (loss <= 120) return '?'; // mistake
  return '??'; // blunder
}

/**
 * Converts a FEN string to a simple piece map for rendering.
 * Returns a record of square → piece (e.g. { e1: 'K', e8: 'k' }).
 */
export function fenToPieceMap(fen: string): Record<string, string> {
  const game = new Chess(fen);
  const board = game.board();
  const map: Record<string, string> = {};

  board.forEach((row, rankIdx) => {
    row.forEach((piece, fileIdx) => {
      if (piece) {
        const file = String.fromCharCode(97 + fileIdx);
        const rank = 8 - rankIdx;
        const square = `${file}${rank}`;
        map[square] = piece.color === 'w' ? piece.type.toUpperCase() : piece.type.toLowerCase();
      }
    });
  });

  return map;
}

/** Unicode chess piece glyphs keyed by FEN piece character */
export const PIECE_UNICODE: Record<string, string> = {
  K: '♔',
  Q: '♕',
  R: '♖',
  B: '♗',
  N: '♘',
  P: '♙',
  k: '♚',
  q: '♛',
  r: '♜',
  b: '♝',
  n: '♞',
  p: '♟',
};
