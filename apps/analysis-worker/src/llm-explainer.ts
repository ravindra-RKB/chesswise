import { GoogleGenerativeAI } from '@google/generative-ai';
import { z } from 'zod';

const ExplanationSchema = z.object({
  explanation: z
    .string()
    .min(20)
    .max(500)
    .describe('Plain-language coaching note. Must not fabricate moves or evaluations.'),
});

export interface ExplainInput {
  movePlayed: string; // SAN
  bestMove: string; // SAN
  evalBefore: number; // centipawns
  evalAfter: number; // centipawns
  quality: string; // BLUNDER | MISTAKE | etc.
  tacticTag: string | null;
  fenBefore: string;
}

export interface ExplainResult {
  explanation: string;
  modelUsed: string;
}

const MODEL_NAME = 'gemini-1.5-flash';

/**
 * Calls Gemini to generate a short, grounded coaching explanation.
 * The prompt strictly forbids fabricating moves or evaluations not in the input.
 */
export async function explainMistake(input: ExplainInput): Promise<ExplainResult | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn('[llm-explainer] GEMINI_API_KEY not set — skipping explanation');
    return null;
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: MODEL_NAME });

  const evalBeforeFormatted = formatEval(input.evalBefore);
  const evalAfterFormatted = formatEval(input.evalAfter);
  const swingFormatted = formatEval(Math.abs(input.evalAfter - input.evalBefore));

  const tacticNote = input.tacticTag
    ? `The missed tactic type is: ${input.tacticTag.replace(/_/g, ' ')}.`
    : '';

  const prompt = `You are a chess coach giving feedback on a single mistake.

STRUCTURED FACTS (use ONLY these — do not invent any other moves or evaluations):
- Move played: ${input.movePlayed}
- Best move available: ${input.bestMove}
- Position evaluation before: ${evalBeforeFormatted}
- Position evaluation after playing ${input.movePlayed}: ${evalAfterFormatted}
- Evaluation swing: ${swingFormatted} in opponent's favor
- Move quality: ${input.quality}
- ${tacticNote}

STRICT RULES:
1. Do NOT mention any chess move notation (e.g. "Nf3", "Rxe8") other than "${input.movePlayed}" and "${input.bestMove}".
2. Do NOT mention any evaluation number other than "${evalBeforeFormatted}", "${evalAfterFormatted}", "${swingFormatted}".
3. Write 2-3 sentences maximum. Plain English only.
4. Focus on WHY the played move was bad and WHAT the best move accomplished.

Write the coaching note now:`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();

    // Validate with Zod
    const parsed = ExplanationSchema.parse({ explanation: text });
    return { explanation: parsed.explanation, modelUsed: MODEL_NAME };
  } catch (err) {
    console.error('[llm-explainer] Failed to generate explanation:', err);
    return null;
  }
}

function formatEval(cp: number): string {
  if (Math.abs(cp) >= 30000) {
    return cp > 0 ? 'forced mate for White' : 'forced mate for Black';
  }
  const pawns = (cp / 100).toFixed(2);
  return cp >= 0 ? `+${pawns}` : pawns;
}
