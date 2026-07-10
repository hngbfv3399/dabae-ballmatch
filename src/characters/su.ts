import type { CharacterConfig, CharacterState } from './character.interface';

interface LaserTrail {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  timeLeft: number;
  maxTime: number;
  color: string;
}

function playHeadshotSound() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const audioCtx = new AudioContextClass();

    // 1. 피이익- 솟구치는 소리 (Oscillator)
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    
    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(1200, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(150, audioCtx.currentTime + 0.45);
    
    gainNode.gain.setValueAtTime(0.25, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.45);
    
    osc.start();
    osc.stop(audioCtx.currentTime + 0.45);

    // 2. 바삭하는 폭발 노이즈 버퍼 추가 (화이트 노이즈로 탕! 터지는 파열음 생성)
    const bufferSize = audioCtx.sampleRate * 0.3; // 0.3초
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    
    const noise = audioCtx.createBufferSource();
    noise.buffer = buffer;
    
    const filter = audioCtx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 800;
    
    const noiseGain = audioCtx.createGain();
    noiseGain.gain.setValueAtTime(0.2, audioCtx.currentTime);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
    
    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(audioCtx.destination);
    
    noise.start();
    noise.stop(audioCtx.currentTime + 0.3);
  } catch (e) {
    console.warn('Web Audio API headshot sound block:', e);
  }
}

export const suConfig: CharacterConfig = {
  id: 'su',
  name: '수',
  maxHp: 140,
  speed: 1.5,
  attackPower: 0,
  baseAttackRange: 60,
  skillName: '정밀 저격 (Sniper shot)',
  skillDescription: '기본 공격력 0. 가장 가까운 대상을 저격합니다. 다리(30% 확률, 20 피해), 바디(60% 확률, 40 피해), 헤드(10% 확률, 대상 최대 체력의 80% 절대 피해) 중 무작위 부위를 저격합니다. 추가로 스킬 사용 시 1.5초간 은신 및 대미지 면역 상태가 됩니다. (쿨타임 6초)',
  color: '#ff2d55', // 네온 핑크 크림슨
  skillChargeRate: 16.7, // 6초 쿨타임 (100 / 6 = 16.66...)
  tier: 'C',
  role: 'Sniper',
  detailedDescription: '수는 평타 공격력을 완전히 배제한 채 치명적인 은신 한 방 공격에 몰두하는 극단적인 저격수 캐릭터입니다. 스킬 발동 시 1.5초간 은신 및 무적 상태로 돌입해 적들의 시야에서 완전히 사라지며, 10%의 초필살 확률로 상대방의 최대 체력 80%를 날려버리는 파멸적인 헤드샷을 꽂아 전장을 폭발시키는 치명적인 스나이퍼입니다.',

  // [1] 스킬 발동 훅 (저격 총 발사 및 1.5초 은신/무적)
  onSkillTrigger(char: CharacterState, ctx) {
    char.skillActive = true; 
    char.skillDurationLeft = 1.5;
    char.isSuInvisible = true;
    ctx.addFloatingText(char.x, char.y - 60, '🎯 정밀 저격 및 은신!', '#ff2d55', 1.5);
    // 가장 가까운 적 조준
    let closestEnemy: CharacterState | null = null;
    let minDist = Infinity;
    ctx.characters.forEach((enemy) => {
      if (enemy.isDead || enemy.id === char.id) return;
      const dist = Math.hypot(enemy.x - char.x, enemy.y - char.y);
      if (dist < minDist) {
        minDist = dist;
        closestEnemy = enemy;
      }
    });

    if (closestEnemy) {
      const target = closestEnemy as CharacterState;

      // 부위 판정: 다리(30%), 바디(60%), 헤드(10%)
      const roll = Math.random();
      let damage = 0;
      let hitPartText = '';
      let particleColor = '#ff2d55';

      if (roll < 0.30) {
        damage = 20;
        hitPartText = '🦵 다리 저격!';
      } else if (roll < 0.90) {
        damage = 40;
        hitPartText = '👕 바디 저격!';
      } else {
        // 헤드샷: 피(최대체력)의 80% 깎임
        damage = Math.round(target.maxHp * 0.80);
        hitPartText = '🎯 HEADSHOT!!!';
        particleColor = '#ffd700'; // 헤드샷 골드 플래시

        // 헤드샷 특수 연출 (소리, 파티클 폭발, 텍스트)
        playHeadshotSound();
        ctx.createExplosion(target.x, target.y, '#ffd700', 40);
        ctx.addFloatingText(target.x, target.y - 70, '🎯 CRITICAL HEADSHOT!!!', '#ffd700', 2.2);
      }

      console.log(`🔫 [저격 시전] 수 -> ${target.name} | 판정: ${hitPartText.split(' ')[0]} (피해량: ${damage})`);
      if (roll >= 0.90) {
        ctx.logMessage?.(`🎯 [헤드샷!!!] 수의 저격 탄환이 ${target.name}의 머리를 관통했습니다! (${damage} 치명타 피해!)`, 'death');
      } else {
        ctx.logMessage?.(`🔫 [저격 시전] 수 ➡️ ${target.name} | 판정: ${hitPartText} (피해량: ${damage})`, 'skill');
      }
      ctx.dealDamage(char, target, damage, hitPartText);

      // 레이저 탄도선 추가
      const activeTrails = (char as any).activeTrails || [];
      activeTrails.push({
        startX: char.x,
        startY: char.y,
        endX: target.x,
        endY: target.y,
        timeLeft: 0.3,
        maxTime: 0.3,
        color: particleColor
      });
      (char as any).activeTrails = activeTrails;

      // 발사 반동 파티클 (총구 화염)
      for (let i = 0; i < 8; i++) {
        ctx.createParticle(
          char.x,
          char.y,
          '#ff2d55',
          2 + Math.random() * 2,
          8 + Math.random() * 8
        );
      }

      // 피격 폭발
      const count = roll >= 0.85 ? 20 : 8;
      ctx.createExplosion(target.x, target.y, particleColor, count);
    }
  },

  // [2] 매 프레임 업데이트 훅 (탄도선 쿨다운 및 은신 제어)
  onUpdate(char: CharacterState, dt: number, ctx) {
    if (!(char as any).activeTrails) {
      (char as any).activeTrails = [];
    }
    const activeTrails = (char as any).activeTrails as LaserTrail[];
    activeTrails.forEach((trail) => {
      trail.timeLeft -= dt;
    });
    (char as any).activeTrails = activeTrails.filter((t) => t.timeLeft > 0);

    // 은신 지속시간 갱신 및 해제
    if (char.skillActive) {
      char.skillDurationLeft -= dt;
      if (char.skillDurationLeft <= 0) {
        char.skillActive = false;
        char.isSuInvisible = false;
        ctx.addFloatingText(char.x, char.y - 25, '은신 해제', '#ff3366', 1.0);
        console.log(`👤 [은신 해제] 수의 은신 상태가 종료되었습니다.`);
      }
    }

    // 기절 상태 제어
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
  },

  // [3] 캐릭터 고유 렌더링 확장 훅 (레이저 선 그리기)
  onRenderExtra(char: CharacterState, canvasCtx: CanvasRenderingContext2D, currentRadius: number) {
    const activeTrails = ((char as any).activeTrails || []) as LaserTrail[];
    
    canvasCtx.save();
    activeTrails.forEach((trail) => {
      const progress = trail.timeLeft / trail.maxTime; // 1.0 -> 0.0
      canvasCtx.strokeStyle = trail.color;
      canvasCtx.lineWidth = 3.5 * progress;
      canvasCtx.shadowBlur = 12;
      canvasCtx.shadowColor = trail.color;

      canvasCtx.beginPath();
      canvasCtx.moveTo(trail.startX, trail.startY);
      canvasCtx.lineTo(trail.endX, trail.endY);
      canvasCtx.stroke();
    });
    canvasCtx.restore();

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
