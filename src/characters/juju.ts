import type { CharacterConfig, CharacterState } from './character.interface';

interface SwapPortalEffect {
  x: number;
  y: number;
  life: number; // 1.0 -> 0.0
}

interface JujuState extends CharacterState {
  swapPortals?: SwapPortalEffect[];
}

export const jujuConfig: CharacterConfig = {
  id: 'juju',
  name: '주주',
  maxHp: 135,
  speed: 1.25,
  attackPower: 9,
  baseAttackRange: 45,
  skillName: '차원 전술 포탈',
  skillDescription: '7초 쿨타임. 스킬 충전 완료 시 자신을 제외하고 체력이 가장 많은 적을 탐색해 위치를 즉시 맞바꿉니다. 교환 순간 두 위치에 차원 포탈 충격파가 터져 주변 반경 120px 안의 다른 모든 상대에게 15의 대미지와 강력한 넉백을 선사합니다.',
  color: '#00bfff', // 홀로그램 하늘색
  skillChargeRate: 14.3, // 7초 쿨타임
  tier: 'S',

  onSkillTrigger(char: CharacterState, ctx) {
    // 자신을 제외하고 체력이 가장 많은 상대 찾기
    let target: any = null;
    let maxHp = -Infinity;

    ctx.characters.forEach((enemy) => {
      if (enemy.isDead || enemy.id === char.id) return;
      if (enemy.hp > maxHp) {
        maxHp = enemy.hp;
        target = enemy;
      }
    });

    if (target) {
      const jX = char.x;
      const jY = char.y;
      const tX = (target as CharacterState).x;
      const tY = (target as CharacterState).y;

      // 1. 위치 맞바꾸기
      char.x = tX;
      char.y = tY;
      (target as CharacterState).x = jX;
      (target as CharacterState).y = jY;

      // 2. 포탈 흔적 이펙트 생성
      const js = char as JujuState;
      const swapPortals = js.swapPortals || [];
      swapPortals.push({ x: jX, y: jY, life: 0.8 });
      swapPortals.push({ x: tX, y: tY, life: 0.8 });
      js.swapPortals = swapPortals;

      // 3. 차원 충격파 격발 함수
      const triggerShockwave = (x: number, y: number) => {
        ctx.createExplosion(x, y, '#00bfff', 18);
        ctx.addFloatingText(x, y - 10, '🌀 SWAP!', '#00bfff', 1.5);
        
        ctx.characters.forEach((enemy: CharacterState) => {
          if (enemy.isDead || enemy.id === char.id) return;
          const dist = Math.hypot(enemy.x - x, enemy.y - y);
          if (dist <= 120) {
            ctx.dealDamage(char, enemy, 15, '🌀 PORTAL BLAST!');
            
            // 강력한 폭발 넉백 벡터 적용
            const angle = Math.atan2(enemy.y - y, enemy.x - x);
            enemy.vx += Math.cos(angle) * 7.5;
            enemy.vy += Math.sin(angle) * 7.5;
          }
        });
      };

      triggerShockwave(jX, jY);
      triggerShockwave(tX, tY);

      ctx.logMessage?.(`🌀 [차원 교환] 주주 ➡️ 체력이 가장 높은 ${target.name}(HP: ${target.hp})와 위치 스왑!`, 'skill');
    } else {
      ctx.addFloatingText(char.x, char.y - 50, '🌀 차원 간섭 실패 (대상 없음)', '#888888', 1.0);
    }
  },

  onUpdate(char: CharacterState, dt: number, ctx) {
    const js = char as JujuState;
    if (js.swapPortals === undefined) js.swapPortals = [];

    // 포탈 이펙트 수명 차감
    js.swapPortals.forEach((p) => {
      p.life -= dt * 1.8;
    });
    js.swapPortals = js.swapPortals.filter((p) => p.life > 0);

    // 홀로그램 잔상 이펙트
    if (Math.random() < 0.1) {
      ctx.createParticle(char.x, char.y, '#00bfff', 2, 10);
    }
  },

  onRenderExtra(char: CharacterState, canvasCtx: CanvasRenderingContext2D, currentRadius: number) {
    const js = char as JujuState;
    const swapPortals = js.swapPortals || [];

    // 1. 차원 전송 구체 포탈 이펙트 그리기
    swapPortals.forEach((p) => {
      canvasCtx.save();
      canvasCtx.strokeStyle = `rgba(0, 191, 255, ${p.life})`;
      canvasCtx.lineWidth = 4;
      canvasCtx.shadowBlur = 12;
      canvasCtx.shadowColor = '#00bfff';
      
      // 퍼져나가는 고리 그리기
      const radius = (0.8 - p.life) * 110 + 10;
      canvasCtx.beginPath();
      canvasCtx.arc(p.x, p.y, radius, 0, Math.PI * 2);
      canvasCtx.stroke();
      canvasCtx.restore();
    });

    // 2. 주주 전술 궤도 회전 그리드
    canvasCtx.save();
    canvasCtx.strokeStyle = 'rgba(0, 191, 255, 0.45)';
    canvasCtx.lineWidth = 1.5;
    
    const rotAngle = (Date.now() / 450) % (Math.PI * 2);
    canvasCtx.beginPath();
    canvasCtx.arc(char.x, char.y, currentRadius + 5, rotAngle, rotAngle + Math.PI * 0.45);
    canvasCtx.stroke();

    canvasCtx.beginPath();
    canvasCtx.arc(char.x, char.y, currentRadius + 5, rotAngle + Math.PI, rotAngle + Math.PI * 1.45);
    canvasCtx.stroke();
    canvasCtx.restore();
  }
};
