import type { CharacterBehaviorContext, CharacterConfig, CharacterState } from '../character.interface';

// ═══════════════════════════════════════════
// #region TYPES
// ═══════════════════════════════════════════
interface BlockPoint { x: number; y: number; timeLeft: number; damage: number; radius: number; enhanced: boolean; }
interface JunseokState extends CharacterState { operationData?: number; blockPoints?: BlockPoint[]; }
// #endregion TYPES

// ═══════════════════════════════════════════
// #region CONSTANTS
// ═══════════════════════════════════════════
const SKILL_CONSTANTS = {
  MAX_HP: 125,
  SPEED: 1.35,
  ATTACK_POWER: 12,
  ATTACK_RANGE: 52,
  COOLDOWN: 6,
  MAX_OPERATION_DATA: 3,
  BASE_BLOCK_COUNT: 2,
  ENHANCED_BLOCK_COUNT: 3,
  BLOCK_DELAY: 0.7,
  BLOCK_INTERVAL: 0.42,
  PREDICTION_SECONDS: 0.42,
  BASE_DAMAGE: 18,
  ENHANCED_DAMAGE: 30,
  BASE_RADIUS: 58,
  ENHANCED_RADIUS: 86,
  BASE_KNOCKBACK: 5.5,
  ENHANCED_KNOCKBACK: 9,
  SLOW_DURATION: 0.5,
  SLOW_MULTIPLIER: 0.65,
};
// #endregion CONSTANTS

// ═══════════════════════════════════════════
// #region HELPERS
// ═══════════════════════════════════════════
function isEnemy(first: CharacterState, second: CharacterState) {
  return first.teamId === undefined || second.teamId === undefined || first.teamId !== second.teamId;
}

function nearestEnemy(char: CharacterState, ctx: CharacterBehaviorContext) {
  return ctx.characters
    .filter((candidate) => !candidate.isDead && candidate.id !== char.id && isEnemy(char, candidate))
    .sort((first, second) => Math.hypot(first.x - char.x, first.y - char.y) - Math.hypot(second.x - char.x, second.y - char.y))[0];
}
// #endregion HELPERS

// ═══════════════════════════════════════════
// #region CONFIG
// ═══════════════════════════════════════════
export const junseokConfig: CharacterConfig = {
  id: 'junseok', name: '준석', maxHp: SKILL_CONSTANTS.MAX_HP, speed: SKILL_CONSTANTS.SPEED,
  attackPower: SKILL_CONSTANTS.ATTACK_POWER, defense: 7, baseAttackRange: SKILL_CONSTANTS.ATTACK_RANGE,
  skillName: '작전명: 차단',
  skillDescription: `가장 가까운 적의 예상 이동 경로에 차단 폭발을 설치합니다. 기본은 ${SKILL_CONSTANTS.BASE_BLOCK_COUNT}회 폭발(각 ${SKILL_CONSTANTS.BASE_DAMAGE} 피해)이며, 작전 자료 ${SKILL_CONSTANTS.MAX_OPERATION_DATA}스택이면 마지막 포위 폭발이 ${SKILL_CONSTANTS.ENHANCED_DAMAGE} 피해로 강화됩니다.`,
  color: '#7dd3fc', skillChargeRate: 100 / SKILL_CONSTANTS.COOLDOWN, tier: 'A', role: 'Specialist',
  detailedDescription: '해병대 작전병 출신 준석은 평타로 작전 자료를 축적한 뒤, 적의 진행 방향을 예측해 차단 폭발을 배치하는 준비형 전술가입니다.',
// #endregion CONFIG

  // ═══════════════════════════════════════════
  // #region SKILL_TRIGGER
  // ═══════════════════════════════════════════
  onSkillTrigger(char, ctx) {
    const state = char as JunseokState;
    const target = nearestEnemy(char, ctx);
    state.blockPoints ??= [];
    if (!target) { char.skillActive = false; return; }
    const enhanced = (state.operationData ?? 0) >= SKILL_CONSTANTS.MAX_OPERATION_DATA;
    const count = enhanced ? SKILL_CONSTANTS.ENHANCED_BLOCK_COUNT : SKILL_CONSTANTS.BASE_BLOCK_COUNT;
    const velocityLength = Math.hypot(target.vx, target.vy);
    const directionX = velocityLength > 0.2 ? target.vx / velocityLength : (target.x - char.x) / (Math.hypot(target.x - char.x, target.y - char.y) || 1);
    const directionY = velocityLength > 0.2 ? target.vy / velocityLength : (target.y - char.y) / (Math.hypot(target.x - char.x, target.y - char.y) || 1);
    for (let index = 0; index < count; index += 1) {
      const futureSeconds = SKILL_CONSTANTS.PREDICTION_SECONDS + index * SKILL_CONSTANTS.BLOCK_INTERVAL;
      const finalBlast = enhanced && index === count - 1;
      state.blockPoints.push({
        x: target.x + directionX * velocityLength * futureSeconds * 60,
        y: target.y + directionY * velocityLength * futureSeconds * 60,
        timeLeft: SKILL_CONSTANTS.BLOCK_DELAY + index * SKILL_CONSTANTS.BLOCK_INTERVAL,
        damage: finalBlast ? SKILL_CONSTANTS.ENHANCED_DAMAGE : SKILL_CONSTANTS.BASE_DAMAGE,
        radius: finalBlast ? SKILL_CONSTANTS.ENHANCED_RADIUS : SKILL_CONSTANTS.BASE_RADIUS,
        enhanced: finalBlast,
      });
    }
    if (enhanced) state.operationData = 0;
    char.skillDurationLeft = SKILL_CONSTANTS.BLOCK_DELAY + (count - 1) * SKILL_CONSTANTS.BLOCK_INTERVAL;
    ctx.addFloatingText(char.x, char.y - 58, enhanced ? '🎯 작전명: 포위!' : '📍 작전명: 차단!', char.color, 1.2);
  },
  // #endregion SKILL_TRIGGER

  // ═══════════════════════════════════════════
  // #region UPDATE
  // ═══════════════════════════════════════════
  onUpdate(char, dt, ctx) {
    const state = char as JunseokState;
    state.blockPoints ??= [];
    state.blockPoints.forEach((point) => {
      point.timeLeft -= dt;
      if (point.timeLeft > 0) return;
      ctx.characters.forEach((target) => {
        if (target.isDead || target.id === char.id || !isEnemy(char, target) || Math.hypot(target.x - point.x, target.y - point.y) > point.radius + target.radius) return;
        ctx.dealDamage(char, target, point.damage, point.enhanced ? '🎯 포위 폭발' : '📍 차단 폭발');
        const angle = Math.atan2(target.y - point.y, target.x - point.x);
        const force = point.enhanced ? SKILL_CONSTANTS.ENHANCED_KNOCKBACK : SKILL_CONSTANTS.BASE_KNOCKBACK;
        target.vx += Math.cos(angle) * force;
        target.vy += Math.sin(angle) * force;
        (target as CharacterState & { junseokSlowLeft?: number; junseokSlowBaseSpeed?: number }).junseokSlowLeft = SKILL_CONSTANTS.SLOW_DURATION;
        (target as CharacterState & { junseokSlowLeft?: number; junseokSlowBaseSpeed?: number }).junseokSlowBaseSpeed ??= target.speed;
        target.speed = Math.min(target.speed, target.speed * SKILL_CONSTANTS.SLOW_MULTIPLIER);
      });
      ctx.createExplosion(point.x, point.y, point.enhanced ? '#facc15' : char.color, point.enhanced ? 26 : 14);
    });
    state.blockPoints = state.blockPoints.filter((point) => point.timeLeft > 0);
    ctx.characters.forEach((target) => {
      const slowed = target as CharacterState & { junseokSlowLeft?: number; junseokSlowBaseSpeed?: number };
      if ((slowed.junseokSlowLeft ?? 0) <= 0) return;
      slowed.junseokSlowLeft! -= dt;
      if (slowed.junseokSlowLeft! <= 0) { target.speed = slowed.junseokSlowBaseSpeed ?? target.speed; slowed.junseokSlowBaseSpeed = undefined; }
    });
    if (char.skillActive && state.blockPoints.length === 0) char.skillActive = false;
  },
  // #endregion UPDATE

  // ═══════════════════════════════════════════
  // #region BASIC_ATTACK
  // ═══════════════════════════════════════════
  onBasicAttack(char, target, ctx) {
    const state = char as JunseokState;
    state.operationData = Math.min(SKILL_CONSTANTS.MAX_OPERATION_DATA, (state.operationData ?? 0) + 1);
    ctx.addFloatingText(char.x, char.y - 42, `📋 자료 ${state.operationData}/${SKILL_CONSTANTS.MAX_OPERATION_DATA}`, char.color, 0.8);
    if (state.operationData === SKILL_CONSTANTS.MAX_OPERATION_DATA) ctx.addFloatingText(target.x, target.y - 50, '🎯 포위 준비 완료', '#facc15', 1);
  },
  // #endregion BASIC_ATTACK

  // ═══════════════════════════════════════════
  // #region COLLISION
  // ═══════════════════════════════════════════
  onCollisionWithTarget() {},
  // #endregion COLLISION

  // ═══════════════════════════════════════════
  // #region DAMAGE
  // ═══════════════════════════════════════════
  onTakeDamage(_target, _attacker, damage) { return { finalDamage: damage, blocked: false }; },
  // #endregion DAMAGE

  // ═══════════════════════════════════════════
  // #region DEATH
  // ═══════════════════════════════════════════
  onDeath(char) { (char as JunseokState).blockPoints = []; },
  // #endregion DEATH

  // ═══════════════════════════════════════════
  // #region RENDER
  // ═══════════════════════════════════════════
  onRenderExtra(char, canvasCtx, currentRadius) {
    const state = char as JunseokState;
    canvasCtx.save();
    canvasCtx.strokeStyle = (state.operationData ?? 0) >= SKILL_CONSTANTS.MAX_OPERATION_DATA ? '#facc15' : char.color;
    canvasCtx.lineWidth = 3;
    canvasCtx.beginPath(); canvasCtx.arc(char.x, char.y, currentRadius + 8, 0, Math.PI * 2); canvasCtx.stroke();
    state.blockPoints?.forEach((point) => {
      canvasCtx.strokeStyle = point.enhanced ? '#facc15' : '#7dd3fc';
      canvasCtx.lineWidth = point.enhanced ? 4 : 2;
      canvasCtx.setLineDash([7, 5]); canvasCtx.beginPath(); canvasCtx.arc(point.x, point.y, point.radius, 0, Math.PI * 2); canvasCtx.stroke(); canvasCtx.setLineDash([]);
    });
    canvasCtx.restore();
  },
  // #endregion RENDER
};
