import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';

export async function GET(_req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const dbUser = await prisma.user.findUnique({ where: { supabaseId: user.id } });
  if (!dbUser)
    return NextResponse.json({ dueToday: 0, totalSolved: 0, accuracy7d: null, streak: 0 });

  const now = new Date();
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const [dueToday, totalSolved, recent] = await Promise.all([
    // Count puzzles due today
    prisma.puzzleCard.count({
      where: { userId: dbUser.id, nextReviewAt: { lte: now } },
    }),
    // Total solved ever
    prisma.puzzleCard.aggregate({
      where: { userId: dbUser.id },
      _sum: { solvedCount: true },
    }),
    // Last 7 days audit logs for accuracy
    prisma.auditLog.findMany({
      where: {
        userId: dbUser.id,
        action: { in: ['puzzle_solved', 'puzzle_failed'] },
        createdAt: { gte: sevenDaysAgo },
      },
      select: { action: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  const solvedCount = recent.filter((r) => r.action === 'puzzle_solved').length;
  const accuracy7d = recent.length > 0 ? Math.round((solvedCount / recent.length) * 100) : null;

  // Streak: consecutive days with at least one solve
  const daysSolved = new Set(
    recent.filter((r) => r.action === 'puzzle_solved').map((r) => r.createdAt.toDateString()),
  );
  let streak = 0;
  const today = new Date();
  for (let i = 0; i < 30; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    if (daysSolved.has(d.toDateString())) streak++;
    else break;
  }

  return NextResponse.json({
    dueToday,
    totalSolved: totalSolved._sum.solvedCount ?? 0,
    accuracy7d,
    streak,
  });
}
