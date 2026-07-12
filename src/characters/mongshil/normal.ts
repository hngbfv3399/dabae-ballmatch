import type { CharacterBehaviorContext, CharacterConfig, CharacterState } from '../character.interface';

// ═══════════════════════════════════════════
// #region TYPES
// ═══════════════════════════════════════════
interface MagicResidue {
  x: number;
  y: number;
  timeLeft: number;
  affectedIds: string[];
}

interface ToxicBottle {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  hasLanded: boolean;
}

interface MongshilState extends CharacterState {
  magicResidues?: MagicResidue[];
  toxicBottles?: ToxicBottle[];
}
// #endregion TYPES

// ═══════════════════════════════════════════
// #region CONSTANTS
// ═══════════════════════════════════════════
const SKILL_CONSTANTS = {
  COOLDOWN: 6,
  HEAT_CHANCE: 0.35,
  HEAT_DURATION: 3,
  HEAT_DAMAGE_PER_SECOND: 5,
  RESIDUE_COUNT: 3,
  RESIDUE_LIFETIME: 5,
  RESIDUE_RADIUS: 82,
  RESIDUE_ENEMY_DAMAGE: 10,
  RESIDUE_ALLY_HEAL: 8,
  RESIDUE_SPREAD: 52,
  PROJECTILE_SPEED: 13,
  PROJECTILE_HIT_DISTANCE: 10,
};
// #endregion CONSTANTS

// ═══════════════════════════════════════════
// #region HELPERS
// ═══════════════════════════════════════════
function isAlly(first: CharacterState, second: CharacterState): boolean {
  return first.teamId !== undefined && second.teamId !== undefined && first.teamId === second.teamId;
}
// #endregion HELPERS

// ═══════════════════════════════════════════
// #region CONFIG
// ═══════════════════════════════════════════
export const mongshilConfig: CharacterConfig = {
  id: 'mongshil',
  name: '몽실',
  maxHp: 145,
  speed: 1.35,
  attackPower: 13,
  baseAttackRange: 50,
  skillName: '독성 잔향',
  skillDescription: `${SKILL_CONSTANTS.COOLDOWN}초마다 가장 가까운 적의 위치로 독성 물질을 투척합니다. 착탄 지점에는 ${SKILL_CONSTANTS.RESIDUE_LIFETIME}초간 독성 잔상 ${SKILL_CONSTANTS.RESIDUE_COUNT}개가 남습니다. 적은 잔상당 ${SKILL_CONSTANTS.RESIDUE_ENEMY_DAMAGE} 피해를 받고, 아군은 ${SKILL_CONSTANTS.RESIDUE_ALLY_HEAL} 회복합니다. 패시브: 평타 적중 시 ${SKILL_CONSTANTS.HEAT_CHANCE * 100}% 확률로 ${SKILL_CONSTANTS.HEAT_DURATION}초간 초당 ${SKILL_CONSTANTS.HEAT_DAMAGE_PER_SECOND} 열기 피해를 줍니다.`,
  color: '#FEE500',
  skillChargeRate: 100 / SKILL_CONSTANTS.COOLDOWN,
  tier: 'B',
  role: 'Specialist',
  detailedDescription: '몽실은 근거리에서 매직기의 열기를 누적시키고, 독성 잔상으로 전장의 길목을 장악하는 미용인 마법사입니다. 팀전에서는 아군의 이동 경로에 회복 잔상을 남길 수 있습니다.',
// #endregion CONFIG

  // ═══════════════════════════════════════════
  // #region SKILL_TRIGGER
  // ═══════════════════════════════════════════
  onSkillTrigger(char: CharacterState, ctx: CharacterBehaviorContext) {
    const ms = char as MongshilState;
    ms.magicResidues ??= [];
    ms.toxicBottles ??= [];
    char.skillActive = false;
    const target = ctx.characters
      .filter((candidate) => !candidate.isDead && candidate.id !== char.id && !isAlly(char, candidate))
      .sort((first, second) => Math.hypot(first.x - char.x, first.y - char.y) - Math.hypot(second.x - char.x, second.y - char.y))[0];
    if (!target) return;
    ms.toxicBottles.push({ x: char.x, y: char.y, targetX: target.x, targetY: target.y, hasLanded: false });
    ctx.addFloatingText(char.x, char.y - 55, '🧪 독성 물질 투척!', char.color, 1.4);
    ctx.logMessage?.(`🧪 [독성 투척] 몽실이 ${target.name} 방향으로 독성 물질을 던졌습니다.`, 'skill');
  },
  // #endregion SKILL_TRIGGER

  // ═══════════════════════════════════════════
  // #region UPDATE
  // ═══════════════════════════════════════════
  onUpdate(char: CharacterState, dt: number, ctx: CharacterBehaviorContext) {
    const ms = char as MongshilState;
    ms.magicResidues ??= [];
    ms.toxicBottles ??= [];

    ms.toxicBottles.forEach((bottle) => {
      if (bottle.hasLanded) return;
      const dx = bottle.targetX - bottle.x;
      const dy = bottle.targetY - bottle.y;
      const distance = Math.hypot(dx, dy);
      if (distance > SKILL_CONSTANTS.PROJECTILE_HIT_DISTANCE) {
        bottle.x += (dx / distance) * SKILL_CONSTANTS.PROJECTILE_SPEED * dt * 60;
        bottle.y += (dy / distance) * SKILL_CONSTANTS.PROJECTILE_SPEED * dt * 60;
        return;
      }
      for (let index = 0; index < SKILL_CONSTANTS.RESIDUE_COUNT; index++) {
        const angle = (index / SKILL_CONSTANTS.RESIDUE_COUNT) * Math.PI * 2;
        ms.magicResidues!.push({
          x: bottle.targetX + Math.cos(angle) * SKILL_CONSTANTS.RESIDUE_SPREAD,
          y: bottle.targetY + Math.sin(angle) * SKILL_CONSTANTS.RESIDUE_SPREAD,
          timeLeft: SKILL_CONSTANTS.RESIDUE_LIFETIME,
          affectedIds: [],
        });
      }
      bottle.hasLanded = true;
      ctx.createExplosion(bottle.x, bottle.y, char.color, SKILL_CONSTANTS.RESIDUE_COUNT * 4);
    });
    ms.toxicBottles = ms.toxicBottles.filter((bottle) => !bottle.hasLanded);

    ctx.characters.forEach((target) => {
      const state = target as CharacterState & { mongshilHeatTimeLeft?: number; mongshilHeatTick?: number; mongshilHeatSourceId?: string };
      if (state.mongshilHeatSourceId !== char.id || state.isDead) return;
      state.mongshilHeatTimeLeft = (state.mongshilHeatTimeLeft ?? 0) - dt;
      state.mongshilHeatTick = (state.mongshilHeatTick ?? 0) - dt;
      if (state.mongshilHeatTimeLeft <= 0) return;
      if (state.mongshilHeatTick <= 0) {
        state.mongshilHeatTick = 1;
        ctx.dealDamage(char, target, SKILL_CONSTANTS.HEAT_DAMAGE_PER_SECOND, '🔥 매직기 열기');
      }
    });

    ms.magicResidues.forEach((residue) => {
      residue.timeLeft -= dt;
      ctx.characters.forEach((target) => {
        if (target.isDead || target.id === char.id || residue.affectedIds.includes(target.id)) return;
        if (Math.hypot(target.x - residue.x, target.y - residue.y) > SKILL_CONSTANTS.RESIDUE_RADIUS) return;
        residue.affectedIds.push(target.id);
        if (isAlly(char, target)) {
          target.hp = Math.min(target.maxHp, target.hp + SKILL_CONSTANTS.RESIDUE_ALLY_HEAL);
          ctx.addFloatingText(target.x, target.y - 35, `+${SKILL_CONSTANTS.RESIDUE_ALLY_HEAL} 독성 케어`, '#39ff14', 1);
        } else {
          ctx.dealDamage(char, target, SKILL_CONSTANTS.RESIDUE_ENEMY_DAMAGE, '🧪 독성 잔향');
        }
      });
    });
    ms.magicResidues = ms.magicResidues.filter((residue) => residue.timeLeft > 0);
  },
  // #endregion UPDATE

  // ═══════════════════════════════════════════
  // #region BASIC_ATTACK
  // ═══════════════════════════════════════════
  onBasicAttack(char: CharacterState, target: CharacterState, ctx: CharacterBehaviorContext) {
    if (Math.random() >= SKILL_CONSTANTS.HEAT_CHANCE) return;
    const state = target as CharacterState & { mongshilHeatTimeLeft?: number; mongshilHeatTick?: number; mongshilHeatSourceId?: string };
    state.mongshilHeatSourceId = char.id;
    state.mongshilHeatTimeLeft = SKILL_CONSTANTS.HEAT_DURATION;
    state.mongshilHeatTick = 0;
    ctx.addFloatingText(target.x, target.y - 45, '🔥 열기 화상!', '#ff7a00', 1);
  },
  // #endregion BASIC_ATTACK

  // ═══════════════════════════════════════════
  // #region RENDER
  // ═══════════════════════════════════════════
  onRenderExtra(char: CharacterState, canvasCtx: CanvasRenderingContext2D) {
    const residues = (char as MongshilState).magicResidues ?? [];
    const bottles = (char as MongshilState).toxicBottles ?? [];
    canvasCtx.save();
    residues.forEach((residue) => {
      const progress = Math.max(0, residue.timeLeft / SKILL_CONSTANTS.RESIDUE_LIFETIME);
      canvasCtx.globalAlpha = progress * 0.45;
      canvasCtx.fillStyle = '#a020f0';
      canvasCtx.beginPath();
      canvasCtx.arc(residue.x, residue.y, SKILL_CONSTANTS.RESIDUE_RADIUS, 0, Math.PI * 2);
      canvasCtx.fill();
      canvasCtx.globalAlpha = 0.9;
      canvasCtx.strokeStyle = '#f0abfc'; canvasCtx.lineWidth = 3;
      canvasCtx.beginPath(); canvasCtx.arc(residue.x, residue.y, SKILL_CONSTANTS.RESIDUE_RADIUS, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * progress); canvasCtx.stroke();
      canvasCtx.fillStyle = '#fff'; canvasCtx.font = 'bold 10px Orbit'; canvasCtx.textAlign = 'center'; canvasCtx.fillText(`🧪 ${residue.timeLeft.toFixed(1)}s`, residue.x, residue.y + 4);
    });
    canvasCtx.globalAlpha = 1;
    canvasCtx.fillStyle = '#d95f9f';
    bottles.forEach((bottle) => {
      canvasCtx.strokeStyle = 'rgba(240,171,252,0.72)'; canvasCtx.lineWidth = 2; canvasCtx.setLineDash([6, 5]); canvasCtx.beginPath(); canvasCtx.moveTo(bottle.x, bottle.y); canvasCtx.lineTo(bottle.targetX, bottle.targetY); canvasCtx.stroke(); canvasCtx.setLineDash([]);
      canvasCtx.strokeStyle = '#f0abfc'; canvasCtx.lineWidth = 2; canvasCtx.beginPath(); canvasCtx.arc(bottle.targetX, bottle.targetY, SKILL_CONSTANTS.RESIDUE_RADIUS, 0, Math.PI * 2); canvasCtx.stroke();
      canvasCtx.beginPath();
      canvasCtx.arc(bottle.x, bottle.y, 8, 0, Math.PI * 2);
      canvasCtx.fill();
    });
    canvasCtx.restore();
  },
  // #endregion RENDER
};
