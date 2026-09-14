'use client';

import ChatPanel from '@/components/coach/chat-panel';

export default function CoachPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div>
        <h1 className="font-serif text-2xl font-bold text-foreground">AI Coach</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Ask anything about chess — your skill profile and recent blunders are already loaded as
          context.
        </p>
      </div>
      <div className="overflow-hidden rounded-2xl border border-border" style={{ height: '70vh' }}>
        <ChatPanel embedded={true} />
      </div>
    </div>
  );
}
