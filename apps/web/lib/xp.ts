import { prisma } from '@/lib/prisma';

// XP awarded per action
export const XP_REWARDS = {
  PUZZLE_CORRECT: 10,
  GAME_IMPORTED: 5,
  OPENING_DRILL: 20,
  STREAK_7_DAY: 50,
} as const;

/**
 * Level formula: level = floor(sqrt(xp / 100)) + 1
 * Level 1 = 0 XP, Level 2 = 100 XP, Level 3 = 400 XP, Level 4 = 900 XP ...
 */
export function xpToLevel(xp: number): number {
  return Math.floor(Math.sqrt(xp / 100)) + 1;
}

/**
 * XP needed to reach the next level from current level.
 */
export function xpForNextLevel(level: number): number {
  return Math.pow(level, 2) * 100; // level N needs N^2 * 100 XP total
}

/**
 * XP progress within the current level (0–1).
 */
export function xpProgress(xp: number): number {
  const level = xpToLevel(xp);
  const currentLevelXp = Math.pow(level - 1, 2) * 100;
  const nextLevelXp = Math.pow(level, 2) * 100;
  return (xp - currentLevelXp) / (nextLevelXp - currentLevelXp);
}

/**
 * Award XP to a user. Updates both xp and level atomically.
 */
export async function awardXp(
  userId: string,
  amount: number,
): Promise<{ xp: number; level: number; leveledUp: boolean }> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { xp: true, level: true },
  });

  const currentXp = user?.xp ?? 0;
  const newXp = currentXp + amount;
  const newLevel = xpToLevel(newXp);
  const leveledUp = newLevel > (user?.level ?? 1);

  await prisma.user.update({
    where: { id: userId },
    data: { xp: newXp, level: newLevel },
  });

  return { xp: newXp, level: newLevel, leveledUp };
}
