import type { CharacterBehaviorContext, CharacterConfig, CharacterState } from "../characters/character.interface";

type SurvivalEnemyKind = "melee" | "fast" | "ranged" | "brute";

const ENEMY_STATS: Record<SurvivalEnemyKind, Pick<CharacterConfig, "name" | "maxHp" | "speed" | "attackPower" | "baseAttackRange" | "color">> = {
  melee: { name: "균열 포식자", maxHp: 34, speed: 0.94, attackPower: 5, baseAttackRange: 16, color: "#ef6b73" },
  fast: { name: "질주 포식자", maxHp: 22, speed: 1.52, attackPower: 4, baseAttackRange: 14, color: "#f7c94c" },
  ranged: { name: "균열 사수", maxHp: 28, speed: 0.76, attackPower: 5, baseAttackRange: 20, color: "#b38cff" },
  brute: { name: "균열 중장갑", maxHp: 92, speed: 0.66, attackPower: 8, baseAttackRange: 18, color: "#45c69a" },
};

const RANGED_SHOT = { cooldown: 2.05, speed: 390, damage: 7, radius: 8, life: 2.3 };

type RangedEnemyState = CharacterState & { survivalShotCooldown?: number };

function updateRangedEnemy(char: RangedEnemyState, dt: number, ctx: CharacterBehaviorContext) {
  char.survivalShotCooldown = Math.max(0, (char.survivalShotCooldown ?? 0) - dt);
  if (char.survivalShotCooldown > 0) return;
  const target = ctx.characters.find((candidate) => !candidate.isDead && candidate.teamId !== char.teamId);
  if (!target) return;
  const angle = Math.atan2(target.y - char.y, target.x - char.x);
  char.survivalShotCooldown = RANGED_SHOT.cooldown;
  ctx.spawnProjectile(char, {
    x: char.x,
    y: char.y,
    vx: Math.cos(angle) * RANGED_SHOT.speed,
    vy: Math.sin(angle) * RANGED_SHOT.speed,
    radius: RANGED_SHOT.radius,
    damage: RANGED_SHOT.damage,
    color: char.color,
    life: RANGED_SHOT.life,
    label: "균열 탄환",
  });
  ctx.createExplosion(char.x, char.y, char.color, 4);
}

function createEnemy(kind: SurvivalEnemyKind, wave: number, index: number): CharacterConfig {
  const scale = 1 + wave * 0.1;
  const stats = ENEMY_STATS[kind];
  const config: CharacterConfig = {
    id: `survival-${wave}-${kind}-${index}`,
    name: stats.name,
    maxHp: Math.round(stats.maxHp * scale),
    attackPower: Math.max(1, Math.round(stats.attackPower * (1 + wave * 0.075))),
    speed: stats.speed * (1 + Math.min(0.34, wave * 0.009)),
    baseAttackRange: stats.baseAttackRange,
    color: stats.color,
    skillName: kind === "ranged" ? "균열 탄환" : "추적 돌진",
    skillDescription: "균열 생존전 전용 적입니다.",
    skillChargeRate: 0,
    role: "Supporter",
    detailedDescription: `${kind === "ranged" ? "멀리서 투사체를 발사하는" : "플레이어에게 접근해 공격하는"} 균열 생존전 전용 몬스터입니다.`,
  };
  if (kind === "ranged") config.onUpdate = updateRangedEnemy;
  return config;
}

/** 웨이브마다 근거리·빠른·원거리 비율을 높이고, 5웨이브부터 중장갑을 섞는다. */
export function createSurvivalWave(wave: number): CharacterConfig[] {
  const count = Math.min(30, 3 + Math.floor(wave * 1.6));
  return Array.from({ length: count }, (_, index) => {
    const rotation = (index + wave) % 10;
    const kind: SurvivalEnemyKind = wave >= 5 && rotation === 0
      ? "brute"
      : wave >= 2 && rotation % 4 === 0
        ? "ranged"
        : rotation % 3 === 0
          ? "fast"
          : "melee";
    return createEnemy(kind, wave, index);
  });
}
