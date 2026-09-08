# Chesswise ♟️ — Personalized AI Chess Coach

> **Gen AI OJT Project → Production-Grade SaaS**  
> **Team:** Vishnu M.S. & Ravindra Kumar Bundela · **Mentor:** Subham Das · **Track:** Gen AI

---

## 🌟 Overview

**Chesswise** is not just "a chess website with a bot." It is a personalized AI chess coach that studies how _you_ specifically play and builds an adaptive training loop around your real mistakes — getting sharper the more you train.

Instead of a generic chatbot bolted onto a chessboard, Chesswise uses a closed-loop architecture:

- **Stockfish Engine** provides deterministic ground truth (evaluations, win percentages, best moves).
- **Algorithmic Tactic Classification** identifies the exact tactical motifs you missed (forks, pins, skewers, etc.) before the AI even touches the position.
- **Generative AI (LLMs)** translates those structured insights into plain-English coaching, personalized explanations, and conversational mentorship grounded in your personal game history.

```
       [ Play / Import Game ]
                 │
                 ▼
     [ Stockfish Deep Analysis ]
                 │
                 ▼
   [ Deterministic Tactic Tagging ] ──> (Pins, Forks, Skewers)
                 │
                 ▼
      [ LLM Grounded Explanations ] ──> (Plain English "Why")
                 │
                 ▼
    [ Dynamic Skill Radar Profile ]
                 │
                 ▼
    [ Spaced-Repetition Puzzles ] ──> (Generated from YOUR blunders)
                 │
                 └─────────────── (Repeat Loop) ───────────────┘
```

---

## 🚀 Key Features

- **Mistake DNA & Tactical Radar:** Algorithmic identification of specific tactics missed during games.
- **Personalized Blunder Puzzles:** Spaced-repetition puzzles generated exclusively from your own historical blunders using an SM-2 scheduling algorithm.
- **Human-Feeling AI Opponents:** Play vs. Stockfish configured with skill tiers and humanized blunder injection.
- **Grounded RAG Coach Chat:** Ask questions like _"Why do I keep losing in the Sicilian defense after move 20?"_ and receive answers grounded strictly in your analyzed games.
- **Bespoke "Study-Lamp" Design System:** Custom dark theme featuring ink backgrounds (`#14171C`), warm ivory text (`#EDE6D6`), brass accents (`#C9A24B`), oxblood blunder flags (`#9B3B3B`), and classical notation glyphs (`!!`, `??`, `!?`).
- **Opening Repertoire Guardian:** Track opening lines and get alerted and drilled at the exact moment of deviation.
- **Dodo Payments Integration:** Multi-tier subscription billing (Free, Plus, Pro, Team).

---

## 🛠️ Tech Stack & Architecture

- **Monorepo:** [Turborepo](https://turbo.build/) + [pnpm](https://pnpm.io/) workspaces
- **Frontend App:** [Next.js 15](https://nextjs.org/) (App Router, Server Components), React 19, TypeScript
- **Styling & UI:** [Tailwind CSS](https://tailwindcss.com/), [shadcn/ui](https://ui.shadcn.com/), Framer Motion, Lucide Icons
- **Chess Logic & Engine:**
  - Client: `chess.js` + Stockfish 18 WASM in Web Workers (zero server cost for live play)
  - Server: Native Stockfish 18 worker instances for deep batch analysis
- **Async Workers & Queue:** [BullMQ](https://bullmq.io/) + Redis (Upstash)
- **Database & Auth:** [PostgreSQL](https://www.postgresql.org/) (via [Supabase](https://supabase.com/)), [Prisma ORM](https://www.prisma.io/), `pgvector` for RAG embeddings
- **Generative AI:** [Vercel AI SDK](https://sdk.vercel.ai/) with Zod schema validation
- **Payments:** [Dodo Payments](https://www.dodopayments.com/)

---

## 📁 Repository Structure

```text
chesswise/
├── apps/
│   ├── web/                # Next.js 15 web application & dashboard
│   ├── realtime/           # Realtime Socket.io server for live play & whisper coach
│   └── analysis-worker/    # Background Stockfish batch processing worker
├── packages/
│   ├── chess-core/         # Shared chess utilities, tactic classifiers, PGN helpers
│   ├── database/           # Prisma schema, migrations, and database client
│   ├── shared-types/       # TypeScript interfaces shared across web & workers
│   ├── eslint-config/      # Shared ESLint configuration
│   └── typescript-config/  # Shared tsconfig definitions
├── docs/                   # Product & Engineering documentation (PRD, BRD, Architecture)
└── .github/workflows/      # GitHub Actions CI pipelines (lint, typecheck, build)
```

---

## ⚡ Getting Started

### Prerequisites

- **Node.js**: `v20.x` or higher
- **pnpm**: `v9.x` or higher (`npm install -g pnpm`)
- **Supabase Account**: For database and authentication

### Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/vishnums2k5/chesswise.git
   cd chesswise
   ```

2. Install dependencies:

   ```bash
   pnpm install
   ```

3. Configure environment variables:
   Copy `.env.example` to `.env.local` in the project root and fill in your Supabase credentials:

   ```bash
   cp .env.example .env.local
   ```

   ```env
   # Supabase Configuration
   NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-or-publishable-key

   # Database Connection Strings (from Supabase Database Settings)
   DATABASE_URL=postgresql://postgres:[PASSWORD]@...pooler.supabase.com:6543/postgres?pgbouncer=true
   DIRECT_URL=postgresql://postgres:[PASSWORD]@...pooler.supabase.com:5432/postgres
   ```

4. Push the database schema:

   ```bash
   pnpm turbo run db:push
   ```

5. Start the development environment:

   ```bash
   pnpm dev
   ```

   Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🧪 Available Scripts

| Command          | Description                                           |
| ---------------- | ----------------------------------------------------- |
| `pnpm dev`       | Start development servers for all apps with Turbopack |
| `pnpm build`     | Build all packages and applications                   |
| `pnpm lint`      | Run ESLint across the monorepo                        |
| `pnpm typecheck` | Run TypeScript type checks across all workspaces      |

---

## 👥 Team & Roles

- **Vishnu M.S.** ([@vishnums2k5](https://github.com/vishnums2k5)) — Chess Core, Analysis Pipeline, Database/ORM, Stockfish Engine Integration.
- **Ravindra Kumar Bundela** — Frontend UI/UX, AI Coach Chat (Prompt Engineering & RAG), Gamification, Dashboard.
- **Mentor:** Subham Das

---

## 📜 License

This project is developed as part of the Generative AI OJT program. All rights reserved.
