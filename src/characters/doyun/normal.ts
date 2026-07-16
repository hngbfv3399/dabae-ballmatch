import type { CharacterConfig, CharacterState, CharacterBehaviorContext } from '../character.interface';

// ═══════════════════════════════════════════
// #region CONSTANTS
// ═══════════════════════════════════════════
const SKILL_CONSTANTS = {
  COOLDOWN: 5,
  SPLASH_RADIUS: 100,
  DMG_MULTIPLIER: 2.2,
  DMG_BASE: -5,
  SHIELD_AMOUNT: 6,
  SHIELD_DURATION: 3.0,
  COMBO_SEARCH_RADIUS: 145,
  COMBO_MAX_FOLLOW_UPS: 2,
  COMBO_INTERVAL: 0.35,
  COMBO_DAMAGE_MULTIPLIER: 1.15,
  COMBO_DAMAGE_BASE: -2,
  COMBO_KNOCKBACK_SPEED: 10,
  DODGE_CHANCE: 0.15,
  DODGE_FLASH_DURATION: 0.22,
};
// #endregion CONSTANTS

// ═══════════════════════════════════════════
// #region TYPES
// ═══════════════════════════════════════════
interface DoyunState extends CharacterState {
  doyunComboHitsLeft?: number;
  doyunComboTimer?: number;
  doyunDodgeFlashTimeLeft?: number;
}
// #endregion TYPES

// ═══════════════════════════════════════════
// #region CONFIG — character stats & metadata
// ═══════════════════════════════════════════
export const doyunConfig: CharacterConfig = {
  id: 'doyun',
  name: '도윤',
  maxHp: 150,
  speed: 1.2,
  attackPower: 13,
  defense: 14,
  baseAttackRange: 45,
  skillName: '불꽃 덩크 러시',
  skillDescription: `${SKILL_CONSTANTS.COOLDOWN}초 쿨타임. 가장 가까운 적에게 공중 도약 후 유도 돌진하여 반경 ${SKILL_CONSTANTS.SPLASH_RADIUS}px에 폭발 피해(공격력의 ${SKILL_CONSTANTS.DMG_MULTIPLIER}배 + ${SKILL_CONSTANTS.DMG_BASE})를 줍니다. 적중 후 주변 ${SKILL_CONSTANTS.COMBO_SEARCH_RADIUS}px에 적이 있으면 ${SKILL_CONSTANTS.COMBO_MAX_FOLLOW_UPS}회 추가 덩크합니다. 적중 시 ${SKILL_CONSTANTS.SHIELD_DURATION}초간 ${SKILL_CONSTANTS.SHIELD_AMOUNT} 흡수 실드를 얻으며, 항상 ${Math.round(SKILL_CONSTANTS.DODGE_CHANCE * 100)}% 확률로 피해를 회피합니다.`,
  color: '#ff6600',       // 주황색
  skillChargeRate: 100 / SKILL_CONSTANTS.COOLDOWN,
  tier: 'C',
  role: 'Guardian',
  detailedDescription: `도윤은 적진 한복판에서 연속 덩크로 전선을 흔드는 수호형 캐릭터입니다. 첫 덩크가 적중하면 주변 적을 찾아 연이어 내리꽂으며, 많은 적 사이에 뛰어들수록 더 큰 보상을 얻습니다. 적중 시 ${SKILL_CONSTANTS.SHIELD_DURATION}초간 피해를 막는 전용 보호막(Shield)을 얻고, 항상 ${Math.round(SKILL_CONSTANTS.DODGE_CHANCE * 100)}% 확률의 순간 회피로 위험한 반격을 흘려냅니다.`,
  luck: 10,
  attackSpeed: 1.0,
// #endregion CONFIG

  // ═══════════════════════════════════════════
  // #region SKILL_TRIGGER — air launch & targeting
  // ═══════════════════════════════════════════
  onSkillTrigger(char: CharacterState, ctx) {
    const state = char as DoyunState;
    char.skillActive = true;
    char.skillDurationLeft = 1.0;
    char.scaleMultiplier = 1.6; // Scale up for jump
    state.doyunComboHitsLeft = 0;
    state.doyunComboTimer = 0;

    // Target closest enemy
    let closestEnemy: CharacterState | null = null;
    let minDist = Infinity;
    ctx.characters.forEach((enemy) => {
      if (enemy.isDead || enemy.id === char.id) return;
      if (isSameTeam(char, enemy)) return;
      const dist = Math.hypot(enemy.x - char.x, enemy.y - char.y);
      if (dist < minDist) {
        minDist = dist;
        closestEnemy = enemy;
      }
    });

    if (closestEnemy) {
      const targetEnemy = closestEnemy as CharacterState;
      const angle = Math.atan2(targetEnemy.y - char.y, targetEnemy.x - char.x);
      const launchSpeed = char.speed * 14;
      char.vx = Math.cos(angle) * launchSpeed;
      char.vy = Math.sin(angle) * launchSpeed;
      (char as any).slamTargetId = targetEnemy.id;
    } else {
      // Random direction dash if no enemies
      const angle = Math.random() * Math.PI * 2;
      char.vx = Math.cos(angle) * (char.speed * 10);
      char.vy = Math.sin(angle) * (char.speed * 10);
      (char as any).slamTargetId = null;
    }
  },
  // #endregion SKILL_TRIGGER

  // ═══════════════════════════════════════════
  // #region UPDATE — slam timing & shield decay
  // ═══════════════════════════════════════════
  onUpdate(char: CharacterState, dt: number, ctx) {
    const state = char as DoyunState;
    // Shield timer update
    if (char.doyunShield && char.doyunShieldTimeLeft !== undefined && char.doyunShieldTimeLeft > 0) {
      char.doyunShieldTimeLeft -= dt;
      if (char.doyunShieldTimeLeft <= 0) {
        char.doyunShield = 0;
        char.doyunShieldTimeLeft = 0;
        console.log(`🛡️ [실드 소멸] 도윤의 보호막이 소멸했습니다.`);
      }
    }

    if ((state.doyunDodgeFlashTimeLeft ?? 0) > 0) {
      state.doyunDodgeFlashTimeLeft = Math.max(0, state.doyunDodgeFlashTimeLeft! - dt);
    }

    // Immune to stun while skill is active
    if (char.skillActive) {
      char.isStunned = false;
      char.stunTimeLeft = 0;
    }

    // Stun state handling
    if (char.isStunned) {
      char.stunTimeLeft -= dt;
      char.vx = 0;
      char.vy = 0;
      if (char.stunTimeLeft <= 0) {
        char.isStunned = false;
        const randomAngle = Math.random() * Math.PI * 2;
        const baseSpeed = 3.5 * char.speed;
        char.vx = Math.cos(randomAngle) * baseSpeed;
        char.vy = Math.sin(randomAngle) * baseSpeed;
      }
      return;
    }

    // Slam movement update
    if (char.skillActive) {
      if ((state.doyunComboHitsLeft ?? 0) > 0) {
        state.doyunComboTimer = (state.doyunComboTimer ?? 0) - dt;
        if (state.doyunComboTimer <= 0) executeFollowUpDunk(state, ctx);
        return;
      }

      if (Math.random() < 0.5) {
        ctx.createParticle(char.x, char.y, '#ff6600', 8, 15);
      }

      // Homing logic: update angle toward target every frame
      const targetId = (char as any).slamTargetId;
      let targetEnemy = ctx.characters.find((c) => c.id === targetId && !c.isDead) as CharacterState | undefined;
      
      if (!targetEnemy) {
        let closest: CharacterState | null = null;
        let minDist = Infinity;
        const chars = ctx.characters;
        for (const enemy of chars) {
          if (enemy.isDead || enemy.id === char.id) continue;
          if (isSameTeam(char, enemy)) continue;
          const dist = Math.hypot(enemy.x - char.x, enemy.y - char.y);
          if (dist < minDist) {
            minDist = dist;
            closest = enemy;
          }
        }
        if (closest) {
          targetEnemy = closest;
          (char as any).slamTargetId = closest.id;
        }
      }

      if (targetEnemy) {
        const angle = Math.atan2(targetEnemy.y - char.y, targetEnemy.x - char.x);
        const launchSpeed = char.speed * 14;
        char.vx = Math.cos(angle) * launchSpeed;
        char.vy = Math.sin(angle) * launchSpeed;
      }

      char.skillDurationLeft -= dt;
      if (char.skillDurationLeft <= 0) {
        executeDunkSlam(char, targetEnemy, ctx);
      }
    }
  },
  // #endregion UPDATE

  // ═══════════════════════════════════════════
  // #region COLLISION — explode on target hit
  // ═══════════════════════════════════════════
  onCollisionWithTarget(char: CharacterState, opponent: CharacterState, ctx) {
    const state = char as DoyunState;
    if (char.skillActive && !(state.doyunComboHitsLeft ?? 0) && !isSameTeam(char, opponent)) {
      executeDunkSlam(char, opponent, ctx);
    }
  },
  // #endregion COLLISION

  // ═══════════════════════════════════════════
  // #region DAMAGE — shield absorption logic
  // ═══════════════════════════════════════════
  onTakeDamage(target: CharacterState, _attacker: CharacterState, damage: number, ctx: CharacterBehaviorContext) {
    const state = target as DoyunState;
    if (Math.random() < SKILL_CONSTANTS.DODGE_CHANCE) {
      state.doyunDodgeFlashTimeLeft = SKILL_CONSTANTS.DODGE_FLASH_DURATION;
      ctx.addFloatingText(target.x, target.y - 45, '💨 DODGE!', '#fef3c7', 0.8);
      console.log(`💨 [순간 회피] 도윤이 ${damage} 피해를 회피했습니다.`);
      return { finalDamage: 0, blocked: true };
    }
    if (target.doyunShield && target.doyunShield > 0) {
      const absorb = Math.min(damage, target.doyunShield);
      target.doyunShield -= absorb;
      const finalDamage = damage - absorb;
      console.log(`🛡️ [실드 흡수] 도윤 -> 보호막이 ${absorb} 피해를 흡수했습니다. (남은 보호막: ${target.doyunShield})`);
      if (absorb > 0) {
        ctx.addFloatingText(target.x, target.y - 45, `🛡️ ABSORB -${absorb}`, '#00ccff', 1.0);
      }
      return { finalDamage, blocked: finalDamage <= 0 };
    }
    return { finalDamage: damage, blocked: false };
  },
  // #endregion DAMAGE

  // ═══════════════════════════════════════════
  // #region RENDER — shield visual circle, stun stars
  // ═══════════════════════════════════════════
  onRenderExtra(char: CharacterState, canvasCtx: CanvasRenderingContext2D, currentRadius: number) {
    const state = char as DoyunState;
    if ((state.doyunDodgeFlashTimeLeft ?? 0) > 0) {
      canvasCtx.save();
      canvasCtx.globalAlpha = state.doyunDodgeFlashTimeLeft! / SKILL_CONSTANTS.DODGE_FLASH_DURATION;
      canvasCtx.strokeStyle = '#fef3c7';
      canvasCtx.lineWidth = 3;
      canvasCtx.beginPath();
      canvasCtx.arc(char.x, char.y, currentRadius + 12, 0, Math.PI * 2);
      canvasCtx.stroke();
      canvasCtx.restore();
    }

    // Blue shield circle
    if (char.doyunShield && char.doyunShield > 0) {
      canvasCtx.save();
      canvasCtx.strokeStyle = '#00ccff';
      canvasCtx.lineWidth = 3.0;
      canvasCtx.shadowBlur = 10;
      canvasCtx.shadowColor = '#00ccff';
      canvasCtx.beginPath();
      canvasCtx.arc(char.x, char.y, currentRadius + 3, 0, Math.PI * 2);
      canvasCtx.stroke();
      canvasCtx.restore();
    }

    // Stun stars
    if (char.isStunned) {
      canvasCtx.save();
      const numStars = 3;
      const timeFactor = Date.now() / 150;
      canvasCtx.fillStyle = '#ffd700';
      canvasCtx.font = '12px Arial';
      canvasCtx.textAlign = 'center';
      canvasCtx.textBaseline = 'middle';
      for (let idx = 0; idx < numStars; idx++) {
        const starAngle = timeFactor + (idx * Math.PI * 2) / numStars;
        const starX = char.x + Math.cos(starAngle) * (currentRadius + 6);
        const starY = char.y - currentRadius - 10 + Math.sin(starAngle) * 4;
        canvasCtx.fillText('💫', starX, starY);
      }
      canvasCtx.restore();
    }
  }
  // #endregion RENDER
};

// ═══════════════════════════════════════════
// #region HELPERS — dunk slam execution
// ═══════════════════════════════════════════
function executeDunkSlam(char: CharacterState, target: CharacterState | undefined, ctx: CharacterBehaviorContext) {
  if (!char.skillActive) return;
  char.skillActive = false;
  char.scaleMultiplier = 1.0; // scale back

  const slamX = target ? target.x : char.x;
  const slamY = target ? target.y : char.y;

  console.log(`🏀 [덩크 슬램] 도윤 -> 내리꽂기 폭발 작동! (유도 추적 대상: ${target ? target.name : '지면'})`);
  ctx.logMessage?.(`🏀 [덩크 슬램] 도윤 ➡️ 내리꽂기 폭발! (대상: ${target ? target.name : '지면'})`, 'skill');

  ctx.createExplosion(slamX, slamY, '#ff6600', 30);
  ctx.createExplosion(slamX, slamY, '#ffd700', 15);
  ctx.addFloatingText(slamX, slamY - 35, '🏀 SLAM DUNK!', '#ff6600', 1.6);

  let hitEnemy = false;

  // Splash damage and knockback within splash radius
  ctx.characters.forEach((enemy: CharacterState) => {
    if (enemy.isDead || enemy.id === char.id) return;
    if (isSameTeam(char, enemy)) return;
    const dist = Math.hypot(enemy.x - slamX, enemy.y - slamY);
    if (dist <= SKILL_CONSTANTS.SPLASH_RADIUS) {
      const damage = Math.round(char.attackPower * SKILL_CONSTANTS.DMG_MULTIPLIER) + SKILL_CONSTANTS.DMG_BASE;
      ctx.dealDamage(char, enemy, damage, 'DUNK SLAM!');
      hitEnemy = true;

      // Strong knockback
      const kAngle = Math.atan2(enemy.y - slamY, enemy.x - slamX);
      enemy.vx = Math.cos(kAngle) * 14;
      enemy.vy = Math.sin(kAngle) * 14;

      // Min speed guarantee
      const curSpd = Math.hypot(enemy.vx, enemy.vy);
      const baseSpd = 3.5 * enemy.speed;
      if (curSpd < baseSpd * 0.8) {
        enemy.vx = (enemy.vx / (curSpd || 1)) * baseSpd;
        enemy.vy = (enemy.vy / (curSpd || 1)) * baseSpd;
      }
    }
  });

  // Grant shield only on successful hits
  if (hitEnemy) {
    char.doyunShield = SKILL_CONSTANTS.SHIELD_AMOUNT;
    char.doyunShieldTimeLeft = SKILL_CONSTANTS.SHIELD_DURATION;
    ctx.addFloatingText(char.x, char.y - 65, `🛡️ SHIELD +${SKILL_CONSTANTS.SHIELD_AMOUNT}`, '#00ccff', 1.5);
    console.log(`🛡️ [실드 획득] 도윤 -> 덩크슛 적중으로 ${SKILL_CONSTANTS.SHIELD_DURATION}초간 ${SKILL_CONSTANTS.SHIELD_AMOUNT} 보호막 획득`);
    ctx.logMessage?.(`🛡️ [실드 획득] 도윤 ➡️ ${SKILL_CONSTANTS.SHIELD_DURATION}초간 ${SKILL_CONSTANTS.SHIELD_AMOUNT} 흡수 실드 활성화`, 'skill');
    const state = char as DoyunState;
    if (findClosestEnemy(char, ctx, SKILL_CONSTANTS.COMBO_SEARCH_RADIUS)) {
      state.doyunComboHitsLeft = SKILL_CONSTANTS.COMBO_MAX_FOLLOW_UPS;
      state.doyunComboTimer = SKILL_CONSTANTS.COMBO_INTERVAL;
      char.skillActive = true;
      ctx.logMessage?.(`🏀 [덩크 러시] 도윤 ➡️ 추가 덩크 ${SKILL_CONSTANTS.COMBO_MAX_FOLLOW_UPS}회 준비!`, 'skill');
    }
  } else {
    console.log(`🏀 [실드 미획득] 도윤 -> 덩크슛이 빗나가 실드를 획득하지 못했습니다.`);
    ctx.addFloatingText(char.x, char.y - 65, '❌ MISS! 실드 없음', '#888888', 1.2);
  }

  // Stabilize own velocity
  const currentSpeed = Math.hypot(char.vx, char.vy);
  char.vx = (char.vx / (currentSpeed || 1)) * (char.speed * 3.5);
  char.vy = (char.vy / (currentSpeed || 1)) * (char.speed * 3.5);
}

function executeFollowUpDunk(char: DoyunState, ctx: CharacterBehaviorContext) {
  const target = findClosestEnemy(char, ctx, SKILL_CONSTANTS.COMBO_SEARCH_RADIUS);
  if (!target) {
    char.doyunComboHitsLeft = 0;
    char.skillActive = false;
    return;
  }

  const damage = Math.round(char.attackPower * SKILL_CONSTANTS.COMBO_DAMAGE_MULTIPLIER) + SKILL_CONSTANTS.COMBO_DAMAGE_BASE;
  ctx.dealDamage(char, target, damage, 'DUNK RUSH!');
  ctx.createExplosion(target.x, target.y, '#ff8c00', 16);
  ctx.addFloatingText(target.x, target.y - 35, '🏀 RUSH DUNK!', '#ffd700', 0.8);

  const angle = Math.atan2(target.y - char.y, target.x - char.x);
  target.vx = Math.cos(angle) * SKILL_CONSTANTS.COMBO_KNOCKBACK_SPEED;
  target.vy = Math.sin(angle) * SKILL_CONSTANTS.COMBO_KNOCKBACK_SPEED;
  char.x = target.x;
  char.y = target.y;
  char.doyunComboHitsLeft = Math.max(0, (char.doyunComboHitsLeft ?? 0) - 1);
  char.doyunComboTimer = SKILL_CONSTANTS.COMBO_INTERVAL;

  if (char.doyunComboHitsLeft === 0) {
    char.skillActive = false;
    const currentSpeed = Math.hypot(char.vx, char.vy);
    char.vx = (char.vx / (currentSpeed || 1)) * (char.speed * 3.5);
    char.vy = (char.vy / (currentSpeed || 1)) * (char.speed * 3.5);
  }
}

function findClosestEnemy(char: CharacterState, ctx: CharacterBehaviorContext, maxDistance: number): CharacterState | undefined {
  let closest: CharacterState | undefined;
  let minDistance = maxDistance;
  for (const enemy of ctx.characters) {
    if (enemy.isDead || enemy.id === char.id || isSameTeam(char, enemy)) continue;
    const distance = Math.hypot(enemy.x - char.x, enemy.y - char.y);
    if (distance < minDistance) {
      closest = enemy;
      minDistance = distance;
    }
  }
  return closest;
}

function isSameTeam(source: CharacterState, target: CharacterState): boolean {
  return source.teamId !== undefined && target.teamId !== undefined && source.teamId === target.teamId;
}
// #endregion HELPERS
