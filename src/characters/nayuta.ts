import type { CharacterConfig, CharacterState } from './character.interface';

export const nayutaConfig: CharacterConfig = {
  id: 'nayuta',
  name: '나유타',
  maxHp: 140,
  speed: 1.5,
  attackPower: 11,
  baseAttackRange: 45,
  skillName: '지배 (Domination)',
  skillDescription: '스킬 지속 5초. 적과 접촉 시 40% 확률로 10초간 적을 "지배"합니다. 지배된 적은 스킬 게이지가 충전되지 않습니다. 스킬 사용 시 5초간 지배 대상에게 지속 대미지와 디버프를 주고, 스킬을 무효화합니다.',
  color: '#e52b50', // 체리 핑크
  skillChargeRate: 50, // 2초 쿨타임 (100 / 2 = 50)
  tier: 'B',

  // [1] 스킬 최초 시동 시 훅
  onSkillTrigger(char: CharacterState, ctx) {
    char.skillActive = true;
    char.skillDurationLeft = 5.0; // 5초간 지배 조종 가동

    ctx.addFloatingText(char.x, char.y - 60, '👁️ 지배!', '#e52b50', 1.5);
    console.log(`👁️ [스킬 발동] 나유타 -> 지배 가동! (5초간 대상 지속 대미지/디버프 및 스킬 봉인)`);
    ctx.logMessage?.(`👁️ [스킬 발동] 나유타 ➡️ 지배 개시! 지배 대상들 5초간 디버프 및 조종 가동`, 'skill');

    // 발동 시점에 지배당한 모든 대상의 스킬 및 게이지를 즉시 소멸
    const chars = ctx.characters;
    chars.forEach((enemy) => {
      if (enemy.isDead || enemy.id === char.id) return;
      if (enemy.nayutaControlled) {
        if (enemy.skillActive) {
          enemy.skillActive = false;
          enemy.skillDurationLeft = 0;
          console.log(`🚫 [스킬 강제 소멸] 나유타 -> ${enemy.name}의 활성화된 스킬을 강제 차단했습니다.`);
          ctx.logMessage?.(`🚫 [스킬 강제 차단] 나유타 ➡️ ${enemy.name}의 활성화된 스킬 차단 및 게이지 리셋`, 'skill');
        }
        enemy.skillGauge = 0; // 게이지 리셋
        ctx.createExplosion(enemy.x, enemy.y, '#ff0033', 8);
        ctx.addFloatingText(enemy.x, enemy.y - 45, '🚫 SKILL CANCEL!', '#ff0033', 1.5);
      }
    });

  },

  // [2] 매 프레임 업데이트 훅
  onUpdate(char: CharacterState, dt: number, ctx) {
    const chars = ctx.characters;
    (char as any)._charactersRef = chars; // 렌더러용 참조 저장

    // A. 지배 타이머 및 디버프 상태 실시간 갱신 (지배는 찬휘의 스킬 상태에 무관하게 실시간 감소)
    chars.forEach((enemy) => {
      if (enemy.isDead || enemy.id === char.id) return;
      if (enemy.nayutaControlled) {
        if (enemy.nayutaControlTimeLeft !== undefined) {
          enemy.nayutaControlTimeLeft -= dt;
          if (enemy.nayutaControlTimeLeft <= 0) {
            enemy.nayutaControlled = false;
            enemy.nayutaControlTimeLeft = 0;
            ctx.addFloatingText(enemy.x, enemy.y - 25, '해제', '#00ffcc', 1.0);
            console.log(`👁️ [지배 자연해제] ${enemy.name}의 지배 상태가 10초 경과되어 자연 해제되었습니다.`);
          }
        }
      }
    });

    // B. 스킬이 켜져 있을 때 (8초간 지속 대미지/디버프 + 조종)
    if (char.skillActive) {
      char.skillDurationLeft -= dt;

      // 스킬 시전 중에도 나유타는 계속 이동 가능

      // 지배당한 적들을 조종하여 공격에 참여시킴
      chars.forEach((enemy) => {
        if (enemy.isDead || enemy.id === char.id) return;
        if (enemy.nayutaControlled) {
           // 1. 강제 스킬 취소 상태 유지 (스킬 무효화)
          if (enemy.skillActive) {
            enemy.skillActive = false;
            enemy.skillDurationLeft = 0;
          }
          enemy.skillGauge = 0; // 게이지 강제 0 고정

          // 2. 지속 대미지 (0.5초마다 8 데미지)
          if (!(enemy as any)._lastDominationTick) (enemy as any)._lastDominationTick = 0;
          const tickNow = Date.now();
          if (tickNow - (enemy as any)._lastDominationTick > 500) {
            (enemy as any)._lastDominationTick = tickNow;
            ctx.dealDamage(char, enemy, 8, '👁️ 지배');
            console.log(`👁️ [지배 데미지] 나유타 -> ${enemy.name} | 8 데미지`);
          }

          // 2. 조종: 지배당하지 않은 가장 가까운 다른 적을 표적으로 탐색
          let closestTarget: CharacterState | null = null;
          let minDist = Infinity;

          chars.forEach((other) => {
            if (other.isDead || other.id === char.id || other.id === enemy.id || other.nayutaControlled) return;
            const dist = Math.hypot(other.x - enemy.x, other.y - enemy.y);
            if (dist < minDist) {
              minDist = dist;
              closestTarget = other;
            }
          });

          // 표적을 향해 돌진
          if (closestTarget) {
            const kAngle = Math.atan2((closestTarget as CharacterState).y - enemy.y, (closestTarget as CharacterState).x - enemy.x);
            // 일반 이동속도보다 훨씬 강력한 돌진 속도(7.5px/frame) 부여
            enemy.vx = Math.cos(kAngle) * 7.5;
            enemy.vy = Math.sin(kAngle) * 7.5;

            // 3. 자폭/인형 타격 접촉 피해 연산
            const currentMinDist = enemy.radius + (closestTarget as CharacterState).radius + 6;
            if (minDist <= currentMinDist) {
              const now = Date.now();
              const lastDmg = enemy.lastContactDmgTime || 0;
              if (now - lastDmg > 800) {
                enemy.lastContactDmgTime = now;
                ctx.dealDamage(enemy, closestTarget, 25, '👁️ 돌진!');
                ctx.createExplosion(enemy.x, enemy.y, '#e52b50', 16);
                console.log(`👁️ [지배 돌격] ${enemy.name} -> ${(closestTarget as CharacterState).name} 충돌! 대미지: 25`);
                ctx.logMessage?.(`👁️ [지배 돌격] 조종된 ${enemy.name} ➡️ ${(closestTarget as CharacterState).name} 충돌 (25 피해)`, 'skill');
              }
            }
          }
        }
      });

      // 스킬 완료 처리
      if (char.skillDurationLeft <= 0) {
        char.skillActive = false;
        
        // 스킬 종료 직후 즉시 다시 자유 기동하도록 속도 복구
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
    const chars = (char as any)._charactersRef as CharacterState[] || [];

    chars.forEach((enemy) => {
       if (enemy.isDead || enemy.id === char.id) return;

       // 1. 지배당한 대상들의 빨간색 테두리 서클(칼라) 점멸 렌더링
       if (enemy.nayutaControlled) {
         canvasCtx.save();
         canvasCtx.strokeStyle = 'rgba(229, 43, 80, 0.75)';
         canvasCtx.lineWidth = 3.0;
         // 점멸하며 팽창/수축하는 붉은 고리
         const collarPulse = enemy.radius + 6 + Math.abs(Math.sin(Date.now() / 120)) * 4;
         canvasCtx.beginPath();
         canvasCtx.arc(enemy.x, enemy.y, collarPulse, 0, Math.PI * 2);
         canvasCtx.stroke();
         canvasCtx.restore();
       }
    });

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
