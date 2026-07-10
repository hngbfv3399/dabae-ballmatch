import type { CharacterConfig, CharacterState } from './character.interface';

const SKILL_CONSTANTS = {
  COOLDOWN: 5,
  SPLASH_RADIUS: 100,
  DMG_MULTIPLIER: 2.2,
  DMG_BASE: -5,
  SHIELD_AMOUNT: 6,
  SHIELD_DURATION: 3.0,
};

export const doyunConfig: CharacterConfig = {
  id: 'doyun',
  name: '도윤',
  maxHp: 150,
  speed: 1.2,
  attackPower: 13,
  baseAttackRange: 45,
  skillName: '불꽃 덩크슛 슬램',
  skillDescription: `${SKILL_CONSTANTS.COOLDOWN}초 쿨타임. 가장 가까운 적에게 공중 도약(크기 확대) 후 유도 돌진하여 내리꽂아 반경 ${SKILL_CONSTANTS.SPLASH_RADIUS}px 내의 모든 적에게 광역 폭발 피해(공격력의 ${SKILL_CONSTANTS.DMG_MULTIPLIER}배 + ${SKILL_CONSTANTS.DMG_BASE})를 주고 밀쳐냅니다. 돌진이 적에게 적중했을 경우에만 ${SKILL_CONSTANTS.SHIELD_DURATION}초간 ${SKILL_CONSTANTS.SHIELD_AMOUNT} 대미지를 막아내는 실드를 획득합니다.`,
  color: '#ff6600',       // 주황색
  skillChargeRate: 100 / SKILL_CONSTANTS.COOLDOWN,
  tier: 'C',
  role: 'Guardian',
  detailedDescription: `도윤은 뛰어난 군중 제어(CC)와 생존 장벽을 겸비한 수호형 캐릭터입니다. 스킬 사용 시 공중으로 도약한 뒤 적에게 내려꽂히는 유도 덩크슛 공격을 시전하여 주변 적들을 일시에 기절시키고 멀리 밀쳐냅니다. 돌진이 적에게 적중했을 때에만 ${SKILL_CONSTANTS.SHIELD_DURATION}초간 피해를 막아주는 전용 보호막(Shield)을 생성해, 정확한 판단이 요구되는 리스크-리턴형 캐릭터입니다.`,

  // [1] 스킬 최초 시동 시 훅
  onSkillTrigger(char: CharacterState, ctx) {
    char.skillActive = true;
    char.skillDurationLeft = 1.0;
    char.scaleMultiplier = 1.6; // 도약 크기 팽창

    // 가장 가까운 적을 찾아서 조준 돌진 및 타겟 ID 저장
    let closestEnemy: CharacterState | null = null;
    let minDist = Infinity;
    ctx.characters.forEach((enemy) => {
      if (enemy.isDead || enemy.id === char.id) return;
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
      // 적이 없으면 랜덤 방향 돌진
      const angle = Math.random() * Math.PI * 2;
      char.vx = Math.cos(angle) * (char.speed * 10);
      char.vy = Math.sin(angle) * (char.speed * 10);
      (char as any).slamTargetId = null;
    }
  },

  // [2] 매 프레임 업데이트 훅
  onUpdate(char: CharacterState, dt: number, ctx) {
    // 실드 시간 업데이트
    if (char.doyunShield && char.doyunShieldTimeLeft !== undefined && char.doyunShieldTimeLeft > 0) {
      char.doyunShieldTimeLeft -= dt;
      if (char.doyunShieldTimeLeft <= 0) {
        char.doyunShield = 0;
        char.doyunShieldTimeLeft = 0;
        console.log(`🛡️ [실드 소멸] 도윤의 보호막이 소멸했습니다.`);
      }
    }

    // 덩크 슬램 시전 중에는 기절 상태 즉시 면역 및 해제 (시전 보장 판정)
    if (char.skillActive) {
      char.isStunned = false;
      char.stunTimeLeft = 0;
    }

    // 2-A. 기절 상태 처리
    if (char.isStunned) {
      char.stunTimeLeft -= dt;
      char.vx = 0;
      char.vy = 0;
      if (char.stunTimeLeft <= 0) {
        char.isStunned = false;
        // 기절 풀렸을 때 속도 복구
        const randomAngle = Math.random() * Math.PI * 2;
        const baseSpeed = 3.5 * char.speed;
        char.vx = Math.cos(randomAngle) * baseSpeed;
        char.vy = Math.sin(randomAngle) * baseSpeed;
      }
      return;
    }

    // 2-B. 덩크 돌진 업데이트 및 만료 처리
    if (char.skillActive) {
      // 주황색 대시 잔상 파티클 방출
      if (Math.random() < 0.5) {
        ctx.createParticle(char.x, char.y, '#ff6600', 8, 15);
      }

      // 유도 로직: 매 프레임 타겟을 따라 조준을 수정합니다. (무조건 맞도록)
      const targetId = (char as any).slamTargetId;
      let targetEnemy = ctx.characters.find((c) => c.id === targetId && !c.isDead) as CharacterState | undefined;
      
      if (!targetEnemy) {
        let closest: CharacterState | null = null;
        let minDist = Infinity;
        const chars = (ctx as any).characters as CharacterState[];
        for (const enemy of chars) {
          if (enemy.isDead || enemy.id === char.id) continue;
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
        // 지속시간 초과 시 지상 착지 폭발 (유도 대상 강제 전달)
        executeDunkSlam(char, targetEnemy, ctx);
      }
    }
  },

  // [3] 다른 캐릭터와 물리적 충돌 발생 시 훅
  onCollisionWithTarget(char: CharacterState, opponent: CharacterState, ctx) {
    // 덩크 도약 돌진 중에 누군가와 부딪히면 즉시 착지 폭발 격발!
    if (char.skillActive) {
      executeDunkSlam(char, opponent, ctx);
    }
  },

  // [4] 캐릭터 추가 렌더링 훅
  onRenderExtra(char: CharacterState, canvasCtx: CanvasRenderingContext2D, currentRadius: number) {
    // 실드 활성화 시 푸른색 보호막 서클 그리기
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

    // 기절 💫 드로잉
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
};

/**
 * 도윤 덩크슛 슬램 착지 및 넉백 광역 폭화 대미지 처리 (doyun.ts 로 격리)
 */
function executeDunkSlam(char: CharacterState, target: CharacterState | undefined, ctx: any) {
  if (!char.skillActive) return;
  char.skillActive = false;
  char.scaleMultiplier = 1.0; // 크기 원상 복귀

  const slamX = target ? target.x : char.x;
  const slamY = target ? target.y : char.y;

  console.log(`🏀 [덩크 슬램] 도윤 -> 내리꽂기 폭발 작동! (유도 추적 대상: ${target ? target.name : '지면'})`);
  ctx.logMessage?.(`🏀 [덩크 슬램] 도윤 ➡️ 내리꽂기 폭발! (대상: ${target ? target.name : '지면'})`, 'skill');

  ctx.createExplosion(slamX, slamY, '#ff6600', 30);
  ctx.createExplosion(slamX, slamY, '#ffd700', 15);
  ctx.addFloatingText(slamX, slamY - 35, '🏀 SLAM DUNK!', '#ff6600', 1.6);

  // 적중 여부 판정: 광역 범위 내 적이 1명이라도 있어야 실드 획득
  let hitEnemy = false;

  // 100px 내 광역 피해 및 강한 넉백
  ctx.characters.forEach((enemy: CharacterState) => {
    if (enemy.isDead || enemy.id === char.id) return;
    const dist = Math.hypot(enemy.x - slamX, enemy.y - slamY);
    if (dist <= SKILL_CONSTANTS.SPLASH_RADIUS) {
      const damage = Math.round(char.attackPower * SKILL_CONSTANTS.DMG_MULTIPLIER) + SKILL_CONSTANTS.DMG_BASE;
      ctx.dealDamage(char, enemy, damage, 'DUNK SLAM!');
      hitEnemy = true;

      // 강한 넉백 각도
      const kAngle = Math.atan2(enemy.y - slamY, enemy.x - slamX);
      enemy.vx = Math.cos(kAngle) * 14;
      enemy.vy = Math.sin(kAngle) * 14;

      // 최소 속도 보장
      const curSpd = Math.hypot(enemy.vx, enemy.vy);
      const baseSpd = 3.5 * enemy.speed;
      if (curSpd < baseSpd * 0.8) {
        enemy.vx = (enemy.vx / (curSpd || 1)) * baseSpd;
        enemy.vy = (enemy.vy / (curSpd || 1)) * baseSpd;
      }
    }
  });

  // 적에게 적중한 경우에만 실드 부여
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

  // 본인 속도 안정화
  const currentSpeed = Math.hypot(char.vx, char.vy);
  char.vx = (char.vx / (currentSpeed || 1)) * (char.speed * 3.5);
  char.vy = (char.vy / (currentSpeed || 1)) * (char.speed * 3.5);
}
