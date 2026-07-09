import type { CharacterConfig, CharacterState } from './character.interface';

export const unheeConfig: CharacterConfig = {
  id: 'unhee',
  name: '운희',
  maxHp: 150,
  speed: 1.5,
  attackPower: 12,
  baseAttackRange: 45,
  skillName: '벌크업 피트니스 (Bulk-up)',
  skillDescription: '10초 쿨타임. 스킬 게이지가 100%가 되면 제자리에서 2.5초간 쇠질 운동을 시작합니다. 운동 중에는 움직일 수 없지만, 완료 시 체력을 35 즉시 회복하고 6초간 덩치가 1.6배 커지고 공격력이 2배(24) 증가하며 받는 피해가 50% 감소합니다. 대신 이동 속도가 40%(0.9) 느려집니다.',
  color: '#ff8c00', // 진한 오렌지 (쇠질 느낌)
  skillChargeRate: 10, // 10초 쿨타임

  // [1] 스킬 최초 시동 훅
  onSkillTrigger(char: CharacterState, ctx) {
    char.skillActive = true;
    char.skillDurationLeft = 8.5; // 2.5초 쇠질 + 6초 벌크업 버프
    (char as any).workoutFinished = false;
    (char as any).unhwiBuffActive = false;
    
    // 강제 정지
    char.vx = 0;
    char.vy = 0;

    ctx.addFloatingText(char.x, char.y - 60, '🏋️ 쇠질 시작! (근비대 측정)', '#ff8c00', 1.5);
    console.log(`🏋️ [쇠질 돌입] 운희 -> 2.5초간 운동 개시 (움직임 불가능)`);
    ctx.logMessage?.(`🏋️ [쇠질 돌입] 운희 ➡️ 2.5초간 쇠질 운동 개시 (이동 불가)`, 'skill');
  },

  // [2] 매 프레임 업데이트 훅
  onUpdate(char: CharacterState, dt: number, ctx) {
    if (char.skillActive) {
      char.skillDurationLeft -= dt;
      const elapsed = 8.5 - char.skillDurationLeft; // 경과 시간

      // 1. 운동 중 (0.0 ~ 2.5초)
      if (elapsed < 2.5) {
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
      // 2. 운동 종료 및 벌크업 버프 돌입 시점 (2.5초 시점)
      else if (!(char as any).workoutFinished) {
        (char as any).workoutFinished = true;
        (char as any).unhwiBuffActive = true;

        char.scaleMultiplier = 1.6; // 덩치 확대
        char.speed = 0.9;          // 이속 40% 감소 (1.5 -> 0.9)
        char.attackPower = 24;     // 공격력 2배 (12 -> 24)

        // 체력 회복 35 즉시 수행
        const healAmount = 35;
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
        console.log(`🏋️ [벌크업 성공] 운희 -> 체력 ${healAmount} 회복 및 6초간 벌크업 상태 돌입 (크기 1.6배, 공격 24, 방어 50% 증가, 속도 0.9)`);
        ctx.logMessage?.(`🏋️ [벌크업 성공] 운희 ➡️ 체력 ${healAmount} 회복 및 6초 벌크업 (공격력 24, 피해감소 50%, 크기 1.6배)`, 'skill');
      }

      // 3. 스킬 지속 종료 처리 (8.5초 만료)
      if (char.skillDurationLeft <= 0) {
        char.skillActive = false;
        char.scaleMultiplier = 1.0;
        char.speed = 1.5;          // 원래 스피드로 복귀
        char.attackPower = 12;     // 원래 공격력 복귀
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

  // [3] 캐릭터 고유 렌더링 확장 훅 (바벨 그리기 및 벌크업 오라)
  onRenderExtra(char: CharacterState, canvasCtx: CanvasRenderingContext2D, currentRadius: number) {
    if (char.skillActive) {
      const elapsed = 8.5 - char.skillDurationLeft;

      // A. 운동 중일 때 바벨(Barbell) 드로잉 연출
      if (elapsed < 2.5) {
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
