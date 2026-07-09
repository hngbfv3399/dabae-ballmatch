import type { CharacterConfig, CharacterState } from './character.interface';

interface SwapPortalEffect {
  x: number;
  y: number;
  life: number; // 1.0 -> 0.0
}

interface JujuState extends CharacterState {
  swapPortals?: SwapPortalEffect[];
  hasEmergencySwapped?: boolean;
  blackHoleX?: number;
  blackHoleY?: number;
}

export const jujuConfig: CharacterConfig = {
  id: 'juju',
  name: '주주',
  maxHp: 135,
  speed: 1.25,
  attackPower: 9,
  baseAttackRange: 45,
  skillName: '전술적 특이점 블랙홀',
  skillDescription: '7초 쿨타임. 스킬 시전 시 현재 위치에 3초간 블랙홀을 소환합니다. 주변 250px 내 적들의 움직임을 원천 봉쇄(기절)하고 블랙홀 중심부로 강력하게 끌고 들어갑니다. 블랙홀 지속 중 주주는 완전 무적입니다. 만료 시 30 광역 충격파 피해와 초강력 넉백을 선사합니다. 패시브: 죽음 직전 위기(체력 5% 이하) 처할 시 1회 한정으로 최다 HP 생존자와 자리를 바꾸고 3초 무적 보호막을 얻습니다.',
  color: '#00bfff', // 홀로그램 하늘색
  skillChargeRate: 14.3, // 7초 쿨타임
  tier: 'S',

  onSkillTrigger(char: CharacterState, ctx) {
    char.skillActive = true;
    char.skillDurationLeft = 3.0; // 3초 유지

    const js = char as JujuState;
    // 주주의 현재 시전 위치에 블랙홀 중심 설정
    js.blackHoleX = js.x;
    js.blackHoleY = js.y;
    
    // 피해 무적 적용
    char.isImmune = true;
    char.immuneTimeLeft = 3.0;

    ctx.addFloatingText(char.x, char.y - 65, '🌀 특이점 블랙홀 소환! (무적)', '#00bfff', 1.8);
    ctx.createExplosion(char.x, char.y, '#00bfff', 15);
    ctx.logMessage?.(`🌀 [블랙홀 시동] 주주 ➡️ 현재 위치(${Math.round(js.blackHoleX)}, ${Math.round(js.blackHoleY)})에 블랙홀 기동 및 3초 피해 면역 무적!`, 'skill');
  },

  onUpdate(char: CharacterState, dt: number, ctx) {
    const js = char as JujuState;
    if (js.swapPortals === undefined) js.swapPortals = [];

    // 1. 포탈 이펙트 수명 차감
    js.swapPortals.forEach((p) => {
      p.life -= dt * 1.8;
    });
    js.swapPortals = js.swapPortals.filter((p) => p.life > 0);

    // 2. 액티브: 블랙홀 흡입 및 만료 붕괴
    if (js.skillActive && js.blackHoleX !== undefined && js.blackHoleY !== undefined) {
      js.skillDurationLeft -= dt;

      const bX = js.blackHoleX;
      const bY = js.blackHoleY;

      // 주주를 제외한 주변 250px 내 적들의 기절 봉쇄 및 강제 끌어당김
      ctx.characters.forEach((enemy: CharacterState) => {
        if (enemy.isDead || enemy.id === js.id) return;
        
        const dx = bX - enemy.x;
        const dy = bY - enemy.y;
        const dist = Math.hypot(dx, dy);

        if (dist <= 250) {
          // A. 기절 처리하여 움직임 무력화 (0.2초 지속 스턴을 프레임마다 리프레시)
          enemy.isStunned = true;
          enemy.stunTimeLeft = Math.max(enemy.stunTimeLeft || 0, 0.2);

          // B. 관성 움직임을 멈춤
          enemy.vx = 0;
          enemy.vy = 0;

          // C. 중심 방향으로 강제 좌표 이동 (강제 흡입)
          if (dist > 15) {
            const pullSpeed = 4.8; // 강하게 끌고 들어감
            const angle = Math.atan2(dy, dx);
            enemy.x += Math.cos(angle) * pullSpeed * (dt * 60);
            enemy.y += Math.sin(angle) * pullSpeed * (dt * 60);
          }
        }
      });

      // 블랙홀 빨아들이는 궤적 파티클 연출
      if (Math.random() < 0.7) {
        const randAngle = Math.random() * Math.PI * 2;
        const startDist = 120 + Math.random() * 120;
        const px = bX + Math.cos(randAngle) * startDist;
        const py = bY + Math.sin(randAngle) * startDist;
        ctx.createParticle(px, py, '#00bfff', 2.2, 25);
      }

      // 블랙홀 시간 만료 붕괴 (강력한 폭발 대미지 30 및 사방 초넉백)
      if (js.skillDurationLeft <= 0) {
        js.skillActive = false;

        ctx.createExplosion(bX, bY, '#1c0d24', 45); // 암흑 특이점 폭발
        ctx.createExplosion(bX, bY, '#00bfff', 35);
        ctx.addFloatingText(bX, bY - 20, '💥 블랙홀 붕괴!', '#ff007f', 2.2);

        // 중앙 반경 250px 모든 적 피해 30 및 외곽 초넉백
        ctx.characters.forEach((enemy: CharacterState) => {
          if (enemy.isDead || enemy.id === js.id) return;
          
          const dx = enemy.x - bX;
          const dy = enemy.y - bY;
          const dist = Math.hypot(dx, dy);

          if (dist <= 250) {
            ctx.dealDamage(js, enemy, 30, '💥 SINGULARITY!');
            
            // 바깥으로 넉백 튕겨내기
            const angle = Math.atan2(dy, dx);
            enemy.vx = Math.cos(angle) * 28.5;
            enemy.vy = Math.sin(angle) * 28.5;
          }
        });

        ctx.logMessage?.(`💥 [블랙홀 붕괴] 주주 ➡️ 블랙홀 특이점 폭발! 주변 적에게 30 광역 피해 및 초강력 외곽 넉백!`, 'skill');
      }
    }

    // 3. 무적 보호막 잔여 시간 차감
    if (js.isImmune && js.immuneTimeLeft !== undefined) {
      js.immuneTimeLeft -= dt;
      if (js.immuneTimeLeft <= 0) {
        js.isImmune = false;
        js.immuneTimeLeft = 0;
        ctx.addFloatingText(js.x, js.y - 45, '🛡️ 보호막 만료', '#888888', 1.0);
      }
    }

    // 홀로그램 그리드 장식
    if (Math.random() < 0.08) {
      ctx.createParticle(js.x, js.y, '#00bfff', 2, 8);
    }
  },

  onRenderExtra(char: CharacterState, canvasCtx: CanvasRenderingContext2D, currentRadius: number) {
    const js = char as JujuState;
    const swapPortals = js.swapPortals || [];

    // 1. 차원 스왑 포탈 이펙트
    swapPortals.forEach((p) => {
      canvasCtx.save();
      canvasCtx.strokeStyle = `rgba(0, 191, 255, ${p.life})`;
      canvasCtx.lineWidth = 4;
      canvasCtx.shadowBlur = 12;
      canvasCtx.shadowColor = '#00bfff';
      
      const radius = (0.8 - p.life) * 110 + 10;
      canvasCtx.beginPath();
      canvasCtx.arc(p.x, p.y, radius, 0, Math.PI * 2);
      canvasCtx.stroke();
      canvasCtx.restore();
    });

    // 2. 액티브: 전술 블랙홀 코어 렌더링 (주주가 소환했던 시전 좌표)
    if (js.skillActive && js.blackHoleX !== undefined && js.blackHoleY !== undefined) {
      canvasCtx.save();
      const bX = js.blackHoleX;
      const bY = js.blackHoleY;
      
      // 블랙 코어 암흑원
      canvasCtx.fillStyle = 'rgba(10, 5, 20, 0.85)';
      canvasCtx.beginPath();
      canvasCtx.arc(bX, bY, 45, 0, Math.PI * 2);
      canvasCtx.fill();

      // 회전하는 청색 특이점 중력 고리
      canvasCtx.strokeStyle = '#00bfff';
      canvasCtx.lineWidth = 4;
      canvasCtx.shadowBlur = 25;
      canvasCtx.shadowColor = '#00bfff';
      
      const rotAngle = (Date.now() / 150) % (Math.PI * 2);
      canvasCtx.beginPath();
      canvasCtx.arc(bX, bY, 55, rotAngle, rotAngle + Math.PI * 0.7);
      canvasCtx.stroke();

      canvasCtx.beginPath();
      canvasCtx.arc(bX, bY, 55, rotAngle + Math.PI, rotAngle + Math.PI * 1.7);
      canvasCtx.stroke();
      
      canvasCtx.restore();
    }

    // 3. 무적 보호막 베리어막 드로잉
    if (js.isImmune) {
      canvasCtx.save();
      canvasCtx.strokeStyle = 'rgba(0, 191, 255, 0.8)';
      canvasCtx.lineWidth = 3.5;
      canvasCtx.shadowBlur = 15;
      canvasCtx.shadowColor = '#00bfff';
      
      const pulse = Math.sin(Date.now() / 50) * 1.5;
      canvasCtx.beginPath();
      canvasCtx.arc(char.x, char.y, currentRadius + 5 + pulse, 0, Math.PI * 2);
      canvasCtx.stroke();
      
      canvasCtx.restore();
    }

    // 4. 주주 기본 그리드
    canvasCtx.save();
    canvasCtx.strokeStyle = 'rgba(0, 191, 255, 0.4)';
    canvasCtx.lineWidth = 1.2;
    const rot = (Date.now() / 500) % (Math.PI * 2);
    canvasCtx.beginPath();
    canvasCtx.arc(char.x, char.y, currentRadius + 4, rot, rot + Math.PI * 0.5);
    canvasCtx.stroke();
    canvasCtx.beginPath();
    canvasCtx.arc(char.x, char.y, currentRadius + 4, rot + Math.PI, rot + Math.PI * 1.5);
    canvasCtx.stroke();
    canvasCtx.restore();
  }
};
