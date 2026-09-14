'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface OpeningLine {
  id: string;
  eco: string;
  name: string;
  moves: string;
  count: number;
  wins: number;
  draws: number;
  losses: number;
  lastPlayedAt: string;
}

export default function OpeningsPage() {
  const [lines, setLines] = useState<OpeningLine[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/openings')
      .then((r) => r.json())
      .then((d) => {
        setLines(d.lines ?? []);
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="animate-pulse">Loading repertoire...</div>;

  if (lines.length === 0) {
    return (
      <div className="flex h-64 flex-col items-center justify-center text-center">
        <span className="text-4xl">📖</span>
        <h2 className="mt-4 text-lg font-semibold">No Openings Yet</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Import some games to start building your opening repertoire.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-bold text-foreground">Opening Repertoire</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Openings you've played in your imported games, up to depth 10.
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted/50 text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">ECO</th>
              <th className="px-4 py-3 font-medium">Opening</th>
              <th className="px-4 py-3 text-right font-medium">Games</th>
              <th className="px-4 py-3 text-right font-medium">Win %</th>
              <th className="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {lines.map((line) => {
              const winPct = line.count > 0 ? (line.wins / line.count) * 100 : 0;
              const drawPct = line.count > 0 ? (line.draws / line.count) * 100 : 0;
              const lossPct = line.count > 0 ? (line.losses / line.count) * 100 : 0;

              return (
                <tr key={line.id} className="transition-colors hover:bg-muted/20">
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{line.eco}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-foreground">{line.name}</p>
                    <p className="mt-1 font-mono text-xs text-muted-foreground">{line.moves}</p>
                  </td>
                  <td className="px-4 py-3 text-right font-medium">{line.count}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex flex-col items-end gap-1">
                      <span className="font-semibold">{winPct.toFixed(1)}%</span>
                      {/* Mini bar chart */}
                      <div className="flex h-1.5 w-16 overflow-hidden rounded-full bg-muted">
                        <div style={{ width: `${winPct}%` }} className="bg-good" />
                        <div style={{ width: `${drawPct}%` }} className="bg-muted-foreground/40" />
                        <div style={{ width: `${lossPct}%` }} className="bg-destructive" />
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/openings/drill/${line.id}`}
                      className="inline-flex items-center justify-center rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
                    >
                      Drill →
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
