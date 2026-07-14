import type {
  CharacterBehaviorContext,
  CharacterConfig,
  CharacterState,
} from "../characters/character.interface";

export const SLIME_MEADOW_DUNGEON_ID = "slime-meadow";
export const SLIME_MEADOW_STAGE_COUNT = 5;

type SlimeKind = "basic" | "swift" | "armored" | "split" | "small" | "king";

type SpawnedSlime = CharacterState & { pveSpawned?: true };

const SLIME_STATS: Record<SlimeKind, Pick<CharacterConfig, "name" | "maxHp" | "speed" | "attackPower" | "baseAttackRange" | "color">> = {
  basic: { name: "슬라임", maxHp: 30, speed: 0.9, attackPower: 4, baseAttackRange: 42, color: "#74d680" },
  swift: { name: "빠른 슬라임", maxHp: 24, speed: 1.35, attackPower: 5, baseAttackRange: 40, color: "#b7f34a" },
  armored: { name: "단단한 슬라임", maxHp: 70, speed: 0.72, attackPower: 5, baseAttackRange: 44, color: "#3f8f58" },
  split: { name: "분열 슬라임", maxHp: 160, speed: 0.8, attackPower: 7, baseAttackRange: 46, color: "#39c56a" },
  small: { name: "작은 슬라임", maxHp: 42, speed: 1.08, attackPower: 5, baseAttackRange: 38, color: "#9be15d" },
  king: { name: "슬라임 킹", maxHp: 320, speed: 0.74, attackPower: 8, baseAttackRange: 52, color: "#19a856" },
};

function createSpawnedState(parent: CharacterState, config: CharacterConfig, suffix: string): SpawnedSlime {
  const angle = Math.random() * Math.PI * 2;
  const distance = parent.radius + 26 + Math.random() * 16;
  return {
    ...parent,
    ...config,
    id: `${config.id}-${suffix}-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
    x: parent.x + Math.cos(angle) * distance,
    y: parent.y + Math.sin(angle) * distance,
    hp: config.maxHp,
    radius: 24,
    vx: Math.cos(angle) * 2.8,
    vy: Math.sin(angle) * 2.8,
    skillGauge: 0,
    skillActive: false,
    isDead: false,
    opacity: 1,
    baseAttackCooldown: 0.4,
    totalDamageDealt: 0,
    totalDamageTaken: 0,
    kills: 0,
    pveSpawned: true,
  };
}

function spawnSmallSlimes(parent: CharacterState, ctx: CharacterBehaviorContext, count: number, label: string) {
  for (let index = 0; index < count; index += 1) {
    const child = createSlimeConfig("small", `${parent.id}-${label}-${index}`);
    ctx.characters.push(createSpawnedState(parent, child, label));
  }
  ctx.createExplosion(parent.x, parent.y, "#a3e635", 18);
}

function createSlimeConfig(kind: SlimeKind, id: string): CharacterConfig {
  const stats = SLIME_STATS[kind];
  const config: CharacterConfig = {
    id,
    ...stats,
    skillName: "슬라임 바운스",
    skillDescription: "던전 전용 적입니다.",
    skillChargeRate: 0,
    role: "Supporter",
    detailedDescription: "초원의 슬라임 소굴에 출현하는 PvE 전용 적입니다.",
  };

  if (kind === "split") {
    config.onDeath = (char, _killer, ctx) => spawnSmallSlimes(char, ctx, 3, "split");
  }
  if (kind === "king") {
    config.onUpdate = (char, _dt, ctx) => {
      const state = char as CharacterState & { pveKingFirstSplit?: boolean; pveKingSecondSplit?: boolean };
      if (!state.pveKingFirstSplit && char.hp <= char.maxHp * 0.65) {
        state.pveKingFirstSplit = true;
        spawnSmallSlimes(char, ctx, 2, "king-first");
      }
      if (!state.pveKingSecondSplit && char.hp <= char.maxHp * 0.3) {
        state.pveKingSecondSplit = true;
        spawnSmallSlimes(char, ctx, 3, "king-second");
      }
    };
  }
  return config;
}

const stageLayouts: readonly SlimeKind[][] = [
  ["basic", "basic", "basic"],
  ["basic", "swift", "armored", "basic"],
  ["split"],
  ["armored", "armored", "swift", "swift"],
  ["king"],
];

export function createSlimeMeadowStage(stageNumber: number): CharacterConfig[] {
  const layout = stageLayouts[stageNumber - 1];
  if (!layout) throw new Error(`Unknown slime meadow stage: ${stageNumber}`);
  return layout.map((kind, index) => createSlimeConfig(kind, `pve-slime-${stageNumber}-${kind}-${index}`));
}
