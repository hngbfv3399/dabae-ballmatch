import type { CharacterBehaviorContext, CharacterConfig, CharacterState } from '../character.interface';

// ═══════════════════════════════════════════
// #region TYPES
// ═══════════════════════════════════════════
interface SingularityZone { x: number; y: number; radius: number; timeLeft: number; tickLeft: number; }
interface TemporalFault { x: number; y: number; angle: number; length: number; timeLeft: number; hitIds: string[]; }
interface FutureRift { x: number; y: number; timeLeft: number; }
interface PositionSnapshot { x: number; y: number; timeLeft: number; }
interface JujuBossState extends CharacterState {
  bossPhase?: 1 | 2 | 3;
  patternTimer?: number;
  phaseAnnouncement?: string;
  phaseAnnouncementLeft?: number;
  horizons?: SingularityZone[];
  faults?: TemporalFault[];
  futureRifts?: FutureRift[];
  playerHistory?: Record<string, PositionSnapshot[]>;
  ultimateStarted?: boolean;
  ultimateLeft?: number;
  exhaustedLeft?: number;
  baseAttackPower?: number;
  baseSpeed?: number;
}
// #endregion TYPES

// ═══════════════════════════════════════════
// #region CONSTANTS
// ═══════════════════════════════════════════
const SKILL_CONSTANTS = {
  MAX_HP: 1200,
  RADIUS: 70,
  BASE_ATTACK: 24,
  COOLDOWN: 5,
  PHASE_TWO_RATIO: 0.7,
  PHASE_THREE_RATIO: 0.3,
  ENRAGE_RATIO: 0.1,
  HORIZON_RADIUS: 130,
  HORIZON_DURATION: 4.5,
  HORIZON_DAMAGE: 13,
  HORIZON_TICK: 0.6,
  HORIZON_PULL_BASE: 0.22,
  HORIZON_PULL_CENTER_BONUS: 0.38,
  FAULT_DURATION: 3.2,
  FAULT_WARNING_DURATION: 0.85,
  FAULT_DAMAGE: 28,
  FAULT_KNOCKBACK: 3.6,
  FAULT_HALF_WIDTH: 15,
  RIFT_DELAY: 2.5,
  RIFT_DAMAGE: 24,
  TIME_STOP_DURATION: 1.25,
  REWIND_SECONDS: 2,
  REWIND_DAMAGE: 12,
  SINGULARITY_RADIUS: 260,
  SINGULARITY_PULL: 0.25,
  ULTIMATE_CAST: 8,
  ULTIMATE_DAMAGE: 34,
  EXHAUSTED_DURATION: 8,
};
// #endregion CONSTANTS

// ═══════════════════════════════════════════
// #region HELPERS
// ═══════════════════════════════════════════
function challengers(ctx: CharacterBehaviorContext): CharacterState[] {
  return ctx.characters.filter((target) => !target.isDead && !target.isBoss && !target.id.includes('clone'));
}

function announce(char: CharacterState, state: JujuBossState, ctx: CharacterBehaviorContext, text: string) {
  state.phaseAnnouncement = text;
  state.phaseAnnouncementLeft = 2.2;
  ctx.addFloatingText(char.x, char.y - 95, text, '#c7b8ff', 2);
}

function pull(target: CharacterState, x: number, y: number, strength: number) {
  const dx = x - target.x;
  const dy = y - target.y;
  const distance = Math.hypot(dx, dy) || 1;
  target.vx += (dx / distance) * strength;
  target.vy += (dy / distance) * strength;
}

function randomPoint(ctx: CharacterBehaviorContext, margin = 100) {
  return {
    x: margin + Math.random() * (ctx.arenaWidth - margin * 2),
    y: margin + Math.random() * (ctx.arenaHeight - margin * 2),
  };
}

function spawnFault(ctx: CharacterBehaviorContext, angle = Math.random() * Math.PI): TemporalFault {
  return {
    x: ctx.arenaWidth * (0.25 + Math.random() * 0.5),
    y: ctx.arenaHeight * (0.25 + Math.random() * 0.5),
    angle,
    length: Math.hypot(ctx.arenaWidth, ctx.arenaHeight) * 1.2,
    timeLeft: SKILL_CONSTANTS.FAULT_DURATION,
    hitIds: [],
  };
}

function distanceToFault(target: CharacterState, fault: TemporalFault) {
  const halfLength = fault.length / 2;
  const directionX = Math.cos(fault.angle);
  const directionY = Math.sin(fault.angle);
  const relativeX = target.x - fault.x;
  const relativeY = target.y - fault.y;
  const along = Math.max(-halfLength, Math.min(halfLength, relativeX * directionX + relativeY * directionY));
  const closestX = fault.x + directionX * along;
  const closestY = fault.y + directionY * along;
  return Math.hypot(target.x - closestX, target.y - closestY);
}
// #endregion HELPERS

// ═══════════════════════════════════════════
// #region CONFIG
// ═══════════════════════════════════════════
export const jujuSingularityBossConfig: CharacterConfig = {
  id: 'juju_singularity_boss',
  characterFamilyId: 'juju',
  name: '주주',
  maxHp: SKILL_CONSTANTS.MAX_HP,
  radius: SKILL_CONSTANTS.RADIUS,
  speed: 1.1,
  attackPower: SKILL_CONSTANTS.BASE_ATTACK,
  baseAttackRange: 95,
  skillName: '『시공 특이점』',
  skillDescription: '전용 레이드 보스. 체력에 따라 공간 왜곡, 시간 붕괴, 특이점 3페이즈 패턴을 사용합니다.',
  color: '#8b5cf6',
  skillChargeRate: 100 / SKILL_CONSTANTS.COOLDOWN,
  tier: 'S',
  role: 'Disabler',
  detailedDescription: '별이 사라진 우주에서 붕괴하는 특이점과 시간 단층, 시간 정지와 시간 역행을 다루는 1대3 전용 보스입니다.',
// #endregion CONFIG

  // ═══════════════════════════════════════════
  // #region SKILL_TRIGGER
  // ═══════════════════════════════════════════
  onSkillTrigger(char, ctx) {
    const state = char as JujuBossState;
    if ((state.bossPhase ?? 1) < 3 || state.ultimateStarted) {
      char.skillActive = false;
      return;
    }
    state.ultimateStarted = true;
    state.ultimateLeft = SKILL_CONSTANTS.ULTIMATE_CAST;
    char.skillActive = true;
    announce(char, state, ctx, '『시공 특이점』 캐스팅');
  },
  // #endregion SKILL_TRIGGER

  // ═══════════════════════════════════════════
  // #region UPDATE
  // ═══════════════════════════════════════════
  onUpdate(char, dt, ctx) {
    const state = char as JujuBossState;
    state.bossPhase ??= 1;
    state.patternTimer ??= 2.5;
    state.horizons ??= [];
    state.faults ??= [];
    state.futureRifts ??= [];
    state.playerHistory ??= {};
    state.baseAttackPower ??= char.attackPower;
    state.baseSpeed ??= char.speed;

    const hpRatio = char.hp / char.maxHp;
    const nextPhase: 1 | 2 | 3 = hpRatio <= SKILL_CONSTANTS.PHASE_THREE_RATIO ? 3 : hpRatio <= SKILL_CONSTANTS.PHASE_TWO_RATIO ? 2 : 1;
    if (nextPhase > state.bossPhase) {
      state.bossPhase = nextPhase;
      const text = nextPhase === 2 ? '시간은... 멈춘다.' : '공간도... 시간도... 의미가 없다.';
      announce(char, state, ctx, text);
      challengers(ctx).forEach((target) => ctx.applyStun(char, target, nextPhase === 2 ? 0.8 : 1.1));
    }

    const players = challengers(ctx);
    players.forEach((target) => {
      const history = state.playerHistory![target.id] ?? [];
      history.push({ x: target.x, y: target.y, timeLeft: SKILL_CONSTANTS.REWIND_SECONDS });
      history.forEach((snapshot) => { snapshot.timeLeft -= dt; });
      state.playerHistory![target.id] = history.filter((snapshot) => snapshot.timeLeft > 0);
    });

    if ((state.phaseAnnouncementLeft ?? 0) > 0) state.phaseAnnouncementLeft! -= dt;
    if ((state.exhaustedLeft ?? 0) > 0) {
      state.exhaustedLeft! -= dt;
      char.attackPower = state.baseAttackPower * 0.4;
      char.speed = state.baseSpeed * 0.55;
    } else {
      char.attackPower = state.baseAttackPower;
      char.speed = state.baseSpeed;
    }

    state.horizons.forEach((zone) => {
      zone.timeLeft -= dt;
      zone.tickLeft -= dt;
      players.forEach((target) => {
        const distance = Math.hypot(target.x - zone.x, target.y - zone.y);
        if (distance > zone.radius) return;
        pull(target, zone.x, zone.y, SKILL_CONSTANTS.HORIZON_PULL_BASE + (1 - distance / zone.radius) * SKILL_CONSTANTS.HORIZON_PULL_CENTER_BONUS);
        if (zone.tickLeft <= 0) ctx.dealDamage(char, target, SKILL_CONSTANTS.HORIZON_DAMAGE, '🌌 사건의 지평선');
      });
      if (zone.tickLeft <= 0) zone.tickLeft = SKILL_CONSTANTS.HORIZON_TICK;
    });
    state.horizons = state.horizons.filter((zone) => zone.timeLeft > 0);

    state.faults.forEach((fault) => {
      fault.timeLeft -= dt;
      const isActive = fault.timeLeft <= SKILL_CONSTANTS.FAULT_DURATION - SKILL_CONSTANTS.FAULT_WARNING_DURATION;
      if (!isActive) return;
      players.forEach((target) => {
        if (fault.hitIds.includes(target.id) || distanceToFault(target, fault) > target.radius + SKILL_CONSTANTS.FAULT_HALF_WIDTH) return;
        const side = Math.sign((target.x - fault.x) * -Math.sin(fault.angle) + (target.y - fault.y) * Math.cos(fault.angle)) || 1;
        target.vx += -Math.sin(fault.angle) * side * SKILL_CONSTANTS.FAULT_KNOCKBACK;
        target.vy += Math.cos(fault.angle) * side * SKILL_CONSTANTS.FAULT_KNOCKBACK;
        fault.hitIds.push(target.id);
        ctx.dealDamage(char, target, SKILL_CONSTANTS.FAULT_DAMAGE, '⚡ 시간 단층');
        ctx.createExplosion(target.x, target.y, '#d8b4fe', 12);
      });
    });
    state.faults = state.faults.filter((fault) => fault.timeLeft > 0);

    state.futureRifts.forEach((rift) => {
      rift.timeLeft -= dt;
      if (rift.timeLeft > 0) return;
      players.forEach((target) => {
        if (Math.hypot(target.x - rift.x, target.y - rift.y) <= target.radius + 78) ctx.dealDamage(char, target, SKILL_CONSTANTS.RIFT_DAMAGE, '⌛ 미래 균열');
      });
      ctx.createExplosion(rift.x, rift.y, '#a855f7', 22);
    });
    state.futureRifts = state.futureRifts.filter((rift) => rift.timeLeft > 0);

    if (state.bossPhase === 3) {
      const centerX = ctx.arenaWidth / 2;
      const centerY = ctx.arenaHeight / 2;
      players.forEach((target) => {
        const distance = Math.hypot(target.x - centerX, target.y - centerY);
        if (distance <= SKILL_CONSTANTS.SINGULARITY_RADIUS) pull(target, centerX, centerY, SKILL_CONSTANTS.SINGULARITY_PULL);
      });
    }

    if (state.bossPhase === 3 && hpRatio <= SKILL_CONSTANTS.ENRAGE_RATIO && !state.ultimateStarted) {
      state.ultimateStarted = true;
      state.ultimateLeft = SKILL_CONSTANTS.ULTIMATE_CAST;
      char.skillActive = true;
      announce(char, state, ctx, '『시공 특이점』');
    }
    if ((state.ultimateLeft ?? 0) > 0) {
      state.ultimateLeft! -= dt;
      players.forEach((target) => pull(target, ctx.arenaWidth / 2, ctx.arenaHeight / 2, 0.24));
      if (state.ultimateLeft! <= 0) {
        players.forEach((target) => ctx.dealDamage(char, target, SKILL_CONSTANTS.ULTIMATE_DAMAGE, '🌌 특이점 붕괴'));
        state.exhaustedLeft = SKILL_CONSTANTS.EXHAUSTED_DURATION;
        char.skillActive = false;
        announce(char, state, ctx, '특이점 불안정 · 딜타임');
      }
      return;
    }

    state.patternTimer! -= dt;
    if (state.patternTimer! > 0) return;
    if (state.bossPhase === 1) {
      const point = randomPoint(ctx);
      state.horizons.push({ ...point, radius: SKILL_CONSTANTS.HORIZON_RADIUS, timeLeft: SKILL_CONSTANTS.HORIZON_DURATION, tickLeft: 0.2 });
      state.faults.push(spawnFault(ctx));
      state.patternTimer = 3.7;
    } else if (state.bossPhase === 2) {
      if (Math.random() < 0.5) {
        players.forEach((target) => ctx.applyStun(char, target, SKILL_CONSTANTS.TIME_STOP_DURATION));
        announce(char, state, ctx, 'TIME STOP');
      } else {
        players.forEach((target) => {
          const history = state.playerHistory?.[target.id] ?? [];
          const snapshot = history[0];
          if (!snapshot) return;
          target.x = snapshot.x; target.y = snapshot.y;
          ctx.dealDamage(char, target, SKILL_CONSTANTS.REWIND_DAMAGE, '⌛ 시간 역행');
        });
        announce(char, state, ctx, 'TIME REWIND');
      }
      state.futureRifts.push({ ...randomPoint(ctx), timeLeft: SKILL_CONSTANTS.RIFT_DELAY });
      state.faults.push(spawnFault(ctx));
      state.patternTimer = 3.5;
    } else {
      state.horizons.push({ x: ctx.arenaWidth / 2, y: ctx.arenaHeight / 2, radius: SKILL_CONSTANTS.SINGULARITY_RADIUS, timeLeft: 2.5, tickLeft: 0.3 });
      for (let index = 0; index < 3; index++) state.futureRifts.push({ ...randomPoint(ctx), timeLeft: 1.6 + index * 0.45 });
      state.faults.push(spawnFault(ctx, Math.PI / 4), spawnFault(ctx, -Math.PI / 4));
      state.patternTimer = hpRatio <= SKILL_CONSTANTS.ENRAGE_RATIO ? 1.7 : 2.7;
    }
  },
  // #endregion UPDATE

  // ═══════════════════════════════════════════
  // #region DAMAGE
  // ═══════════════════════════════════════════
  onTakeDamage(_target, _attacker, damage, _ctx) { return { finalDamage: damage, blocked: false }; },
  // #endregion DAMAGE

  // ═══════════════════════════════════════════
  // #region RENDER
  // ═══════════════════════════════════════════
  onRenderBackground(_char, canvasCtx, canvasWidth, canvasHeight) {
    canvasCtx.save();
    for (let index = 0; index < 80; index++) {
      const x = (index * 97) % canvasWidth;
      const y = (index * 173) % canvasHeight;
      const alpha = 0.25 + ((index * 19) % 70) / 100;
      canvasCtx.fillStyle = `rgba(185, 155, 255, ${alpha})`;
      canvasCtx.fillRect(x, y, index % 5 === 0 ? 2 : 1, index % 5 === 0 ? 2 : 1);
    }
    canvasCtx.restore();
  },
  onRenderExtra(char, canvasCtx, currentRadius) {
    const state = char as JujuBossState;
    canvasCtx.save();
    state.horizons?.forEach((zone) => {
      const pulse = 0.82 + Math.sin(zone.timeLeft * 9) * 0.12;
      const gradient = canvasCtx.createRadialGradient(zone.x, zone.y, 4, zone.x, zone.y, zone.radius);
      gradient.addColorStop(0, 'rgba(1,0,8,1)'); gradient.addColorStop(0.28, 'rgba(13,3,35,0.96)'); gradient.addColorStop(0.62, 'rgba(106,39,194,0.45)'); gradient.addColorStop(1, 'rgba(212,134,255,0.04)');
      canvasCtx.fillStyle = gradient; canvasCtx.beginPath(); canvasCtx.arc(zone.x, zone.y, zone.radius, 0, Math.PI * 2); canvasCtx.fill();
      canvasCtx.strokeStyle = `rgba(224, 166, 255, ${pulse})`; canvasCtx.lineWidth = 3; canvasCtx.beginPath(); canvasCtx.arc(zone.x, zone.y, zone.radius * 0.72, zone.timeLeft * 3, zone.timeLeft * 3 + Math.PI * 1.5); canvasCtx.stroke();
      canvasCtx.strokeStyle = 'rgba(111, 247, 255, 0.7)'; canvasCtx.lineWidth = 2; canvasCtx.beginPath(); canvasCtx.arc(zone.x, zone.y, zone.radius * 0.47, -zone.timeLeft * 4, -zone.timeLeft * 4 + Math.PI * 1.2); canvasCtx.stroke();
      for (let index = 0; index < 12; index++) { const angle = index * Math.PI / 6 + zone.timeLeft * 2; const radius = zone.radius * (0.32 + (index % 4) * 0.12); canvasCtx.fillStyle = index % 2 ? '#d8b4fe' : '#67e8f9'; canvasCtx.fillRect(zone.x + Math.cos(angle) * radius, zone.y + Math.sin(angle) * radius, 2, 2); }
    });
    state.faults?.forEach((fault) => {
      const halfLength = fault.length / 2;
      const startX = fault.x - Math.cos(fault.angle) * halfLength; const startY = fault.y - Math.sin(fault.angle) * halfLength;
      const endX = fault.x + Math.cos(fault.angle) * halfLength; const endY = fault.y + Math.sin(fault.angle) * halfLength;
      const active = fault.timeLeft <= SKILL_CONSTANTS.FAULT_DURATION - SKILL_CONSTANTS.FAULT_WARNING_DURATION;
      canvasCtx.strokeStyle = active ? '#f0abfc' : 'rgba(216,180,254,0.7)'; canvasCtx.lineWidth = active ? 10 : 3; canvasCtx.setLineDash(active ? [] : [14, 10]); canvasCtx.beginPath(); canvasCtx.moveTo(startX, startY); canvasCtx.lineTo(endX, endY); canvasCtx.stroke();
      canvasCtx.strokeStyle = active ? 'rgba(91,33,182,0.95)' : 'rgba(244,114,182,0.7)'; canvasCtx.lineWidth = active ? 4 : 1; canvasCtx.beginPath(); canvasCtx.moveTo(startX, startY); canvasCtx.lineTo(endX, endY); canvasCtx.stroke(); canvasCtx.setLineDash([]);
      if (!active) { canvasCtx.fillStyle = '#f5d0fe'; canvasCtx.font = 'bold 14px Orbit'; canvasCtx.textAlign = 'center'; canvasCtx.fillText(`⚡ 단층 ${(fault.timeLeft - (SKILL_CONSTANTS.FAULT_DURATION - SKILL_CONSTANTS.FAULT_WARNING_DURATION)).toFixed(1)}s`, fault.x, fault.y - 16); }
    });
    state.futureRifts?.forEach((rift) => { canvasCtx.strokeStyle = '#ff5ac8'; canvasCtx.lineWidth = 3; canvasCtx.setLineDash([8, 7]); canvasCtx.beginPath(); canvasCtx.arc(rift.x, rift.y, 78, 0, Math.PI * 2); canvasCtx.stroke(); canvasCtx.setLineDash([]); });
    if (state.bossPhase === 3) { const x = canvasCtx.canvas.width / 2; const y = canvasCtx.canvas.height / 2; const radius = SKILL_CONSTANTS.SINGULARITY_RADIUS; const gradient = canvasCtx.createRadialGradient(x, y, 5, x, y, radius); gradient.addColorStop(0, 'rgba(0,0,0,0.88)'); gradient.addColorStop(0.45, 'rgba(35,8,76,0.28)'); gradient.addColorStop(1, 'rgba(174,90,255,0.03)'); canvasCtx.fillStyle = gradient; canvasCtx.beginPath(); canvasCtx.arc(x, y, radius, 0, Math.PI * 2); canvasCtx.fill(); canvasCtx.strokeStyle = 'rgba(216,180,254,0.85)'; canvasCtx.lineWidth = 6; canvasCtx.beginPath(); canvasCtx.arc(x, y, radius * 0.84, -state.patternTimer!, -state.patternTimer! + Math.PI * 1.7); canvasCtx.stroke(); canvasCtx.strokeStyle = 'rgba(103,232,249,0.7)'; canvasCtx.lineWidth = 2; canvasCtx.beginPath(); canvasCtx.arc(x, y, radius * 0.55, state.patternTimer! * 1.6, state.patternTimer! * 1.6 + Math.PI * 1.3); canvasCtx.stroke(); }
    canvasCtx.strokeStyle = '#d8b4fe'; canvasCtx.lineWidth = 4; canvasCtx.beginPath(); canvasCtx.arc(char.x, char.y, currentRadius + 10, 0, Math.PI * 2); canvasCtx.stroke();
    canvasCtx.restore();
  },
  onRenderOverlay(char, canvasCtx, canvasWidth, canvasHeight) {
    const state = char as JujuBossState;
    if ((state.ultimateLeft ?? 0) > 0) {
      const progress = 1 - state.ultimateLeft! / SKILL_CONSTANTS.ULTIMATE_CAST;
      canvasCtx.save(); canvasCtx.fillStyle = `rgba(0, 0, 0, ${0.22 + progress * 0.38})`; canvasCtx.fillRect(0, 0, canvasWidth, canvasHeight);
      canvasCtx.strokeStyle = '#a855f7'; canvasCtx.lineWidth = 8; canvasCtx.beginPath(); canvasCtx.arc(canvasWidth / 2, canvasHeight / 2, 30 + progress * 300, 0, Math.PI * 2); canvasCtx.stroke(); canvasCtx.restore();
    }
    if ((state.phaseAnnouncementLeft ?? 0) > 0 && state.phaseAnnouncement) {
      canvasCtx.save(); canvasCtx.font = 'bold 30px Orbit'; canvasCtx.textAlign = 'center'; canvasCtx.fillStyle = '#f1e8ff'; canvasCtx.fillText(state.phaseAnnouncement, canvasWidth / 2, 90); canvasCtx.restore();
    }
  },
  // #endregion RENDER
};
