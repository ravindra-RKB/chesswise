'use client';

import { useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

type Tab = 'paste' | 'username' | 'my-games';
type GameStatus =
  | 'IMPORTED'
  | 'QUEUED'
  | 'PROCESSING'
  | 'ANALYSIS_COMPLETE'
  | 'EXPLANATION_READY'
  | 'PROFILE_UPDATED'
  | 'PROCESSING_FAILED';

interface GameSummary {
  id: string;
  headers: Record<string, string>;
  status: GameStatus;
  accuracy: number | null;
  importedAt: string;
}

const STATUS_LABELS: Record<GameStatus, string> = {
  IMPORTED: 'Imported',
  QUEUED: 'Queued',
  PROCESSING: 'Analyzing...',
  ANALYSIS_COMPLETE: 'Engine done',
  EXPLANATION_READY: 'Report ready',
  PROFILE_UPDATED: 'Complete',
  PROCESSING_FAILED: 'Failed',
};

const STATUS_COLORS: Record<GameStatus, string> = {
  IMPORTED: 'text-muted-foreground',
  QUEUED: 'text-[#C9A24B]',
  PROCESSING: 'text-[#C9A24B] animate-pulse',
  ANALYSIS_COMPLETE: 'text-[#C9A24B]',
  EXPLANATION_READY: 'text-good',
  PROFILE_UPDATED: 'text-good',
  PROCESSING_FAILED: 'text-destructive',
};

const DONE_STATUSES: GameStatus[] = ['EXPLANATION_READY', 'PROFILE_UPDATED'];

export default function ImportPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('paste');

  // Paste / upload state
  const [pgn, setPgn] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [pendingGameId, setPendingGameId] = useState<string | null>(null);
  const [analysisStatus, setAnalysisStatus] = useState<GameStatus | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Username fetch state
  const [username, setUsername] = useState('');
  const [source, setSource] = useState<'lichess' | 'chess.com'>('lichess');
  const [fetchLimit, setFetchLimit] = useState(5);
  const [fetchLoading, setFetchLoading] = useState(false);
  const [fetchError, setFetchError] = useState('');

  // My games state
  const [games, setGames] = useState<GameSummary[]>([]);
  const [gamesLoaded, setGamesLoaded] = useState(false);

  const startPolling = (gameId: string) => {
    setPendingGameId(gameId);
    setAnalysisStatus('QUEUED');
    pollRef.current = setInterval(async () => {
      const res = await fetch(`/api/games/${gameId}/status`);
      if (!res.ok) return;
      const data = await res.json();
      setAnalysisStatus(data.status);
      if (DONE_STATUSES.includes(data.status) || data.status === 'PROCESSING_FAILED') {
        clearInterval(pollRef.current!);
        if (DONE_STATUSES.includes(data.status)) {
          setTimeout(() => router.push(`/report/${gameId}`), 800);
        }
      }
    }, 2500);
  };

  const handlePgnSubmit = async () => {
    if (!pgn.trim()) return;
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/games/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pgn }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Import failed');
      startPolling(data.gameId);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setPgn((ev.target?.result as string) ?? '');
    reader.readAsText(file);
  }, []);

  const handleUsernameFetch = async () => {
    if (!username.trim()) return;
    setFetchError('');
    setFetchLoading(true);
    try {
      let gamesData: string[] = [];

      if (source === 'lichess') {
        const res = await fetch(
          `https://lichess.org/api/games/user/${username}?max=${fetchLimit}&pgnInJson=false`,
          { headers: { Accept: 'application/x-ndjson' } },
        );
        if (!res.ok) throw new Error('Failed to fetch from Lichess');
        const text = await res.text();
        // Each line is a game in PGN
        gamesData = text.split('\n\n\n').filter(Boolean);
      } else {
        // Chess.com public API
        const archivesRes = await fetch(
          `https://api.chess.com/pub/player/${username}/games/archives`,
        );
        if (!archivesRes.ok) throw new Error('Player not found on Chess.com');
        const archivesData = await archivesRes.json();
        const latestArchive = archivesData.archives?.[archivesData.archives.length - 1];
        if (!latestArchive) throw new Error('No games found');
        const gamesRes = await fetch(`${latestArchive}/pgn`);
        const pgnsText = await gamesRes.text();
        gamesData = pgnsText.split('\n\n\n').filter(Boolean).slice(0, fetchLimit);
      }

      if (gamesData.length === 0) throw new Error('No games found for this user');

      // Import each game
      let importedCount = 0;
      let lastGameId = '';
      for (const gamePgn of gamesData.slice(0, fetchLimit)) {
        const res = await fetch('/api/games/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pgn: gamePgn }),
        });
        if (res.ok) {
          const d = await res.json();
          lastGameId = d.gameId;
          importedCount++;
        }
      }

      if (importedCount === 0) throw new Error('Failed to import any games');
      if (lastGameId) startPolling(lastGameId);
    } catch (err: any) {
      setFetchError(err.message);
    } finally {
      setFetchLoading(false);
    }
  };

  const loadMyGames = async () => {
    const res = await fetch('/api/games');
    if (res.ok) {
      const data = await res.json();
      setGames(data.games ?? []);
      setGamesLoaded(true);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-bold text-foreground">Import a Game</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Paste a PGN, upload a file, or fetch from Lichess / Chess.com
        </p>
      </div>

      {/* Analysis status banner */}
      {pendingGameId && analysisStatus && (
        <div
          className={cn(
            'rounded-lg border px-4 py-3 text-sm font-medium',
            DONE_STATUSES.includes(analysisStatus)
              ? 'border-good/40 bg-good/10 text-good'
              : analysisStatus === 'PROCESSING_FAILED'
                ? 'border-destructive/40 bg-destructive/10 text-destructive'
                : 'border-[#C9A24B]/40 bg-[#C9A24B]/10 text-[#C9A24B]',
          )}
        >
          {DONE_STATUSES.includes(analysisStatus)
            ? '✅ Analysis complete! Redirecting to report...'
            : analysisStatus === 'PROCESSING_FAILED'
              ? '❌ Analysis failed. Please try again.'
              : `⏳ ${STATUS_LABELS[analysisStatus]} — please wait...`}
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-border">
        {(
          [
            ['paste', 'Paste / Upload'],
            ['username', 'Lichess / Chess.com'],
            ['my-games', 'My Games'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            onClick={() => {
              setTab(id);
              if (id === 'my-games' && !gamesLoaded) loadMyGames();
            }}
            className={cn(
              '-mb-px border-b-2 px-4 py-2 text-sm font-medium transition-colors',
              tab === id
                ? 'border-[#C9A24B] text-[#C9A24B]'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Tab: Paste / Upload */}
      {tab === 'paste' && (
        <div className="space-y-4">
          <textarea
            value={pgn}
            onChange={(e) => setPgn(e.target.value)}
            placeholder={`[Event "Example Game"]\n[White "Magnus"]\n[Black "Hikaru"]\n\n1. e4 e5 2. Nf3 Nc6 ...`}
            rows={10}
            className="w-full resize-y rounded-lg border border-border bg-card px-4 py-3 font-mono text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <div className="flex items-center gap-3">
            <label className="flex-1 cursor-pointer rounded-lg border border-dashed border-border bg-muted/20 px-4 py-3 text-center text-sm text-muted-foreground transition-colors hover:border-[#C9A24B]/50">
              📂 Drop a .pgn file or click to upload
              <input type="file" accept=".pgn" onChange={handleFileUpload} className="hidden" />
            </label>
            <button
              onClick={handlePgnSubmit}
              disabled={!pgn.trim() || loading || !!pendingGameId}
              className="rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              {loading ? 'Importing...' : 'Analyze Game'}
            </button>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
      )}

      {/* Tab: Username fetch */}
      {tab === 'username' && (
        <div className="space-y-4">
          <div className="flex gap-2">
            <button
              onClick={() => setSource('lichess')}
              className={cn(
                'rounded-md border px-4 py-2 text-sm font-medium transition-colors',
                source === 'lichess'
                  ? 'border-[#C9A24B] bg-[#C9A24B]/10 text-[#C9A24B]'
                  : 'border-border text-muted-foreground',
              )}
            >
              🟢 Lichess
            </button>
            <button
              onClick={() => setSource('chess.com')}
              className={cn(
                'rounded-md border px-4 py-2 text-sm font-medium transition-colors',
                source === 'chess.com'
                  ? 'border-[#C9A24B] bg-[#C9A24B]/10 text-[#C9A24B]'
                  : 'border-border text-muted-foreground',
              )}
            >
              ♟ Chess.com
            </button>
          </div>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleUsernameFetch()}
            placeholder="Enter username..."
            className="w-full rounded-lg border border-border bg-card px-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <div className="flex items-center gap-3">
            <label className="text-sm text-muted-foreground">Recent games:</label>
            {[5, 10, 20].map((n) => (
              <button
                key={n}
                onClick={() => setFetchLimit(n)}
                className={cn(
                  'rounded px-3 py-1 text-sm font-medium transition-colors',
                  fetchLimit === n
                    ? 'bg-[#C9A24B]/20 text-[#C9A24B]'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {n}
              </button>
            ))}
          </div>
          <button
            onClick={handleUsernameFetch}
            disabled={!username.trim() || fetchLoading || !!pendingGameId}
            className="rounded-lg bg-primary px-6 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            {fetchLoading ? 'Fetching...' : `Fetch ${fetchLimit} Games`}
          </button>
          {fetchError && <p className="text-sm text-destructive">{fetchError}</p>}
        </div>
      )}

      {/* Tab: My Games */}
      {tab === 'my-games' && (
        <div className="space-y-2">
          {!gamesLoaded ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : games.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              No games imported yet. Use the Paste or Username tab to get started!
            </div>
          ) : (
            <div className="overflow-hidden rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/20">
                    <th className="px-4 py-2 text-left font-medium text-muted-foreground">Game</th>
                    <th className="px-4 py-2 text-left font-medium text-muted-foreground">Date</th>
                    <th className="px-4 py-2 text-left font-medium text-muted-foreground">
                      Accuracy
                    </th>
                    <th className="px-4 py-2 text-left font-medium text-muted-foreground">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {games.map((g) => {
                    const h = g.headers as Record<string, string>;
                    const isDone = DONE_STATUSES.includes(g.status);
                    return (
                      <tr
                        key={g.id}
                        onClick={() => isDone && router.push(`/report/${g.id}`)}
                        className={cn(
                          'border-b border-border/50 transition-colors',
                          isDone ? 'cursor-pointer hover:bg-muted/20' : '',
                        )}
                      >
                        <td className="px-4 py-3 text-foreground">
                          {h['White'] ?? '?'} vs {h['Black'] ?? '?'}
                          <span className="ml-2 text-xs text-muted-foreground">{h['Result']}</span>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {h['Date'] ?? new Date(g.importedAt).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 font-mono">
                          {g.accuracy != null ? `${g.accuracy.toFixed(1)}%` : '—'}
                        </td>
                        <td className={cn('px-4 py-3 font-medium', STATUS_COLORS[g.status])}>
                          {STATUS_LABELS[g.status]}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          <button
            onClick={loadMyGames}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            ↻ Refresh
          </button>
        </div>
      )}
    </div>
  );
}
