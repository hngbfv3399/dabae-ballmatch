import type { CharacterConfig, CharacterState } from './character.interface';

interface BowlingBall {
  x: number;
  y: number;
  vx: number;
  vy: number;
  damage: number;
  radius: number;
  timeLeft: number;
  lastHitTargetId: string; // 동일 대상 다중 히트 쿨다운 관리용
  hitCooldown: number;
}

interface MyeongseokState extends CharacterState {
  bowlingBalls?: BowlingBall[];
}

export const myeongseokConfig: CharacterConfig = {
  id: 'myeongseok',
  name: '명석',
  maxHp: 145,
  speed: 1.2,
  attackPower: 14,
  baseAttackRange: 45,
  skillName: '퍼펙트 스트라이크',
  skillDescription: '6초 쿨타임. 무겁고 빠른 볼링공을 던집니다. 볼링공은 5초 동안 벽과 캐릭터 사이를 바운싱하며, 벽에 충돌 시 +4 대미지, 캐릭터 충돌 시 +6 대미지가 영구적으로 중첩됩니다.',
  color: '#4a154b', // 무거운 가지색 / 퍼플
  skillChargeRate: 16.6, // 6초 쿨타임
  tier: 'B',

  onSkillTrigger(char: CharacterState, ctx) {
    // 쿨타임 즉시 재가동 설정
    char.skillActive = false;
    char.skillDurationLeft = 0;

    let closestEnemy: any = null;
    let minDist = Infinity;

    ctx.characters.forEach((enemy) => {
      if (enemy.isDead || enemy.id === char.id) return;
      const dist = Math.hypot(enemy.x - char.x, enemy.y - char.y);
      if (dist < minDist) {
        minDist = dist;
        closestEnemy = enemy;
      }
    });

    // 방향 결정 (조준 대상이 없다면 랜덤 방향)
    const angle = closestEnemy 
      ? Math.atan2(closestEnemy.y - char.y, closestEnemy.x - char.x)
      : Math.random() * Math.PI * 2;

    const ms = char as MyeongseokState;
    const bowlingBalls = ms.bowlingBalls || [];
    
    // 빠른 속도로 발사 (speed 11.5)
    bowlingBalls.push({
      x: char.x,
      y: char.y,
      vx: Math.cos(angle) * 11.5,
      vy: Math.sin(angle) * 11.5,
      damage: 18, // 시작 데미지
      radius: 15,
      timeLeft: 5.0, // 5초 지속
      lastHitTargetId: '',
      hitCooldown: 0
    });
    ms.bowlingBalls = bowlingBalls;

    ctx.addFloatingText(char.x, char.y - 50, '🎳 퍼펙트 스트라이크!', '#4a154b', 1.5);
    ctx.createExplosion(char.x, char.y, '#4a154b', 15);
  },

  onUpdate(char: CharacterState, dt: number, ctx) {
    const ms = char as MyeongseokState;
    if (ms.bowlingBalls === undefined) ms.bowlingBalls = [];

    ms.bowlingBalls.forEach((ball) => {
      ball.timeLeft -= dt;

      // 1. 물리 이동
      ball.x += ball.vx * dt * 60;
      ball.y += ball.vy * dt * 60;

      // 동일 타겟 연속 타격 방지용 쿨다운
      if (ball.hitCooldown > 0) {
        ball.hitCooldown -= dt;
      }

      // 2. 벽 충돌 처리 (바운싱 및 데미지 증가 +4)
      let wallHit = false;
      const restitution = 1.0;
      
      if (ball.x - ball.radius < 0) {
        ball.x = ball.radius;
        ball.vx = -ball.vx * restitution;
        wallHit = true;
      } else if (ball.x + ball.radius > 800) {
        ball.x = 800 - ball.radius;
        ball.vx = -ball.vx * restitution;
        wallHit = true;
      }

      if (ball.y - ball.radius < 0) {
        ball.y = ball.radius;
        ball.vy = -ball.vy * restitution;
        wallHit = true;
      } else if (ball.y + ball.radius > 600) {
        ball.y = 600 - ball.radius;
        ball.vy = -ball.vy * restitution;
        wallHit = true;
      }

      if (wallHit) {
        ball.damage += 4;
        ball.lastHitTargetId = ''; // 벽에 닿으면 타겟 락 초기화
        ctx.addFloatingText(ball.x, ball.y - 12, `🎳 +4 대미지 (벽)`, '#ffc107', 0.8);
        ctx.createExplosion(ball.x, ball.y, '#ffffff', 4);
      }

      // 3. 캐릭터 충돌 처리 (바운싱 및 데미지 증가 +6, 피해량 적용)
      ctx.characters.forEach((enemy) => {
        if (enemy.isDead || enemy.id === char.id) return;
        
        // 쿨다운 검사
        if (ball.lastHitTargetId === enemy.id && ball.hitCooldown > 0) return;

        const dist = Math.hypot(enemy.x - ball.x, enemy.y - ball.y);
        const minDist = enemy.radius + ball.radius;

        if (dist < minDist) {
          // 캐릭터 충돌 바운싱
          const dx = enemy.x - ball.x;
          const dy = enemy.y - ball.y;
          const nx = dx / dist;
          const ny = dy / dist;

          // 겹침 방지 밀어내기
          ball.x -= nx * ((minDist - dist) / 2);
          ball.y -= ny * ((minDist - dist) / 2);

          const kx = ball.vx - enemy.vx;
          const ky = ball.vy - enemy.vy;
          const vn = kx * nx + ky * ny;

          if (vn > 0) {
            // 속도 반사
            ball.vx -= vn * nx * 2;
            ball.vy -= vn * ny * 2;
          }

          // 데미지 처리 및 넉백
          ctx.dealDamage(char, enemy, ball.damage, '🎳 STRIKE!');
          
          enemy.vx += nx * 4.5;
          enemy.vy += ny * 4.5;
          
          ball.damage += 6;
          ball.lastHitTargetId = enemy.id;
          ball.hitCooldown = 0.5; // 0.5초 연속타격 면역

          ctx.addFloatingText(enemy.x, enemy.y - 45, `🎳 +6 대미지 (명중)`, '#ff5722', 1.2);
          ctx.createExplosion(ball.x, ball.y, '#ff5722', 12);
          ctx.logMessage?.(`🎳 [스트라이크] 명석 ➡️ ${enemy.name} | ${ball.damage - 6} 피해 (스탯 증가 후: ${ball.damage})`, 'skill');
        }
      });
    });

    // 만료된 볼링공 제거
    ms.bowlingBalls = ms.bowlingBalls.filter((b) => b.timeLeft > 0);
  },

  onRenderExtra(char: CharacterState, canvasCtx: CanvasRenderingContext2D, _currentRadius: number) {
    const ms = char as MyeongseokState;
    const bowlingBalls = ms.bowlingBalls || [];

    // 볼링공 렌더링
    bowlingBalls.forEach((ball) => {
      canvasCtx.save();
      canvasCtx.fillStyle = '#1c0d24'; // 어두운 보라/블랙
      canvasCtx.shadowBlur = 8;
      canvasCtx.shadowColor = '#4a154b';
      
      // 공 본체
      canvasCtx.beginPath();
      canvasCtx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
      canvasCtx.fill();

      // 볼링 구멍 3개 그리기 (회전 효과 추가)
      const rot = (Date.now() / 100) % (Math.PI * 2);
      canvasCtx.fillStyle = '#ffffff';
      
      const offsets = [
        { r: 5, a: 0 },
        { r: 5, a: Math.PI * 0.7 },
        { r: 5, a: Math.PI * 1.3 }
      ];

      offsets.forEach((off) => {
        const hx = ball.x + Math.cos(rot + off.a) * off.r;
        const hy = ball.y + Math.sin(rot + off.a) * off.r;
        canvasCtx.beginPath();
        canvasCtx.arc(hx, hy, 2.2, 0, Math.PI * 2);
        canvasCtx.fill();
      });

      // 대미지 텍스트 표시
      canvasCtx.fillStyle = '#ffc107';
      canvasCtx.font = 'bold 9px Outfit, sans-serif';
      canvasCtx.textAlign = 'center';
      canvasCtx.fillText(ball.damage.toString(), ball.x, ball.y - ball.radius - 4);

      canvasCtx.restore();
    });
  }
};
