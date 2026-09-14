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
    select: {
      displayName: true,
      avatarUrl: true,
      email: true,
      lichessUsername: true,
      chessComUsername: true,
      xp: true,
      level: true,
    },
  });

  if (!dbUser) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ settings: dbUser });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { displayName, avatarUrl, lichessUsername, chessComUsername } = body as {
    displayName?: string;
    avatarUrl?: string;
    lichessUsername?: string;
    chessComUsername?: string;
  };

  const updated = await prisma.user.update({
    where: { supabaseId: user.id },
    data: {
      ...(displayName !== undefined && { displayName: displayName.trim() || null }),
      ...(avatarUrl !== undefined && { avatarUrl: avatarUrl.trim() || null }),
      ...(lichessUsername !== undefined && { lichessUsername: lichessUsername.trim() || null }),
      ...(chessComUsername !== undefined && { chessComUsername: chessComUsername.trim() || null }),
    },
    select: { displayName: true, avatarUrl: true, lichessUsername: true, chessComUsername: true },
  });

  return NextResponse.json({ settings: updated });
}
