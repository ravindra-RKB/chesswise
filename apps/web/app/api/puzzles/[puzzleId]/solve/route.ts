import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';

/**
 * SM-2 algorithm:
 * - Correct (quality >= 3): EF' = EF + 0.1 - (5 - q) * (0.08 + (5 - q) * 0.02), interval grows
 * - Incorrect: reset interval to 1
 */
function sm2Update(correct: boolean, interval: number, easeFactor: number, solvedCount: number) {
  if (!correct) {
    return {
      interval: 1,
      easeFactor: Math.max(1.3, easeFactor - 0.2),
      nextReviewAt: addDays(new Date(), 1),
      solvedCount,
    };
  }

  // q = 4 for correct (simplified — could expose a 0-5 rating later)
  const q = 4;
  const newEF = Math.max(1.3, easeFactor + 0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));

  let newInterval: number;
  if (solvedCount === 0) newInterval = 1;
  else if (solvedCount === 1) newInterval = 6;
  else newInterval = Math.round(interval * newEF);

  return {
    interval: newInterval,
    easeFactor: newEF,
    nextReviewAt: addDays(new Date(), newInterval),
    solvedCount: solvedCount + 1,
  };
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ puzzleId: string }> },
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { puzzleId } = await params;
  const body = await req.json();
  const { correct } = body as { correct: boolean };

  const dbUser = await prisma.user.findUnique({ where: { supabaseId: user.id } });
  if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const puzzle = await prisma.puzzleCard.findFirst({
    where: { id: puzzleId, userId: dbUser.id },
  });
  if (!puzzle) return NextResponse.json({ error: 'Puzzle not found' }, { status: 404 });

  const { interval, easeFactor, nextReviewAt, solvedCount } = sm2Update(
    correct,
    puzzle.interval,
    puzzle.easeFactor,
    puzzle.solvedCount,
  );

  await prisma.puzzleCard.update({
    where: { id: puzzleId },
    data: { interval, easeFactor, nextReviewAt, solvedCount },
  });

  // Write audit log entry
  await prisma.auditLog.create({
    data: {
      userId: dbUser.id,
      entityType: 'puzzle',
      entityId: puzzleId,
      action: correct ? 'puzzle_solved' : 'puzzle_failed',
      metadata: { correct, newInterval: interval, newEaseFactor: easeFactor },
    },
  });

  return NextResponse.json({
    success: true,
    nextReviewAt,
    interval,
    message: correct
      ? `✅ Correct! Next review in ${interval} day${interval === 1 ? '' : 's'}`
      : `❌ Try again. Due again tomorrow.`,
  });
}
