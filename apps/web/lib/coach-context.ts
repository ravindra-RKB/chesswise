import { prisma } from '@/lib/prisma';

export interface CoachContext {
  systemPrompt: string;
}

/**
 * Builds a grounded system prompt for the AI coach.
 * Only facts from the DB are injected — no hallucinated context.
 */
export async function buildCoachContext(
  userId: string,
  opts: { gameId?: string; fen?: string } = {},
): Promise<CoachContext> {
  // 1. Skill profile
  const profile = await prisma.skillProfile.findUnique({ where: { userId } });

  const skillLines = profile
    ? [
        `- Tactics: ${profile.tactics.toFixed(0)}/100`,
        `- Strategy: ${profile.strategy.toFixed(0)}/100`,
        `- Endgame: ${profile.endgame.toFixed(0)}/100`,
        `- Opening: ${profile.opening.toFixed(0)}/100`,
        `- Calculation: ${profile.calculation.toFixed(0)}/100`,
      ].join('\n')
    : '(No skill data yet — player has not analyzed any games)';

  // 2. Recent blunders across all games (last 10)
  const recentBlunders = await prisma.gameMove.findMany({
    where: {
      game: { userId },
      quality: { in: ['BLUNDER', 'MISTAKE'] },
    },
    orderBy: { game: { analyzedAt: 'desc' } },
    take: 10,
    select: {
      san: true,
      bestMoveSan: true,
      tacticTag: true,
      quality: true,
      fenBefore: true,
      explanation: true,
    },
  });

  const blunderLines =
    recentBlunders.length > 0
      ? recentBlunders
          .map(
            (m, i) =>
              `${i + 1}. ${m.quality}: played ${m.san}, best was ${m.bestMoveSan ?? '?'}` +
              (m.tacticTag ? ` [${m.tacticTag.replace(/_/g, ' ')}]` : ''),
          )
          .join('\n')
      : '(No analyzed games yet)';

  // 3. Game-specific context
  let gameContext = '';
  if (opts.gameId) {
    const game = await prisma.game.findUnique({
      where: { id: opts.gameId },
      select: {
        headers: true,
        accuracy: true,
        moves: {
          where: { quality: { in: ['BLUNDER', 'MISTAKE'] } },
          select: {
            moveNumber: true,
            color: true,
            san: true,
            bestMoveSan: true,
            evalDelta: true,
            tacticTag: true,
            explanation: true,
            quality: true,
          },
          orderBy: { moveNumber: 'asc' },
          take: 20,
        },
      },
    });

    if (game) {
      const h = game.headers as Record<string, string>;
      const mistakeLines = game.moves
        .map(
          (m) =>
            `  - Move ${m.moveNumber}${m.color === 'b' ? '...' : '.'} ${m.san} (${m.quality})` +
            (m.bestMoveSan ? `, best: ${m.bestMoveSan}` : '') +
            (m.evalDelta ? `, eval swing: ${(m.evalDelta / 100).toFixed(2)}` : ''),
        )
        .join('\n');

      gameContext = `
CURRENT GAME CONTEXT:
- White: ${h['White'] ?? 'Unknown'}, Black: ${h['Black'] ?? 'Unknown'}
- Result: ${h['Result'] ?? 'Unknown'}
- Accuracy: ${game.accuracy?.toFixed(1) ?? 'N/A'}%
- Mistakes in this game:
${mistakeLines || '  (none)'}`;
    }
  }

  // 4. Current board position
  const fenContext = opts.fen ? `\nCURRENT POSITION (FEN): ${opts.fen}` : '';

  const systemPrompt = `You are ChessWise Coach, an expert chess tutor. You give precise, encouraging, and grounded coaching.

PLAYER SKILL PROFILE:
${skillLines}

PLAYER'S RECENT MISTAKES (last 10 across all games):
${blunderLines}
${gameContext}${fenContext}

STRICT RULES — follow these exactly:
1. Only reference moves, positions, or evaluations that appear in the context above. Do NOT invent moves.
2. Be specific: cite exact move notation from the context when relevant.
3. Keep responses concise (2-4 paragraphs max) unless the player asks for a detailed explanation.
4. If asked about a position not in your context, say you can only analyze positions from the player's imported games.
5. Always be encouraging and constructive — mistakes are learning opportunities.
6. Use standard chess notation (e.g., Nf3, e4, O-O) in your responses.
7. If the player's question is unclear, ask one clarifying question.`;

  return { systemPrompt };
}
