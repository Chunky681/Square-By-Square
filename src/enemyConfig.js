// Centralized enemy spawn controls.
// Toggle `enabled` to hot-disable an enemy type if needed.
// Adjust `startDifficulty` to control when that enemy can begin spawning.
export const ENEMY_CONFIG = {
  chaser: { enabled: true, startDifficulty: 1 },
  dart: { enabled: true, startDifficulty: 1 },
  brute: { enabled: true, startDifficulty: 1 },
  berserker: { enabled: true, startDifficulty: 4 },
  tank: { enabled: true, startDifficulty: 5 },
  leaper: { enabled: true, startDifficulty: 3 },
  splitter: { enabled: true, startDifficulty: 5 },
  shardling: { enabled: true, startDifficulty: 1 },
  mini_boss: { enabled: true, startDifficulty: 9 },
  mini_boss_miner: { enabled: true, startDifficulty: 9 },
  mega_cannon_boss: { enabled: true, startDifficulty: 10 },
  siphon_overlord: { enabled: true, startDifficulty: 10 },
  siphon: { enabled: true, startDifficulty: 8 },
  phantom: { enabled: true, startDifficulty: 8 },
};

const SPAWN_WEIGHT_PROFILES = [
  // D1-D2
  { maxDifficulty: 2, weights: { chaser: 72, dart: 23, brute: 5, phantom: 1 } },
  // D3-D4
  { maxDifficulty: 4, weights: { chaser: 48, dart: 21, brute: 17, berserker: 9, leaper: 5 } },
  // D5-D7
  { maxDifficulty: 7, weights: { chaser: 26, dart: 14, berserker: 17, brute: 13, tank: 11, leaper: 11, splitter: 8 } },
  // D8-D10
  { maxDifficulty: Number.POSITIVE_INFINITY, weights: { chaser: 12, dart: 10, berserker: 13, brute: 12, tank: 12, leaper: 10, splitter: 10, siphon: 9, phantom: 8, mini_boss: 2, mini_boss_miner: 2, mega_cannon_boss: 1, siphon_overlord: 1 } },
];

function getWeightProfile(difficulty) {
  return SPAWN_WEIGHT_PROFILES.find((profile) => difficulty <= profile.maxDifficulty) || SPAWN_WEIGHT_PROFILES[SPAWN_WEIGHT_PROFILES.length - 1];
}

function isSpawnable(kind, difficulty) {
  const cfg = ENEMY_CONFIG[kind];
  if (!cfg) return false;
  if (!cfg.enabled) return false;
  return difficulty >= cfg.startDifficulty;
} 

function pickWeighted(candidates, rng = Math.random) {
  let total = 0;
  for (const c of candidates) total += c.weight;
  if (total <= 0) return candidates[0]?.kind || "chaser";

  let roll = rng() * total;
  for (const c of candidates) {
    roll -= c.weight;
    if (roll <= 0) return c.kind;
  }
  return candidates[candidates.length - 1]?.kind || "chaser";
}

export function getSpawnCandidatesForDifficulty(difficulty) {
  const profile = getWeightProfile(difficulty);
  const weighted = Object.entries(profile.weights)
    .filter(([kind, weight]) => weight > 0 && isSpawnable(kind, difficulty))
    .map(([kind, weight]) => ({ kind, weight }));

  if (weighted.length > 0) return weighted;

  const eligible = Object.entries(ENEMY_CONFIG)
    .filter(([kind]) => isSpawnable(kind, difficulty))
    .map(([kind]) => ({ kind, weight: 1 }));

  if (eligible.length > 0) return eligible;

  const enabledAnyDifficulty = Object.entries(ENEMY_CONFIG)
    .filter(([, cfg]) => cfg.enabled)
    .map(([kind]) => ({ kind, weight: 1 }));

  if (enabledAnyDifficulty.length > 0) return enabledAnyDifficulty;

  return [{ kind: "chaser", weight: 1 }];
}

export function pickEnemyKindForDifficulty(difficulty, rng = Math.random) {
  const candidates = getSpawnCandidatesForDifficulty(difficulty);
  return pickWeighted(candidates, rng);
}
