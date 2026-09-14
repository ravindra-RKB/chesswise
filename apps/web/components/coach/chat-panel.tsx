'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';

interface Message {
  id?: string;
  role: 'USER' | 'ASSISTANT';
  content: string;
  streaming?: boolean;
}

interface ChatPanelProps {
  gameId?: string;
  fen?: string;
  initialMessage?: string; // pre-filled question (e.g. from "Ask Coach" button)
  onClose?: () => void;
  embedded?: boolean; // true = full page, false = floating panel
}

function MarkdownText({ text }: { text: string }) {
  // Minimal markdown: bold, inline code, line breaks
  const rendered = text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`]+)`/g, '<code class="font-mono bg-muted px-1 rounded text-xs">$1</code>')
    .replace(/\n/g, '<br/>');

  return <span className="leading-relaxed" dangerouslySetInnerHTML={{ __html: rendered }} />;
}

export default function ChatPanel({
  gameId,
  fen,
  initialMessage = '',
  onClose,
  embedded = false,
}: ChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState(initialMessage);
  const [sessionId, setSessionId] = useState<string | undefined>();
  const [isStreaming, setIsStreaming] = useState(false);
  const [sessions, setSessions] = useState<any[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Auto-focus input and set initial message
  useEffect(() => {
    if (initialMessage) {
      setInput(initialMessage);
      inputRef.current?.focus();
    }
  }, [initialMessage]);

  const loadSessions = async () => {
    const res = await fetch('/api/chat/sessions');
    if (res.ok) {
      const data = await res.json();
      setSessions(data.sessions ?? []);
    }
  };

  const loadSession = async (id: string) => {
    const res = await fetch(`/api/chat/sessions/${id}`);
    if (res.ok) {
      const data = await res.json();
      setSessionId(id);
      setMessages(
        data.session.messages.map((m: any) => ({
          id: m.id,
          role: m.role,
          content: m.content,
        })),
      );
      setShowHistory(false);
    }
  };

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || isStreaming) return;

    setInput('');
    setIsStreaming(true);

    const userMsg: Message = { role: 'USER', content: text };
    setMessages((prev) => [...prev, userMsg]);

    // Add streaming placeholder
    const placeholderId = `stream-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      { id: placeholderId, role: 'ASSISTANT', content: '', streaming: true },
    ]);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, sessionId, gameId, fen }),
      });

      if (!res.ok || !res.body) throw new Error('Chat request failed');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter((l) => l.startsWith('data: '));

        for (const line of lines) {
          try {
            const payload = JSON.parse(line.slice(6));
            if (payload.sessionId && !sessionId) setSessionId(payload.sessionId);
            if (payload.text) {
              accumulated += payload.text;
              setMessages((prev) =>
                prev.map((m) => (m.id === placeholderId ? { ...m, content: accumulated } : m)),
              );
            }
            if (payload.done) {
              setMessages((prev) =>
                prev.map((m) => (m.id === placeholderId ? { ...m, streaming: false } : m)),
              );
            }
          } catch {
            // skip malformed SSE line
          }
        }
      }
    } catch (err) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === placeholderId
            ? { ...m, content: '⚠ Something went wrong. Please try again.', streaming: false }
            : m,
        ),
      );
    } finally {
      setIsStreaming(false);
    }
  }, [input, isStreaming, sessionId, gameId, fen]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const newChat = () => {
    setMessages([]);
    setSessionId(undefined);
    setInput('');
    setShowHistory(false);
  };

  const panelClass = embedded
    ? 'flex flex-col h-full'
    : 'flex flex-col h-[600px] w-[380px] rounded-2xl border border-border bg-card shadow-2xl';

  return (
    <div className={panelClass}>
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <span className="text-lg">🤖</span>
        <div className="flex-1">
          <p className="text-sm font-semibold text-foreground">Chess Coach</p>
          <p className="text-[10px] text-muted-foreground">
            {gameId ? 'Game-specific coaching' : 'General chess coaching'}
          </p>
        </div>
        <button
          onClick={() => {
            setShowHistory(!showHistory);
            if (!showHistory) loadSessions();
          }}
          className="rounded p-1.5 text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground"
          title="Chat history"
        >
          🕐
        </button>
        <button
          onClick={newChat}
          className="rounded p-1.5 text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground"
          title="New chat"
        >
          ✏️
        </button>
        {onClose && (
          <button
            onClick={onClose}
            className="rounded p-1.5 text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground"
          >
            ✕
          </button>
        )}
      </div>

      {/* Session history sidebar */}
      {showHistory && (
        <div className="max-h-48 overflow-y-auto border-b border-border bg-muted/10">
          {sessions.length === 0 ? (
            <p className="px-4 py-3 text-xs text-muted-foreground">No previous conversations</p>
          ) : (
            sessions.map((s) => (
              <button
                key={s.id}
                onClick={() => loadSession(s.id)}
                className="w-full border-b border-border/30 px-4 py-2 text-left transition-colors last:border-0 hover:bg-muted/30"
              >
                <p className="truncate text-xs font-medium text-foreground">{s.title}</p>
                {s.messages[0] && (
                  <p className="mt-0.5 truncate text-[10px] text-muted-foreground">
                    {s.messages[0].content}
                  </p>
                )}
              </button>
            ))
          )}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-3">
        {messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
            <span className="text-4xl">♟</span>
            <p className="text-sm font-medium text-foreground">Ask me anything about chess!</p>
            <p className="max-w-[260px] text-xs text-muted-foreground">
              {gameId
                ? "I have full context of this game's mistakes and your skill profile."
                : 'I have your skill profile and recent blunders loaded as context.'}
            </p>
            <div className="flex w-full max-w-[280px] flex-col gap-2">
              {[
                gameId ? 'Why was that move a blunder?' : 'What should I focus on to improve?',
                gameId ? 'What tactic did I miss?' : 'Explain the Sicilian Defense basics',
                'How can I improve my endgame?',
              ].map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => setInput(suggestion)}
                  className="rounded-lg border border-border px-3 py-2 text-left text-xs text-muted-foreground transition-colors hover:border-[#C9A24B]/50 hover:text-foreground"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={msg.id ?? i}
            className={cn('flex', msg.role === 'USER' ? 'justify-end' : 'justify-start')}
          >
            <div
              className={cn(
                'max-w-[85%] rounded-2xl px-3 py-2 text-sm',
                msg.role === 'USER'
                  ? 'rounded-br-sm bg-primary text-primary-foreground'
                  : 'rounded-bl-sm bg-muted text-foreground',
              )}
            >
              {msg.role === 'ASSISTANT' ? (
                <>
                  <MarkdownText text={msg.content} />
                  {msg.streaming && (
                    <span className="ml-0.5 inline-block h-3 w-2 animate-pulse rounded-sm bg-current" />
                  )}
                </>
              ) : (
                msg.content
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-border px-3 py-3">
        <div className="flex items-end gap-2 rounded-xl border border-border bg-background px-3 py-2 focus-within:ring-1 focus-within:ring-ring">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about chess..."
            rows={1}
            disabled={isStreaming}
            className="max-h-24 flex-1 resize-none bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none disabled:opacity-50"
            style={{ fieldSizing: 'content' } as React.CSSProperties}
          />
          <button
            onClick={send}
            disabled={!input.trim() || isStreaming}
            className="flex-shrink-0 rounded-lg bg-primary p-1.5 text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-40"
          >
            <svg width={16} height={16} viewBox="0 0 24 24" fill="currentColor">
              <path d="M2 21L23 12 2 3v7l15 2-15 2z" />
            </svg>
          </button>
        </div>
        <p className="mt-1 text-center text-[10px] text-muted-foreground">
          Enter to send · Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}
