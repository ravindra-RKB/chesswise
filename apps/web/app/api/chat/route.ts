import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';
import { buildCoachContext } from '@/lib/coach-context';
import { GoogleGenerativeAI } from '@google/generative-ai';

const MODEL = 'gemini-1.5-flash';

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response('Unauthorized', { status: 401 });

  const body = await req.json();
  const { message, sessionId, gameId, fen } = body as {
    message: string;
    sessionId?: string;
    gameId?: string;
    fen?: string;
  };

  if (!message?.trim()) return new Response('message is required', { status: 400 });

  const dbUser = await prisma.user.findUnique({ where: { supabaseId: user.id } });
  if (!dbUser) return new Response('User not found', { status: 404 });

  // Get or create chat session
  let session;
  if (sessionId) {
    session = await prisma.chatSession.findFirst({
      where: { id: sessionId, userId: dbUser.id },
    });
  }
  if (!session) {
    const title = message.slice(0, 60) + (message.length > 60 ? '...' : '');
    session = await prisma.chatSession.create({
      data: {
        userId: dbUser.id,
        gameId: gameId ?? null,
        title,
      },
    });
  }

  // Persist user message
  await prisma.chatMessage.create({
    data: { sessionId: session.id, role: 'USER', content: message },
  });

  // Load message history (last 20 turns for context window)
  const history = await prisma.chatMessage.findMany({
    where: { sessionId: session.id },
    orderBy: { createdAt: 'asc' },
    take: 20,
  });

  // Build grounded context
  const { systemPrompt } = await buildCoachContext(dbUser.id, {
    gameId: gameId ?? session.gameId ?? undefined,
    fen,
  });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    // Graceful degradation
    const fallback =
      "I'm sorry, the AI coach is temporarily unavailable. Please add a GEMINI_API_KEY to enable coaching.";
    await prisma.chatMessage.create({
      data: { sessionId: session.id, role: 'ASSISTANT', content: fallback },
    });
    return new Response(
      `data: ${JSON.stringify({ text: fallback, sessionId: session.id, done: true })}\n\n`,
      { headers: { 'Content-Type': 'text/event-stream' } },
    );
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: MODEL,
    systemInstruction: systemPrompt,
  });

  // Build chat history for Gemini (exclude current message)
  const chatHistory = history
    .slice(0, -1) // exclude the message we just saved
    .map((m) => ({
      role: m.role === 'USER' ? 'user' : 'model',
      parts: [{ text: m.content }],
    }));

  const chat = model.startChat({ history: chatHistory });

  // Stream response as SSE
  const encoder = new TextEncoder();
  let fullResponse = '';

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const result = await chat.sendMessageStream(message);

        for await (const chunk of result.stream) {
          const text = chunk.text();
          fullResponse += text;
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ text, sessionId: session!.id })}\n\n`),
          );
        }

        // Persist the full assistant response
        await prisma.chatMessage.create({
          data: { sessionId: session!.id, role: 'ASSISTANT', content: fullResponse },
        });

        // Auto-update session title from first message if default
        if (session!.title === 'New conversation') {
          await prisma.chatSession.update({
            where: { id: session!.id },
            data: { title: message.slice(0, 60) },
          });
        }

        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ done: true, sessionId: session!.id })}\n\n`),
        );
      } catch (err) {
        console.error('[chat] Gemini error:', err);
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ error: 'Coach error. Please try again.', done: true })}\n\n`,
          ),
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
