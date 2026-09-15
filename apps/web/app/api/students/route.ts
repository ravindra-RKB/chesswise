import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';

export async function GET(_req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const dbUser = await prisma.user.findUnique({
    where: { supabaseId: user.id },
    select: { id: true, role: true },
  });

  if (!dbUser || dbUser.role !== 'COACH') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const students = await prisma.user.findMany({
    where: { coachId: dbUser.id },
    select: {
      id: true,
      displayName: true,
      email: true,
      xp: true,
      level: true,
      skillProfile: true,
      _count: {
        select: { games: true },
      },
    },
  });

  return NextResponse.json({ students });
}
