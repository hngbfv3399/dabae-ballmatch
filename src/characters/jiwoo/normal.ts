import type { CharacterBehaviorContext, CharacterConfig, CharacterState } from '../character.interface';

// ═══════════════════════════════════════════
// #region TYPES
// ═══════════════════════════════════════════
interface JiwooState extends CharacterState {
  vanityPassiveUsed?: boolean;
  vanityReturnX?: number;
  vanityReturnY?: number;
  vanityAttackers?: { id: string; at: number }[];
  vanityReflectedAttackerIds?: string[];
}
// #endregion TYPES

// ═══════════════════════════════════════════
// #region CONSTANTS
// ═══════════════════════════════════════════
const SKILL_CONSTANTS = {
  COOLDOWN: 8,
  PASSIVE_THRESHOLD_RATIO: 0.15,
  PASSIVE_HEAL_RATIO: 0.4,
  VANITY_DURATION: 2,
  RETURN_DAMAGE: 20,
  RETURN_RADIUS: 120,
  CONFUSION_DURATION: 1,
  CONFUSION_REROLL_INTERVAL: 0.2,
  ATTACKER_MEMORY_DURATION_MS: 3000,
  TELEPORT_MARGIN: 12,
  TELEPORT_DAMAGE: 10,
  FRACTURE_DURATION: 3,
  FRACTURE_BASIC_ATTACK_DAMAGE: 14,
  REFLECT_DAMAGE_RATIO: 1,
};
// #endregion CONSTANTS

// ═══════════════════════════════════════════
// #region HELPERS
// ═══════════════════════════════════════════
function isEnemy(first: CharacterState, second: CharacterState): boolean {
  return first.teamId === undefined || second.teamId === undefined || first.teamId !== second.teamId;
}

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
  skillDescription: `패시브: HP ${SKILL_CONSTANTS.PASSIVE_THRESHOLD_RATIO * 100}% 이하가 될 피해를 처음 받을 때 HP를 ${SKILL_CONSTANTS.PASSIVE_HEAL_RATIO * 100}%까지 회복하고 모든 디버프를 해제합니다. 액티브: ${SKILL_CONSTANTS.VANITY_DURATION}초간 무적 상태가 되며, 지우를 공격한 적에게 받은 피해의 ${SKILL_CONSTANTS.REFLECT_DAMAGE_RATIO * 100}%를 1회 반사합니다. 종료 후 원래 위치로 돌아와 반경 ${SKILL_CONSTANTS.RETURN_RADIUS} 내 적에게 ${SKILL_CONSTANTS.RETURN_DAMAGE} 피해와 ${SKILL_CONSTANTS.CONFUSION_DURATION}초 혼란을 부여합니다. 피격 적은 ${SKILL_CONSTANTS.FRACTURE_DURATION}초간 현실 균열 상태가 되며, 지우의 다음 평타에 ${SKILL_CONSTANTS.FRACTURE_BASIC_ATTACK_DAMAGE} 추가 정신 피해를 받습니다.`,
  color: '#b38cff', skillChargeRate: 100 / SKILL_CONSTANTS.COOLDOWN, tier: 'A', role: 'Disabler',
  detailedDescription: '지우는 죽음 직전 현실을 부정하고, 허상으로 사라졌다가 원점으로 되돌아와 적의 판단을 무너뜨리는 교란형 마법사입니다.',
// #endregion CONFIG

  // ═══════════════════════════════════════════
  // #region SKILL_TRIGGER
  // ═══════════════════════════════════════════
  onSkillTrigger(char: CharacterState, ctx: CharacterBehaviorContext) {
    const js = char as JiwooState;
    js.vanityReturnX = char.x; js.vanityReturnY = char.y;
    js.vanityAttackers = [];
    js.vanityReflectedAttackerIds = [];
    char.skillActive = true; char.skillDurationLeft = SKILL_CONSTANTS.VANITY_DURATION;
    clearDebuffs(char);
    char.isCcImmune = true;
    ctx.addFloatingText(char.x, char.y - 55, '🪞 허식', char.color, 1.4);
  },
  // #endregion SKILL_TRIGGER

  // ═══════════════════════════════════════════
  // #region UPDATE
  // ═══════════════════════════════════════════
  onUpdate(char: CharacterState, dt: number, ctx: CharacterBehaviorContext) {
    const js = char as JiwooState;
    ctx.characters.forEach((target) => {
      const markedTarget = target as CharacterState & { jiwooFractureTimeLeft?: number; jiwooFractureSourceId?: string };
      if (markedTarget.jiwooFractureSourceId !== char.id) return;
      markedTarget.jiwooFractureTimeLeft = (markedTarget.jiwooFractureTimeLeft ?? 0) - dt;
      if (markedTarget.jiwooFractureTimeLeft <= 0) {
        markedTarget.jiwooFractureTimeLeft = 0;
        markedTarget.jiwooFractureSourceId = undefined;
      }
    });
    if (!char.skillActive) return;
    char.skillDurationLeft -= dt;
    clearDebuffs(char);
    if (char.skillDurationLeft > 0) return;

    char.x = js.vanityReturnX ?? char.x; char.y = js.vanityReturnY ?? char.y;
    const now = Date.now();
    ctx.characters.forEach((target) => {
      if (target.isDead || !isEnemy(char, target)) return;
      if (Math.hypot(target.x - char.x, target.y - char.y) <= SKILL_CONSTANTS.RETURN_RADIUS) {
        ctx.dealDamage(char, target, SKILL_CONSTANTS.RETURN_DAMAGE, '🪞 현실 붕괴');
        ctx.applyConfusion(target, SKILL_CONSTANTS.CONFUSION_DURATION, SKILL_CONSTANTS.CONFUSION_REROLL_INTERVAL);
        const markedTarget = target as CharacterState & { jiwooFractureTimeLeft?: number; jiwooFractureSourceId?: string };
        markedTarget.jiwooFractureTimeLeft = SKILL_CONSTANTS.FRACTURE_DURATION;
        markedTarget.jiwooFractureSourceId = char.id;
        ctx.addFloatingText(target.x, target.y - 55, '🪞 현실 균열', char.color, 1);
      }
    });
    const attacker = (js.vanityAttackers ?? [])
      .filter((entry) => now - entry.at <= SKILL_CONSTANTS.ATTACKER_MEMORY_DURATION_MS)
      .map((entry) => ctx.characters.find((target) => target.id === entry.id))
      .filter((target): target is CharacterState => !!target && !target.isDead && isEnemy(char, target))
      .sort((first, second) => Math.hypot(first.x - char.x, first.y - char.y) - Math.hypot(second.x - char.x, second.y - char.y))[0];
    if (attacker) {
      ctx.dealDamage(char, attacker, SKILL_CONSTANTS.TELEPORT_DAMAGE, '🪞 허상 전이');
      attacker.x = attacker.radius + SKILL_CONSTANTS.TELEPORT_MARGIN + Math.random() * (ctx.arenaWidth - (attacker.radius + SKILL_CONSTANTS.TELEPORT_MARGIN) * 2);
      attacker.y = attacker.radius + SKILL_CONSTANTS.TELEPORT_MARGIN + Math.random() * (ctx.arenaHeight - (attacker.radius + SKILL_CONSTANTS.TELEPORT_MARGIN) * 2);
      ctx.addFloatingText(attacker.x, attacker.y - 35, '🪞 허상 전이', char.color, 1);
    }
    char.skillActive = false;
    char.isCcImmune = false;
    js.vanityAttackers = [];
  },
  // #endregion UPDATE

  // ═══════════════════════════════════════════
  // #region DAMAGE
  // ═══════════════════════════════════════════
  onTakeDamage(target: CharacterState, attacker: CharacterState, damage: number, ctx: CharacterBehaviorContext) {
    const js = target as JiwooState;
    if (target.skillActive) {
      js.vanityAttackers ??= [];
      js.vanityAttackers.push({ id: attacker.id, at: Date.now() });
      js.vanityReflectedAttackerIds ??= [];
      if (!js.vanityReflectedAttackerIds.includes(attacker.id)) {
        js.vanityReflectedAttackerIds.push(attacker.id);
        ctx.dealDamage(target, attacker, damage * SKILL_CONSTANTS.REFLECT_DAMAGE_RATIO, '🪞 허식 반사');
        ctx.addFloatingText(attacker.x, attacker.y - 50, '🪞 반사!', target.color, 1);
      }
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

  // ═══════════════════════════════════════════
  // #region BASIC_ATTACK
  // ═══════════════════════════════════════════
  onBasicAttack(char: CharacterState, target: CharacterState, ctx: CharacterBehaviorContext) {
    const markedTarget = target as CharacterState & { jiwooFractureTimeLeft?: number; jiwooFractureSourceId?: string };
    if (markedTarget.jiwooFractureSourceId !== char.id || (markedTarget.jiwooFractureTimeLeft ?? 0) <= 0) return;
    markedTarget.jiwooFractureTimeLeft = 0;
    markedTarget.jiwooFractureSourceId = undefined;
    ctx.dealDamage(char, target, SKILL_CONSTANTS.FRACTURE_BASIC_ATTACK_DAMAGE, '🪞 균열 파열');
    ctx.addFloatingText(target.x, target.y - 60, '💥 균열 파열!', char.color, 1);
  },
  // #endregion BASIC_ATTACK

  // ═══════════════════════════════════════════
  // #region RENDER
  // ═══════════════════════════════════════════
  onPreRender(char: CharacterState, canvasCtx: CanvasRenderingContext2D) {
    if (char.skillActive) canvasCtx.globalAlpha = 0.35;
  },
  isTargetable: (char) => !char.skillActive,
  // #endregion RENDER
};
