import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';

// POST /api/audit — append an audit log entry (override, note, etc.)
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { entityType, entityId, action, reason, metadata } = body as {
    entityType: string;
    entityId: string;
    action: string;
    reason?: string;
    metadata?: Record<string, unknown>;
  };

  if (!entityType || !entityId || !action) {
    return NextResponse.json({ error: 'entityType, entityId, action required' }, { status: 400 });
  }

  const dbUser = await prisma.user.findUnique({ where: { supabaseId: user.id } });
  if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const log = await prisma.auditLog.create({
    data: {
      userId: dbUser.id,
      entityType,
      entityId,
      action,
      reason: reason ?? null,
      metadata: (metadata ?? {}) as object,
    },
  });

  return NextResponse.json({ log }, { status: 201 });
}

// GET /api/audit?entityId=<id> — returns full audit chain for an entity
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const entityId = searchParams.get('entityId');
  if (!entityId) return NextResponse.json({ error: 'entityId required' }, { status: 400 });

  const dbUser = await prisma.user.findUnique({ where: { supabaseId: user.id } });
  if (!dbUser) return NextResponse.json({ logs: [] });

  const logs = await prisma.auditLog.findMany({
    where: { entityId, userId: dbUser.id },
    orderBy: { createdAt: 'asc' },
  });

  return NextResponse.json({ logs });
}
