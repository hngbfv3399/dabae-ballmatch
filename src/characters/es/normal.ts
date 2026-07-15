import type { CharacterBehaviorContext, CharacterConfig, CharacterState } from '../character.interface';

// ═══════════════════════════════════════════
// #region TYPES
// ═══════════════════════════════════════════
interface StickyGrenade {
  x: number;
  y: number;
  vx: number;
  vy: number;
  timeLeft: number;
  targetId?: string;
  attachedToWall?: boolean;
}

interface EsState extends CharacterState {
  stickyGrenades?: StickyGrenade[];
  bombDevilTriggered?: boolean;
}
// #endregion TYPES

// ═══════════════════════════════════════════
// #region CONSTANTS
// ═══════════════════════════════════════════
const SKILL_CONSTANTS = {
  MAX_HP: 135,
  SPEED: 1.65,
  ATTACK_POWER: 12,
  ATTACK_RANGE: 44,
  COOLDOWN: 7,
  GRENADE_SPEED: 10,
  GRENADE_RADIUS: 10,
  GRENADE_FUSE_DURATION: 2.5,
  GRENADE_DAMAGE: 42,
  GRENADE_RADIUS_DAMAGE: 125,
  GRENADE_EXPLOSION_PARTICLES: 18,
  PASSIVE_HP_THRESHOLD: 35,
  PASSIVE_DAMAGE: 65,
  PASSIVE_RADIUS: 180,
  PASSIVE_EXPLOSION_PARTICLES: 28,
  FUSE_LABEL_OFFSET: 16,
  FUSE_LABEL_HEIGHT: 22,
};
// #endregion CONSTANTS

// ═══════════════════════════════════════════
// #region HELPERS
// ═══════════════════════════════════════════
function isEnemy(first: CharacterState, second: CharacterState): boolean {
  return first.teamId === undefined || second.teamId === undefined || first.teamId !== second.teamId;
}

function getGrenades(char: CharacterState): StickyGrenade[] {
  const state = char as EsState;
  state.stickyGrenades ??= [];
  return state.stickyGrenades;
}

function getNearestEnemy(char: CharacterState, characters: CharacterState[]): CharacterState | undefined {
  return characters
    .filter((candidate) => !candidate.isDead && candidate.id !== char.id && isEnemy(char, candidate))
    .sort((first, second) => Math.hypot(first.x - char.x, first.y - char.y) - Math.hypot(second.x - char.x, second.y - char.y))[0];
}

function syncGrenadeStatusEffects(char: CharacterState, characters: CharacterState[]): void {
  characters.forEach((target) => {
    target.statusIndicators = (target.statusIndicators ?? []).filter(
      (effect) => effect.label !== '수류탄 부착',
    );
  });

  getGrenades(char).forEach((grenade) => {
    const target = characters.find((candidate) => candidate.id === grenade.targetId);
    if (!target || target.isDead || !isEnemy(char, target)) return;
    target.statusIndicators?.push({
      icon: '💣',
      label: '수류탄 부착',
      timeLeft: grenade.timeLeft,
      duration: SKILL_CONSTANTS.GRENADE_FUSE_DURATION,
      color: char.color,
    });
  });
}

function explode(
  char: CharacterState,
  x: number,
  y: number,
  damage: number,
  radius: number,
  text: string,
  particleCount: number,
  ctx: CharacterBehaviorContext,
): void {
  ctx.createExplosion(x, y, char.color, particleCount);
  ctx.addFloatingText(x, y - 42, text, '#fff7ed', 1.1);
  ctx.characters.forEach((target) => {
    if (target.isDead || target.id === char.id || !isEnemy(char, target)) return;
    if (Math.hypot(target.x - x, target.y - y) > radius + target.radius) return;
    ctx.dealDamage(char, target, damage, text);
  });
}
// #endregion HELPERS

// ═══════════════════════════════════════════
// #region CONFIG
// ═══════════════════════════════════════════
export const esConfig: CharacterConfig = {
  id: 'es',
  name: '에스',
  maxHp: SKILL_CONSTANTS.MAX_HP,
  speed: SKILL_CONSTANTS.SPEED,
  attackPower: SKILL_CONSTANTS.ATTACK_POWER,
  defense: 5,
  baseAttackRange: SKILL_CONSTANTS.ATTACK_RANGE,
  skillName: '부착형 수류탄',
  skillDescription: `${SKILL_CONSTANTS.COOLDOWN}초마다 가장 가까운 적을 향해 수류탄을 던집니다. 수류탄은 적 또는 벽에 붙고 ${SKILL_CONSTANTS.GRENADE_FUSE_DURATION}초 뒤 반경 ${SKILL_CONSTANTS.GRENADE_RADIUS_DAMAGE}px에 ${SKILL_CONSTANTS.GRENADE_DAMAGE} 피해를 줍니다. 패시브 [폭탄의 악마]: HP가 ${SKILL_CONSTANTS.PASSIVE_HP_THRESHOLD} 이하가 되면 한 번, 반경 ${SKILL_CONSTANTS.PASSIVE_RADIUS}px 적 전원에게 ${SKILL_CONSTANTS.PASSIVE_DAMAGE} 피해를 줍니다.`,
  color: '#ff6b35',
  skillChargeRate: 100 / SKILL_CONSTANTS.COOLDOWN,
  tier: 'A',
  role: 'Nuker',
  detailedDescription: '에스는 죽기 직전 폭발하는 폭탄의 악마다. 부착형 수류탄을 적이나 벽에 고정해 이동 경로를 봉쇄하고, 마지막 체력에서는 주변을 통째로 폭파한다.',
// #endregion CONFIG

  // ═══════════════════════════════════════════
  // #region SKILL_TRIGGER
  // ═══════════════════════════════════════════
  onSkillTrigger(char: CharacterState, ctx: CharacterBehaviorContext) {
    const target = getNearestEnemy(char, ctx.characters);
    const fallbackAngle = Math.atan2(char.vy, char.vx);
    const angle = target
      ? Math.atan2(target.y - char.y, target.x - char.x)
      : Number.isFinite(fallbackAngle) ? fallbackAngle : 0;
    getGrenades(char).push({
      x: char.x,
      y: char.y,
      vx: Math.cos(angle) * SKILL_CONSTANTS.GRENADE_SPEED,
      vy: Math.sin(angle) * SKILL_CONSTANTS.GRENADE_SPEED,
      timeLeft: SKILL_CONSTANTS.GRENADE_FUSE_DURATION,
    });
    char.skillActive = false;
    ctx.addFloatingText(char.x, char.y - 52, '💣 부착형 수류탄!', char.color, 1);
  },
  // #endregion SKILL_TRIGGER

  // ═══════════════════════════════════════════
  // #region UPDATE
  // ═══════════════════════════════════════════
  onUpdate(char: CharacterState, dt: number, ctx: CharacterBehaviorContext) {
    const state = char as EsState;
    if (!state.bombDevilTriggered && char.hp > 0 && char.hp <= SKILL_CONSTANTS.PASSIVE_HP_THRESHOLD) {
      state.bombDevilTriggered = true;
      explode(char, char.x, char.y, SKILL_CONSTANTS.PASSIVE_DAMAGE, SKILL_CONSTANTS.PASSIVE_RADIUS, '💥 폭탄의 악마!', SKILL_CONSTANTS.PASSIVE_EXPLOSION_PARTICLES, ctx);
    }

    const grenades = getGrenades(char);
    grenades.forEach((grenade) => {
      grenade.timeLeft -= dt;
      const attachedTarget = ctx.characters.find((candidate) => candidate.id === grenade.targetId && !candidate.isDead);
      if (attachedTarget) {
        grenade.x = attachedTarget.x;
        grenade.y = attachedTarget.y;
        return;
      }
      if (grenade.targetId) grenade.targetId = undefined;
      if (grenade.attachedToWall) return;

      grenade.x += grenade.vx * dt * 60;
      grenade.y += grenade.vy * dt * 60;
      const hitTarget = ctx.characters.find((candidate) =>
        !candidate.isDead && candidate.id !== char.id && isEnemy(char, candidate) &&
        Math.hypot(candidate.x - grenade.x, candidate.y - grenade.y) <= candidate.radius + SKILL_CONSTANTS.GRENADE_RADIUS,
      );
      if (hitTarget) {
        grenade.targetId = hitTarget.id;
        grenade.x = hitTarget.x;
        grenade.y = hitTarget.y;
        grenade.vx = 0;
        grenade.vy = 0;
        return;
      }

      const minX = SKILL_CONSTANTS.GRENADE_RADIUS;
      const maxX = ctx.arenaWidth - SKILL_CONSTANTS.GRENADE_RADIUS;
      const minY = SKILL_CONSTANTS.GRENADE_RADIUS;
      const maxY = ctx.arenaHeight - SKILL_CONSTANTS.GRENADE_RADIUS;
      if (grenade.x <= minX || grenade.x >= maxX || grenade.y <= minY || grenade.y >= maxY) {
        grenade.x = Math.max(minX, Math.min(maxX, grenade.x));
        grenade.y = Math.max(minY, Math.min(maxY, grenade.y));
        grenade.vx = 0;
        grenade.vy = 0;
        grenade.attachedToWall = true;
      }
    });

    state.stickyGrenades = grenades.filter((grenade) => {
      if (grenade.timeLeft > 0) return true;
      explode(char, grenade.x, grenade.y, SKILL_CONSTANTS.GRENADE_DAMAGE, SKILL_CONSTANTS.GRENADE_RADIUS_DAMAGE, '💥 수류탄 폭발!', SKILL_CONSTANTS.GRENADE_EXPLOSION_PARTICLES, ctx);
      return false;
    });
    syncGrenadeStatusEffects(char, ctx.characters);
  },
  // #endregion UPDATE

  // ═══════════════════════════════════════════
  // #region BASIC_ATTACK
  // ═══════════════════════════════════════════
  onBasicAttack(_char: CharacterState, _opponent: CharacterState, _ctx: CharacterBehaviorContext) {},
  // #endregion BASIC_ATTACK

  // ═══════════════════════════════════════════
  // #region COLLISION
  // ═══════════════════════════════════════════
  onCollisionWithTarget(_char: CharacterState, _opponent: CharacterState, _ctx: CharacterBehaviorContext) {},
  // #endregion COLLISION

  // ═══════════════════════════════════════════
  // #region DAMAGE
  // ═══════════════════════════════════════════
  onTakeDamage(_target: CharacterState, _attacker: CharacterState, damage: number, _ctx: CharacterBehaviorContext) {
    return { finalDamage: damage, blocked: false };
  },
  // #endregion DAMAGE

  // ═══════════════════════════════════════════
  // #region DEATH
  // ═══════════════════════════════════════════
  onDeath(char: CharacterState, _killer: CharacterState, ctx: CharacterBehaviorContext) {
    const state = char as EsState;
    state.stickyGrenades = [];
    syncGrenadeStatusEffects(char, ctx.characters);
  },
  // #endregion DEATH

  // ═══════════════════════════════════════════
  // #region RENDER
  // ═══════════════════════════════════════════
  onRenderExtra(char: CharacterState, canvasCtx: CanvasRenderingContext2D) {
    getGrenades(char).forEach((grenade) => {
      const pulse = Math.abs(Math.sin(Date.now() / 120));
      const label = grenade.targetId ? `💣 부착 ${Math.max(0, grenade.timeLeft).toFixed(1)}s` : `${Math.max(0, grenade.timeLeft).toFixed(1)}s`;

      canvasCtx.save();
      canvasCtx.fillStyle = '#1a0802';
      canvasCtx.strokeStyle = char.color;
      canvasCtx.lineWidth = 3;
      canvasCtx.shadowColor = char.color;
      canvasCtx.shadowBlur = 8 + pulse * 10;
      canvasCtx.beginPath();
      canvasCtx.arc(grenade.x, grenade.y, SKILL_CONSTANTS.GRENADE_RADIUS, 0, Math.PI * 2);
      canvasCtx.fill();
      canvasCtx.stroke();
      canvasCtx.fillStyle = '#fff7ed';
      canvasCtx.beginPath();
      canvasCtx.arc(grenade.x, grenade.y, 3 + pulse * 2, 0, Math.PI * 2);
      canvasCtx.fill();

      canvasCtx.font = 'bold 12px Orbit, sans-serif';
      canvasCtx.textAlign = 'center';
      canvasCtx.textBaseline = 'middle';
      const labelWidth = canvasCtx.measureText(label).width + 12;
      const labelY = grenade.y - SKILL_CONSTANTS.GRENADE_RADIUS - SKILL_CONSTANTS.FUSE_LABEL_OFFSET;
      canvasCtx.fillStyle = 'rgba(23, 8, 4, 0.9)';
      canvasCtx.fillRect(grenade.x - labelWidth / 2, labelY - SKILL_CONSTANTS.FUSE_LABEL_HEIGHT / 2, labelWidth, SKILL_CONSTANTS.FUSE_LABEL_HEIGHT);
      canvasCtx.strokeStyle = char.color;
      canvasCtx.strokeRect(grenade.x - labelWidth / 2, labelY - SKILL_CONSTANTS.FUSE_LABEL_HEIGHT / 2, labelWidth, SKILL_CONSTANTS.FUSE_LABEL_HEIGHT);
      canvasCtx.fillStyle = '#fff7ed';
      canvasCtx.fillText(label, grenade.x, labelY);
      canvasCtx.restore();
    });
  },
  // #endregion RENDER
};
