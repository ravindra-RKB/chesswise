import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';

// Spend (deduct) XP for features like hints
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { amount, reason } = (await req.json()) as { amount: number; reason?: string };
  if (!amount || amount <= 0)
    return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });

  const dbUser = await prisma.user.findUnique({
    where: { supabaseId: user.id },
    select: { id: true, xp: true, level: true },
  });
  if (!dbUser) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const newXp = Math.max(0, dbUser.xp - amount);
  await prisma.user.update({
    where: { id: dbUser.id },
    data: { xp: newXp },
  });

  return NextResponse.json({ xp: newXp, level: dbUser.level, spent: amount, reason });
}
