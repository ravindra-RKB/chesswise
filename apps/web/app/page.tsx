import Link from 'next/link';
import { AnnotationGlyph } from '@/components/chess/annotation-glyph';
import { createClient } from '@/lib/supabase/server';

export default async function LandingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-border px-6 py-4">
        <div className="flex items-center gap-2">
          <span className="font-serif text-xl font-bold text-foreground">Chesswise</span>
        </div>
        <nav className="flex items-center gap-4">
          {user ? (
            <Link
              href="/dashboard"
              className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Go to Dashboard
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                Sign In
              </Link>
              <Link
                href="/register"
                className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
              >
                Get Started
              </Link>
            </>
          )}
        </nav>
      </header>

      {/* Hero */}
      <main className="flex flex-1 flex-col items-center justify-center px-6 text-center">
        <div className="max-w-2xl space-y-8">
          <div className="space-y-4">
            <div className="flex items-center justify-center gap-3">
              <AnnotationGlyph type="!!" size="lg" />
              <AnnotationGlyph type="??" size="lg" />
            </div>
            <h1 className="font-serif text-5xl font-bold leading-tight text-foreground sm:text-6xl">
              Your AI Chess Coach
            </h1>
            <p className="mx-auto max-w-lg text-lg text-muted-foreground">
              Personalized training grounded in your real game history — not generic advice. Every
              mistake becomes a lesson. Every lesson sticks.
            </p>
          </div>

          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link
              href="/register"
              className="rounded-md bg-primary px-8 py-3 text-base font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
            >
              Start Training — Free
            </Link>
            <Link
              href="/login"
              className="rounded-md border border-border px-8 py-3 text-base font-medium text-foreground transition-colors hover:bg-accent"
            >
              Sign In
            </Link>
          </div>

          {/* Feature preview — annotation glyph showcase */}
          <div className="mt-16 grid grid-cols-2 gap-4 sm:grid-cols-3">
            {[
              { icon: '♟', title: 'Play', desc: 'Human-feeling AI opponents' },
              { icon: '📊', title: 'Analyze', desc: 'Deep game analysis with AI explanations' },
              { icon: '🎯', title: 'Train', desc: 'Puzzles from your own mistakes' },
              { icon: '📈', title: 'Profile', desc: 'Skill radar & weakness tracking' },
              { icon: '🗣️', title: 'Coach', desc: 'Grounded AI chat about your games' },
              { icon: '🏆', title: 'Compete', desc: 'Streaks, achievements & leaderboards' },
            ].map((feature) => (
              <div
                key={feature.title}
                className="rounded-lg border border-border bg-card p-4 text-left"
              >
                <div className="text-2xl">{feature.icon}</div>
                <h3 className="mt-2 font-semibold text-foreground">{feature.title}</h3>
                <p className="mt-1 text-xs text-muted-foreground">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border px-6 py-6 text-center text-xs text-muted-foreground">
        Chesswise — AI Chess Coach · Built with ♟ and Stockfish
      </footer>
    </div>
  );
}
