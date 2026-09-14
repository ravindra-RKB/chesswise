import { Chess } from 'chess.js';

export type TacticTag =
  'fork' | 'pin' | 'skewer' | 'discovered_attack' | 'back_rank' | 'hanging_piece' | null;

/**
 * Deterministically classifies what tactic the best move exploits.
 * No LLM — purely chess logic via chess.js.
 */
export function classifyTactic(
  fenBefore: string,
  bestMoveUci: string | null,
  playedMoveUci: string,
): TacticTag {
  if (!bestMoveUci || bestMoveUci === playedMoveUci) return null;

  try {
    const game = new Chess(fenBefore);

    // Apply best move and examine resulting position
    const from = bestMoveUci.slice(0, 2);
    const to = bestMoveUci.slice(2, 4);
    const promotion = bestMoveUci[4];

    const move = game.move({ from, to, promotion });
    if (!move) return null;

    const afterGame = new Chess(game.fen());
    const attackedSquares = getAttackedSquares(game, to as any);

    // Check: back-rank mate threat
    if (isBackRankThreat(fenBefore, bestMoveUci)) return 'back_rank';

    // Check: fork (best move attacks 2+ enemy pieces)
    const attackedPieces = getAttackedEnemyPieces(game, to, move.color);
    if (attackedPieces.length >= 2) return 'fork';

    // Check: hanging piece (captures an undefended piece)
    const captured = move.captured;
    if (captured && !isDefended(game, to, move.color === 'w' ? 'b' : 'w')) {
      return 'hanging_piece';
    }

    // Check: discovered attack (moved piece reveals attack from another)
    if (isDiscoveredAttack(fenBefore, bestMoveUci)) return 'discovered_attack';

    // Check: pin (best move creates a pin against opponent's king)
    if (createsPinOrSkewer(fenBefore, bestMoveUci, 'pin')) return 'pin';

    // Check: skewer
    if (createsPinOrSkewer(fenBefore, bestMoveUci, 'skewer')) return 'skewer';

    return null;
  } catch {
    return null;
  }
}

function getAttackedEnemyPieces(game: Chess, square: string, ourColor: 'w' | 'b'): string[] {
  const enemyColor = ourColor === 'w' ? 'b' : 'w';
  const board = game.board();
  const attacked: string[] = [];

  // Get all enemy pieces
  board.forEach((row, rankIdx) => {
    row.forEach((piece, fileIdx) => {
      if (piece && piece.color === enemyColor) {
        const sq = `${String.fromCharCode(97 + fileIdx)}${8 - rankIdx}`;
        // Check if our piece on 'square' attacks this enemy piece
        const attacks = game.moves({ square: square as any, verbose: true });
        if (attacks.some((m: any) => m.to === sq)) {
          attacked.push(sq);
        }
      }
    });
  });

  return attacked;
}

function getAttackedSquares(game: Chess, square: string): string[] {
  return game.moves({ square: square as any, verbose: true }).map((m: any) => m.to);
}

function isDefended(game: Chess, square: string, byColor: 'w' | 'b'): boolean {
  // Check if any piece of byColor defends the given square
  const allMoves = game.moves({ verbose: true });
  return allMoves.some((m: any) => m.color === byColor && m.to === square);
}

function isBackRankThreat(fen: string, bestMoveUci: string): boolean {
  try {
    const game = new Chess(fen);
    const from = bestMoveUci.slice(0, 2);
    const to = bestMoveUci.slice(2, 4);
    game.move({ from, to });

    // Is the opponent in checkmate or is back rank the 8th/1st rank?
    if (game.isCheckmate()) return true;

    const targetRank = parseInt(to[1]!);
    const isBackRank = targetRank === 1 || targetRank === 8;
    return isBackRank && game.inCheck();
  } catch {
    return false;
  }
}

function isDiscoveredAttack(fen: string, bestMoveUci: string): boolean {
  try {
    const before = new Chess(fen);
    const from = bestMoveUci.slice(0, 2);
    const to = bestMoveUci.slice(2, 4);
    const movingPiece = before.get(from as any);
    if (!movingPiece) return false;

    // Get attacks of all allied pieces before move
    const attacksBefore = new Set<string>();
    before.board().forEach((row, ri) =>
      row.forEach((p, fi) => {
        if (p && p.color === movingPiece.color) {
          const sq = `${String.fromCharCode(97 + fi)}${8 - ri}`;
          if (sq !== from) {
            before
              .moves({ square: sq as any, verbose: true })
              .forEach((m: any) => attacksBefore.add(m.to));
          }
        }
      }),
    );

    // Get attacks after move
    const after = new Chess(fen);
    after.move({ from, to });
    const attacksAfter = new Set<string>();
    after.board().forEach((row, ri) =>
      row.forEach((p, fi) => {
        if (p && p.color === movingPiece.color) {
          const sq = `${String.fromCharCode(97 + fi)}${8 - ri}`;
          if (sq !== to) {
            after
              .moves({ square: sq as any, verbose: true })
              .forEach((m: any) => attacksAfter.add(m.to));
          }
        }
      }),
    );

    // New enemy squares attacked after (not attacked before)
    const after2 = new Chess(fen);
    after2.move({ from, to });
    const newAttacks = [...attacksAfter].filter((sq) => !attacksBefore.has(sq));
    const enemyColor = movingPiece.color === 'w' ? 'b' : 'w';

    return newAttacks.some((sq) => {
      const piece = after2.get(sq as any);
      return piece && piece.color === enemyColor;
    });
  } catch {
    return false;
  }
}

function createsPinOrSkewer(fen: string, bestMoveUci: string, type: 'pin' | 'skewer'): boolean {
  // Simplified heuristic: sliding piece move aligned with enemy king
  try {
    const game = new Chess(fen);
    const from = bestMoveUci.slice(0, 2);
    const to = bestMoveUci.slice(2, 4);
    const movingPiece = game.get(from as any);
    if (!movingPiece) return false;

    // Only sliding pieces (queen, rook, bishop) can create pins/skewers
    if (!['q', 'r', 'b'].includes(movingPiece.type)) return false;

    game.move({ from, to });
    const enemyColor = movingPiece.color === 'w' ? 'b' : 'w';

    // Find enemy king
    let kingSquare: string | null = null;
    game.board().forEach((row, ri) =>
      row.forEach((p, fi) => {
        if (p && p.type === 'k' && p.color === enemyColor) {
          kingSquare = `${String.fromCharCode(97 + fi)}${8 - ri}`;
        }
      }),
    );

    if (!kingSquare) return false;

    // Check if moved piece's attack line passes through the king
    const attacks = game.moves({ square: to as any, verbose: true });
    return attacks.some((m: any) => m.to === kingSquare);
  } catch {
    return false;
  }
}
