'use client';

import { useEffect, useState } from 'react';

interface SkillProfile {
  tactics: number;
  strategy: number;
  endgame: number;
  opening: number;
  calculation: number;
  updatedAt: string;
}

const AXES = [
  { key: 'tactics', label: 'Tactics' },
  { key: 'strategy', label: 'Strategy' },
  { key: 'endgame', label: 'Endgame' },
  { key: 'opening', label: 'Opening' },
  { key: 'calculation', label: 'Calculation' },
] as const;

// SVG Radar Chart — pure, no external lib
function RadarChart({ profile }: { profile: SkillProfile }) {
  const cx = 150,
    cy = 150,
    r = 100;
  const n = AXES.length;
  const angleStep = (2 * Math.PI) / n;
  const startAngle = -Math.PI / 2;

  // Grid rings at 20, 40, 60, 80, 100%
  const rings = [20, 40, 60, 80, 100];

  const getPoint = (angle: number, value: number, maxR = r) => ({
    x: cx + Math.cos(angle) * ((maxR * value) / 100),
    y: cy + Math.sin(angle) * ((maxR * value) / 100),
  });

  const axisPoints = AXES.map((_, i) => ({
    angle: startAngle + i * angleStep,
    outer: getPoint(startAngle + i * angleStep, 100),
    label: getPoint(startAngle + i * angleStep, 120),
  }));

  const dataPoints = AXES.map((axis, i) => {
    const val = profile[axis.key];
    return getPoint(startAngle + i * angleStep, val);
  });

  const dataPath =
    dataPoints
      .map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
      .join(' ') + ' Z';

  return (
    <svg viewBox="0 0 300 300" className="mx-auto w-full max-w-sm">
      {/* Grid rings */}
      {rings.map((pct) =>
        axisPoints.map((_, i) => {
          const next = axisPoints[(i + 1) % n]!;
          const p1 = getPoint(axisPoints[i]!.angle, pct);
          const p2 = getPoint(next.angle, pct);
          return (
            <line
              key={`ring-${pct}-${i}`}
              x1={p1.x}
              y1={p1.y}
              x2={p2.x}
              y2={p2.y}
              stroke="#2a3040"
              strokeWidth="0.5"
            />
          );
        }),
      )}
      {/* Axis lines */}
      {axisPoints.map((a, i) => (
        <line
          key={i}
          x1={cx}
          y1={cy}
          x2={a.outer.x}
          y2={a.outer.y}
          stroke="#2a3040"
          strokeWidth="0.8"
        />
      ))}
      {/* Data area */}
      <path d={dataPath} fill="#C9A24B30" stroke="#C9A24B" strokeWidth="1.5" />
      {/* Data points */}
      {dataPoints.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={3} fill="#C9A24B" />
      ))}
      {/* Labels */}
      {axisPoints.map((a, i) => (
        <text
          key={i}
          x={a.label.x}
          y={a.label.y}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={10}
          fill="#9BA3AF"
        >
          {AXES[i]!.label}
        </text>
      ))}
      {/* Score labels on each axis */}
      {AXES.map((axis, i) => {
        const val = profile[axis.key];
        const p = getPoint(axisPoints[i]!.angle, val);
        return (
          <text key={i} x={p.x} y={p.y - 6} textAnchor="middle" fontSize={8} fill="#C9A24B">
            {val.toFixed(0)}
          </text>
        );
      })}
    </svg>
  );
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<SkillProfile | null>(null);
  const [gameCount, setGameCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [puzzleStats, setPuzzleStats] = useState<{
    dueToday: number;
    streak: number;
    totalSolved: number;
    accuracy7d: number | null;
  } | null>(null);
  const [userXp, setUserXp] = useState<{ xp: number; level: number } | null>(null);

  useEffect(() => {
    Promise.all([
      fetch('/api/profile')
        .then((r) => r.json())
        .catch(() => null),
      fetch('/api/games')
        .then((r) => r.json())
        .catch(() => ({ games: [] })),
      fetch('/api/puzzles/stats')
        .then((r) => r.json())
        .catch(() => null),
      fetch('/api/settings')
        .then((r) => r.json())
        .catch(() => null),
    ])
      .then(([profileData, gamesData, statsData, settingsData]) => {
        setProfile(profileData?.profile ?? null);
        setGameCount(gamesData?.games?.length ?? 0);
        setPuzzleStats(statsData ?? null);
        if (settingsData?.settings) {
          setUserXp({ xp: settingsData.settings.xp, level: settingsData.settings.level });
        }
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex h-64 animate-pulse items-center justify-center text-muted-foreground">
        Loading profile...
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl font-bold text-foreground">Skill Profile</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Computed from {gameCount} analyzed game{gameCount !== 1 ? 's' : ''}
          </p>
        </div>
        {userXp && (
          <div className="flex flex-col items-end gap-1.5">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                {userXp.level}
              </div>
              <span className="text-sm font-semibold text-foreground">Level {userXp.level}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-32 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-primary transition-all"
                  style={{
                    width: `${Math.min(100, ((userXp.xp - Math.pow(userXp.level - 1, 2) * 100) / (Math.pow(userXp.level, 2) * 100 - Math.pow(userXp.level - 1, 2) * 100)) * 100)}%`,
                  }}
                />
              </div>
              <span className="text-[10px] text-muted-foreground">{userXp.xp} XP</span>
            </div>
          </div>
        )}
      </div>

      {!profile ? (
        <div className="space-y-3 rounded-lg border border-dashed border-border p-12 text-center">
          <p className="text-4xl">♟</p>
          <p className="text-lg font-semibold text-foreground">No games analyzed yet</p>
          <p className="text-sm text-muted-foreground">
            Import and analyze at least one game to see your skill profile.
          </p>
          <a
            href="/import"
            className="mt-2 inline-block rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Import a Game
          </a>
        </div>
      ) : (
        <>
          {/* Radar chart */}
          <div className="rounded-lg border border-border bg-card p-6">
            <RadarChart profile={profile} />
          </div>

          {/* Score breakdown */}
          <div className="space-y-4 rounded-lg border border-border bg-card p-6">
            <h2 className="text-sm font-semibold text-foreground">Score Breakdown</h2>
            {AXES.map((axis) => {
              const val = profile[axis.key];
              return (
                <div key={axis.key} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-foreground">{axis.label}</span>
                    <span className="font-mono text-[#C9A24B]">{val.toFixed(0)}/100</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-[#C9A24B] transition-all duration-500"
                      style={{ width: `${val}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {profile.updatedAt && (
            <p className="text-center text-xs text-muted-foreground">
              Last updated: {new Date(profile.updatedAt).toLocaleString()}
            </p>
          )}

          {/* Training Stats */}
          {puzzleStats && (
            <div className="space-y-4 rounded-lg border border-border bg-card p-6">
              <h2 className="text-sm font-semibold text-foreground">Training Stats</h2>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-[#C9A24B]">{puzzleStats.streak} 🔥</p>
                  <p className="text-xs text-muted-foreground">Day Streak</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-foreground">{puzzleStats.dueToday}</p>
                  <p className="text-xs text-muted-foreground">Due Today</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-foreground">{puzzleStats.totalSolved}</p>
                  <p className="text-xs text-muted-foreground">Total Solved</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-foreground">
                    {puzzleStats.accuracy7d != null ? `${puzzleStats.accuracy7d}%` : '—'}
                  </p>
                  <p className="text-xs text-muted-foreground">7-Day Accuracy</p>
                </div>
              </div>
              {puzzleStats.dueToday > 0 && (
                <a
                  href="/train"
                  className="block rounded-lg bg-primary px-4 py-2 text-center text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  Start Training ({puzzleStats.dueToday} due) →
                </a>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
