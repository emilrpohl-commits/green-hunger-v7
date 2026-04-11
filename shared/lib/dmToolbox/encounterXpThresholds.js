/**
 * Per-character XP thresholds for encounter difficulty (DMG-style).
 * Total party budget = threshold × party size.
 */
export const XP_THRESHOLDS_BY_LEVEL = {
  1: { easy: 25, medium: 50, hard: 75, deadly: 100 },
  2: { easy: 50, medium: 100, hard: 150, deadly: 200 },
  3: { easy: 75, medium: 150, hard: 225, deadly: 400 },
  4: { easy: 125, medium: 250, hard: 375, deadly: 500 },
  5: { easy: 250, medium: 500, hard: 750, deadly: 1100 },
  6: { easy: 300, medium: 600, hard: 900, deadly: 1400 },
  7: { easy: 350, medium: 750, hard: 1100, deadly: 1700 },
  8: { easy: 450, medium: 900, hard: 1400, deadly: 2100 },
  9: { easy: 550, medium: 1100, hard: 1600, deadly: 2400 },
  10: { easy: 600, medium: 1200, hard: 1900, deadly: 2800 },
  11: { easy: 800, medium: 1600, hard: 2400, deadly: 3600 },
  12: { easy: 1000, medium: 2000, hard: 3000, deadly: 4500 },
  13: { easy: 1000, medium: 2000, hard: 3000, deadly: 4500 },
  14: { easy: 1250, medium: 2500, hard: 3800, deadly: 5700 },
  15: { easy: 1250, medium: 2500, hard: 3800, deadly: 5700 },
  16: { easy: 1500, medium: 3000, hard: 4500, deadly: 7200 },
  17: { easy: 2000, medium: 4000, hard: 6000, deadly: 9500 },
  18: { easy: 2000, medium: 4000, hard: 6000, deadly: 9500 },
  19: { easy: 2500, medium: 5000, hard: 7500, deadly: 11500 },
  20: { easy: 2500, medium: 5000, hard: 7500, deadly: 11500 },
}

/**
 * @param {number} level
 * @param {'easy'|'medium'|'hard'|'deadly'} difficulty
 * @param {number} partySize
 */
export function partyXpBudget(level, difficulty, partySize) {
  const lv = Math.min(20, Math.max(1, Math.floor(Number(level) || 1)))
  const row = XP_THRESHOLDS_BY_LEVEL[lv]
  const per = row[difficulty] ?? row.medium
  const n = Math.min(12, Math.max(1, Math.floor(Number(partySize) || 4)))
  return per * n
}
