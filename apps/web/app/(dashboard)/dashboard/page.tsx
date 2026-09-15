import { createClient } from '@/lib/supabase/server';
import { AnnotationGlyph } from '@/components/chess/annotation-glyph';
import Link from 'next/link';

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const displayName = user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'Player';

  return (
    <div className="space-y-8">
      {/* Welcome header */}
      <div>
        <h1 className="font-serif text-3xl font-bold text-foreground">Welcome, {displayName}</h1>
        <p className="mt-1 text-muted-foreground">Your chess training dashboard</p>
      </div>

      {/* Feature cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[
          {
            title: 'Play vs AI',
            desc: 'Challenge human-feeling AI opponents at any level.',
            glyph: '!?' as const,
            href: '/play',
          },
          {
            title: 'Analyze Games',
            desc: 'Upload or import your games for deep AI analysis.',
            glyph: '!!' as const,
            href: '/import',
          },
          {
            title: 'Daily Training',
            desc: 'Personalized puzzles from your own mistakes.',
            glyph: '!' as const,
            href: '/train',
          },
          {
            title: 'Skill Profile',
            desc: 'Track your tactical and strategic strengths.',
            glyph: '!?' as const,
            href: '/profile',
          },
          {
            title: 'AI Coach Chat',
            desc: 'Ask questions about your games and get grounded answers.',
            glyph: '!' as const,
            href: '/coach',
          },
          {
            title: 'Repertoire',
            desc: 'Build and guard your opening repertoire.',
            glyph: '!?' as const,
            href: '/openings',
          },
        ].map((feature) => (
          <Link
            key={feature.title}
            href={feature.href}
            className="group relative block rounded-lg border border-border bg-card p-6 transition-colors hover:border-gold/50 hover:bg-muted/10"
          >
            <div className="flex items-start justify-between">
              <h3 className="font-semibold text-foreground transition-colors group-hover:text-gold">
                {feature.title}
              </h3>
              <AnnotationGlyph type={feature.glyph} size="sm" />
            </div>
            <p className="mt-2 text-sm text-muted-foreground">{feature.desc}</p>
            <div className="mt-4 flex items-center text-xs font-medium text-muted-foreground transition-colors group-hover:text-gold">
              Open feature <span>→</span>
            </div>
          </Link>
        ))}
      </div>

      {/* Annotation glyph showcase */}
      <div className="rounded-lg border border-border bg-card p-6">
        <h2 className="font-serif text-xl font-bold text-foreground">
          Move Quality — Annotation System
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          The visual language of Chesswise, drawn from classical chess notation.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <AnnotationGlyph type="!!" size="lg" />
          <AnnotationGlyph type="!" size="lg" />
          <AnnotationGlyph type="!?" size="lg" />
          <AnnotationGlyph type="?!" size="lg" />
          <AnnotationGlyph type="?" size="lg" />
          <AnnotationGlyph type="??" size="lg" />
        </div>
      </div>
    </div>
  );
}
