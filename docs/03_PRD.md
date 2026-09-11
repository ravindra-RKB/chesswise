# Product Requirements Document (PRD)

### Chesswise — AI Chess Trainer

**Team:** Vishnu M.S. & Ravindra Kumar Bundela · **Mentor:** Subham Das · **Track:** Gen AI
**Duration:** 14 weeks
**Time Commitment:** 2 developers @ 20 hours/week each (approx. 560 total hours)

---

## Product Goal

Create a personalized AI chess coaching platform that converts a player's game history into structured analysis, grounded explanations, and an adaptive training loop — so a player can understand exactly why they lose and systematically fix it.

---

## Team Commitment & Responsibility Split

| Developer                  | Core Focus Areas                 | Must-Have Deliverables Owned                                                                                                     | Est. Hours             |
| -------------------------- | -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | ---------------------- |
| **Vishnu M.S.**            | Backend, Engine, Pipeline & Data | Stockfish WASM/Native setup, BullMQ queue, Deterministic tactic tagger, Prisma DB schema, Audit logging                          | 20 hrs/week (~280 hrs) |
| **Ravindra Kumar Bundela** | Frontend, UX & GenAI Integration | Interactive chessboard UI, Game report screen, LLM explanation prompts & Zod validation, Radar skill profile, Daily puzzle queue | 20 hrs/week (~280 hrs) |

---

## Feature Priorities

| Feature                                                           | Priority |
| ----------------------------------------------------------------- | -------- |
| User registration and authentication                              | Must     |
| Interactive chessboard (play vs. engine)                          | Must     |
| PGN game import (upload / paste / username fetch)                 | Must     |
| Asynchronous deep game analysis (Stockfish)                       | Must     |
| Deterministic tactic classification                               | Must     |
| Per-move quality classification (Blunder → Best)                  | Must     |
| Game report UI (eval graph, annotation glyphs, per-mistake cards) | Must     |
| LLM-generated, evidence-grounded mistake explanations             | Must     |
| Player skill-vector profile (radar chart)                         | Must     |
| Personalized puzzle generator from player's own blunders          | Must     |
| SM-2 spaced-repetition puzzle scheduling                          | Must     |
| Daily recommended training queue                                  | Must     |
| Human decision / override with reason                             | Must     |
| Audit trail for all analyses and decisions                        | Must     |
| Game-scoped AI chat                                               | Should   |
| Global RAG chat over full game history                            | Should   |
| "What-if" branch explorer                                         | Should   |
| Whisper Coach (live practice hints)                               | Should   |
| Opening Repertoire Builder + Guardian                             | Should   |
| Mirror Bot (biased toward user's own mistakes)                    | Should   |
| Coach / Team B2B dashboard                                        | Should   |
| XP, streaks, and skill-tree gamification                          | Should   |
| Realtime human-vs-human sparring                                  | Should   |
| Tournament opponent scouting reports                              | Could    |
| TTS voice-narrated game recaps                                    | Could    |
| OTB photo import (scoresheet → PGN)                               | Could    |
| Friend lists and leaderboards                                     | Could    |
| Dodo Payments subscription billing                                | Could    |
| Notifications (email / in-app)                                    | Could    |

---

## User Stories

### US-001

As a chess player, I want to create an account and log in so that my game history and training progress are saved.

**Acceptance Criteria**

- I can register with email/password or Google OAuth.
- My session persists across browser refreshes.
- Invalid credentials show a clear error without revealing which specific field is wrong.
- I can request a password reset via email.

---

### US-002

As a player, I want to import a game by uploading a PGN file, pasting a PGN string, or entering a Lichess/Chess.com username so that my real games can be analyzed.

**Acceptance Criteria**

- All three import methods produce the same stored game format.
- Invalid or unrecognized PGN is rejected with a descriptive error.
- Username fetch uses official public APIs only; result is cached.
- Upload progress status is visible in real time.

---

### US-003

As a player, I want to see a full game analysis report with move quality glyphs and an eval-swing graph so that I understand where the game turned.

**Acceptance Criteria**

- Report shows overall accuracy and phase-split accuracy (opening / middlegame / endgame).
- Every move is annotated with a quality glyph (`!!` `!` `!?` `?!` `?` `??`).
- An evaluation-swing graph is displayed as a timeline across all moves.
- Blunders and mistakes show the missed best move and its evaluation.

---

### US-004

As a player, I want each of my mistakes to be tagged with the specific tactic I missed so that I know what to practice.

**Acceptance Criteria**

- Tactic labels (fork, pin, skewer, discovered attack, back-rank, etc.) are computed deterministically from engine output — not guessed by an LLM.
- The label is visible on every mistake card.
- Labels are verifiable against a hand-checked regression test set.

---

### US-005

As a player, I want a plain-language explanation of each mistake so that I can learn from it without needing to read engine lines.

**Acceptance Criteria**

- Every mistake card has an AI-generated explanation.
- The explanation references only facts from the engine's structured analysis — no invented moves or evaluations. Verified via an automated LLM-eval test suite (e.g., DeepEval or LangSmith) that fails if the output contains any chess move (e.g., "Nf3") or evaluation score (e.g., "+1.5") not explicitly present in the source JSON.
- The specific tactic label is woven into the explanation.
- A disclaimer indicates the explanation is AI-generated decision support.

---

### US-006

As a player, I want to see a radar chart of my skill across tactics, strategy, endgames, and openings so that I know exactly where to focus.

**Acceptance Criteria**

- The radar chart is computed from my actual analyzed games, not a generic template.
- The chart updates after each newly analyzed game.
- Each axis links to the underlying mistake data that drives the score.
- My profile is private by default.

---

### US-007

As a player, I want daily puzzles generated from my own blunders so that I drill exactly what I personally struggle with.

**Acceptance Criteria**

- Every puzzle is traceable to a specific mistake in a specific game.
- Puzzles are Elo-rated and scheduled using SM-2 based on my past performance.
- Correct answers increase the next review interval; incorrect answers reset it.
- A daily queue surfaces only due puzzles and weakest-skill-area puzzles.

---

### US-008

As a player, I want to ask the AI questions about my games and get answers grounded in my own history so that I receive personalized coaching.

**Acceptance Criteria**

- Every answer cites the specific game(s) and move(s) it references.
- The model cannot fabricate evaluations or moves not present in stored data. Verified via strict structured output schema (Zod) forcing the LLM to provide exact citation IDs for every claim, and a regression suite testing the RAG pipeline against 50 known game states.
- I can scope a question to a single game or ask across my full history.
- The model clearly identifies when it has insufficient data to answer.

---

### US-009

As a coach, I want to view my students' skill profiles and assign homework puzzle sets so that I can guide their training between sessions.

**Acceptance Criteria**

- A coach account can invite students via email.
- The roster view shows each student's radar chart and recent puzzle performance.
- A coach can assign a named puzzle set sourced from a student's own blunders.
- Assigned homework appears at the top of the student's daily queue.

---

### US-010

As a coach or advanced user, I want to see the full evidence chain behind any AI recommendation and override it with a reason so that human judgment is always preserved.

**Acceptance Criteria**

- Every AI explanation stores the model version, prompt version, engine depth, and evidence references.
- A user or coach can add an override note disagreeing with a recommendation.
- The override reason and actor are stored permanently in the audit log.
- No recommendation or audit event can be retroactively deleted.

---

## Product States

Every imported game passes through the following state machine:

```
IMPORTED → QUEUED → PROCESSING → ANALYSIS_COMPLETE → EXPLANATION_READY → PROFILE_UPDATED
                        ↓
                PROCESSING_FAILED  (retryable)
```

| State               | Description                                                |
| ------------------- | ---------------------------------------------------------- |
| `IMPORTED`          | PGN validated and stored; not yet queued for analysis      |
| `QUEUED`            | Job placed in BullMQ queue; waiting for an analysis worker |
| `PROCESSING`        | Native Stockfish and deterministic tactic tagger running   |
| `ANALYSIS_COMPLETE` | Engine results stored; LLM explanation job queued          |
| `EXPLANATION_READY` | AI explanations stored; full game report is viewable       |
| `PROFILE_UPDATED`   | Player skill-vector radar recomputed from new results      |
| `PROCESSING_FAILED` | Job failed; error recorded; user can retry                 |

---

## Product Principles

- **Engine is truth. AI is the teacher.** Stockfish evaluation is never overridden or questioned by the LLM. The LLM receives structured facts and produces prose only.
- **Evidence before explanation.** No AI narrative is generated without structured engine output. The model cannot speculate on positions it has not received data for.
- **Every AI output is traceable.** Model version, prompt version, engine depth, and evidence references are stored with every explanation permanently.
- **Human coaching is never replaced.** Live AI hints exist only in explicitly labeled practice surfaces. The platform never intercepts or assists in rated games on any external platform.
- **Data belongs to the player.** A player's games, mistakes, and skill profile are private by default. No other player's data is surfaced without an explicit consent step.
- **Compute is bounded.** Every engine call has a hard budget enforced server-side, tied to the user's plan tier. _Pipeline Scaling & Cost:_ Free tier analysis runs at Depth 16 (~1 second per move, cost ~$0.001 per game on standard VPS resources). Pro runs at Depth 20+. The pipeline scales horizontally via a BullMQ + Redis queue, spawning separate Native Stockfish worker threads based on available vCPUs so web servers are never blocked.
- **Fail gracefully.** If an LLM explanation is unavailable, the engine analysis report is still shown. Analysis always takes priority over narration.
