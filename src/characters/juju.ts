import type { CharacterConfig, CharacterState } from './character.interface';

interface SwapPortalEffect {
  x: number;
  y: number;
  life: number; // 1.0 -> 0.0
}

interface JujuState extends CharacterState {
  swapPortals?: SwapPortalEffect[];
  hasEmergencySwapped?: boolean;
}

export const jujuConfig: CharacterConfig = {
  id: 'juju',
  name: '주주',
  maxHp: 135,
  speed: 1.25,
  attackPower: 9,
  baseAttackRange: 45,
  skillName: '전술적 특이점 블랙홀',
  skillDescription: '7초 쿨타임. 맵 중앙(400, 300)에 3초 동안 블랙홀을 소환해 적들을 한데 모으고, 만료 즉시 30 피해의 충격파와 사방 초강력 넉백을 가합니다. 블랙홀 소환 중 주주는 완전 무적입니다. 패시브: 체력이 5% 이하가 되면 1회 한정으로 최다 HP 생존자와 위치를 즉시 맞바꾸고 3초 무적 보호막을 얻습니다.',
  color: '#00bfff', // 홀로그램 하늘색
  skillChargeRate: 14.3, // 7초 쿨타임
  tier: 'S',

  onSkillTrigger(char: CharacterState, ctx) {
    char.skillActive = true;
    char.skillDurationLeft = 3.0; // 3초 유지
    
    // 피해 무적 적용
    char.isImmune = true;
    char.immuneTimeLeft = 3.0;

    ctx.addFloatingText(char.x, char.y - 65, '🌀 전술 블랙홀 기동! (무적)', '#00bfff', 1.8);
    ctx.createExplosion(char.x, char.y, '#00bfff', 15);
    ctx.logMessage?.(`🌀 [블랙홀 가동] 주주 ➡️ 맵 중앙(400, 300)에 블랙홀 소환 및 3초 피해 면역 무적!`, 'skill');
  },

  onUpdate(char: CharacterState, dt: number, ctx) {
    const js = char as JujuState;
    if (js.swapPortals === undefined) js.swapPortals = [];

    // 1. 패시브: 체력이 5% 이하인 경우 비상 텔레포트 스왑 (1회 한정)
    if (js.hp <= js.maxHp * 0.05 && !js.hasEmergencySwapped && !js.isDead) {
      js.hasEmergencySwapped = true;

      // 생존자 중 가장 체력이 높은 대상 찾기
      let target: any = null;
      let maxHp = -Infinity;

      ctx.characters.forEach((enemy) => {
        if (enemy.isDead || enemy.id === js.id) return;
        if (enemy.hp > maxHp) {
          maxHp = enemy.hp;
          target = enemy;
        }
      });

      if (target) {
        const jX = js.x;
        const jY = js.y;
        const tX = target.x;
        const tY = target.y;

        // 위치 맞바꾸기
        js.x = tX;
        js.y = tY;
        target.x = jX;
        target.y = jY;

        // 포탈 이펙트 등록
        js.swapPortals.push({ x: jX, y: jY, life: 0.8 });
        js.swapPortals.push({ x: tX, y: tY, life: 0.8 });

        // 주주 비상 보호막 무적 부여 (3초)
        js.isImmune = true;
        js.immuneTimeLeft = 3.0;

        ctx.createExplosion(jX, jY, '#00bfff', 15);
        ctx.createExplosion(tX, tY, '#00bfff', 15);
        ctx.addFloatingText(js.x, js.y - 70, '🛡️ 비상 탈출! (무적 3초)', '#00bfff', 2.0);
        ctx.logMessage?.(`🛡️ [비상 탈출] 주주 ➡️ 체력 5% 이하 비상 차원 스왑 활성화! ${target.name}와 위치 스왑 및 3초 무적 보호막 생성!`, 'skill');
      }
    }

    // 2. 포탈 이펙트 수명 차감
    js.swapPortals.forEach((p) => {
      p.life -= dt * 1.8;
    });
    js.swapPortals = js.swapPortals.filter((p) => p.life > 0);

    // 3. 액티브: 블랙홀 흡입 및 만료 붕괴
    if (js.skillActive) {
      js.skillDurationLeft -= dt;

      // 주주를 제외한 모든 적을 맵 중앙 (400, 300)으로 강력 흡입
      ctx.characters.forEach((enemy: CharacterState) => {
        if (enemy.isDead || enemy.id === js.id) return;
        
        const dx = 400 - enemy.x;
        const dy = 300 - enemy.y;
        const dist = Math.hypot(dx, dy);

        if (dist > 15) {
          const force = 0.55; // 끌어당기는 힘
          const angle = Math.atan2(dy, dx);
          enemy.vx += Math.cos(angle) * force;
          enemy.vy += Math.sin(angle) * force;
        }
      });

      // 중앙 흡입 입자 비주얼 파티클 생성
      if (Math.random() < 0.7) {
        const randAngle = Math.random() * Math.PI * 2;
        const startDist = 150 + Math.random() * 150;
        const px = 400 + Math.cos(randAngle) * startDist;
        const py = 300 + Math.sin(randAngle) * startDist;
        ctx.createParticle(px, py, '#00bfff', 2.2, 35);
        // 수동으로 생성한 입자 벡터 조절이 어려우므로 궤적 효과만 적용
      }

      // 블랙홀 시간 초과 만료 붕괴 (강력한 폭발 대미지 30 및 초넉백)
      if (js.skillDurationLeft <= 0) {
        js.skillActive = false;

        ctx.createExplosion(400, 300, '#1c0d24', 45); // 암흑 붕괴 코어
        ctx.createExplosion(400, 300, '#00bfff', 35); // 중력 스파크
        ctx.addFloatingText(400, 280, '💥 블랙홀 특이점 붕괴!', '#ff007f', 2.2);

        // 중앙 반경 250px 모든 적 피해 30 및 외곽 초넉백
        ctx.characters.forEach((enemy: CharacterState) => {
          if (enemy.isDead || enemy.id === js.id) return;
          
          const dx = enemy.x - 400;
          const dy = enemy.y - 300;
          const dist = Math.hypot(dx, dy);

          if (dist <= 250) {
            ctx.dealDamage(js, enemy, 30, '💥 SINGULARITY!');
            
            // 바깥으로 극심한 넉백 튕겨내기
            const angle = Math.atan2(dy, dx);
            enemy.vx = Math.cos(angle) * 14.5;
            enemy.vy = Math.sin(angle) * 14.5;
          }
        });

        ctx.logMessage?.(`💥 [블랙홀 붕괴] 주주 ➡️ 블랙홀 붕괴! 주변 광역 30 피해 및 사방 초강력 넉백 격발!`, 'skill');
      }
    }

    // 4. 무적 보호막 잔여 시간 차감
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

    // 2. 액티브: 전술 블랙홀 코어 렌더링 (맵 중앙 400, 300)
    if (js.skillActive) {
      canvasCtx.save();
      
      // 블랙 코어 암흑원
      canvasCtx.fillStyle = 'rgba(10, 5, 20, 0.85)';
      canvasCtx.beginPath();
      canvasCtx.arc(400, 300, 45, 0, Math.PI * 2);
      canvasCtx.fill();

      // 회전하는 청색 특이점 중력 고리
      canvasCtx.strokeStyle = '#00bfff';
      canvasCtx.lineWidth = 4;
      canvasCtx.shadowBlur = 25;
      canvasCtx.shadowColor = '#00bfff';
      
      const rotAngle = (Date.now() / 150) % (Math.PI * 2);
      canvasCtx.beginPath();
      canvasCtx.arc(400, 300, 55, rotAngle, rotAngle + Math.PI * 0.7);
      canvasCtx.stroke();

      canvasCtx.beginPath();
      canvasCtx.arc(400, 300, 55, rotAngle + Math.PI, rotAngle + Math.PI * 1.7);
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
      
      // 보호막 구체 맥동
      const pulse = Math.sin(Date.now() / 50) * 1.5;
      canvasCtx.beginPath();
      canvasCtx.arc(js.x, js.y, currentRadius + 5 + pulse, 0, Math.PI * 2);
      canvasCtx.stroke();
      
      canvasCtx.restore();
    }

    // 4. 주주 기본 그리드
    canvasCtx.save();
    canvasCtx.strokeStyle = 'rgba(0, 191, 255, 0.4)';
    canvasCtx.lineWidth = 1.2;
    const rot = (Date.now() / 500) % (Math.PI * 2);
    canvasCtx.beginPath();
    canvasCtx.arc(js.x, js.y, currentRadius + 4, rot, rot + Math.PI * 0.5);
    canvasCtx.stroke();
    canvasCtx.beginPath();
    canvasCtx.arc(js.x, js.y, currentRadius + 4, rot + Math.PI, rot + Math.PI * 1.5);
    canvasCtx.stroke();
    canvasCtx.restore();
  }
};
