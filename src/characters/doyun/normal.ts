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
};
// #endregion CONSTANTS

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
  skillName: '불꽃 덩크슛 슬램',
  skillDescription: `${SKILL_CONSTANTS.COOLDOWN}초 쿨타임. 가장 가까운 적에게 공중 도약(크기 확대) 후 유도 돌진하여 내리꽂아 반경 ${SKILL_CONSTANTS.SPLASH_RADIUS}px 내의 모든 적에게 광역 폭발 피해(공격력의 ${SKILL_CONSTANTS.DMG_MULTIPLIER}배 + ${SKILL_CONSTANTS.DMG_BASE})를 주고 밀쳐냅니다. 돌진이 적에게 적중했을 경우에만 ${SKILL_CONSTANTS.SHIELD_DURATION}초간 ${SKILL_CONSTANTS.SHIELD_AMOUNT} 대미지를 막아내는 실드를 획득합니다.`,
  color: '#ff6600',       // 주황색
  skillChargeRate: 100 / SKILL_CONSTANTS.COOLDOWN,
  tier: 'C',
  role: 'Guardian',
  detailedDescription: `도윤은 뛰어난 군중 제어(CC)와 생존 장벽을 겸비한 수호형 캐릭터입니다. 스킬 사용 시 공중으로 도약한 뒤 적에게 내려꽂히는 유도 덩크슛 공격을 시전하여 주변 적들을 일시에 기절시키고 멀리 밀쳐냅니다. 돌진이 적에게 적중했을 때에만 ${SKILL_CONSTANTS.SHIELD_DURATION}초간 피해를 막아주는 전용 보호막(Shield)을 생성해, 정확한 판단이 요구되는 리스크-리턴형 캐릭터입니다.`,
// #endregion CONFIG

  // ═══════════════════════════════════════════
  // #region SKILL_TRIGGER — air launch & targeting
  // ═══════════════════════════════════════════
  onSkillTrigger(char: CharacterState, ctx) {
    char.skillActive = true;
    char.skillDurationLeft = 1.0;
    char.scaleMultiplier = 1.6; // Scale up for jump

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
    // Shield timer update
    if (char.doyunShield && char.doyunShieldTimeLeft !== undefined && char.doyunShieldTimeLeft > 0) {
      char.doyunShieldTimeLeft -= dt;
      if (char.doyunShieldTimeLeft <= 0) {
        char.doyunShield = 0;
        char.doyunShieldTimeLeft = 0;
        console.log(`🛡️ [실드 소멸] 도윤의 보호막이 소멸했습니다.`);
      }
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
    if (char.skillActive && !isSameTeam(char, opponent)) {
      executeDunkSlam(char, opponent, ctx);
    }
  },
  // #endregion COLLISION

  // ═══════════════════════════════════════════
  // #region DAMAGE — shield absorption logic
  // ═══════════════════════════════════════════
  onTakeDamage(target: CharacterState, _attacker: CharacterState, damage: number, ctx: CharacterBehaviorContext) {
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
  } else {
    console.log(`🏀 [실드 미획득] 도윤 -> 덩크슛이 빗나가 실드를 획득하지 못했습니다.`);
    ctx.addFloatingText(char.x, char.y - 65, '❌ MISS! 실드 없음', '#888888', 1.2);
  }

  // Stabilize own velocity
  const currentSpeed = Math.hypot(char.vx, char.vy);
  char.vx = (char.vx / (currentSpeed || 1)) * (char.speed * 3.5);
  char.vy = (char.vy / (currentSpeed || 1)) * (char.speed * 3.5);
}

function isSameTeam(source: CharacterState, target: CharacterState): boolean {
  return source.teamId !== undefined && target.teamId !== undefined && source.teamId === target.teamId;
}
// #endregion HELPERS
