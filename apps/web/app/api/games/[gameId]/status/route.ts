import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest, { params }: { params: Promise<{ gameId: string }> }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { gameId } = await params;

  const dbUser = await prisma.user.findUnique({ where: { supabaseId: user.id } });
  if (!dbUser) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const game = await prisma.game.findFirst({
    where: { id: gameId, userId: dbUser.id },
    select: { status: true, accuracy: true, errorMsg: true },
  });

  if (!game) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  return NextResponse.json(game);
}
