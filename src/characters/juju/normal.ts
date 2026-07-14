import type { CharacterConfig, CharacterState, CharacterBehaviorContext } from '../character.interface';

// ═══════════════════════════════════════════
// #region TYPES
// ═══════════════════════════════════════════
interface SwapPortalEffect {
  x: number;
  y: number;
  life: number; // 1.0 -> 0.0
}

interface JujuState extends CharacterState {
  swapPortals?: SwapPortalEffect[];
  hasEmergencySwapped?: boolean;
  blackHoleX?: number;
  blackHoleY?: number;
}
// #endregion TYPES

// ═══════════════════════════════════════════
// #region CONSTANTS
// ═══════════════════════════════════════════
const SKILL_CONSTANTS = {
  BLACK_HOLE_DURATION: 3.0,
  BLACK_HOLE_RADIUS: 250,
  BLACK_HOLE_PULL_SPEED: 4.8,
  BLACK_HOLE_COLLAPSE_DAMAGE: 30,
  BLACK_HOLE_KNOCKBACK_SPEED: 28.5,
  EMERGENCY_HP_RATIO: 0.10,
  EMERGENCY_ENEMY_STUN_DURATION: 1.0,
  EMERGENCY_IMMUNITY_DURATION: 3.0,
  EMERGENCY_SAFE_MARGIN: 72,
  EMERGENCY_PULL_RING_RADIUS: 14,
} as const;
// #endregion CONSTANTS

// ═══════════════════════════════════════════
// #region HELPERS
// ═══════════════════════════════════════════
function isEnemy(char: CharacterState, target: CharacterState) {
  return char.teamId === undefined || target.teamId === undefined || char.teamId !== target.teamId;
}

function findSafestEscapePoint(target: CharacterState, enemies: CharacterState[], ctx: CharacterBehaviorContext) {
  const margin = Math.max(target.radius + SKILL_CONSTANTS.EMERGENCY_SAFE_MARGIN, SKILL_CONSTANTS.EMERGENCY_SAFE_MARGIN);
  const candidates = [
    { x: margin, y: margin },
    { x: ctx.arenaWidth - margin, y: margin },
    { x: margin, y: ctx.arenaHeight - margin },
    { x: ctx.arenaWidth - margin, y: ctx.arenaHeight - margin },
  ];

  return candidates.reduce((safest, candidate) => {
    const candidateDistance = Math.min(...enemies.map((enemy) => Math.hypot(candidate.x - enemy.x, candidate.y - enemy.y)));
    const safestDistance = Math.min(...enemies.map((enemy) => Math.hypot(safest.x - enemy.x, safest.y - enemy.y)));
    return candidateDistance > safestDistance ? candidate : safest;
  });
}
// #endregion HELPERS

// ═══════════════════════════════════════════
// #region CONFIG — character stats & metadata
// ═══════════════════════════════════════════
export const jujuConfig: CharacterConfig = {
  id: 'juju',
  characterFamilyId: 'juju',
  name: '주주',
  maxHp: 135,
  speed: 1.25,
  attackPower: 14,
  baseAttackRange: 45,
  skillName: '전술적 특이점 블랙홀',
  skillDescription: '7초 쿨타임. 스킬 시전 시 현재 위치에 3초간 블랙홀을 소환합니다. 주변 250px 내 적들의 움직임을 원천 봉쇄(기절)하고 블랙홀 중심부로 강력하게 끌고 들어갑니다. 블랙홀 지속 중 주주는 완전 무적입니다. 만료 시 30 광역 충격파 피해와 초강력 넉백을 선사합니다. 패시브: 죽음 직전 위기(체력 10% 이하) 처할 시 1회 한정으로 블랙홀을 즉시 생성해 모든 적을 가두고, 가장 안전한 전장 가장자리로 탈출해 3초 무적을 얻습니다.',
  color: '#00bfff', // 홀로그램 하늘색
  skillChargeRate: 14.3, // 7초 쿨타임
  tier: 'S',
  role: 'Disabler',
  detailedDescription: '주주는 다수를 일거에 무력화하는 무적 영역 전개 능력을 가진 제어형 특수 포지션 캐릭터입니다. 스킬 작동 시 3초 동안 자신은 완전 무적(Invulnerable) 상태가 되며 적들을 기절시킨 채 한 지점으로 빨아들이는 블랙홀을 배치합니다. 소멸 시 강력한 충격파를 주고 튕겨내며, 빈사 상태 돌입 시 블랙홀에 적 전원을 강제 이동시킨 뒤 가장 안전한 전장 가장자리로 탈출하는 생존 패시브도 탑재하고 있습니다.',
// #endregion CONFIG

  // ═══════════════════════════════════════════
  // #region SKILL_TRIGGER — spawn black hole & grant immunity
  // ═══════════════════════════════════════════
  onSkillTrigger(char: CharacterState, ctx) {
    char.skillActive = true;
    char.skillDurationLeft = SKILL_CONSTANTS.BLACK_HOLE_DURATION;

    const js = char as JujuState;
    // Set center of black hole at current location
    js.blackHoleX = js.x;
    js.blackHoleY = js.y;
    
    // Apply damage immunity
    char.isImmune = true;
    char.immuneTimeLeft = SKILL_CONSTANTS.BLACK_HOLE_DURATION;

    ctx.addFloatingText(char.x, char.y - 65, '🌀 특이점 블랙홀 소환! (무적)', '#00bfff', 1.8);
    ctx.createExplosion(char.x, char.y, '#00bfff', 15);
    ctx.logMessage?.(`🌀 [블랙홀 시동] 주주 ➡️ 현재 위치(${Math.round(js.blackHoleX)}, ${Math.round(js.blackHoleY)})에 블랙홀 기동 및 3초 피해 면역 무적!`, 'skill');
  },
  // #endregion SKILL_TRIGGER

  // ═══════════════════════════════════════════
  // #region UPDATE — suction effect, black hole decay, immune timer
  // ═══════════════════════════════════════════
  onUpdate(char: CharacterState, dt: number, ctx) {
    const js = char as JujuState;
    if (js.swapPortals === undefined) js.swapPortals = [];

    // 1. Decay portal effects
    js.swapPortals.forEach((p) => {
      p.life -= dt * 1.8;
    });
    js.swapPortals = js.swapPortals.filter((p) => p.life > 0);

    // 2. Active: suction and collapse of black hole
    if (js.skillActive) {
      js.skillDurationLeft -= dt;

      if (js.blackHoleX !== undefined && js.blackHoleY !== undefined) {
        const bX = js.blackHoleX;
        const bY = js.blackHoleY;

        // Pull nearby enemies within 250px (exclude self)
        ctx.characters.forEach((enemy: CharacterState) => {
          if (enemy.isDead || enemy.id === js.id || !isEnemy(char, enemy)) return;
          
          const dx = bX - enemy.x;
          const dy = bY - enemy.y;
          const dist = Math.hypot(dx, dy);

          if (dist <= SKILL_CONSTANTS.BLACK_HOLE_RADIUS) {
            // A. Stun opponent to block movement (refresh 0.2s duration)
            if (!ctx.applyStun(char, enemy, 0.2)) return;

            // B. Cancel velocity
            enemy.vx = 0;
            enemy.vy = 0;

            // C. Force coordinate draw towards center
            if (dist > 15) {
              const pullSpeed = SKILL_CONSTANTS.BLACK_HOLE_PULL_SPEED;
              const angle = Math.atan2(dy, dx);
              enemy.x += Math.cos(angle) * pullSpeed * (dt * 60);
              enemy.y += Math.sin(angle) * pullSpeed * (dt * 60);
            }
          }
        });

        // Suction particle trail effects
        if (Math.random() < 0.7) {
          const randAngle = Math.random() * Math.PI * 2;
          const startDist = 120 + Math.random() * 120;
          const px = bX + Math.cos(randAngle) * startDist;
          const py = bY + Math.sin(randAngle) * startDist;
          ctx.createParticle(px, py, '#00bfff', 2.2, 25);
        }
      }

      // Black hole collapse (30 splash damage & extreme knockback)
      if (js.skillDurationLeft <= 0) {
        js.skillActive = false;
        js.skillDurationLeft = 0;

        if (js.blackHoleX !== undefined && js.blackHoleY !== undefined) {
          const bX = js.blackHoleX;
          const bY = js.blackHoleY;

          ctx.createExplosion(bX, bY, '#1c0d24', 45); // Dark core explosion
          ctx.createExplosion(bX, bY, '#00bfff', 35);
          ctx.addFloatingText(bX, bY - 20, '💥 블랙홀 붕괴!', '#ff007f', 2.2);

          // Apply damage and knockback
          ctx.characters.forEach((enemy: CharacterState) => {
            if (enemy.isDead || enemy.id === js.id || !isEnemy(char, enemy)) return;
            
            const dx = enemy.x - bX;
            const dy = enemy.y - bY;
            const dist = Math.hypot(dx, dy);

            if (dist <= SKILL_CONSTANTS.BLACK_HOLE_RADIUS) {
              ctx.dealDamage(js, enemy, SKILL_CONSTANTS.BLACK_HOLE_COLLAPSE_DAMAGE, '💥 SINGULARITY!');
              
              // Knockback outwards (speed 28.5)
              const angle = Math.atan2(dy, dx);
              enemy.vx = Math.cos(angle) * SKILL_CONSTANTS.BLACK_HOLE_KNOCKBACK_SPEED;
              enemy.vy = Math.sin(angle) * SKILL_CONSTANTS.BLACK_HOLE_KNOCKBACK_SPEED;
            }
          });

          ctx.logMessage?.(`💥 [블랙홀 붕괴] 주주 ➡️ 블랙홀 특이점 폭발! 주변 적에게 30 광역 피해 및 초강력 외곽 넉백!`, 'skill');
        }
      }
    }

    // 3. Decrement immunity barrier duration
    if (js.isImmune && js.immuneTimeLeft !== undefined) {
      js.immuneTimeLeft -= dt;
      if (js.immuneTimeLeft <= 0) {
        js.isImmune = false;
        js.immuneTimeLeft = 0;
        ctx.addFloatingText(js.x, js.y - 45, '🛡️ 보호막 만료', '#888888', 1.0);
      }
    }

    // Grid particles decoration
    if (Math.random() < 0.08) {
      ctx.createParticle(js.x, js.y, '#00bfff', 2, 8);
    }
  },
  // #endregion UPDATE

  // ═══════════════════════════════════════════
  // #region DAMAGE — damage immunity & emergency black-hole escape
  // ═══════════════════════════════════════════
  onTakeDamage(target: CharacterState, _attacker: CharacterState, damage: number, ctx: CharacterBehaviorContext) {
    // 1. Damage immunity (Black hole active state etc.)
    if (target.isImmune) {
      console.log(`🛡️ [피해 무적] ${target.name}이 무적 상태이므로 피해를 받지 않습니다.`);
      return { finalDamage: 0, blocked: true };
    }

    // 2. Emergency Black-Hole Escape Passive (triggers once when HP drops to 10% or below)
    const js = target as JujuState;
    if (!js.hasEmergencySwapped) {
      const nextHp = target.hp - damage;
      if (nextHp <= target.maxHp * SKILL_CONSTANTS.EMERGENCY_HP_RATIO) {
        js.hasEmergencySwapped = true;
        const origin = { x: target.x, y: target.y };
        const enemies = ctx.characters.filter((enemy) => !enemy.isDead && enemy.id !== target.id && isEnemy(target, enemy));

        // Form the black hole first, then place every enemy inside its core on a small ring.
        target.skillActive = true;
        target.skillDurationLeft = SKILL_CONSTANTS.BLACK_HOLE_DURATION;
        js.blackHoleX = origin.x;
        js.blackHoleY = origin.y;
        const escapePoint = enemies.length > 0 ? findSafestEscapePoint(target, enemies, ctx) : origin;
        enemies.forEach((enemy, index) => {
          const angle = (Math.PI * 2 * index) / Math.max(1, enemies.length);
          enemy.x = origin.x + Math.cos(angle) * SKILL_CONSTANTS.EMERGENCY_PULL_RING_RADIUS;
          enemy.y = origin.y + Math.sin(angle) * SKILL_CONSTANTS.EMERGENCY_PULL_RING_RADIUS;
          enemy.vx = 0;
          enemy.vy = 0;
          ctx.applyStun(target, enemy, SKILL_CONSTANTS.EMERGENCY_ENEMY_STUN_DURATION);
        });

        target.x = escapePoint.x;
        target.y = escapePoint.y;
        target.vx = 0;
        target.vy = 0;
        target.isImmune = true;
        target.immuneTimeLeft = SKILL_CONSTANTS.EMERGENCY_IMMUNITY_DURATION;

        if (!js.swapPortals) js.swapPortals = [];
        js.swapPortals.push({ x: origin.x, y: origin.y, life: 0.8 });
        js.swapPortals.push({ x: escapePoint.x, y: escapePoint.y, life: 0.8 });
        ctx.createExplosion(origin.x, origin.y, '#1c0d24', 28);
        ctx.createExplosion(origin.x, origin.y, '#00bfff', 22);
        ctx.createExplosion(escapePoint.x, escapePoint.y, '#00bfff', 18);
        ctx.addFloatingText(origin.x, origin.y - 65, '🌀 비상 블랙홀!', '#00bfff', 1.8);
        ctx.addFloatingText(target.x, target.y - 70, '🛡️ 안전 지대로 탈출! (무적 3초)', '#00bfff', 2.0);
        ctx.logMessage?.(`🌀 [비상 블랙홀 탈출] 주주 ➡️ 체력 10% 이하에서 적 ${enemies.length}명을 특이점에 강제 이동시키고 안전 지대로 이탈!`, 'skill');
        return { finalDamage: 0, blocked: true };
      }
    }

    return { finalDamage: damage, blocked: false };
  },
  // #endregion DAMAGE

  // ═══════════════════════════════════════════
  // #region RENDER — portal effects, black hole visual, barrier drawing
  // ═══════════════════════════════════════════
  onRenderExtra(char: CharacterState, canvasCtx: CanvasRenderingContext2D, currentRadius: number) {
    const js = char as JujuState;
    const swapPortals = js.swapPortals || [];

    // 1. Swap portals visual effect
    swapPortals.forEach((p) => {
      canvasCtx.save();
      canvasCtx.strokeStyle = `rgba(0, 191, 255, ${p.life})`;
      canvasCtx.lineWidth = 4;
      canvasCtx.shadowBlur = 12;
      canvasCtx.shadowColor = '#00bfff';
      
      const radius = (0.8 - p.life) * 110 + 10;
      canvasCtx.beginPath();
      canvasCtx.arc(p.x, p.y, radius, 0, Math.PI * 2);
      canvasCtx.stroke();
      canvasCtx.restore();
    });

    // 2. Black hole rendering
    if (js.blackHoleX !== undefined && js.blackHoleY !== undefined && (js.skillActive || js.skillDurationLeft > 0)) {
      canvasCtx.save();
      const bX = js.blackHoleX;
      const bY = js.blackHoleY;
      
      // Black core
      canvasCtx.fillStyle = 'rgba(10, 5, 20, 0.85)';
      canvasCtx.beginPath();
      canvasCtx.arc(bX, bY, 45, 0, Math.PI * 2);
      canvasCtx.fill();

      // Rotating gravity ring
      canvasCtx.strokeStyle = '#00bfff';
      canvasCtx.lineWidth = 4;
      canvasCtx.shadowBlur = 25;
      canvasCtx.shadowColor = '#00bfff';
      
      const rotAngle = (Date.now() / 150) % (Math.PI * 2);
      canvasCtx.beginPath();
      canvasCtx.arc(bX, bY, 55, rotAngle, rotAngle + Math.PI * 0.7);
      canvasCtx.stroke();

      canvasCtx.beginPath();
      canvasCtx.arc(bX, bY, 55, rotAngle + Math.PI, rotAngle + Math.PI * 1.7);
      canvasCtx.stroke();
      
      canvasCtx.restore();
    }

    // 3. Immunity barrier dome drawing
    if (js.isImmune) {
      canvasCtx.save();
      canvasCtx.strokeStyle = 'rgba(0, 191, 255, 0.8)';
      canvasCtx.lineWidth = 3.5;
      canvasCtx.shadowBlur = 15;
      canvasCtx.shadowColor = '#00bfff';
      
      const pulse = Math.sin(Date.now() / 50) * 1.5;
      canvasCtx.beginPath();
      canvasCtx.arc(char.x, char.y, currentRadius + 5 + pulse, 0, Math.PI * 2);
      canvasCtx.stroke();
      
      canvasCtx.restore();
    }

    // 4. Base hologram grid circle decoration
    canvasCtx.save();
    canvasCtx.strokeStyle = 'rgba(0, 191, 255, 0.4)';
    canvasCtx.lineWidth = 1.2;
    const rot = (Date.now() / 500) % (Math.PI * 2);
    canvasCtx.beginPath();
    canvasCtx.arc(char.x, char.y, currentRadius + 4, rot, rot + Math.PI * 0.5);
    canvasCtx.stroke();
    canvasCtx.beginPath();
    canvasCtx.arc(char.x, char.y, currentRadius + 4, rot + Math.PI, rot + Math.PI * 1.5);
    canvasCtx.stroke();
    canvasCtx.restore();
  }
  // #endregion RENDER
};
