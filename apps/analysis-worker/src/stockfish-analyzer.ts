import { Chess } from 'chess.js';
import { spawn } from 'child_process';
import { resolve } from 'path';

export interface MoveAnalysis {
  evalBefore: number | null; // centipawns, null if mate
  evalAfter: number | null;
  bestMoveUci: string | null;
  bestMoveSan: string | null;
}

/**
 * Analyzes a single position using a native Stockfish process.
 * Returns evaluation before and after the played move, plus the best move.
 */
export async function analyzePosition(
  fenBefore: string,
  playedMoveUci: string,
  depth = 20,
  timeLimitMs = 5000,
): Promise<MoveAnalysis> {
  const evalBefore = await getEval(fenBefore, depth, timeLimitMs);

  // Apply the played move to get the position after
  const game = new Chess(fenBefore);
  const from = playedMoveUci.slice(0, 2);
  const to = playedMoveUci.slice(2, 4);
  const promotion = playedMoveUci[4];
  game.move({ from, to, promotion });
  const fenAfter = game.fen();

  const afterResult = await getEvalWithBest(fenBefore, depth, timeLimitMs);
  const evalAfter = await getEval(fenAfter, depth, timeLimitMs);

  // Best move in bestMove UCI is from the perspective of the side to move
  // Convert bestMove SAN
  let bestMoveSan: string | null = null;
  if (afterResult.bestMoveUci) {
    try {
      const g = new Chess(fenBefore);
      const bFrom = afterResult.bestMoveUci.slice(0, 2);
      const bTo = afterResult.bestMoveUci.slice(2, 4);
      const bPromo = afterResult.bestMoveUci[4];
      const move = g.move({ from: bFrom, to: bTo, promotion: bPromo });
      bestMoveSan = move?.san ?? null;
    } catch {
      bestMoveSan = null;
    }
  }

  return {
    evalBefore: afterResult.evalCp,
    evalAfter,
    bestMoveUci: afterResult.bestMoveUci,
    bestMoveSan,
  };
}

interface StockfishResult {
  evalCp: number | null;
  bestMoveUci: string | null;
}

async function getEvalWithBest(
  fen: string,
  depth: number,
  timeLimitMs: number,
): Promise<StockfishResult> {
  return new Promise((resolve, reject) => {
    // Find stockfish binary in node_modules
    const stockfishBin = findStockfishBin();
    const sf = spawn(stockfishBin);

    let evalCp: number | null = null;
    let bestMove: string | null = null;
    let done = false;

    const timeout = setTimeout(() => {
      if (!done) {
        sf.stdin.write('stop\n');
      }
    }, timeLimitMs);

    sf.stdout.on('data', (data: Buffer) => {
      const lines = data.toString().split('\n');
      for (const line of lines) {
        // Parse evaluation
        const cpMatch = line.match(/score cp (-?\d+)/);
        const mateMatch = line.match(/score mate (-?\d+)/);
        if (cpMatch) evalCp = parseInt(cpMatch[1]!);
        if (mateMatch) {
          const mateIn = parseInt(mateMatch[1]!);
          evalCp = mateIn > 0 ? 30000 : -30000;
        }

        // Parse best move
        if (line.startsWith('bestmove')) {
          const parts = line.trim().split(' ');
          bestMove = parts[1] !== '(none)' ? (parts[1] ?? null) : null;
          done = true;
          clearTimeout(timeout);
          sf.kill();
          resolve({ evalCp, bestMoveUci: bestMove });
        }
      }
    });

    sf.on('error', reject);

    sf.stdin.write('uci\n');
    sf.stdin.write('isready\n');
    sf.stdin.write(`position fen ${fen}\n`);
    sf.stdin.write(`go depth ${depth}\n`);
  });
}

async function getEval(fen: string, depth: number, timeLimitMs: number): Promise<number | null> {
  const result = await getEvalWithBest(fen, depth, timeLimitMs);
  return result.evalCp;
}

function findStockfishBin(): string {
  // Try common locations
  try {
    // From node_modules stockfish package
    const p = resolve(process.cwd(), 'node_modules/.bin/stockfish');
    return p;
  } catch {
    return 'stockfish'; // fallback to system PATH
  }
}
