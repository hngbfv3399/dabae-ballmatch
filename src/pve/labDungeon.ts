import type { CharacterBehaviorContext, CharacterConfig, CharacterState } from "../characters/character.interface";

export const LABORATORY_DUNGEON_ID = "collapsed-laboratory";
export const LABORATORY_STAGE_COUNT = 5;

type LaboratoryEnemyKind = "specimen" | "drone" | "tesla" | "brute" | "overseer";

const ENEMY_STATS: Record<LaboratoryEnemyKind, Pick<CharacterConfig, "name" | "maxHp" | "speed" | "attackPower" | "baseAttackRange" | "color">> = {
  specimen: { name: "불안정 실험체", maxHp: 44, speed: 1.02, attackPower: 6, baseAttackRange: 44, color: "#a78bfa" },
  drone: { name: "추적 드론", maxHp: 38, speed: 0.82, attackPower: 5, baseAttackRange: 38, color: "#38bdf8" },
  tesla: { name: "테슬라 포탑", maxHp: 66, speed: 0.48, attackPower: 7, baseAttackRange: 42, color: "#fbbf24" },
  brute: { name: "방호 실험체", maxHp: 120, speed: 0.7, attackPower: 9, baseAttackRange: 48, color: "#fb7185" },
  overseer: { name: "폭주한 감독관", maxHp: 440, speed: 0.78, attackPower: 11, baseAttackRange: 54, color: "#e879f9" },
};

const SHOT_CONSTANTS = {
  drone: { cooldown: 2.5, speed: 370, damage: 10, radius: 8, life: 2.4, leadSeconds: 0.38 },
  tesla: { cooldown: 2.1, speed: 410, damage: 13, radius: 9, life: 2.1, leadSeconds: 0.28 },
  overseer: { cooldown: 1.45, speed: 440, damage: 16, radius: 11, life: 2.0, leadSeconds: 0.42 },
} as const;

type RangedState = CharacterState & { pveShotCooldown?: number };

function firePredictedShot(char: RangedState, ctx: CharacterBehaviorContext, kind: keyof typeof SHOT_CONSTANTS) {
  char.pveShotCooldown = Math.max(0, (char.pveShotCooldown ?? 0));
  if (char.pveShotCooldown > 0) return;
  const player = ctx.characters.find((candidate) => !candidate.isDead && candidate.teamId !== char.teamId);
  if (!player) return;
  const settings = SHOT_CONSTANTS[kind];
  const predictedX = player.x + player.vx * 60 * settings.leadSeconds;
  const predictedY = player.y + player.vy * 60 * settings.leadSeconds;
  const angle = Math.atan2(predictedY - char.y, predictedX - char.x);
  char.pveShotCooldown = settings.cooldown;
  ctx.spawnProjectile(char, {
    x: char.x,
    y: char.y,
    vx: Math.cos(angle) * settings.speed,
    vy: Math.sin(angle) * settings.speed,
    radius: settings.radius,
    damage: settings.damage,
    color: char.color,
    life: settings.life,
    label: "예측 탄환",
  });
  ctx.createExplosion(char.x, char.y, char.color, 5);
}

function createLaboratoryEnemy(kind: LaboratoryEnemyKind, id: string): CharacterConfig {
  const config: CharacterConfig = {
    id,
    ...ENEMY_STATS[kind],
    skillName: kind === "drone" || kind === "tesla" || kind === "overseer" ? "예측 사격" : "난동",
    skillDescription: "붕괴한 연구소의 PvE 전용 적입니다.",
    skillChargeRate: 0,
    role: "Supporter",
    detailedDescription: "붕괴한 연구소에 출현하는 PvE 전용 적입니다.",
  };
  if (kind === "drone" || kind === "tesla" || kind === "overseer") {
    config.onUpdate = (char, dt, ctx) => {
      const state = char as RangedState;
      state.pveShotCooldown = Math.max(0, (state.pveShotCooldown ?? 0) - dt);
      firePredictedShot(state, ctx, kind);
    };
  }
  return config;
}

const STAGE_LAYOUTS: readonly LaboratoryEnemyKind[][] = [
  ["specimen", "specimen", "drone"],
  ["drone", "drone", "brute"],
  ["tesla", "specimen", "specimen", "drone"],
  ["tesla", "brute", "drone", "specimen"],
  ["overseer", "drone"],
];

export function createCollapsedLaboratoryStage(stageNumber: number): CharacterConfig[] {
  const layout = STAGE_LAYOUTS[stageNumber - 1];
  if (!layout) throw new Error(`Unknown collapsed laboratory stage: ${stageNumber}`);
  return layout.map((kind, index) => createLaboratoryEnemy(kind, `pve-lab-${stageNumber}-${kind}-${index}`));
}
