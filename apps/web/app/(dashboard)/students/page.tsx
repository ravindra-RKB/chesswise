'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface SkillProfile {
  tactics: number;
  strategy: number;
  endgame: number;
  opening: number;
  calculation: number;
}

interface Student {
  id: string;
  displayName: string | null;
  email: string;
  xp: number;
  level: number;
  skillProfile: SkillProfile | null;
  _count: { games: number };
}

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/students')
      .then(async (r) => {
        if (!r.ok) {
          if (r.status === 403) throw new Error('You must be a COACH to view this page.');
          throw new Error('Failed to load students');
        }
        return r.json();
      })
      .then((d) => setStudents(d.students || []))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const getWeakestAxis = (profile: SkillProfile) => {
    const axes = [
      { k: 'Tactics', v: profile.tactics },
      { k: 'Strategy', v: profile.strategy },
      { k: 'Endgame', v: profile.endgame },
      { k: 'Opening', v: profile.opening },
      { k: 'Calculation', v: profile.calculation },
    ];
    return axes.reduce((prev, curr) => (curr.v < prev.v ? curr : prev));
  };

  if (loading)
    return <div className="animate-pulse text-muted-foreground">Loading students...</div>;

  if (error)
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6 text-destructive">
        {error}
      </div>
    );

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-bold text-foreground">My Students</h1>
        <p className="text-sm text-muted-foreground">
          Monitor your team's training progress and weaknesses.
        </p>
      </div>

      {students.length === 0 ? (
        <div className="space-y-3 rounded-xl border border-dashed border-border p-12 text-center">
          <p className="text-3xl">👨‍🎓</p>
          <p className="text-lg font-semibold text-foreground">No students yet</p>
          <p className="text-sm text-muted-foreground">
            Students can link to your coach account to appear here.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/30 text-xs font-semibold uppercase text-muted-foreground">
              <tr>
                <th className="px-6 py-4">Student</th>
                <th className="px-6 py-4">Level</th>
                <th className="px-6 py-4">Games</th>
                <th className="px-6 py-4">Weakest Area</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {students.map((s) => {
                const weakest = s.skillProfile ? getWeakestAxis(s.skillProfile) : null;
                return (
                  <tr key={s.id} className="transition-colors hover:bg-muted/10">
                    <td className="px-6 py-4">
                      <p className="font-semibold text-foreground">
                        {s.displayName || s.email.split('@')[0]}
                      </p>
                      <p className="text-xs text-muted-foreground">{s.email}</p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                          {s.level}
                        </span>
                        <span className="text-xs text-muted-foreground">{s.xp} XP</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">{s._count.games}</td>
                    <td className="px-6 py-4">
                      {weakest ? (
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-[#C9A24B]">{weakest.k}</span>
                          <span className="font-mono text-xs text-muted-foreground">
                            ({Math.round(weakest.v)})
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs italic text-muted-foreground">
                          Not enough data
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
