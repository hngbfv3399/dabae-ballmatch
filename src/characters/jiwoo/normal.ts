import type { CharacterBehaviorContext, CharacterConfig, CharacterState } from '../character.interface';

// ═══════════════════════════════════════════
// #region TYPES
// ═══════════════════════════════════════════
interface JiwooState extends CharacterState {
  vanityPassiveUsed?: boolean;
  vanityReturnX?: number;
  vanityReturnY?: number;
}
// #endregion TYPES

// ═══════════════════════════════════════════
// #region CONSTANTS
// ═══════════════════════════════════════════
const SKILL_CONSTANTS = {
  COOLDOWN: 8,
  PASSIVE_THRESHOLD_RATIO: 0.15,
  PASSIVE_HEAL_RATIO: 0.4,
  VANITY_DURATION: 3,
  REFLECT_DAMAGE_RATIO: 1,
};
// #endregion CONSTANTS

// ═══════════════════════════════════════════
// #region HELPERS
// ═══════════════════════════════════════════
function clearDebuffs(char: CharacterState): void {
  char.isStunned = false; char.stunTimeLeft = 0;
  char.isCharmed = false; char.charmTimeLeft = 0;
  char.isPoisoned = false; char.poisonTimeLeft = 0;
  char.isConfused = false; char.confusedTimeLeft = 0;
  char.nayutaControlled = false; char.nayutaControlTimeLeft = 0;
}
// #endregion HELPERS

// ═══════════════════════════════════════════
// #region CONFIG
// ═══════════════════════════════════════════
export const jiwooConfig: CharacterConfig = {
  id: 'jiwoo', name: '지우', maxHp: 130, speed: 1.4, attackPower: 12, baseAttackRange: 48,
  skillName: '허식 (Vanity)',
  skillDescription: `패시브: HP ${SKILL_CONSTANTS.PASSIVE_THRESHOLD_RATIO * 100}% 이하가 될 피해를 처음 받을 때 HP를 ${SKILL_CONSTANTS.PASSIVE_HEAL_RATIO * 100}%까지 회복하고 모든 디버프를 해제합니다. 액티브: ${SKILL_CONSTANTS.VANITY_DURATION}초간 지우의 허상이 남습니다. 적은 허상을 정상적으로 공격하지만 지우는 피해를 전부 무시하며, 허상이 받은 피해의 ${SKILL_CONSTANTS.REFLECT_DAMAGE_RATIO * 100}%를 공격자에게 즉시 되돌립니다.`,
  color: '#b38cff', skillChargeRate: 100 / SKILL_CONSTANTS.COOLDOWN, tier: 'A', role: 'Disabler',
  detailedDescription: '지우는 죽음 직전 현실을 부정하고, 허상으로 사라졌다가 원점으로 되돌아와 적의 판단을 무너뜨리는 교란형 마법사입니다.',
// #endregion CONFIG

  // ═══════════════════════════════════════════
  // #region SKILL_TRIGGER
  // ═══════════════════════════════════════════
  onSkillTrigger(char: CharacterState, ctx: CharacterBehaviorContext) {
    const js = char as JiwooState;
    js.vanityReturnX = char.x; js.vanityReturnY = char.y;
    char.skillActive = true; char.skillDurationLeft = SKILL_CONSTANTS.VANITY_DURATION;
    clearDebuffs(char);
    char.isCcImmune = true;
    ctx.addFloatingText(char.x, char.y - 55, '🪞 허식', char.color, 1.4);
  },
  // #endregion SKILL_TRIGGER

  // ═══════════════════════════════════════════
  // #region UPDATE
  // ═══════════════════════════════════════════
  onUpdate(char: CharacterState, dt: number) {
    const js = char as JiwooState;
    if (!char.skillActive) return;
    char.skillDurationLeft -= dt;
    clearDebuffs(char);
    if (char.skillDurationLeft > 0) return;

    char.x = js.vanityReturnX ?? char.x; char.y = js.vanityReturnY ?? char.y;
    char.skillActive = false;
    char.isCcImmune = false;
  },
  // #endregion UPDATE

  // ═══════════════════════════════════════════
  // #region DAMAGE
  // ═══════════════════════════════════════════
  onTakeDamage(target: CharacterState, attacker: CharacterState, damage: number, ctx: CharacterBehaviorContext) {
    const js = target as JiwooState;
    if (target.skillActive) {
      ctx.dealDamage(target, attacker, damage * SKILL_CONSTANTS.REFLECT_DAMAGE_RATIO, '🪞 허식 반사');
      ctx.addFloatingText(attacker.x, attacker.y - 50, `🪞 ${Math.round(damage)} 반사!`, target.color, 1);
      return { finalDamage: damage, blocked: true };
    }
    if (!js.vanityPassiveUsed && target.hp - damage <= target.maxHp * SKILL_CONSTANTS.PASSIVE_THRESHOLD_RATIO) {
      js.vanityPassiveUsed = true;
      target.hp = target.maxHp * SKILL_CONSTANTS.PASSIVE_HEAL_RATIO;
      clearDebuffs(target);
      ctx.addFloatingText(target.x, target.y - 55, '🪞 현실 부정!', target.color, 1.4);
      return { finalDamage: damage, blocked: true };
    }
    return { finalDamage: damage, blocked: false };
  },
  // #endregion DAMAGE

  onReceiveCrowdControl(target, source, type, duration, ctx) {
    const js = target as JiwooState;
    if (!js.skillActive) return false;
    if (type === 'stun') ctx.applyStun(target, source, duration, true);
    if (type === 'confusion') ctx.applyConfusion(target, source, duration, 0.2, true);
    if (type === 'charm') ctx.applyCharm(target, source, duration, true);
    if (type === 'domination') ctx.applyDomination(target, source, duration, true);
    ctx.addFloatingText(source.x, source.y - 52, `🪞 ${type.toUpperCase()} 반사!`, target.color, 1);
    return true;
  },

  // ═══════════════════════════════════════════
  // #region RENDER
  // ═══════════════════════════════════════════
  onPreRender(char: CharacterState, canvasCtx: CanvasRenderingContext2D) {
    if (char.skillActive) canvasCtx.globalAlpha = 0.42;
  },
  onRenderExtra(char: CharacterState, canvasCtx: CanvasRenderingContext2D, currentRadius: number) {
    if (!char.skillActive) return;
    canvasCtx.save();
    canvasCtx.strokeStyle = '#f0d9ff';
    canvasCtx.globalAlpha = 0.72;
    canvasCtx.lineWidth = 2;
    canvasCtx.setLineDash([6, 5]);
    canvasCtx.beginPath();
    canvasCtx.arc(char.x, char.y, currentRadius + 8 + Math.sin(Date.now() / 90) * 4, 0, Math.PI * 2);
    canvasCtx.stroke();
    canvasCtx.setLineDash([]);
    canvasCtx.font = 'bold 12px Orbit';
    canvasCtx.textAlign = 'center';
    canvasCtx.fillStyle = '#f0d9ff';
    canvasCtx.fillText('ILLUSION', char.x, char.y - currentRadius - 16);
    canvasCtx.restore();
  },
  // #endregion RENDER
};
