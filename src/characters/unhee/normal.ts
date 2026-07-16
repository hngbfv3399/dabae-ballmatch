import type { CharacterConfig, CharacterState, CharacterBehaviorContext } from '../character.interface';

// ═══════════════════════════════════════════
// #region CONSTANTS
// ═══════════════════════════════════════════
const SKILL_CONSTANTS = {
  COOLDOWN: 10,
  WORKOUT_DURATION: 2.0,       // workout channeling time (2s)
  BULKUP_DURATION: 7.0,        // bulkup buff duration (7s)
  TOTAL_DURATION: 9.0,         // total skill duration (2 + 7 = 9s)
  HEAL_AMOUNT: 35,             // heal amount on workout completion
  ATK_MULTIPLIER: 2,           // attack multiplier
  BASE_ATK: 12,                // base attack power
  BULKUP_ATK: 24,              // bulkup attack power (12 * 2)
  BASE_SPEED: 1.5,             // base movement speed
  SPEED_REDUCTION_PCT: 30,     // speed reduction % during bulkup
  BULKUP_SPEED: 1.05,          // bulkup speed (1.5 * 0.7 = 1.05)
  SCALE: 1.6,                  // scale multiplier
  DMG_REDUCTION_PCT: 50,       // damage reduction %
};
// #endregion CONSTANTS

// ═══════════════════════════════════════════
// #region CONFIG — character stats & metadata
// ═══════════════════════════════════════════
export const unheeConfig: CharacterConfig = {
  id: 'unhee',
  name: '운희',
  maxHp: 150,
  speed: SKILL_CONSTANTS.BASE_SPEED,
  attackPower: SKILL_CONSTANTS.BASE_ATK,
  defense: 16,
  baseAttackRange: 45,
  skillName: '벌크업 피트니스 (Bulk-up)',
  skillDescription: `${SKILL_CONSTANTS.COOLDOWN}초 쿨타임. 스킬 게이지가 100%가 되면 제자리에서 ${SKILL_CONSTANTS.WORKOUT_DURATION}초간 쇠질 운동을 시작합니다. 운동 중에는 움직일 수 없지만, 완료 시 체력을 ${SKILL_CONSTANTS.HEAL_AMOUNT} 즉시 회복하고 ${SKILL_CONSTANTS.BULKUP_DURATION}초간 덩치가 ${SKILL_CONSTANTS.SCALE}배 커지고 공격력이 ${SKILL_CONSTANTS.ATK_MULTIPLIER}배(${SKILL_CONSTANTS.BULKUP_ATK}) 증가하며 받는 피해가 ${SKILL_CONSTANTS.DMG_REDUCTION_PCT}% 감소합니다. 대신 이동 속도가 ${SKILL_CONSTANTS.SPEED_REDUCTION_PCT}%(${SKILL_CONSTANTS.BULKUP_SPEED}) 느려집니다. 패시브: 적과 충돌 시 35% 확률로 1.5초간 대상을 [강제 쇠질] 상태(이동 불가 기절, 대상별 내부 쿨타임 4초)로 만듭니다.`,
  color: '#ff8c00', // 진한 오렌지 (쇠질 느낌)
  skillChargeRate: 100 / SKILL_CONSTANTS.COOLDOWN, // 10초 쿨타임
  tier: 'D',
  role: 'Juggernaut',
  detailedDescription: `운희는 '쇠질(웨이트 트레이닝)'과 적 접촉 시 발동되는 강제 쇠질 패시브를 활용하여 적의 기동력을 억제하고 생존력을 높이는 전투 지속형 돌격형 전사 캐릭터입니다. 스킬 완료 시 대량의 체력 회복과 함께 덩치 및 공격력이 대폭 상승하고 받는 피해를 50% 줄인 채 적을 압박할 수 있습니다.`,
  luck: 8,         // 운 스탯 — 크리티컬 확률과 가챠 가중치에 영향
  attackSpeed: 0.9,   // 공격속도 배율
// #endregion CONFIG

  // ═══════════════════════════════════════════
  // #region SKILL_TRIGGER — start workout channeling
  // ═══════════════════════════════════════════
  onSkillTrigger(char: CharacterState, ctx) {
    char.skillActive = true;
    char.skillDurationLeft = SKILL_CONSTANTS.TOTAL_DURATION; // 2s workout + 7s bulkup
    (char as any).workoutFinished = false;
    (char as any).unhwiBuffActive = false;
    
    // Stop movement
    char.vx = 0;
    char.vy = 0;

    ctx.addFloatingText(char.x, char.y - 60, '🏋️ 쇠질 시작! (근비대 측정)', '#ff8c00', 1.5);
    console.log(`🏋️ [쇠질 돌입] 운희 -> ${SKILL_CONSTANTS.WORKOUT_DURATION}초간 운동 개시 (움직임 불가능)`);
    ctx.logMessage?.(`🏋️ [쇠질 돌입] 운희 ➡️ ${SKILL_CONSTANTS.WORKOUT_DURATION}초간 쇠질 운동 개시 (이동 불가)`, 'skill');
  },
  // #endregion SKILL_TRIGGER

  // ═══════════════════════════════════════════
  // #region UPDATE — workout channel & bulkup timer
  // ═══════════════════════════════════════════
  onUpdate(char: CharacterState, dt: number, ctx) {
    if (char.skillActive) {
      char.skillDurationLeft -= dt;
      const elapsed = SKILL_CONSTANTS.TOTAL_DURATION - char.skillDurationLeft;

      // 1. Channeling Workout (0.0 ~ WORKOUT_DURATION)
      if (elapsed < SKILL_CONSTANTS.WORKOUT_DURATION) {
        char.vx = 0;
        char.vy = 0;

        // Sweat drops (blue) & energy particles (orange)
        if (Math.random() < 0.25) {
          ctx.createParticle(char.x + (Math.random() - 0.5) * 20, char.y - 15, '#00ddff', 2 + Math.random() * 2, 10);
        }
        if (Math.random() < 0.2) {
          ctx.createParticle(char.x + (Math.random() - 0.5) * 35, char.y + 15, '#ff8c00', 2.5, 12);
        }

        // Show floating quotes every 800ms
        const quoteTimer = (char as any).quoteTimer || 0;
        if (Date.now() - quoteTimer > 800) {
          (char as any).quoteTimer = Date.now();
          const quotes = ['🏋️ 흡! 하!', '💦 득근 득근', '💪 3대 500!', '🔥 근손실 안돼!'];
          const randQuote = quotes[Math.floor(Math.random() * quotes.length)];
          ctx.addFloatingText(char.x, char.y - 45, randQuote, '#ff8c00', 0.8);
        }
      } 
      // 2. Workout Complete -> Enter Bulkup Buff Phase
      else if (!(char as any).workoutFinished) {
        (char as any).workoutFinished = true;
        (char as any).unhwiBuffActive = true;

        char.scaleMultiplier = SKILL_CONSTANTS.SCALE; // Grow size
        char.speed = SKILL_CONSTANTS.BULKUP_SPEED;    // Speed reduction (1.5 -> 1.05)
        char.attackPower = SKILL_CONSTANTS.BULKUP_ATK; // Double attack power (12 -> 24)

        // Instant HP recovery
        const healAmount = SKILL_CONSTANTS.HEAL_AMOUNT;
        char.hp = Math.min(char.maxHp, char.hp + healAmount);
        ctx.addFloatingText(char.x, char.y - 85, `💚 +${healAmount} HEAL`, '#39ff14', 1.8);
        ctx.createParticle(char.x, char.y, '#39ff14', 5, 20);

        // Resume movement immediately to avoid sticking
        const randomAngle = Math.random() * Math.PI * 2;
        const baseSpeed = 3.5 * char.speed;
        char.vx = Math.cos(randomAngle) * baseSpeed;
        char.vy = Math.sin(randomAngle) * baseSpeed;

        ctx.createExplosion(char.x, char.y, '#ff8c00', 25);
        ctx.addFloatingText(char.x, char.y - 65, '💪 벌크업 완료! (공/방 폭발)', '#ff3300', 2.0);
        console.log(`🏋️ [벌크업 성공] 운희 -> 체력 ${healAmount} 회복 및 ${SKILL_CONSTANTS.BULKUP_DURATION}초간 벌크업 상태 돌입 (크기 ${SKILL_CONSTANTS.SCALE}배, 공격 ${SKILL_CONSTANTS.BULKUP_ATK}, 방어 ${SKILL_CONSTANTS.DMG_REDUCTION_PCT}% 증가, 속도 ${SKILL_CONSTANTS.BULKUP_SPEED})`);
        ctx.logMessage?.(`🏋️ [벌크업 성공] 운희 ➡️ 체력 ${healAmount} 회복 및 ${SKILL_CONSTANTS.BULKUP_DURATION}초 벌크업 (공격력 ${SKILL_CONSTANTS.BULKUP_ATK}, 피해감소 ${SKILL_CONSTANTS.DMG_REDUCTION_PCT}%, 크기 ${SKILL_CONSTANTS.SCALE}배)`, 'skill');
      }

      // 3. Skills End
      if (char.skillDurationLeft <= 0) {
        char.skillActive = false;
        char.scaleMultiplier = 1.0;
        char.speed = SKILL_CONSTANTS.BASE_SPEED;
        char.attackPower = SKILL_CONSTANTS.BASE_ATK;
        (char as any).unhwiBuffActive = false;
        (char as any).workoutFinished = false;

        const randomAngle = Math.random() * Math.PI * 2;
        const baseSpeed = 3.5 * char.speed;
        char.vx = Math.cos(randomAngle) * baseSpeed;
        char.vy = Math.sin(randomAngle) * baseSpeed;

        ctx.addFloatingText(char.x, char.y - 45, '💨 벌크업 해제', '#888888', 1.2);
        console.log(`🏋️ [벌크업 만료] 운희 -> 일반 상태로 복구되었습니다.`);
      }
    }
  },
  // #endregion UPDATE

  // ═══════════════════════════════════════════
  // #region COLLISION — passive forced workout on contact
  // ═══════════════════════════════════════════
  onCollisionWithTarget(char: CharacterState, opponent: CharacterState, ctx) {
    if (opponent.isDead || opponent.id.includes('clone')) return;
    // 강제 쇠질은 적에게만 적용한다. 팀전/보스전의 아군 충돌은 CC를 발생시키지 않는다.
    if (char.teamId !== undefined && opponent.teamId !== undefined && char.teamId === opponent.teamId) return;

    // Passive: 35% chance to force opponent to exercise (stun 1.5s) on contact (4s internal cooldown per target)
    const now = Date.now();
    const oppAny = opponent as any;
    if (oppAny.lastUnheeStunTime === undefined) {
      oppAny.lastUnheeStunTime = 0;
    }

    if (now - oppAny.lastUnheeStunTime >= 4000) {
      if (Math.random() < 0.35) {
        oppAny.lastUnheeStunTime = now;
        ctx.applyStun(char, opponent, 1.5);

        ctx.addFloatingText(opponent.x, opponent.y - 50, '🏋️ 강제 쇠질! (1.5초)', '#ff8c00', 1.6);
        
        for (let i = 0; i < 5; i++) {
          ctx.createParticle(opponent.x, opponent.y - 15, '#00ddff', 2 + Math.random() * 2, 10);
        }

        ctx.logMessage?.(`🏋️ [강제 쇠질] 운희 ➡️ ${opponent.name}에게 1.5초간 강제 운동 부여! (이동 불가)`, 'damage');
      }
    }
  },
  // #endregion COLLISION

  // ═══════════════════════════════════════════
  // #region DAMAGE — 50% damage reduction during bulkup
  // ═══════════════════════════════════════════
  onTakeDamage(target: CharacterState, _attacker: CharacterState, damage: number, _ctx: CharacterBehaviorContext) {
    if ((target as any).unhwiBuffActive) {
      let finalDamage = Math.round(damage * (1 - SKILL_CONSTANTS.DMG_REDUCTION_PCT / 100));
      if (finalDamage < 1 && damage >= 1) {
        finalDamage = 1; // Minimum 1 damage guarantee
      }
      return { finalDamage, blocked: false };
    }
    return { finalDamage: damage, blocked: false };
  },
  // #endregion DAMAGE

  // ═══════════════════════════════════════════
  // #region RENDER — barbell visual, bulkup aura ring
  // ═══════════════════════════════════════════
  onRenderExtra(char: CharacterState, canvasCtx: CanvasRenderingContext2D, currentRadius: number) {
    if (char.skillActive) {
      const elapsed = SKILL_CONSTANTS.TOTAL_DURATION - char.skillDurationLeft;

      // Barbell rendering during workout
      if (elapsed < SKILL_CONSTANTS.WORKOUT_DURATION) {
        canvasCtx.save();
        canvasCtx.strokeStyle = '#555555';
        canvasCtx.lineWidth = 4;
        
        // Bar
        const barLength = currentRadius * 2.2;
        canvasCtx.beginPath();
        canvasCtx.moveTo(char.x - barLength / 2, char.y - currentRadius - 8);
        canvasCtx.lineTo(char.x + barLength / 2, char.y - currentRadius - 8);
        canvasCtx.stroke();

        // Outer plates
        canvasCtx.fillStyle = '#111111';
        canvasCtx.beginPath();
        canvasCtx.arc(char.x - barLength / 2, char.y - currentRadius - 8, 8, 0, Math.PI * 2);
        canvasCtx.arc(char.x + barLength / 2, char.y - currentRadius - 8, 8, 0, Math.PI * 2);
        canvasCtx.fill();

        canvasCtx.fillStyle = '#ff8c00';
        canvasCtx.beginPath();
        canvasCtx.arc(char.x - barLength / 2 - 4, char.y - currentRadius - 8, 5, 0, Math.PI * 2);
        canvasCtx.arc(char.x + barLength / 2 + 4, char.y - currentRadius - 8, 5, 0, Math.PI * 2);
        canvasCtx.fill();

        canvasCtx.restore();
      } 
      // Flame aura during bulkup
      else if ((char as any).unhwiBuffActive) {
        canvasCtx.save();
        canvasCtx.strokeStyle = '#ff3300';
        canvasCtx.lineWidth = 4;
        canvasCtx.shadowBlur = 18;
        canvasCtx.shadowColor = '#ff6600';
        
        const pulse = Math.sin(Date.now() / 60) * 3;
        canvasCtx.beginPath();
        canvasCtx.arc(char.x, char.y, currentRadius + 4 + pulse, 0, Math.PI * 2);
        canvasCtx.stroke();
        canvasCtx.restore();
      }
    }
  }
  // #endregion RENDER
};
