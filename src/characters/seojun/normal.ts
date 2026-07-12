import type { CharacterBehaviorContext, CharacterConfig, CharacterState } from '../character.interface';

// ═══════════════════════════════════════════
// #region TYPES
// ═══════════════════════════════════════════
interface TimePoint { x: number; y: number; hp: number; }
interface SeojunState extends CharacterState {
  timePath?: TimePoint[];
  timeAnchorLeft?: number;
  pathSampleTimer?: number;
  isRewinding?: boolean;
  rewindProgress?: number;
  rewindHitIds?: string[];
  temporalBuffStacks?: number;
  temporalBuffLeft?: number;
  returnShockwave?: { x: number; y: number; timeLeft: number };
}
// #endregion TYPES

// ═══════════════════════════════════════════
// #region CONSTANTS
// ═══════════════════════════════════════════
const SKILL_CONSTANTS = {
  FIRST_CAST_COOLDOWN: 6,
  RECAST_COOLDOWN: 4,
  ANCHOR_DURATION: 7,
  PATH_SAMPLE_INTERVAL: 0.08,
  REWIND_DURATION: 0.7,
  REWIND_DAMAGE: 12,
  HIT_RADIUS_PADDING: 8,
  RETURN_SHOCKWAVE_RADIUS: 150,
  RETURN_SHOCKWAVE_DAMAGE: 16,
  RETURN_SHOCKWAVE_KNOCKBACK: 18,
  RETURN_SHOCKWAVE_VISUAL_DURATION: 0.9,
  RETURN_SHOCKWAVE_RING_COUNT: 3,
  MAX_BUFF_STACKS: 3,
  BUFF_DURATION: 4,
  ATTACK_BONUS_PER_STACK: 0.1,
  SPEED_BONUS_PER_STACK: 0.08,
  RESUME_SPEED_MULTIPLIER: 3.5,
};
// #endregion CONSTANTS

// ═══════════════════════════════════════════
// #region HELPERS
// ═══════════════════════════════════════════
function isEnemy(first: CharacterState, second: CharacterState): boolean {
  return first.teamId === undefined || second.teamId === undefined || first.teamId !== second.teamId;
}
// #endregion HELPERS

// ═══════════════════════════════════════════
// #region CONFIG
// ═══════════════════════════════════════════
export const seojunConfig: CharacterConfig = {
  id: 'seojun', name: '서준', maxHp: 150, speed: 1.55, attackPower: 15, baseAttackRange: 48,
  skillName: '시공간 역행',
  skillDescription: `첫 사용 시 시간 표식을 남기고 ${SKILL_CONSTANTS.RECAST_COOLDOWN}초 후 재사용할 수 있습니다. 재사용 시 기록한 위치와 체력을 ${SKILL_CONSTANTS.REWIND_DURATION}초간 역행하며 무적·CC 면역을 얻고 적에게 ${SKILL_CONSTANTS.REWIND_DAMAGE} 피해를 줍니다. 복귀 지점에서는 반경 ${SKILL_CONSTANTS.RETURN_SHOCKWAVE_RADIUS} 충격파로 ${SKILL_CONSTANTS.RETURN_SHOCKWAVE_DAMAGE} 피해와 넉백을 줍니다. 기절·혼란 중에도 스킬을 사용할 수 있습니다.`,
  color: '#5de2e7', skillChargeRate: 100 / SKILL_CONSTANTS.FIRST_CAST_COOLDOWN, tier: 'A', role: 'Speedster',
  detailedDescription: '서준은 시간을 기록했다가 역행하며 적진을 가로지르는 근거리 딜러입니다. 역행 중에는 피해와 군중 제어를 무시하지만, 경로를 잘 설계해야 최대 보상을 얻습니다.',
// #endregion CONFIG

  // ═══════════════════════════════════════════
  // #region SKILL_TRIGGER
  // ═══════════════════════════════════════════
  onSkillTrigger(char: CharacterState, ctx: CharacterBehaviorContext) {
    const ss = char as SeojunState;
    if (!ss.timePath || ss.timeAnchorLeft === undefined || ss.timeAnchorLeft <= 0) {
      ss.timePath = [{ x: char.x, y: char.y, hp: char.hp }];
      ss.timeAnchorLeft = SKILL_CONSTANTS.ANCHOR_DURATION;
      ss.pathSampleTimer = 0;
      char.skillActive = false;
      char.skillChargeRate = 100 / SKILL_CONSTANTS.RECAST_COOLDOWN;
      ctx.addFloatingText(char.x, char.y - 55, '⏳ 시간 표식!', char.color, 1.2);
      return;
    }
    ss.isRewinding = true;
    ss.rewindProgress = 0;
    ss.rewindHitIds = [];
    char.skillActive = true;
    char.isCcImmune = true;
    ctx.addFloatingText(char.x, char.y - 55, '🌀 시공간 역행!', char.color, 1.2);
  },
  // #endregion SKILL_TRIGGER

  // ═══════════════════════════════════════════
  // #region UPDATE
  // ═══════════════════════════════════════════
  onUpdate(char: CharacterState, dt: number, ctx: CharacterBehaviorContext) {
    const ss = char as SeojunState;
    if (ss.timePath && ss.timeAnchorLeft !== undefined && !ss.isRewinding) {
      ss.timeAnchorLeft -= dt;
      ss.pathSampleTimer = (ss.pathSampleTimer ?? 0) - dt;
      if (ss.pathSampleTimer <= 0) {
        ss.timePath.push({ x: char.x, y: char.y, hp: char.hp });
        ss.pathSampleTimer = SKILL_CONSTANTS.PATH_SAMPLE_INTERVAL;
      }
      if (ss.timeAnchorLeft <= 0) {
        ss.timePath = undefined; ss.timeAnchorLeft = undefined; ss.pathSampleTimer = undefined;
        char.skillChargeRate = 100 / SKILL_CONSTANTS.FIRST_CAST_COOLDOWN;
      }
    }
    if (ss.isRewinding && ss.timePath && ss.rewindProgress !== undefined) {
      ss.rewindProgress += dt / SKILL_CONSTANTS.REWIND_DURATION;
      const index = Math.max(0, Math.floor((1 - Math.min(ss.rewindProgress, 1)) * (ss.timePath.length - 1)));
      const point = ss.timePath[index];
      char.x = point.x; char.y = point.y; char.hp = Math.min(char.maxHp, point.hp); char.vx = 0; char.vy = 0;
      ctx.characters.forEach((target) => {
        if (target.isDead || !isEnemy(char, target) || ss.rewindHitIds?.includes(target.id)) return;
        if (Math.hypot(target.x - char.x, target.y - char.y) <= target.radius + char.radius + SKILL_CONSTANTS.HIT_RADIUS_PADDING) {
          ss.rewindHitIds?.push(target.id);
          ctx.dealDamage(char, target, SKILL_CONSTANTS.REWIND_DAMAGE, '🌀 시간 충돌');
        }
      });
      if (ss.rewindProgress >= 1) {
        const departurePoint = ss.timePath[1];
        const returnPoint = ss.timePath[0];
        const hits = ss.rewindHitIds?.length ?? 0;
        ss.temporalBuffStacks = Math.min(hits, SKILL_CONSTANTS.MAX_BUFF_STACKS);
        ss.temporalBuffLeft = ss.temporalBuffStacks > 0 ? SKILL_CONSTANTS.BUFF_DURATION : 0;
        if (ss.temporalBuffStacks > 0) char.speed *= 1 + ss.temporalBuffStacks * SKILL_CONSTANTS.SPEED_BONUS_PER_STACK;
        ctx.characters.forEach((target) => {
          if (target.isDead || !isEnemy(char, target)) return;
          const distance = Math.hypot(target.x - returnPoint.x, target.y - returnPoint.y);
          if (distance > SKILL_CONSTANTS.RETURN_SHOCKWAVE_RADIUS + target.radius) return;
          ctx.dealDamage(char, target, SKILL_CONSTANTS.RETURN_SHOCKWAVE_DAMAGE, '💥 시간 역행 충격파');
          const angle = Math.atan2(target.y - returnPoint.y, target.x - returnPoint.x);
          target.vx = Math.cos(angle) * SKILL_CONSTANTS.RETURN_SHOCKWAVE_KNOCKBACK;
          target.vy = Math.sin(angle) * SKILL_CONSTANTS.RETURN_SHOCKWAVE_KNOCKBACK;
        });
        ss.returnShockwave = {
          x: returnPoint.x,
          y: returnPoint.y,
          timeLeft: SKILL_CONSTANTS.RETURN_SHOCKWAVE_VISUAL_DURATION,
        };
        ctx.createExplosion(returnPoint.x, returnPoint.y, char.color, 26);
        ctx.addFloatingText(returnPoint.x, returnPoint.y - 58, '💥 시간 충격파!', char.color, 1.1);
        const resumeAngle = departurePoint
          ? Math.atan2(departurePoint.y - returnPoint.y, departurePoint.x - returnPoint.x)
          : Math.random() * Math.PI * 2;
        const resumeSpeed = SKILL_CONSTANTS.RESUME_SPEED_MULTIPLIER * char.speed;
        char.vx = Math.cos(resumeAngle) * resumeSpeed;
        char.vy = Math.sin(resumeAngle) * resumeSpeed;
        ss.timePath = undefined; ss.timeAnchorLeft = undefined; ss.pathSampleTimer = undefined; ss.isRewinding = false; char.skillActive = false; char.isCcImmune = false;
        char.skillChargeRate = 100 / SKILL_CONSTANTS.FIRST_CAST_COOLDOWN;
      }
    }
    if (ss.returnShockwave) {
      ss.returnShockwave.timeLeft -= dt;
      if (ss.returnShockwave.timeLeft <= 0) ss.returnShockwave = undefined;
    }
    if ((ss.temporalBuffLeft ?? 0) > 0) {
      ss.temporalBuffLeft! -= dt;
      if (ss.temporalBuffLeft! <= 0 && (ss.temporalBuffStacks ?? 0) > 0) {
        char.speed /= 1 + ss.temporalBuffStacks! * SKILL_CONSTANTS.SPEED_BONUS_PER_STACK;
        ss.temporalBuffStacks = 0;
      }
    }
    if (ss.isRewinding) { char.isStunned = false; char.isCharmed = false; char.isPoisoned = false; char.isConfused = false; }
  },
  // #endregion UPDATE

  // ═══════════════════════════════════════════
  // #region DAMAGE
  // ═══════════════════════════════════════════
  onTakeDamage(target: CharacterState, _attacker: CharacterState, damage: number) {
    return { finalDamage: damage, blocked: !!(target as SeojunState).isRewinding };
  },
  onDealDamage(attacker: CharacterState, _target: CharacterState, damage: number) {
    const stacks = (attacker as SeojunState).temporalBuffStacks ?? 0;
    return damage * (1 + stacks * SKILL_CONSTANTS.ATTACK_BONUS_PER_STACK);
  },
  // #endregion DAMAGE

  // ═══════════════════════════════════════════
  // #region RENDER
  // ═══════════════════════════════════════════
  onRenderExtra(char: CharacterState, canvasCtx: CanvasRenderingContext2D) {
    const ss = char as SeojunState;
    canvasCtx.save();
    if (ss.returnShockwave) {
      const progress = 1 - ss.returnShockwave.timeLeft / SKILL_CONSTANTS.RETURN_SHOCKWAVE_VISUAL_DURATION;
      for (let ring = 0; ring < SKILL_CONSTANTS.RETURN_SHOCKWAVE_RING_COUNT; ring++) {
        const ringProgress = progress - ring * 0.16;
        if (ringProgress < 0 || ringProgress > 1) continue;
        canvasCtx.globalAlpha = (1 - ringProgress) * 0.82;
        canvasCtx.strokeStyle = '#b7fbff';
        canvasCtx.lineWidth = 5 - ring * 0.8;
        canvasCtx.beginPath();
        canvasCtx.arc(ss.returnShockwave.x, ss.returnShockwave.y, 14 + ringProgress * SKILL_CONSTANTS.RETURN_SHOCKWAVE_RADIUS, 0, Math.PI * 2);
        canvasCtx.stroke();
      }
    }
    if (ss.timePath && ss.timePath.length > 0) {
      canvasCtx.strokeStyle = char.color; canvasCtx.globalAlpha = 0.65; canvasCtx.lineWidth = 2;
      canvasCtx.beginPath(); canvasCtx.moveTo(ss.timePath[0].x, ss.timePath[0].y);
      ss.timePath.forEach((point) => canvasCtx.lineTo(point.x, point.y)); canvasCtx.stroke();
      const anchor = ss.timePath[0]; canvasCtx.beginPath(); canvasCtx.arc(anchor.x, anchor.y, char.radius * 0.6, 0, Math.PI * 2); canvasCtx.stroke();
    }
    canvasCtx.restore();
  },
  isTargetable: (char) => !(char as SeojunState).isRewinding,
  canUseSkillWhileCc: true,
  // #endregion RENDER
};
