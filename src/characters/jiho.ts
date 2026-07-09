import type { CharacterConfig, CharacterState } from './character.interface';

export const jihoConfig: CharacterConfig = {
  id: 'jiho',
  name: '지호',
  maxHp: 160,
  speed: 1.4,
  attackPower: 10,
  baseAttackRange: 45,
  skillName: '코드 컴파일 및 실행',
  skillDescription: '5초 쿨타임. 기본 공격 시 40% 확률로 3초간 [버그] 디버프(이속 30% 감소)를 걸며, 디버프 적용 시 50% 확률로 [런타임 에러](20 피해 + 1초 기절 및 주변 120px 적들에게 15 광역 피해)를 입힙니다. 스킬 성공 시 주변에 25의 광역 피해와 넉백을 주고 버프를 얻으며, 실패 시 기절합니다.',
  color: '#00ffcc',       // 터미널 그린
  skillChargeRate: 20,
  tier: 'A',

  // [1] 기본 공격 시 훅 (디버프 및 확률적 대미지, 스턴, 광역 딜)
  onBasicAttack(char: CharacterState, opponent: CharacterState, ctx) {
    if (opponent.isDead) return;

    // 40% 확률로 버그 디버프 부여
    if (Math.random() < 0.4) {
      const opp = opponent as any;

      if (!opp.jihoDebuffTimeLeft || opp.jihoDebuffTimeLeft <= 0) {
        opp.jihoDebuffOriginalSpeed = opponent.speed;
        opponent.speed = opponent.speed * 0.7; // 30% 속도 감소
        console.log(`🐛 [디버프 부여] 지호 -> ${opponent.name} | [버그] 부여 (3초간 이동 속도 30% 감소)`);
        ctx.logMessage?.(`🐛 [디버프 부여] 지호 ➡️ ${opponent.name} | [버그] 디버프 (3초간 이속 30% 감소)`, 'damage');
      }
      opp.jihoDebuffTimeLeft = 3.0; // 3초 지속

      // 디버프 부여 시 50% 확률로 런타임 에러 (추가 피해 + 1초 스턴 + 주변 120px 광역 피해)
      if (Math.random() < 0.5) {
        console.log(`💥 [디버프 격발] 지호 -> ${opponent.name} | [런타임 에러] 연쇄 충돌 발생!`);
        ctx.logMessage?.(`💥 [런타임 에러 격발] 지호 ➡️ ${opponent.name} | 연쇄 런타임 에러 (20 피해, 1초 기절)`, 'damage');
        ctx.dealDamage(char, opponent, 20, '💻 CRASH & STUN!');
        opponent.isStunned = true;
        opponent.stunTimeLeft = 1.0;
        opponent.vx = 0;
        opponent.vy = 0;
        ctx.createExplosion(opponent.x, opponent.y, '#ff3366', 15);

        // 주변 120px 내 광역 대미지 (본인과 주 대상 제외)
        ctx.characters.forEach((enemy) => {
          if (enemy.isDead || enemy.id === char.id || enemy.id === opponent.id) return;
          const dist = Math.hypot(enemy.x - opponent.x, enemy.y - opponent.y);
          if (dist <= 120) {
            ctx.dealDamage(char, enemy, 15, '⚡ AOE ERROR!');
            ctx.createExplosion(enemy.x, enemy.y, '#ff3366', 6);
            
            // 넉백 벡터
            const kAngle = Math.atan2(enemy.y - opponent.y, enemy.x - opponent.x);
            enemy.vx += Math.cos(kAngle) * 3;
            enemy.vy += Math.sin(kAngle) * 3;
          }
        });

        ctx.createExplosion(opponent.x, opponent.y, '#00ffcc', 10);
      } else {
        ctx.addFloatingText(opponent.x, opponent.y - 25, '🐛 BUG DETECTED', '#00ffcc', 1.2);
        ctx.createParticle(opponent.x, opponent.y, '#00ffcc', 4, 8);
      }
    }
  },

  // [2] 스킬 최초 시동 시 훅
  onSkillTrigger(char: CharacterState) {
    char.skillActive = false; // 대기 코딩 단계이므로 액티브 버프는 아직 아님
    char.isTyping = true;
    char.typingTimeLeft = 2.0;
    char.vx = 0;
    char.vy = 0;
  },

  // [3] 매 프레임 업데이트 훅
  onUpdate(char: CharacterState, dt: number, ctx) {
    // 디버프 상태 업데이트 (모든 적 캐릭터들에 대해 버그 디버프 시간 및 속도 복구 처리)
    ctx.characters.forEach((enemy) => {
      if (enemy.id !== char.id && !enemy.isDead) {
        const opp = enemy as any;
        if (opp.jihoDebuffTimeLeft && opp.jihoDebuffTimeLeft > 0) {
          opp.jihoDebuffTimeLeft -= dt;
          
          if (Math.random() < 0.1) {
            ctx.createParticle(enemy.x, enemy.y, '#00ffcc', 2, 5);
          }

          if (opp.jihoDebuffTimeLeft <= 0) {
            opp.jihoDebuffTimeLeft = 0;
            if (opp.jihoDebuffOriginalSpeed !== undefined) {
              enemy.speed = opp.jihoDebuffOriginalSpeed;
              console.log(`🐛 [디버프 종료] ${enemy.name}의 버그가 수정되어 이동 속도가 복구되었습니다.`);
            }
            ctx.addFloatingText(enemy.x, enemy.y - 25, '🐛 BUG FIXED', '#39ff14', 1.2);
          }
        }
      }
    });

    // 3-A. 타이핑 코딩 중 처리
    if (char.isTyping) {
      char.typingTimeLeft -= dt;
      char.vx = 0;
      char.vy = 0;

      // 타이핑 파티클 생성
      if (Math.random() < 0.4) {
        ctx.createParticle(char.x + (Math.random() - 0.5) * 20, char.y + 10, '#00ffcc', 3, 10);
      }

      // 2초 코딩이 끝나면 성공/실패 판정
      if (char.typingTimeLeft <= 0) {
        char.isTyping = false;

        // 우선 기본 속도로 다시 기동
        const randomAngle = Math.random() * Math.PI * 2;
        const baseSpeed = 3.5 * char.speed;
        char.vx = Math.cos(randomAngle) * baseSpeed;
        char.vy = Math.sin(randomAngle) * baseSpeed;

        // 성공 여부 결정 (성공 65%, 실패 35%)
        const isSuccess = Math.random() < 0.65;

        if (isSuccess) {
          console.log(`💻 [컴파일 성공] 지호 컴파일 성공! 주변 150px 광역 시스템 폭발 피해 가동 및 5초 버프`);
          ctx.logMessage?.(`💻 [컴파일 성공] 지호 ➡️ 성공! (주변 광역 25 피해, HP 30% 회복, 5초간 이속 2배 & 공격력 2.2배)`, 'skill');
          // 컴파일 성공: 주변 150px 적들에게 컴파일 광역 시스템 폭발 피해 (25 피해)
          ctx.characters.forEach((enemy) => {
            if (enemy.isDead || enemy.id === char.id) return;
            const dist = Math.hypot(enemy.x - char.x, enemy.y - char.y);
            if (dist <= 150) {
              ctx.dealDamage(char, enemy, 25, '💻 SYSTEM BLAST!');
              ctx.createExplosion(enemy.x, enemy.y, '#00ffcc', 8);
              
              // 넉백
              const kAngle = Math.atan2(enemy.y - char.y, enemy.x - char.x);
              enemy.vx += Math.cos(kAngle) * 5;
              enemy.vy += Math.sin(kAngle) * 5;
            }
          });

          // 5초간 버프 획득 및 30% 회복
          const wasActive = char.skillActive;
          char.skillActive = true;
          char.skillDurationLeft = 5.0;

          ctx.addFloatingText(char.x, char.y - 45, '💻 [SUCCESS] 컴파일 완료!', '#00ffcc', 1.8);
          ctx.createExplosion(char.x, char.y, '#00ffcc', 20);

          // 체력 30% 즉시 치유
          const healAmount = Math.round(char.maxHp * 0.3);
          char.hp = Math.min(char.maxHp, char.hp + healAmount);
          ctx.addFloatingText(char.x, char.y - 25, `+${healAmount} HEAL`, '#39ff14', 1.5);

          // 초록색 힐링 파티클 뿜어내기
          for (let i = 0; i < 12; i++) {
            ctx.createParticle(
              char.x + (Math.random() - 0.5) * 30,
              char.y + (Math.random() - 0.5) * 30,
              '#39ff14',
              3 + Math.random() * 3,
              15 + Math.random() * 12
            );
          }

          // 이동 속도 2.0배 증폭 (이미 버프가 켜져 있으면 또 곱하지 않음)
          if (!wasActive) {
            char.vx *= 2.0;
            char.vy *= 2.0;
          }
        } else {
          console.log(`⚠️ [컴파일 실패] 지호 컴파일 실패! 2초 기절 및 자해 피해 발생`);
          ctx.logMessage?.(`⚠️ [컴파일 실패] 지호 ➡️ 실패! 자해 15 피해 및 2초간 기절`, 'skill');
          // 컴파일 실패: 자신 역디버프 (2초 기절 + 자해 피해)
          ctx.addFloatingText(char.x, char.y - 45, '⚠️ [ERROR] 컴파일 실패! (역디버프)', '#ff3366', 1.8);
          ctx.createExplosion(char.x, char.y, '#ff3366', 25);

          char.isStunned = true;
          char.stunTimeLeft = 2.0;
          char.vx = 0;
          char.vy = 0;

          const selfDamage = Math.round(char.attackPower * 1.5);
          ctx.dealDamage(char, char, selfDamage, 'RUNTIME ERROR!');
        }
      }
      return;
    }

    // 2-B. 기절 중 타이머 처리 (공통 기절 처리가 게임 라운지에서 도나 여기서 수동 처리도 가능)
    // 기절 수동 제어
    if (char.isStunned) {
      char.stunTimeLeft -= dt;
      char.vx = 0;
      char.vy = 0;
      if (char.stunTimeLeft <= 0) {
        char.isStunned = false;
        // 기절 풀렸을 때 다시 리스타트
        const randomAngle = Math.random() * Math.PI * 2;
        const baseSpeed = 3.5 * char.speed;
        char.vx = Math.cos(randomAngle) * baseSpeed;
        char.vy = Math.sin(randomAngle) * baseSpeed;
      }
      return;
    }

    // 2-C. 버프 활성화 지속시간 갱신 및 롤백
    if (char.skillActive) {
      char.skillDurationLeft -= dt;
      if (char.skillDurationLeft <= 0) {
        char.skillActive = false;
        // 속도 원상복구
        char.vx /= 2.0;
        char.vy /= 2.0;
      }
    }
  },

  // [3] 캐릭터 고유 렌더링 확장 훅
  onRenderExtra(char: CharacterState, canvasCtx: CanvasRenderingContext2D, currentRadius: number) {
    // 3-A. 코딩 진행 바 그리기
    if (char.isTyping) {
      canvasCtx.save();
      canvasCtx.fillStyle = 'rgba(0, 255, 196, 0.9)';
      canvasCtx.font = '16px "Orbit", Arial';
      canvasCtx.textAlign = 'center';
      canvasCtx.fillText('⌨️ 코딩 중...', char.x, char.y - currentRadius - 28);
      
      const barW = 40;
      const barH = 5;
      const progress = (2.0 - char.typingTimeLeft) / 2.0;
      canvasCtx.fillStyle = 'rgba(255,255,255,0.1)';
      canvasCtx.fillRect(char.x - barW / 2, char.y - currentRadius - 18, barW, barH);
      canvasCtx.fillStyle = '#00ffcc';
      canvasCtx.fillRect(char.x - barW / 2, char.y - currentRadius - 18, barW * progress, barH);
      canvasCtx.restore();
    }

    // 3-B. 기절 별 💫 그리기
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
