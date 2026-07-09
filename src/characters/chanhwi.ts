import type { CharacterConfig, CharacterState } from './character.interface';

export const chanhwiConfig: CharacterConfig = {
  id: 'chanhwi',
  name: '찬휘',
  maxHp: 70,
  speed: 1.6,
  attackPower: 25,
  baseAttackRange: 45,
  skillName: '신라천정 (Shinra Tensei)',
  skillDescription: '6초 쿨타임. 스킬 시전 시 2초간 화면 중앙(400, 300)으로 부드럽게 이끌려가며 순간이동 궤적을 그리고, 이후 15초 동안 공중 부양(부동 상태)한 채 화면을 암전시키고 신라천정 대사를 일본어 발음으로 화면 중앙에 렌더링합니다. 이후 전장의 모든 적들의 체력을 거리 비례(200px 이하 3%, 200px~400px 18%, 400px 초과 38%)로 남기고 사방 외벽으로 튕겨 날려보냅니다. 캐스팅 및 방출 동안 받는 피해가 97% 감소(3%만 피해 적용)합니다.',
  color: '#8a2be2', // 보라색
  skillChargeRate: 16.67,
  tier: 'S',

  // [1] 스킬 최초 시동 시 훅
  onSkillTrigger(char: CharacterState) {
    char.skillActive = true;
    char.skillDurationLeft = 17.4; // 2.0초 순간이동 슬라이드 + 15.0초 캐스팅 + 0.4초 척력 전개
    (char as any).blastTriggered = false;

    // 슬라이드 애니메이션을 위해 시작 지점 기록
    (char as any).preX = char.x;
    (char as any).preY = char.y;
    char.vx = 0;
    char.vy = 0;
  },

  // [2] 매 프레임 업데이트 훅
  onUpdate(char: CharacterState, dt: number, ctx) {
    if (char.skillActive) {
      char.skillDurationLeft -= dt;

      // 스킬 시전 중에는 관성 움직임을 차단
      char.vx = 0;
      char.vy = 0;

      const elapsed = 17.4 - char.skillDurationLeft; // 0.0 ~ 17.4

      // 1. 순간이동 슬라이드 애니메이션 (0.0 ~ 2.0초)
      if (elapsed < 2.0) {
        const t = elapsed / 2.0; // 0.0 ~ 1.0
        // 출발지부터 정중앙(400, 300)까지 부드럽게 보간 이동
        char.x = (char as any).preX + (400 - (char as any).preX) * t;
        char.y = (char as any).preY + (300 - (char as any).preY) * t;

        // 순간이동 궤적 보라색 잔상 파티클 생성
        if (Math.random() < 0.6) {
          ctx.createParticle(char.x, char.y, '#da70d6', 3.0, 12);
        }
        (char as any).currentQuotes = undefined;
      } else {
        // 순간이동 완료 후 정중앙(400, 300) 완벽 고정
        char.x = 400;
        char.y = 300;

        // 2. 대사 출력 처리 (일본어 발음 2.1초 교체 노출, 2.0초 시점부터 카운트)
        const quotes: string[] = [];
        const quoteElapsed = elapsed - 2.0; // 0.0 ~ 15.4

        if (quoteElapsed >= 0.0) quotes.push('이타미오 칸지로');
        if (quoteElapsed >= 2.1) quotes.push('이타미오 칸가에로');
        if (quoteElapsed >= 4.2) quotes.push('이타미오 우케토레');
        if (quoteElapsed >= 6.3) quotes.push('이타미오 시레');
        if (quoteElapsed >= 8.4) quotes.push('이타미오 시라노 모노니 혼또노 헤이와오 와카란');
        if (quoteElapsed >= 10.5) quotes.push('오레와 야히코노 이타미오 와스레나이');
        if (quoteElapsed >= 12.6) quotes.push('코코요이 세카이니 이타미오');

        if (quoteElapsed >= 15.0) {
          (char as any).currentQuotes = ['신라... 텐세!!!'];
        } else {
          (char as any).currentQuotes = quotes;
        }

        // 캐스팅 중 흡입 파티클
        if (quoteElapsed < 15.0) {
          if (Math.random() < 0.4) {
            const angle = Math.random() * Math.PI * 2;
            const dist = 120 + Math.random() * 180;
            const spawnX = char.x + Math.cos(angle) * dist;
            const spawnY = char.y + Math.sin(angle) * dist;
            
            ctx.createParticle(spawnX, spawnY, '#9933ff', 2.5, 8);
          }
        }

        // 3. 17.0초(대사 15.0초) 격발 시점 처리
        if (elapsed >= 17.0 && !(char as any).blastTriggered) {
          (char as any).blastTriggered = true;

          console.log(`💥 [신라천정 격발] 찬휘 -> 전 화면 무차별 전탄 척력파 방출! 전원 체력 거리 비례 감소 및 초강력 벽 반사 넉백!`);
          ctx.logMessage?.(`💥 [신라천정 격발] 찬휘 ➡️ 전 화면 무차별 척력파 방출!`, 'skill');
          ctx.addFloatingText(char.x, char.y - 60, 'SHINRA TENSEI!!!', '#ffcc00', 2.0);
          ctx.createExplosion(char.x, char.y, '#da70d6', 50);
          ctx.createExplosion(char.x, char.y, '#8a2be2', 35);

          // 맵 상의 생존한 모든 적 타격
          const chars = (ctx as any).characters as CharacterState[];
          chars.forEach((enemy) => {
            if (enemy.isDead || enemy.id === char.id) return;

            // 거리 비례 남는 체력 비율 연산 (200px 이하 3%, 200px~400px 18%, 400px 초과 38%)
            const dist = Math.hypot(enemy.x - char.x, enemy.y - char.y);
            let hpRatio = 0.38;
            if (dist <= 200) {
              hpRatio = 0.03;
            } else if (dist <= 400) {
              hpRatio = 0.18;
            }

            const targetHp = Math.round(enemy.maxHp * hpRatio);
            const damage = Math.max(1, enemy.hp - targetHp);

            ctx.dealDamage(char, enemy, damage, `💥 신라천정(${Math.round(hpRatio * 100)}%)`);

            // 초강력 척력 날리기 (외곽 방향으로 32px/frame 속도 가산 -> 벽 충돌 반사)
            const kAngle = Math.atan2(enemy.y - char.y, enemy.x - char.x);
            enemy.vx = Math.cos(kAngle) * 32;
            enemy.vy = Math.sin(kAngle) * 32;

            // 1.8초 동안 기절 처리 (기절 동안 날아가고 벽에 격돌하며 튕김)
            enemy.isStunned = true;
            enemy.stunTimeLeft = 1.8;
            
            console.log(`💥 [신라천정 타격] 찬휘 -> ${enemy.name} | 대미지: ${damage} (거리: ${Math.round(dist)}px, 남은 체력 ${Math.round(hpRatio * 100)}% 유도) | 초강력 벽 반사 넉백 (1.8초 기절)`);
            ctx.logMessage?.(`💥 [신라천정 타격] 찬휘 ➡️ ${enemy.name} | ${damage} 피해 (거리: ${Math.round(dist)}px, HP ${Math.round(hpRatio * 100)}%만 남김, 1.8초 기절)`, 'skill');
          });
        }
      }

      // 스킬 지속 종료 처리
      if (char.skillDurationLeft <= 0) {
        char.skillActive = false;
        (char as any).currentQuotes = undefined;

        // 스킬 종료 직후 즉시 기동력 확보를 위해 새로운 속도 부여 (다시 활발히 움직임)
        const randomAngle = Math.random() * Math.PI * 2;
        const baseSpeed = 3.5 * char.speed;
        char.vx = Math.cos(randomAngle) * baseSpeed;
        char.vy = Math.sin(randomAngle) * baseSpeed;
      }
    } else {
      // 기절 처리
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
      }
    }
  },

  // [3] 캐릭터 고유 렌더링 확장 훅
  onRenderExtra(char: CharacterState, canvasCtx: CanvasRenderingContext2D, currentRadius: number) {
    if (char.skillActive) {
      const elapsed = 17.4 - char.skillDurationLeft;

      // (어두운 화면 암전, 화이트 섬광 및 자막 렌더링은 gameLounge.ts에서 전체 화면 대상 위에 일괄 수행됩니다)

      // 3. 중력 에너지 라인 연출 (캐스팅 도중 2.0 ~ 17.0초)
      if (elapsed >= 2.0 && elapsed < 17.0) {
        canvasCtx.save();
        canvasCtx.strokeStyle = 'rgba(138, 43, 226, 0.2)';
        canvasCtx.lineWidth = 1.4;
        const timeSeed = Date.now() / 300;
        for (let i = 0; i < 12; i++) {
          const angle = timeSeed + (i * Math.PI * 2) / 12;
          const startDist = 240 - ((Date.now() / 3.5) % 220); // 광범위에서 중심으로 유입
          const sX = char.x + Math.cos(angle) * startDist;
          const sY = char.y + Math.sin(angle) * startDist;
          canvasCtx.beginPath();
          canvasCtx.moveTo(sX, sY);
          canvasCtx.lineTo(char.x, char.y);
          canvasCtx.stroke();
        }

        // 보라색 중력 에너지 배리어 서클
        const shieldPulse = currentRadius + 6 + Math.abs(Math.sin(Date.now() / 80)) * 6;
        canvasCtx.strokeStyle = 'rgba(186, 85, 211, 0.7)';
        canvasCtx.lineWidth = 2.5;
        canvasCtx.fillStyle = 'rgba(138, 43, 226, 0.08)';
        canvasCtx.beginPath();
        canvasCtx.arc(char.x, char.y, shieldPulse, 0, Math.PI * 2);
        canvasCtx.fill();
        canvasCtx.stroke();
        canvasCtx.restore();
      } else if (elapsed >= 17.0) {
        // 4. 신라천정 충격파 팽창 그리기 (17.0 ~ 17.4초)
        const blastElapsed = elapsed - 17.0;
        const blastRatio = blastElapsed / 0.4;
        const blastRadius = blastRatio * 850; // 전 화면을 뒤덮도록 850px 팽창

        canvasCtx.save();
        const alpha = 1.0 - blastRatio;
        canvasCtx.strokeStyle = `rgba(230, 230, 250, ${alpha})`;
        canvasCtx.lineWidth = 9 * (1 - blastRatio) + 2;
        canvasCtx.beginPath();
        canvasCtx.arc(char.x, char.y, blastRadius, 0, Math.PI * 2);
        canvasCtx.stroke();

        canvasCtx.fillStyle = `rgba(186, 85, 211, ${alpha * 0.18})`;
        canvasCtx.beginPath();
        canvasCtx.arc(char.x, char.y, blastRadius, 0, Math.PI * 2);
        canvasCtx.fill();
        canvasCtx.restore();
      }
    }

    // 기절 이펙트 그리기
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
