'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useChess } from '@/hooks/use-chess';
import ChessBoard from '@/components/chess/chess-board';
import MoveList from '@/components/chess/move-list';
import { Square } from '@chesswise/chess-core';
import { cn } from '@/lib/utils';
import { RealtimeChannel } from '@supabase/supabase-js';

export default function MultiplayerPage() {
  const [supabase] = useState(() => createClient());
  const [matchId, setMatchId] = useState('');
  const [joinId, setJoinId] = useState('');
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);

  const [status, setStatus] = useState<'lobby' | 'waiting' | 'playing'>('lobby');
  const [playerColor, setPlayerColor] = useState<'white' | 'black'>('white');
  const [opponentName, setOpponentName] = useState<string>('Opponent');

  const chess = useChess();

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [channel, supabase]);

  const handleCreateMatch = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const myName = user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'Player';
    const newMatchId = Math.random().toString(36).substring(2, 8).toUpperCase();

    setMatchId(newMatchId);
    setPlayerColor('white'); // Creator is white
    setStatus('waiting');
    chess.resetGame();

    const ch = supabase.channel(`match-${newMatchId}`);

    ch.on('broadcast', { event: 'join' }, ({ payload }) => {
      setOpponentName(payload.name);
      setStatus('playing');
      // Send creator info back
      ch.send({
        type: 'broadcast',
        event: 'creator_info',
        payload: { name: myName },
      });
    })
      .on('broadcast', { event: 'move' }, ({ payload }) => {
        chess.makeMove(payload.from, payload.to, payload.promotion);
      })
      .subscribe();

    setChannel(ch);
  };

  const handleJoinMatch = async () => {
    if (!joinId.trim()) return;
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const myName = user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'Player';

    setMatchId(joinId.toUpperCase());
    setPlayerColor('black'); // Joiner is black
    chess.resetGame();

    const ch = supabase.channel(`match-${joinId.toUpperCase()}`);

    ch.on('broadcast', { event: 'creator_info' }, ({ payload }) => {
      setOpponentName(payload.name);
      setStatus('playing');
    })
      .on('broadcast', { event: 'move' }, ({ payload }) => {
        chess.makeMove(payload.from, payload.to, payload.promotion);
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          ch.send({
            type: 'broadcast',
            event: 'join',
            payload: { name: myName },
          });
        }
      });

    setChannel(ch);
  };

  const handleMove = useCallback(
    (from: Square, to: Square, promotion?: string) => {
      // Only allow move if it's our turn
      const turnColor = chess.turn === 'w' ? 'white' : 'black';
      if (turnColor !== playerColor) return;
      if (status !== 'playing') return;

      const success = chess.makeMove(from, to, promotion as any);
      if (success && channel) {
        channel.send({
          type: 'broadcast',
          event: 'move',
          payload: { from, to, promotion },
        });
      }
    },
    [chess, playerColor, status, channel],
  );

  const handleLeave = () => {
    if (channel) supabase.removeChannel(channel);
    setChannel(null);
    setStatus('lobby');
    setMatchId('');
    setJoinId('');
  };

  if (status === 'lobby') {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <div className="w-full max-w-md space-y-8 rounded-xl border border-border bg-card p-8">
          <div className="text-center">
            <h1 className="font-serif text-2xl font-bold text-foreground">Multiplayer</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Play realtime games against other humans.
            </p>
          </div>

          <div className="space-y-4 border-t border-border pt-4">
            <button
              onClick={handleCreateMatch}
              className="w-full rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Create Match (Play as White)
            </button>

            <div className="relative flex items-center py-2">
              <div className="flex-grow border-t border-border"></div>
              <span className="flex-shrink-0 px-4 text-xs uppercase tracking-wider text-muted-foreground">
                Or join
              </span>
              <div className="flex-grow border-t border-border"></div>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Enter Match ID"
                value={joinId}
                onChange={(e) => setJoinId(e.target.value)}
                className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm uppercase placeholder:normal-case focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <button
                onClick={handleJoinMatch}
                disabled={!joinId.trim()}
                className="rounded-lg border border-border px-4 py-2 text-sm font-medium transition-colors hover:bg-muted disabled:opacity-50"
              >
                Join
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const isMyTurn = (chess.turn === 'w' ? 'white' : 'black') === playerColor;
  let gameStatusMsg = '';
  if (chess.isCheckmate) gameStatusMsg = 'Checkmate!';
  else if (chess.isDraw) gameStatusMsg = 'Draw!';
  else if (chess.isCheck) gameStatusMsg = 'Check!';
  else if (status === 'waiting') gameStatusMsg = 'Waiting for opponent...';
  else gameStatusMsg = isMyTurn ? 'Your turn' : "Opponent's turn";

  return (
    <div className="flex h-full flex-col gap-6 lg:flex-row">
      {/* Board */}
      <div className="flex flex-1 flex-col items-center justify-center space-y-4">
        {status === 'waiting' && (
          <div className="mb-4 space-y-2 text-center animate-in fade-in slide-in-from-bottom-4">
            <p className="text-lg font-medium text-foreground">Waiting for opponent to join...</p>
            <p className="text-sm text-muted-foreground">Share this Match ID with your friend:</p>
            <div className="inline-block rounded-lg border border-border bg-muted/50 px-6 py-3 font-mono text-3xl font-bold tracking-widest text-primary">
              {matchId}
            </div>
          </div>
        )}

        <div
          className={cn(
            'transition-opacity duration-500',
            status === 'waiting' ? 'pointer-events-none opacity-50' : 'opacity-100',
          )}
        >
          <ChessBoard
            fen={chess.fen}
            orientation={playerColor}
            onMove={handleMove}
            interactive={status === 'playing' && isMyTurn && !chess.isGameOver}
            lastMove={
              chess.history.length > 0
                ? {
                    from: chess.history[chess.history.length - 1]!.from as Square,
                    to: chess.history[chess.history.length - 1]!.to as Square,
                  }
                : null
            }
          />
        </div>
      </div>

      {/* Side panel */}
      <div className="flex w-full flex-col gap-4 lg:w-72">
        <div className="space-y-3 rounded-lg border border-border bg-card p-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Match ID
            </span>
            <span className="font-mono text-sm font-bold text-foreground">{matchId}</span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full border border-border bg-white"></div>
              <span className="text-sm font-medium">
                {playerColor === 'white' ? 'You' : opponentName}
              </span>
            </div>
            <span className="text-xs text-muted-foreground">vs</span>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">
                {playerColor === 'black' ? 'You' : opponentName}
              </span>
              <div className="h-3 w-3 rounded-full border border-border bg-black"></div>
            </div>
          </div>

          <div
            className={cn(
              'rounded border py-2 text-center text-sm font-semibold',
              chess.isCheckmate
                ? 'border-[#9B3B3B] bg-[#9B3B3B]/10 text-[#9B3B3B]'
                : 'border-primary/20 bg-primary/10 text-primary',
            )}
          >
            {gameStatusMsg}
          </div>
        </div>

        <div className="flex flex-1 flex-col overflow-hidden rounded-lg border border-border bg-card">
          <div className="border-b border-border px-4 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Move History
          </div>
          <MoveList
            history={chess.history}
            currentIndex={chess.historyIndex}
            className="flex-1 p-2"
          />
        </div>

        <button
          onClick={handleLeave}
          className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-2 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10"
        >
          Leave Match
        </button>
      </div>
    </div>
  );
}
