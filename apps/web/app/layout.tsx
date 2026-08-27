import type { Metadata } from 'next';
import { fontSans, fontSerif, fontMono } from './fonts';
import './globals.css';

export const metadata: Metadata = {
  title: 'Chesswise — AI Chess Coach',
  description:
    'Your personalized AI chess coach — grounded in your real game history, not generic advice.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`dark ${fontSans.variable} ${fontSerif.variable} ${fontMono.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-screen bg-background font-sans text-foreground antialiased">
        {children}
      </body>
    </html>
  );
}
