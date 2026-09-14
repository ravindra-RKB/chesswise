import { Worker, Queue } from 'bullmq';
import { Chess } from 'chess.js';
import { PrismaClient, MoveQuality, GameStatus } from '@prisma/client';
import { analyzePosition } from './stockfish-analyzer';
import { classifyTactic } from './tactic-tagger';
import { explainMistake } from './llm-explainer';

const prisma = new PrismaClient();

const REDIS_URL = process.env.REDIS_URL ?? 'redis://localhost:6379';
const ANALYSIS_DEPTH = parseInt(process.env.ANALYSIS_DEPTH ?? '20');

const connection = {
  url: REDIS_URL,
};

export const gameQueue = new Queue('game-analysis', { connection: { url: REDIS_URL } });

/**
 * Maps centipawn loss (from the player's perspective) to a quality label.
 */
function cpLossToQuality(cpLoss: number, isBestMove: boolean): MoveQuality {
  if (isBestMove || cpLoss <= 0) return MoveQuality.EXCELLENT;
  if (cpLoss <= 10) return MoveQuality.GOOD;
  if (cpLoss <= 30) return MoveQuality.INACCURACY;
  if (cpLoss <= 100) return MoveQuality.MISTAKE;
  return MoveQuality.BLUNDER;
}

function normalizeCp(cp: number | null, color: 'w' | 'b'): number {
  if (cp === null) return 0;
  // Always from white's perspective; negate for black positions
  return color === 'b' ? -cp : cp;
}

async function processGame(gameId: string): Promise<void> {
  console.log(`[worker] Processing game ${gameId}`);

  // Mark as processing
  await prisma.game.update({
    where: { id: gameId },
    data: { status: GameStatus.PROCESSING },
  });

  const game = await prisma.game.findUnique({ where: { id: gameId } });
  if (!game) throw new Error(`Game ${gameId} not found`);

  // Parse PGN
  const chess = new Chess();
  chess.loadPgn(game.pgn);
  const history = chess.history({ verbose: true }) as any[];

  if (history.length === 0) {
    throw new Error('Game has no moves');
  }

  // Replay game collecting positions
  const replay = new Chess();
  const positions: { fen: string; move: any }[] = [];
  for (const move of history) {
    const fen = replay.fen();
    positions.push({ fen, move });
    replay.move(move);
  }

  // Deep analysis per move
  console.log(`[worker] Analyzing ${positions.length} moves at depth ${ANALYSIS_DEPTH}...`);

  const moveRows: any[] = [];
  let totalCpLoss = 0;
  let moveCount = 0;

  for (let i = 0; i < positions.length; i++) {
    const { fen, move } = positions[i]!;
    console.log(`[worker] Move ${i + 1}/${positions.length}: ${move.san}`);

    try {
      const analysis = await analyzePosition(
        fen,
        move.uci ?? `${move.from}${move.to}${move.promotion ?? ''}`,
        ANALYSIS_DEPTH,
      );
      const playerColor = move.color as 'w' | 'b';

      // evalBefore = best eval from position before move (from mover's perspective)
      const evalBefore =
        analysis.evalBefore !== null ? normalizeCp(analysis.evalBefore, playerColor) : null;
      // evalAfter = eval of position after move was played (now opponent's turn)
      const evalAfter =
        analysis.evalAfter !== null
          ? normalizeCp(analysis.evalAfter, playerColor === 'w' ? 'b' : 'w')
          : null;

      // Centipawn loss: how much worse the position became for the mover
      const cpLoss =
        evalBefore !== null && evalAfter !== null
          ? evalBefore - -evalAfter // evalBefore is "our" perspective, evalAfter is opponent perspective
          : 0;

      const isBestMove = analysis.bestMoveUci === (move.uci ?? `${move.from}${move.to}`);
      const quality = cpLossToQuality(Math.max(0, cpLoss), isBestMove);

      const tacticTag =
        quality === MoveQuality.MISTAKE || quality === MoveQuality.BLUNDER
          ? classifyTactic(
              fen,
              analysis.bestMoveUci,
              move.uci ?? `${move.from}${move.to}${move.promotion ?? ''}`,
            )
          : null;

      moveRows.push({
        gameId,
        moveNumber: Math.ceil((i + 1) / 2),
        color: move.color,
        san: move.san,
        uci: move.uci ?? `${move.from}${move.to}${move.promotion ?? ''}`,
        fenBefore: fen,
        evalBefore: analysis.evalBefore,
        evalAfter: analysis.evalAfter,
        evalDelta:
          analysis.evalAfter !== null && analysis.evalBefore !== null
            ? analysis.evalAfter - analysis.evalBefore
            : null,
        quality,
        tacticTag,
        bestMoveSan: analysis.bestMoveSan,
        bestMoveUci: analysis.bestMoveUci,
      });

      if (cpLoss > 0) {
        totalCpLoss += cpLoss;
        moveCount++;
      }
    } catch (err) {
      console.error(`[worker] Failed to analyze move ${i}: ${err}`);
      // Store move without analysis rather than failing the whole game
      moveRows.push({
        gameId,
        moveNumber: Math.ceil((i + 1) / 2),
        color: move.color,
        san: move.san,
        uci: move.uci ?? `${move.from}${move.to}`,
        fenBefore: fen,
      });
    }
  }

  // Calculate accuracy (100 = perfect, lower = more mistakes)
  const avgCpLoss = moveCount > 0 ? totalCpLoss / moveCount : 0;
  const accuracy = Math.max(0, Math.min(100, 100 - avgCpLoss / 10));

  // Store all moves in one batch
  await prisma.gameMove.createMany({ data: moveRows });

  await prisma.game.update({
    where: { id: gameId },
    data: {
      status: GameStatus.ANALYSIS_COMPLETE,
      accuracy,
      analyzedAt: new Date(),
    },
  });

  console.log(`[worker] Analysis complete. Accuracy: ${accuracy.toFixed(1)}%`);

  // Generate LLM explanations for mistakes and blunders
  const mistakeMoves = moveRows.filter(
    (m) => m.quality === MoveQuality.MISTAKE || m.quality === MoveQuality.BLUNDER,
  );

  console.log(`[worker] Generating explanations for ${mistakeMoves.length} mistakes...`);

  for (const m of mistakeMoves) {
    if (!m.bestMoveSan || m.evalBefore === null || m.evalAfter === null) continue;
    const result = await explainMistake({
      movePlayed: m.san,
      bestMove: m.bestMoveSan,
      evalBefore: m.evalBefore,
      evalAfter: m.evalAfter,
      quality: m.quality,
      tacticTag: m.tacticTag,
      fenBefore: m.fenBefore,
    });

    if (result) {
      const stored = await prisma.gameMove.findFirst({
        where: { gameId, san: m.san, fenBefore: m.fenBefore },
      });
      if (stored) {
        await prisma.gameMove.update({
          where: { id: stored.id },
          data: {
            explanation: result.explanation,
            explModel: result.modelUsed,
          },
        });
      }
    }
  }

  await prisma.game.update({
    where: { id: gameId },
    data: { status: GameStatus.EXPLANATION_READY },
  });

  // Update skill profile
  await updateSkillProfile(game.userId, gameId);

  await prisma.game.update({
    where: { id: gameId },
    data: { status: GameStatus.PROFILE_UPDATED },
  });

  console.log(`[worker] Game ${gameId} fully processed!`);
}

async function updateSkillProfile(userId: string, gameId: string): Promise<void> {
  // Fetch all moves across all user's analyzed games for scoring
  const moves = await prisma.gameMove.findMany({
    where: {
      game: { userId },
      quality: { not: null },
    },
    select: { quality: true, tacticTag: true },
  });

  const blunderWeight: Record<MoveQuality, number> = {
    BRILLIANT: -10,
    EXCELLENT: -5,
    GOOD: 0,
    INACCURACY: 5,
    MISTAKE: 15,
    BLUNDER: 30,
  };

  let tactics = 50,
    strategy = 50,
    endgame = 50,
    opening = 50,
    calculation = 50;

  for (const m of moves) {
    if (!m.quality) continue;
    const penalty = blunderWeight[m.quality];
    if (!m.tacticTag) {
      strategy = Math.max(0, strategy - penalty * 0.3);
      calculation = Math.max(0, calculation - penalty * 0.2);
    } else if (['fork', 'pin', 'skewer', 'discovered_attack'].includes(m.tacticTag)) {
      tactics = Math.max(0, tactics - penalty * 0.5);
    } else if (m.tacticTag === 'back_rank') {
      endgame = Math.max(0, endgame - penalty * 0.5);
    }
  }

  // Clamp to 0–100
  const clamp = (v: number) => Math.max(0, Math.min(100, v));

  await prisma.skillProfile.upsert({
    where: { userId },
    create: {
      userId,
      tactics: clamp(tactics),
      strategy: clamp(strategy),
      endgame: clamp(endgame),
      opening: clamp(opening),
      calculation: clamp(calculation),
    },
    update: {
      tactics: clamp(tactics),
      strategy: clamp(strategy),
      endgame: clamp(endgame),
      opening: clamp(opening),
      calculation: clamp(calculation),
    },
  });
}

// Start the BullMQ worker
const worker = new Worker(
  'game-analysis',
  async (job) => {
    const { gameId } = job.data as { gameId: string };
    await processGame(gameId);
  },
  { connection: { url: REDIS_URL }, concurrency: 2 },
);

worker.on('completed', (job) => {
  console.log(`[worker] Job ${job.id} completed`);
});

worker.on('failed', async (job, err) => {
  console.error(`[worker] Job ${job?.id} failed:`, err);
  if (job?.data?.gameId) {
    await prisma.game
      .update({
        where: { id: job.data.gameId },
        data: {
          status: GameStatus.PROCESSING_FAILED,
          errorMsg: err.message,
        },
      })
      .catch(console.error);
  }
});

export { worker, processGame };
