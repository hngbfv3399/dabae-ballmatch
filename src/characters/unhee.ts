import type { CharacterConfig, CharacterState } from './character.interface';

const SKILL_CONSTANTS = {
  COOLDOWN: 10,
  WORKOUT_DURATION: 2.0,       // 쇠질 채널링 시간 (2초)
  BULKUP_DURATION: 7.0,        // 벌크업 버프 지속시간 (7초)
  TOTAL_DURATION: 9.0,         // 총 스킬 지속 (2 + 7 = 9초)
  HEAL_AMOUNT: 35,             // 쇠질 완료 시 회복량
  ATK_MULTIPLIER: 2,           // 공격력 배율
  BASE_ATK: 12,                // 기본 공격력
  BULKUP_ATK: 24,              // 벌크업 공격력 (12 * 2)
  BASE_SPEED: 1.5,             // 기본 이속
  SPEED_REDUCTION_PCT: 30,     // 벌크업 이속 감소 비율 (%)
  BULKUP_SPEED: 1.05,          // 벌크업 이속 (1.5 * 0.7 = 1.05)
  SCALE: 1.6,                  // 덩치 확대 배율
  DMG_REDUCTION_PCT: 50,       // 받는 피해 감소 비율
};

export const unheeConfig: CharacterConfig = {
  id: 'unhee',
  name: '운희',
  maxHp: 150,
  speed: SKILL_CONSTANTS.BASE_SPEED,
  attackPower: SKILL_CONSTANTS.BASE_ATK,
  baseAttackRange: 45,
  skillName: '벌크업 피트니스 (Bulk-up)',
  skillDescription: `${SKILL_CONSTANTS.COOLDOWN}초 쿨타임. 스킬 게이지가 100%가 되면 제자리에서 ${SKILL_CONSTANTS.WORKOUT_DURATION}초간 쇠질 운동을 시작합니다. 운동 중에는 움직일 수 없지만, 완료 시 체력을 ${SKILL_CONSTANTS.HEAL_AMOUNT} 즉시 회복하고 ${SKILL_CONSTANTS.BULKUP_DURATION}초간 덩치가 ${SKILL_CONSTANTS.SCALE}배 커지고 공격력이 ${SKILL_CONSTANTS.ATK_MULTIPLIER}배(${SKILL_CONSTANTS.BULKUP_ATK}) 증가하며 받는 피해가 ${SKILL_CONSTANTS.DMG_REDUCTION_PCT}% 감소합니다. 대신 이동 속도가 ${SKILL_CONSTANTS.SPEED_REDUCTION_PCT}%(${SKILL_CONSTANTS.BULKUP_SPEED}) 느려집니다.`,
  color: '#ff8c00', // 진한 오렌지 (쇠질 느낌)
  skillChargeRate: 100 / SKILL_CONSTANTS.COOLDOWN, // 10초 쿨타임
  tier: 'D',
  role: 'Juggernaut',
  detailedDescription: `운희는 '쇠질(웨이트 트레이닝)'을 통해 비약적인 스탯 상승을 도모하는 전투 지속형 돌격형 전사 캐릭터입니다. 스킬 발동 시 ${SKILL_CONSTANTS.WORKOUT_DURATION}초간 자리에 멈춰 서서 쇠질을 마친 후 즉시 대량의 체력을 회복하고, ${SKILL_CONSTANTS.BULKUP_DURATION}초간 공격력을 ${SKILL_CONSTANTS.ATK_MULTIPLIER}배 증가시키고 받는 대미지를 ${SKILL_CONSTANTS.DMG_REDUCTION_PCT}% 반감시켜 엄청난 크기의 탱딜 하이브리드 거인으로 돌격합니다.`,

  // [1] 스킬 최초 시동 훅
  onSkillTrigger(char: CharacterState, ctx) {
    char.skillActive = true;
    char.skillDurationLeft = SKILL_CONSTANTS.TOTAL_DURATION; // 2초 쇠질 + 7초 벌크업 버프
    (char as any).workoutFinished = false;
    (char as any).unhwiBuffActive = false;
    
    // 강제 정지
    char.vx = 0;
    char.vy = 0;

    ctx.addFloatingText(char.x, char.y - 60, '🏋️ 쇠질 시작! (근비대 측정)', '#ff8c00', 1.5);
    console.log(`🏋️ [쇠질 돌입] 운희 -> ${SKILL_CONSTANTS.WORKOUT_DURATION}초간 운동 개시 (움직임 불가능)`);
    ctx.logMessage?.(`🏋️ [쇠질 돌입] 운희 ➡️ ${SKILL_CONSTANTS.WORKOUT_DURATION}초간 쇠질 운동 개시 (이동 불가)`, 'skill');
  },

  // [2] 매 프레임 업데이트 훅
  onUpdate(char: CharacterState, dt: number, ctx) {
    if (char.skillActive) {
      char.skillDurationLeft -= dt;
      const elapsed = SKILL_CONSTANTS.TOTAL_DURATION - char.skillDurationLeft; // 경과 시간

      // 1. 운동 중 (0.0 ~ WORKOUT_DURATION초)
      if (elapsed < SKILL_CONSTANTS.WORKOUT_DURATION) {
        char.vx = 0;
        char.vy = 0;

        // 운동 땀방울(하늘색) 및 기운 파티클 생성
        if (Math.random() < 0.25) {
          ctx.createParticle(
            char.x + (Math.random() - 0.5) * 20,
            char.y - 15,
            '#00ddff', // 땀방울
            2 + Math.random() * 2,
            10
          );
        }
        if (Math.random() < 0.2) {
          ctx.createParticle(
            char.x + (Math.random() - 0.5) * 35,
            char.y + 15,
            '#ff8c00', // 열기 파티클
            2.5,
            12
          );
        }

        // 1초마다 운동 대사 띄우기
        const quoteTimer = (char as any).quoteTimer || 0;
        if (Date.now() - quoteTimer > 800) {
          (char as any).quoteTimer = Date.now();
          const quotes = ['🏋️ 흡! 하!', '💦 득근 득근', '💪 3대 500!', '🔥 근손실 안돼!'];
          const randQuote = quotes[Math.floor(Math.random() * quotes.length)];
          ctx.addFloatingText(char.x, char.y - 45, randQuote, '#ff8c00', 0.8);
        }
      } 
      // 2. 운동 종료 및 벌크업 버프 돌입 시점 (WORKOUT_DURATION 시점)
      else if (!(char as any).workoutFinished) {
        (char as any).workoutFinished = true;
        (char as any).unhwiBuffActive = true;

        char.scaleMultiplier = SKILL_CONSTANTS.SCALE; // 덩치 확대
        char.speed = SKILL_CONSTANTS.BULKUP_SPEED;    // 이속 30% 감소 (1.5 -> 1.05)
        char.attackPower = SKILL_CONSTANTS.BULKUP_ATK; // 공격력 2배 (12 -> 24)

        // 체력 회복 35 즉시 수행
        const healAmount = SKILL_CONSTANTS.HEAL_AMOUNT;
        char.hp = Math.min(char.maxHp, char.hp + healAmount);
        ctx.addFloatingText(char.x, char.y - 85, `💚 +${healAmount} HEAL`, '#39ff14', 1.8);
        ctx.createParticle(char.x, char.y, '#39ff14', 5, 20); // 초록색 힐 이펙트 파티클

        // 운동 후 정지하는 문제를 해결하기 위해 운동 완료 즉시 움직임 가해줌
        const randomAngle = Math.random() * Math.PI * 2;
        const baseSpeed = 3.5 * char.speed; // 감속된 속도 기준 비행 개시
        char.vx = Math.cos(randomAngle) * baseSpeed;
        char.vy = Math.sin(randomAngle) * baseSpeed;

        ctx.createExplosion(char.x, char.y, '#ff8c00', 25);
        ctx.addFloatingText(char.x, char.y - 65, '💪 벌크업 완료! (공/방 폭발)', '#ff3300', 2.0);
        console.log(`🏋️ [벌크업 성공] 운희 -> 체력 ${healAmount} 회복 및 ${SKILL_CONSTANTS.BULKUP_DURATION}초간 벌크업 상태 돌입 (크기 ${SKILL_CONSTANTS.SCALE}배, 공격 ${SKILL_CONSTANTS.BULKUP_ATK}, 방어 ${SKILL_CONSTANTS.DMG_REDUCTION_PCT}% 증가, 속도 ${SKILL_CONSTANTS.BULKUP_SPEED})`);
        ctx.logMessage?.(`🏋️ [벌크업 성공] 운희 ➡️ 체력 ${healAmount} 회복 및 ${SKILL_CONSTANTS.BULKUP_DURATION}초 벌크업 (공격력 ${SKILL_CONSTANTS.BULKUP_ATK}, 피해감소 ${SKILL_CONSTANTS.DMG_REDUCTION_PCT}%, 크기 ${SKILL_CONSTANTS.SCALE}배)`, 'skill');
      }

      // 3. 스킬 지속 종료 처리 (TOTAL_DURATION 만료)
      if (char.skillDurationLeft <= 0) {
        char.skillActive = false;
        char.scaleMultiplier = 1.0;
        char.speed = SKILL_CONSTANTS.BASE_SPEED;    // 원래 스피드로 복귀
        char.attackPower = SKILL_CONSTANTS.BASE_ATK; // 원래 공격력 복귀
        (char as any).unhwiBuffActive = false;
        (char as any).workoutFinished = false;

        // 버프 종료 시점에도 자연스러운 움직임 확보
        const randomAngle = Math.random() * Math.PI * 2;
        const baseSpeed = 3.5 * char.speed;
        char.vx = Math.cos(randomAngle) * baseSpeed;
        char.vy = Math.sin(randomAngle) * baseSpeed;

        ctx.addFloatingText(char.x, char.y - 45, '💨 벌크업 해제', '#888888', 1.2);
        console.log(`🏋️ [벌크업 만료] 운희 -> 일반 상태로 복구되었습니다.`);
      }
    }
  },

  onCollisionWithTarget(_char: CharacterState, opponent: CharacterState, ctx) {
    if (opponent.isDead || opponent.id.includes('clone')) return;

    // 패시브: 상대방 접촉 시 35% 확률로 1.5초간 강제 쇠질 (기절) (타겟별 4.0초 내부 재사용 대기시간 적용)
    const now = Date.now();
    const oppAny = opponent as any;
    if (oppAny.lastUnheeStunTime === undefined) {
      oppAny.lastUnheeStunTime = 0;
    }

    if (now - oppAny.lastUnheeStunTime >= 4000) {
      if (Math.random() < 0.35) {
        oppAny.lastUnheeStunTime = now;
        opponent.isStunned = true;
        opponent.stunTimeLeft = 1.5;
        opponent.vx = 0;
        opponent.vy = 0;

        ctx.addFloatingText(opponent.x, opponent.y - 50, '🏋️ 강제 쇠질! (1.5초)', '#ff8c00', 1.6);
        
        // 땀방울 파티클 생성
        for (let i = 0; i < 5; i++) {
          ctx.createParticle(
            opponent.x + (Math.random() - 0.5) * 15,
            opponent.y - 15,
            '#00ddff',
            2 + Math.random() * 2,
            10
          );
        }

        ctx.logMessage?.(`🏋️ [강제 쇠질] 운희 ➡️ ${opponent.name}에게 1.5초간 강제 운동 부여! (이동 불가)`, 'damage');
      }
    }
  },

  // [3] 캐릭터 고유 렌더링 확장 훅 (바벨 그리기 및 벌크업 오라)
  onRenderExtra(char: CharacterState, canvasCtx: CanvasRenderingContext2D, currentRadius: number) {
    if (char.skillActive) {
      const elapsed = SKILL_CONSTANTS.TOTAL_DURATION - char.skillDurationLeft;

      // A. 운동 중일 때 바벨(Barbell) 드로잉 연출
      if (elapsed < SKILL_CONSTANTS.WORKOUT_DURATION) {
        canvasCtx.save();
        canvasCtx.strokeStyle = '#555555';
        canvasCtx.lineWidth = 4;
        
        // 역기 봉 그리기
        const barLength = currentRadius * 2.2;
        canvasCtx.beginPath();
        canvasCtx.moveTo(char.x - barLength / 2, char.y - currentRadius - 8);
        canvasCtx.lineTo(char.x + barLength / 2, char.y - currentRadius - 8);
        canvasCtx.stroke();

        // 양끝 원판(중량 플레이트) 그리기
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
      // B. 벌크업 활성 시 붉은/주황색 불꽃 테두리 오라 연출
      else if ((char as any).unhwiBuffActive) {
        canvasCtx.save();
        canvasCtx.strokeStyle = '#ff3300';
        canvasCtx.lineWidth = 4;
        canvasCtx.shadowBlur = 18;
        canvasCtx.shadowColor = '#ff6600';
        
        // 살짝 둥근 파동 맥동 효과
        const pulse = Math.sin(Date.now() / 60) * 3;
        canvasCtx.beginPath();
        canvasCtx.arc(char.x, char.y, currentRadius + 4 + pulse, 0, Math.PI * 2);
        canvasCtx.stroke();
        canvasCtx.restore();
      }
    }
  }
};
