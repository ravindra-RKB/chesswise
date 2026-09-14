import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';

// GET /api/chat/sessions — list user's chat sessions
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const dbUser = await prisma.user.findUnique({ where: { supabaseId: user.id } });
  if (!dbUser) return NextResponse.json({ sessions: [] });

  const sessions = await prisma.chatSession.findMany({
    where: { userId: dbUser.id },
    orderBy: { updatedAt: 'desc' },
    take: 30,
    select: {
      id: true,
      title: true,
      gameId: true,
      createdAt: true,
      updatedAt: true,
      messages: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: { content: true, role: true },
      },
    },
  });

  return NextResponse.json({ sessions });
}
