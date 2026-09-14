import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const dbUser = await prisma.user.findUnique({ where: { supabaseId: user.id } });
  if (!dbUser) return NextResponse.json({ games: [] });

  const games = await prisma.game.findMany({
    where: { userId: dbUser.id },
    orderBy: { importedAt: 'desc' },
    take: 50,
    select: {
      id: true,
      headers: true,
      status: true,
      accuracy: true,
      importedAt: true,
      analyzedAt: true,
    },
  });

  return NextResponse.json({ games });
}
