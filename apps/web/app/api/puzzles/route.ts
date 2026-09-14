import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';

// GET /api/puzzles — returns today's due puzzles, worst skill area first
export async function GET(_req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const dbUser = await prisma.user.findUnique({ where: { supabaseId: user.id } });
  if (!dbUser) return NextResponse.json({ puzzles: [] });

  const now = new Date();

  const puzzles = await prisma.puzzleCard.findMany({
    where: {
      userId: dbUser.id,
      nextReviewAt: { lte: now },
    },
    include: {
      gameMove: {
        select: {
          san: true,
          quality: true,
          tacticTag: true,
          bestMoveSan: true,
          explanation: true,
          fenBefore: true,
        },
      },
      game: {
        select: { headers: true, id: true },
      },
    },
    orderBy: [
      // Blunders first, then mistakes
      { quality: 'asc' },
      { nextReviewAt: 'asc' },
    ],
    take: 20, // cap at 20 per session
  });

  return NextResponse.json({ puzzles });
}
