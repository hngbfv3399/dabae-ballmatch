import type { CharacterBehaviorContext, CharacterConfig, CharacterState, CharacterStatusEffect } from '../character.interface';

// ═══════════════════════════════════════════
// #region TYPES
// ═══════════════════════════════════════════
interface FuseMark {
  targetId: string;
  stacks: number;
  timeLeft: number;
  contactCooldown: number;
}

interface EsState extends CharacterState {
  fuseMarks?: FuseMark[];
  fuseParticleTimer?: number;
  detonationSpeedStacks?: number;
  detonationSpeedLeft?: number;
  _charactersRef?: CharacterState[];
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
  MAX_MARKED_TARGETS: 3,
  MAX_FUSE_STACKS: 3,
  FUSE_DURATION: 4.5,
  CONTACT_COOLDOWN: 0.9,
  DIRECT_DAMAGE_BASE: 16,
  DIRECT_DAMAGE_PER_STACK: 10,
  SPLASH_RADIUS: 100,
  SPLASH_DAMAGE_RATIO: 0.45,
  SPEED_BONUS_PER_TARGET: 0.1,
  SPEED_BONUS_DURATION: 1.5,
  FUSE_PARTICLE_INTERVAL: 0.28,
  EXPLOSION_PARTICLE_COUNT: 12,
  FUSE_RING_PADDING: 10,
  FUSE_RING_PULSE: 5,
  FUSE_LABEL_OFFSET: 18,
  FUSE_LABEL_PADDING_X: 10,
  FUSE_LABEL_HEIGHT: 24,
  FUSE_CONNECTION_DASH: 7,
  FUSE_CONNECTION_GAP: 6,
};
// #endregion CONSTANTS

// ═══════════════════════════════════════════
// #region HELPERS
// ═══════════════════════════════════════════
function isEnemy(first: CharacterState, second: CharacterState): boolean {
  return first.teamId === undefined || second.teamId === undefined || first.teamId !== second.teamId;
}

function getFuseMarks(char: CharacterState): FuseMark[] {
  const state = char as EsState;
  state.fuseMarks ??= [];
  return state.fuseMarks;
}
// #endregion HELPERS

// ═══════════════════════════════════════════
// #region CONFIG
// ═══════════════════════════════════════════
export const esConfig: CharacterConfig = {
  id: 'es', name: '에스', maxHp: SKILL_CONSTANTS.MAX_HP, speed: SKILL_CONSTANTS.SPEED,
  attackPower: SKILL_CONSTANTS.ATTACK_POWER, baseAttackRange: SKILL_CONSTANTS.ATTACK_RANGE,
  skillName: '원격 기폭',
  skillDescription: `적과 충돌하면 ${SKILL_CONSTANTS.FUSE_DURATION}초간 도화선을 부착합니다. 대상당 최대 ${SKILL_CONSTANTS.MAX_FUSE_STACKS}중첩, 최대 ${SKILL_CONSTANTS.MAX_MARKED_TARGETS}명까지 부착할 수 있습니다. ${SKILL_CONSTANTS.COOLDOWN}초마다 모든 도화선을 원격 기폭해 ${SKILL_CONSTANTS.DIRECT_DAMAGE_BASE} + 중첩당 ${SKILL_CONSTANTS.DIRECT_DAMAGE_PER_STACK} 피해를 주고, 반경 ${SKILL_CONSTANTS.SPLASH_RADIUS}px의 적에게 피해의 ${SKILL_CONSTANTS.SPLASH_DAMAGE_RATIO * 100}%를 입힙니다.`,
  color: '#ff6b35', skillChargeRate: 100 / SKILL_CONSTANTS.COOLDOWN, tier: 'A', role: 'Nuker',
  detailedDescription: '에스는 빠른 몸놀림으로 적에게 도화선을 심고 한순간에 폭발시키는 고위험 누커입니다. 충돌을 많이 만들수록 원격 기폭의 위력이 커지지만, 낮은 체력 때문에 전장 한가운데에 오래 머물 수는 없습니다.',
// #endregion CONFIG

  // ═══════════════════════════════════════════
  // #region SKILL_TRIGGER
  // ═══════════════════════════════════════════
  onSkillTrigger(char: CharacterState, ctx: CharacterBehaviorContext) {
    const state = char as EsState;
    const activeMarks = getFuseMarks(char).filter((mark) => {
      const target = ctx.characters.find((candidate) => candidate.id === mark.targetId);
      return !!target && !target.isDead && isEnemy(char, target);
    });
    state.fuseMarks = [];
    char.skillActive = false;

    if (activeMarks.length === 0) {
      ctx.addFloatingText(char.x, char.y - 52, '💣 기폭할 도화선 없음', '#9ca3af', 1.0);
      return;
    }

    activeMarks.forEach((mark) => {
      const target = ctx.characters.find((candidate) => candidate.id === mark.targetId);
      if (!target || target.isDead) return;
      const directDamage = SKILL_CONSTANTS.DIRECT_DAMAGE_BASE + mark.stacks * SKILL_CONSTANTS.DIRECT_DAMAGE_PER_STACK;
      ctx.dealDamage(char, target, directDamage, `💣 ${mark.stacks}중첩 기폭`);
      ctx.createExplosion(target.x, target.y, char.color, SKILL_CONSTANTS.EXPLOSION_PARTICLE_COUNT);
      ctx.addFloatingText(target.x, target.y - 48, `💥 ${mark.stacks}중첩 기폭!`, char.color, 1.0);

      ctx.characters.forEach((other) => {
        if (other.isDead || other.id === char.id || other.id === target.id || !isEnemy(char, other)) return;
        if (Math.hypot(other.x - target.x, other.y - target.y) > SKILL_CONSTANTS.SPLASH_RADIUS + other.radius) return;
        ctx.dealDamage(char, other, directDamage * SKILL_CONSTANTS.SPLASH_DAMAGE_RATIO, '💥 폭발 여파');
      });
    });

    state.detonationSpeedStacks = activeMarks.length;
    state.detonationSpeedLeft = SKILL_CONSTANTS.SPEED_BONUS_DURATION;
    char.speed *= 1 + activeMarks.length * SKILL_CONSTANTS.SPEED_BONUS_PER_TARGET;
    ctx.addFloatingText(char.x, char.y - 60, `🔥 연쇄 기폭! (${activeMarks.length}명)`, char.color, 1.2);
  },
  // #endregion SKILL_TRIGGER

  // ═══════════════════════════════════════════
  // #region UPDATE
  // ═══════════════════════════════════════════
  onUpdate(char: CharacterState, dt: number, ctx: CharacterBehaviorContext) {
    const state = char as EsState;
    state._charactersRef = ctx.characters;
    const marks = getFuseMarks(char);
    marks.forEach((mark) => {
      mark.timeLeft -= dt;
      mark.contactCooldown = Math.max(0, mark.contactCooldown - dt);
    });
    state.fuseMarks = marks.filter((mark) => {
      const target = ctx.characters.find((candidate) => candidate.id === mark.targetId);
      return mark.timeLeft > 0 && !!target && !target.isDead && isEnemy(char, target);
    });

    state.fuseParticleTimer = (state.fuseParticleTimer ?? 0) - dt;
    if (state.fuseParticleTimer <= 0) {
      state.fuseParticleTimer = SKILL_CONSTANTS.FUSE_PARTICLE_INTERVAL;
      state.fuseMarks.forEach((mark) => {
        const target = ctx.characters.find((candidate) => candidate.id === mark.targetId);
        if (target) ctx.createParticle(target.x, target.y - target.radius, char.color, 3 + mark.stacks, 0.45);
      });
    }

    if ((state.detonationSpeedLeft ?? 0) > 0) {
      state.detonationSpeedLeft! -= dt;
      if (state.detonationSpeedLeft! <= 0) {
        char.speed /= 1 + (state.detonationSpeedStacks ?? 0) * SKILL_CONSTANTS.SPEED_BONUS_PER_TARGET;
        state.detonationSpeedStacks = 0;
        state.detonationSpeedLeft = 0;
      }
    }
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
  onCollisionWithTarget(char: CharacterState, opponent: CharacterState, ctx: CharacterBehaviorContext) {
    if (opponent.isDead || !isEnemy(char, opponent)) return;
    const marks = getFuseMarks(char);
    const existing = marks.find((mark) => mark.targetId === opponent.id);
    if (existing) {
      if (existing.contactCooldown > 0) return;
      existing.stacks = Math.min(SKILL_CONSTANTS.MAX_FUSE_STACKS, existing.stacks + 1);
      existing.timeLeft = SKILL_CONSTANTS.FUSE_DURATION;
      existing.contactCooldown = SKILL_CONSTANTS.CONTACT_COOLDOWN;
      ctx.addFloatingText(opponent.x, opponent.y - 42, `🔥 도화선 ${existing.stacks}중첩`, char.color, 0.8);
      return;
    }
    if (marks.length >= SKILL_CONSTANTS.MAX_MARKED_TARGETS) return;
    marks.push({
      targetId: opponent.id,
      stacks: 1,
      timeLeft: SKILL_CONSTANTS.FUSE_DURATION,
      contactCooldown: SKILL_CONSTANTS.CONTACT_COOLDOWN,
    });
    ctx.addFloatingText(opponent.x, opponent.y - 42, '🔥 도화선 부착!', char.color, 0.9);
  },
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
  onDeath(char: CharacterState, _killer: CharacterState, _ctx: CharacterBehaviorContext) {
    const state = char as EsState;
    if ((state.detonationSpeedStacks ?? 0) > 0) {
      char.speed /= 1 + state.detonationSpeedStacks! * SKILL_CONSTANTS.SPEED_BONUS_PER_TARGET;
    }
    state.fuseMarks = [];
    state.detonationSpeedStacks = 0;
    state.detonationSpeedLeft = 0;
  },
  // #endregion DEATH

  // ═══════════════════════════════════════════
  // #region RENDER
  // ═══════════════════════════════════════════
  onRenderExtra(char: CharacterState, canvasCtx: CanvasRenderingContext2D, currentRadius: number) {
    const marks = getFuseMarks(char);
    const markCount = marks.length;
    if (markCount === 0) return;

    // 에스 본체의 현재 표식 수를 보여주는 게이지
    canvasCtx.save();
    canvasCtx.strokeStyle = char.color;
    canvasCtx.globalAlpha = 0.45 + markCount * 0.15;
    canvasCtx.lineWidth = 3;
    canvasCtx.beginPath();
    canvasCtx.arc(char.x, char.y, currentRadius + 7, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (markCount / SKILL_CONSTANTS.MAX_MARKED_TARGETS));
    canvasCtx.stroke();
    canvasCtx.restore();

    // 대상 위에 도화선 중첩·남은 시간을 직접 표시한다. 작은 파티클만으로는
    // 전투 중 표식을 식별하기 어려워, 연결선과 폭발 경고 링을 함께 그린다.
    const pulse = Math.abs(Math.sin(Date.now() / 150));
    marks.forEach((mark) => {
      const target = (char as EsState)._charactersRef?.find((candidate) => candidate.id === mark.targetId);
      if (!target || target.isDead || !isEnemy(char, target)) return;

      const ringRadius = target.radius + SKILL_CONSTANTS.FUSE_RING_PADDING + pulse * SKILL_CONSTANTS.FUSE_RING_PULSE;
      const label = `💣 ${mark.stacks}/${SKILL_CONSTANTS.MAX_FUSE_STACKS} · ${Math.max(0, mark.timeLeft).toFixed(1)}s`;

      canvasCtx.save();
      canvasCtx.strokeStyle = char.color;
      canvasCtx.globalAlpha = 0.45 + pulse * 0.4;
      canvasCtx.lineWidth = 2.5;
      canvasCtx.setLineDash([SKILL_CONSTANTS.FUSE_CONNECTION_DASH, SKILL_CONSTANTS.FUSE_CONNECTION_GAP]);
      canvasCtx.beginPath();
      canvasCtx.moveTo(char.x, char.y);
      canvasCtx.lineTo(target.x, target.y);
      canvasCtx.stroke();
      canvasCtx.setLineDash([]);

      canvasCtx.lineWidth = 3;
      canvasCtx.beginPath();
      canvasCtx.arc(target.x, target.y, ringRadius, 0, Math.PI * 2);
      canvasCtx.stroke();

      canvasCtx.font = 'bold 13px Orbit, sans-serif';
      const textWidth = canvasCtx.measureText(label).width;
      const labelWidth = textWidth + SKILL_CONSTANTS.FUSE_LABEL_PADDING_X * 2;
      const labelX = target.x - labelWidth / 2;
      const labelY = target.y - ringRadius - SKILL_CONSTANTS.FUSE_LABEL_OFFSET;
      canvasCtx.fillStyle = 'rgba(23, 8, 4, 0.9)';
      canvasCtx.fillRect(labelX, labelY - SKILL_CONSTANTS.FUSE_LABEL_HEIGHT, labelWidth, SKILL_CONSTANTS.FUSE_LABEL_HEIGHT);
      canvasCtx.strokeStyle = char.color;
      canvasCtx.globalAlpha = 0.95;
      canvasCtx.strokeRect(labelX, labelY - SKILL_CONSTANTS.FUSE_LABEL_HEIGHT, labelWidth, SKILL_CONSTANTS.FUSE_LABEL_HEIGHT);
      canvasCtx.fillStyle = '#fff7ed';
      canvasCtx.textAlign = 'center';
      canvasCtx.textBaseline = 'middle';
      canvasCtx.fillText(label, target.x, labelY - SKILL_CONSTANTS.FUSE_LABEL_HEIGHT / 2);
      canvasCtx.restore();
    });
  },
  getStatusEffects(char: CharacterState): CharacterStatusEffect[] {
    const marks = getFuseMarks(char);
    if (marks.length === 0) return [];
    const longest = Math.max(...marks.map((mark) => mark.timeLeft));
    return [{ icon: '💣', label: `도화선 ${marks.length}/${SKILL_CONSTANTS.MAX_MARKED_TARGETS}`, timeLeft: longest, duration: SKILL_CONSTANTS.FUSE_DURATION, color: char.color }];
  },
  // #endregion RENDER
};
