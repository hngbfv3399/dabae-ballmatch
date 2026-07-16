import type { CharacterBehaviorContext, CharacterConfig, CharacterState } from '../character.interface';

// #region TYPES
// 찬휘의 마기 상태는 CharacterState에 선언해 HUD·렌더링·전투가 같은 값을 사용한다.
// #endregion TYPES

// #region CONSTANTS
const SKILL_CONSTANTS = {
  BARRIER_DURATION: 3,
  BARRIER_RADIUS_MULTIPLIER: 4,
  DAMAGE_INTERVAL: 0.5,
  DAMAGE_RATIO: 0.3,
  SLOW_MULTIPLIER: 0.75,
  SLOW_DURATION: 0.65,
  MAX_DEMONIC_STACKS: 5,
  STACK_DURATION: 6,
  EXPLOSION_RADIUS_MULTIPLIER: 4.8,
  EXPLOSION_DAMAGE_RATIO: 1.4,
  EXPLOSION_STUN_DURATION: 0.3,
  BARRIER_COLOR: '#dc2626',
  DEMONIC_COLOR: '#f97316',
} as const;
// #endregion CONSTANTS

// #region HELPERS
function isEnemy(first: CharacterState, second: CharacterState): boolean {
  return first.teamId === undefined || second.teamId === undefined || first.teamId !== second.teamId;
}

function addDemonicStack(char: CharacterState, ctx: CharacterBehaviorContext): void {
  char.chanhwiDemonicStacks = Math.min(
    SKILL_CONSTANTS.MAX_DEMONIC_STACKS,
    (char.chanhwiDemonicStacks ?? 0) + 1,
  );
  char.chanhwiDemonicStackTimeLeft = SKILL_CONSTANTS.STACK_DURATION;
  if (char.chanhwiDemonicStacks === SKILL_CONSTANTS.MAX_DEMONIC_STACKS) {
    ctx.addFloatingText(char.x, char.y - char.radius - 26, '마기 포화', SKILL_CONSTANTS.DEMONIC_COLOR, 0.8);
  }
}

function getBarrierTargets(char: CharacterState, ctx: CharacterBehaviorContext, radiusMultiplier: number): CharacterState[] {
  const radius = char.radius * radiusMultiplier;
  return ctx.characters.filter((target) =>
    !target.isDead
    && target.id !== char.id
    && isEnemy(char, target)
    && Math.hypot(target.x - char.x, target.y - char.y) <= radius + target.radius,
  );
}

function detonateDemonicEnergy(char: CharacterState, ctx: CharacterBehaviorContext): void {
  const targets = getBarrierTargets(char, ctx, SKILL_CONSTANTS.EXPLOSION_RADIUS_MULTIPLIER);
  targets.forEach((target) => {
    ctx.dealDamage(char, target, char.attackPower * SKILL_CONSTANTS.EXPLOSION_DAMAGE_RATIO, '마기 폭발');
    ctx.applyStun(char, target, SKILL_CONSTANTS.EXPLOSION_STUN_DURATION);
  });
  ctx.createExplosion(char.x, char.y, SKILL_CONSTANTS.DEMONIC_COLOR, 28);
  ctx.addFloatingText(char.x, char.y - 54, '마기 폭발!', '#fde68a', 1.1);
  ctx.logMessage?.(`🔥 [마기 폭발] 찬휘가 ${targets.length}명에게 결계 폭발을 일으켰습니다.`, 'skill');
  char.chanhwiDemonicStacks = 0;
  char.chanhwiDemonicStackTimeLeft = 0;
}
// #endregion HELPERS

// #region CONFIG
export const chanhwiConfig: CharacterConfig = {
  id: 'chanhwi',
  name: '찬휘',
  maxHp: 175,
  speed: 1.25,
  attackPower: 15,
  defense: 8,
  baseAttackRange: 36,
  skillName: '마천결계',
  skillDescription: '3초 동안 자신 주변에 마천결계를 펼칩니다. 결계 안의 적은 0.5초마다 공격력의 30% 피해를 받고 25% 둔화됩니다. 피해를 줄 때마다 마기 1스택(최대 5)을 얻으며, 결계 종료 시 마기가 5스택이면 넓은 범위에 공격력의 140% 피해와 0.3초 경직을 주는 마기 폭발을 일으킵니다.',
  color: '#dc2626',
  skillChargeRate: 12.5,
  tier: 'A',
  role: 'Juggernaut',
  detailedDescription: '찬휘는 마천결계로 전장 한가운데를 장악하는 근거리 브루저입니다. 기본 공격과 결계 피해로 마기를 채운 뒤 폭발을 만들며, PvP와 PvE에서 동일한 결계·둔화·마기 규칙을 사용합니다.',
  luck: 15,
  attackSpeed: 1.15,

  // #region SKILL_TRIGGER
  onSkillTrigger(char, ctx) {
    char.skillActive = true;
    char.skillDurationLeft = SKILL_CONSTANTS.BARRIER_DURATION;
    char.chanhwiBarrierPulseTimer = 0;
    ctx.createExplosion(char.x, char.y, SKILL_CONSTANTS.BARRIER_COLOR, 14);
    ctx.addFloatingText(char.x, char.y - 48, '마천결계', '#fecaca', 0.9);
    ctx.logMessage?.('🔴 [마천결계] 찬휘가 전장을 억누르는 결계를 펼쳤습니다.', 'skill');
  },
  // #endregion SKILL_TRIGGER

  // #region UPDATE
  onUpdate(char, dt, ctx) {
    if ((char.chanhwiDemonicStackTimeLeft ?? 0) > 0) {
      char.chanhwiDemonicStackTimeLeft = Math.max(0, (char.chanhwiDemonicStackTimeLeft ?? 0) - dt);
      if (char.chanhwiDemonicStackTimeLeft === 0) char.chanhwiDemonicStacks = 0;
    }
    if (!char.skillActive) return;

    char.skillDurationLeft -= dt;
    char.chanhwiBarrierPulseTimer = (char.chanhwiBarrierPulseTimer ?? 0) - dt;
    if (char.chanhwiBarrierPulseTimer <= 0) {
      const targets = getBarrierTargets(char, ctx, SKILL_CONSTANTS.BARRIER_RADIUS_MULTIPLIER);
      targets.forEach((target) => {
        ctx.dealDamage(char, target, char.attackPower * SKILL_CONSTANTS.DAMAGE_RATIO, '마천결계');
        target.movementSlowMultiplier = Math.min(target.movementSlowMultiplier ?? 1, SKILL_CONSTANTS.SLOW_MULTIPLIER);
        target.movementSlowTimeLeft = Math.max(target.movementSlowTimeLeft ?? 0, SKILL_CONSTANTS.SLOW_DURATION);
        ctx.createParticle(target.x, target.y, SKILL_CONSTANTS.BARRIER_COLOR, 2.8, 10);
      });
      if (targets.length > 0) addDemonicStack(char, ctx);
      char.chanhwiBarrierPulseTimer = SKILL_CONSTANTS.DAMAGE_INTERVAL;
    }

    if (char.skillDurationLeft <= 0) {
      char.skillActive = false;
      if ((char.chanhwiDemonicStacks ?? 0) >= SKILL_CONSTANTS.MAX_DEMONIC_STACKS) detonateDemonicEnergy(char, ctx);
    }
  },
  // #endregion UPDATE

  // #region BASIC_ATTACK
  onBasicAttack(char, _opponent, ctx) {
    addDemonicStack(char, ctx);
  },
  // #endregion BASIC_ATTACK

  // #region COLLISION
  onCollisionWithTarget() {
    // 기본 충돌 판정은 공통 전투 엔진이 처리한다.
  },
  // #endregion COLLISION

  // #region DAMAGE
  onTakeDamage(_target, _attacker, damage) {
    return { finalDamage: damage, blocked: false };
  },
  // #endregion DAMAGE

  // #region DEATH
  onDeath(char) {
    char.skillActive = false;
    char.chanhwiDemonicStacks = 0;
    char.chanhwiDemonicStackTimeLeft = 0;
  },
  // #endregion DEATH

  // #region RENDER
  onRenderExtra(char, canvasCtx, currentRadius) {
    const stacks = char.chanhwiDemonicStacks ?? 0;
    if (char.skillActive) {
      const radius = char.radius * SKILL_CONSTANTS.BARRIER_RADIUS_MULTIPLIER;
      const pulse = 1 + Math.sin(Date.now() / 130) * 0.035;
      canvasCtx.save();
      canvasCtx.fillStyle = 'rgba(127, 29, 29, 0.14)';
      canvasCtx.strokeStyle = 'rgba(248, 113, 113, 0.82)';
      canvasCtx.lineWidth = 2.4;
      canvasCtx.setLineDash([7, 8]);
      canvasCtx.beginPath();
      canvasCtx.arc(char.x, char.y, radius * pulse, 0, Math.PI * 2);
      canvasCtx.fill();
      canvasCtx.stroke();
      canvasCtx.setLineDash([]);
      canvasCtx.strokeStyle = 'rgba(251, 146, 60, 0.38)';
      canvasCtx.beginPath();
      canvasCtx.arc(char.x, char.y, currentRadius + 8, 0, Math.PI * 2);
      canvasCtx.stroke();
      canvasCtx.restore();
    }

    if (stacks > 0) {
      canvasCtx.save();
      for (let index = 0; index < SKILL_CONSTANTS.MAX_DEMONIC_STACKS; index += 1) {
        canvasCtx.fillStyle = index < stacks ? SKILL_CONSTANTS.DEMONIC_COLOR : 'rgba(255,255,255,.2)';
        canvasCtx.beginPath();
        canvasCtx.arc(char.x - 16 + index * 8, char.y - currentRadius - 18, 2.8, 0, Math.PI * 2);
        canvasCtx.fill();
      }
      canvasCtx.restore();
    }
  },
  getStatusEffects(char) {
    const effects = [];
    if (char.skillActive) effects.push({ icon: '🔴', label: '마천결계', timeLeft: Math.max(0, char.skillDurationLeft), duration: SKILL_CONSTANTS.BARRIER_DURATION, color: '#f87171' });
    if ((char.chanhwiDemonicStacks ?? 0) > 0) effects.push({ icon: '🔥', label: `마기 ${char.chanhwiDemonicStacks}/${SKILL_CONSTANTS.MAX_DEMONIC_STACKS}`, timeLeft: char.chanhwiDemonicStackTimeLeft ?? 0, duration: SKILL_CONSTANTS.STACK_DURATION, color: '#fb923c' });
    return effects;
  },
  // #endregion RENDER
};
// #endregion CONFIG
