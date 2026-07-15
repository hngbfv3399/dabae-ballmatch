import type { CharacterConfig } from "../characters/character.interface";

export interface BalanceTestOptions {
  seed?: number;
  roundsPerPair?: number;
  maxSeconds?: number;
}

export interface BalanceResult {
  characterId: string;
  games: number;
  wins: number;
  winRate: number;
}

export interface BalanceReport {
  seed: number;
  roundsPerPair: number;
  results: BalanceResult[];
}

/** A small deterministic PRNG. Same seed and inputs always produce the same report. */
export function createSeededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296;
  };
}

interface Duelist {
  config: CharacterConfig;
  hp: number;
  attackCooldown: number;
}

/**
 * Runs a reproducible baseline 1v1 test from public base stats only.
 * Character-specific skills are deliberately excluded: this makes the report a
 * stable regression signal, not a replacement for visual in-game playtests.
 */
export function runBaselineBalanceTest(
  characters: readonly CharacterConfig[],
  options: BalanceTestOptions = {},
): BalanceReport {
  const seed = options.seed ?? 20_260_713;
  const roundsPerPair = options.roundsPerPair ?? 100;
  const maxSeconds = options.maxSeconds ?? 90;
  if (characters.length < 2) throw new Error("At least two characters are required.");
  if (!Number.isInteger(roundsPerPair) || roundsPerPair < 1) throw new Error("roundsPerPair must be a positive integer.");

  const random = createSeededRandom(seed);
  const scores = new Map(characters.map((character) => [character.id, { games: 0, wins: 0 }]));
  for (let left = 0; left < characters.length; left += 1) {
    for (let right = left + 1; right < characters.length; right += 1) {
      for (let round = 0; round < roundsPerPair; round += 1) {
        const winner = simulateBaselineDuel(characters[left], characters[right], maxSeconds, random);
        const leftScore = scores.get(characters[left].id)!;
        const rightScore = scores.get(characters[right].id)!;
        leftScore.games += 1;
        rightScore.games += 1;
        if (winner === "left") leftScore.wins += 1;
        else if (winner === "right") rightScore.wins += 1;
      }
    }
  }
  return {
    seed,
    roundsPerPair,
    results: characters.map((character) => {
      const score = scores.get(character.id)!;
      return { characterId: character.id, ...score, winRate: score.wins / score.games };
    }).sort((a, b) => b.winRate - a.winRate || a.characterId.localeCompare(b.characterId)),
  };
}

function simulateBaselineDuel(leftConfig: CharacterConfig, rightConfig: CharacterConfig, maxSeconds: number, random: () => number): "left" | "right" | "draw" {
  const left: Duelist = { config: leftConfig, hp: leftConfig.maxHp, attackCooldown: 0 };
  const right: Duelist = { config: rightConfig, hp: rightConfig.maxHp, attackCooldown: 0 };
  const dt = 0.1;
  for (let elapsed = 0; elapsed < maxSeconds && left.hp > 0 && right.hp > 0; elapsed += dt) {
    left.attackCooldown -= dt;
    right.attackCooldown -= dt;
    if (left.attackCooldown <= 0) {
      right.hp -= applyHit(left.config, right.config, random);
      left.attackCooldown += attackInterval(left.config);
    }
    if (right.hp > 0 && right.attackCooldown <= 0) {
      left.hp -= applyHit(right.config, left.config, random);
      right.attackCooldown += attackInterval(right.config);
    }
  }
  if (left.hp === right.hp) return "draw";
  return left.hp > right.hp ? "left" : "right";
}

function attackInterval(config: CharacterConfig): number {
  return Math.max(0.35, 1.2 - Math.min(config.speed, 3) * 0.08);
}

function applyHit(attacker: CharacterConfig, target: CharacterConfig, random: () => number): number {
  const rangeFactor = Math.min(1.15, 0.85 + attacker.baseAttackRange / 600);
  const variation = 0.9 + random() * 0.2;
  const defenseMultiplier = 1 - Math.min(0.8, Math.max(0, target.defense ?? 0) / 100);
  return attacker.attackPower * rangeFactor * variation * (1 - Math.min(target.speed, 3) * 0.015) * defenseMultiplier;
}
