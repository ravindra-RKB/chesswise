import { NextRequest, NextResponse } from 'next/server';
import { Chess } from '@chesswise/chess-core';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';
import { Queue } from 'bullmq';

const REDIS_URL = process.env.REDIS_URL ?? 'redis://localhost:6379';

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { pgn } = body as { pgn?: string };

  if (!pgn || typeof pgn !== 'string') {
    return NextResponse.json({ error: 'pgn is required' }, { status: 400 });
  }

  // Validate PGN
  const chess = new Chess();
  try {
    chess.loadPgn(pgn.trim());
  } catch {
    return NextResponse.json({ error: 'Invalid PGN format' }, { status: 400 });
  }

  if (chess.history().length === 0) {
    return NextResponse.json({ error: 'PGN has no moves' }, { status: 400 });
  }

  // Extract headers
  const headers: Record<string, string> = {};
  const headerLines = pgn.match(/\[(\w+)\s+"([^"]*)"\]/g) ?? [];
  for (const line of headerLines) {
    const match = line.match(/\[(\w+)\s+"([^"]*)"\]/);
    if (match) headers[match[1]!] = match[2]!;
  }

  // Look up or create User row linked to Supabase user
  let dbUser = await prisma.user.findUnique({ where: { supabaseId: user.id } });
  if (!dbUser) {
    dbUser = await prisma.user.create({
      data: {
        supabaseId: user.id,
        email: user.email!,
        displayName: user.user_metadata?.display_name ?? user.email?.split('@')[0],
      },
    });
  }

  // Create the game record
  const game = await prisma.game.create({
    data: {
      userId: dbUser.id,
      pgn: pgn.trim(),
      headers,
      status: 'QUEUED',
    },
  });

  // Enqueue analysis job (non-blocking — if Redis is unavailable, game stays QUEUED)
  try {
    const queue = new Queue('game-analysis', { connection: { url: REDIS_URL } });
    await queue.add(
      'analyze',
      { gameId: game.id },
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
      },
    );
    await queue.close();
  } catch (err) {
    console.warn('[import] Redis not available — job not queued:', err);
    // Game stays in QUEUED state; worker can pick it up when Redis is available
  }

  return NextResponse.json({ gameId: game.id, status: 'QUEUED' }, { status: 201 });
}
