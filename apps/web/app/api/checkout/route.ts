import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';

export async function POST(_req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // In a real app with Dodo Payments, this would call their API to create a checkout session
  // and return the URL. For this demo, we instantly upgrade the user to Pro.

  await prisma.user.update({
    where: { supabaseId: user.id },
    data: { isPro: true },
  });

  return NextResponse.json({
    success: true,
    message: 'Payment successful! You have been upgraded to Chesswise Pro.',
  });
}

export async function GET(_req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ isPro: false });

  const dbUser = await prisma.user.findUnique({
    where: { supabaseId: user.id },
    select: { isPro: true },
  });

  return NextResponse.json({ isPro: dbUser?.isPro || false });
}
