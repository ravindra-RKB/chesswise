/**
 * Mirror Bot configuration — biases Stockfish UCI parameters
 * based on the player's weakest skill axis.
 */

export interface SkillProfile {
  tactics: number;
  strategy: number;
  endgame: number;
  opening: number;
  calculation: number;
}

export interface MirrorBotConfig {
  skillLevel: number; // 0–20 UCI Skill Level
  depth: number;
  contempt: number; // >0 = engine avoids draws, plays sharply
  description: string;
  openingHint?: string; // Optional sharp opening suggestion
}

export function getMirrorBotConfig(profile: SkillProfile): MirrorBotConfig {
  const axes = [
    { key: 'tactics' as const, score: profile.tactics },
    { key: 'strategy' as const, score: profile.strategy },
    { key: 'endgame' as const, score: profile.endgame },
    { key: 'opening' as const, score: profile.opening },
    { key: 'calculation' as const, score: profile.calculation },
  ];

  // Find weakest axis
  const weakest = axes.reduce((a, b) => (a.score < b.score ? a : b));

  switch (weakest.key) {
    case 'tactics':
      // Engine plays sharp, tactical positions — will find combinations you miss
      return {
        skillLevel: 14,
        depth: 14,
        contempt: 50,
        description: 'Exploiting your tactical weaknesses — watch out for combinations!',
        openingHint: "King's Gambit or Sicilian Dragon (sharp positions)",
      };

    case 'calculation':
      // Engine plays forcing lines with lots of checks and captures
      return {
        skillLevel: 13,
        depth: 16,
        contempt: 40,
        description: 'Playing forcing lines to test your calculation depth.',
        openingHint: 'Latvian Gambit or Budapest Gambit (complex early tactics)',
      };

    case 'endgame':
      // Engine steers toward endgames — reduces pieces early
      return {
        skillLevel: 12,
        depth: 18,
        contempt: -20, // Slightly contempt for draws = will trade into technical endings
        description: 'Steering toward endgames to expose your technique.',
        openingHint: 'London System or Catalan (positional, piece trades)',
      };

    case 'opening':
      // Engine plays sharp gambits to punish opening unfamiliarity
      return {
        skillLevel: 13,
        depth: 13,
        contempt: 30,
        description: 'Playing tricky gambits to test your opening knowledge.',
        openingHint: "Evan's Gambit or Smith-Morra Gambit",
      };

    case 'strategy':
    default:
      // Engine plays positional squeeze — restricts your pieces
      return {
        skillLevel: 11,
        depth: 15,
        contempt: 10,
        description: 'Slowly outplaying you positionally — find active squares!',
        openingHint: "Nimzo-Indian or Queen's Gambit Declined (strategic pressure)",
      };
  }
}
