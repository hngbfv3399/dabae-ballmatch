import type { CharacterConfig, CharacterState, CharacterBehaviorContext } from '../character.interface';

// ═══════════════════════════════════════════
// #region TYPES
// ═══════════════════════════════════════════
interface LaserTrail {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  timeLeft: number;
  maxTime: number;
  color: string;
}
// #endregion TYPES

// ═══════════════════════════════════════════
// #region CONSTANTS
// ═══════════════════════════════════════════
const SKILL_CONSTANTS = {
  COOLDOWN: 6,
  INVISIBILITY_DURATION: 1.5,
  LEG_CHANCE: 0.30,        // 30% leg shot
  BODY_CHANCE: 0.60,       // 60% body shot (cumulative 90%)
  HEAD_CHANCE: 0.10,       // 10% headshot
  LEG_DMG: 20,
  BODY_DMG: 40,
  HEAD_DMG_RATIO: 0.80,    // 80% of target maxHp
  TRAIL_DURATION: 0.3,
  INVISIBLE_ALPHA: 0.25,   // render alpha when invisible
};
// #endregion CONSTANTS

// ═══════════════════════════════════════════
// #region HELPERS
// ═══════════════════════════════════════════
function playHeadshotSound() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const audioCtx = new AudioContextClass();

    // Rising pitch oscillator
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

    // White noise burst
    const bufferSize = audioCtx.sampleRate * 0.3;
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
// #endregion HELPERS

// ═══════════════════════════════════════════
// #region CONFIG — character stats & metadata
// ═══════════════════════════════════════════
export const suConfig: CharacterConfig = {
  id: 'su',
  name: '수',
  maxHp: 140,
  speed: 1.5,
  attackPower: 0,
  baseAttackRange: 60,
  skillName: '정밀 저격 (Sniper shot)',
  skillDescription: '기본 공격력 0. 가장 가까운 대상을 저격합니다. 다리(30% 확률, 20 피해), 바디(60% 확률, 40 피해), 헤드(10% 확률, 대상 최대 체력의 80% 절대 피해) 중 무작위 부위를 저격합니다. 추가로 스킬 사용 시 1.5초간 은신 및 대미지 면역 상태가 됩니다. (쿨타임 6초)',
  color: '#ff2d55',
  skillChargeRate: 16.7,
  tier: 'C',
  role: 'Sniper',
  detailedDescription: '수는 평타 공격력을 완전히 배제한 채 치명적인 은신 한 방 공격에 몰두하는 극단적인 저격수 캐릭터입니다. 스킬 발동 시 1.5초간 은신 및 무적 상태로 돌입해 적들의 시야에서 완전히 사라지며, 10%의 초필살 확률로 상대방의 최대 체력 80%를 날려버리는 파멸적인 헤드샷을 꽂아 전장을 폭발시키는 치명적인 스나이퍼입니다.',
// #endregion CONFIG

  // ═══════════════════════════════════════════
  // #region SKILL_TRIGGER — sniper shot + invisibility
  // ═══════════════════════════════════════════
  onSkillTrigger(char: CharacterState, ctx) {
    char.skillActive = true;
    char.skillDurationLeft = SKILL_CONSTANTS.INVISIBILITY_DURATION;
    char.isSuInvisible = true;
    ctx.addFloatingText(char.x, char.y - 60, '🎯 정밀 저격 및 은신!', '#ff2d55', 1.5);

    // Find closest enemy
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

      // Body part roll: leg(30%), body(60%), head(10%)
      const roll = Math.random();
      let damage = 0;
      let hitPartText = '';
      let particleColor = '#ff2d55';

      if (roll < SKILL_CONSTANTS.LEG_CHANCE) {
        damage = SKILL_CONSTANTS.LEG_DMG;
        hitPartText = '🦵 다리 저격!';
      } else if (roll < SKILL_CONSTANTS.LEG_CHANCE + SKILL_CONSTANTS.BODY_CHANCE) {
        damage = SKILL_CONSTANTS.BODY_DMG;
        hitPartText = '👕 바디 저격!';
      } else {
        damage = Math.round(target.maxHp * SKILL_CONSTANTS.HEAD_DMG_RATIO);
        hitPartText = '🎯 HEADSHOT!!!';
        particleColor = '#ffd700';
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

      // Laser trail
      const activeTrails = (char as any).activeTrails || [];
      activeTrails.push({
        startX: char.x, startY: char.y,
        endX: target.x, endY: target.y,
        timeLeft: SKILL_CONSTANTS.TRAIL_DURATION,
        maxTime: SKILL_CONSTANTS.TRAIL_DURATION,
        color: particleColor
      });
      (char as any).activeTrails = activeTrails;

      // Muzzle flash particles
      for (let i = 0; i < 8; i++) {
        ctx.createParticle(char.x, char.y, '#ff2d55', 2 + Math.random() * 2, 8 + Math.random() * 8);
      }

      // Impact explosion
      const count = roll >= 0.85 ? 20 : 8;
      ctx.createExplosion(target.x, target.y, particleColor, count);
    }
  },
  // #endregion SKILL_TRIGGER

  // ═══════════════════════════════════════════
  // #region UPDATE — trail cooldown & invisibility timer
  // ═══════════════════════════════════════════
  onUpdate(char: CharacterState, dt: number, ctx) {
    if (!(char as any).activeTrails) {
      (char as any).activeTrails = [];
    }
    const activeTrails = (char as any).activeTrails as LaserTrail[];
    activeTrails.forEach((trail) => { trail.timeLeft -= dt; });
    (char as any).activeTrails = activeTrails.filter((t) => t.timeLeft > 0);

    // Invisibility timer
    if (char.skillActive) {
      char.skillDurationLeft -= dt;
      if (char.skillDurationLeft <= 0) {
        char.skillActive = false;
        char.isSuInvisible = false;
        ctx.addFloatingText(char.x, char.y - 25, '은신 해제', '#ff3366', 1.0);
        console.log(`👤 [은신 해제] 수의 은신 상태가 종료되었습니다.`);
      }
    }

    // Stun handling
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
  // #endregion UPDATE

  // ═══════════════════════════════════════════
  // #region DAMAGE — invisible = immune to damage
  // ═══════════════════════════════════════════
  onTakeDamage(target: CharacterState, _attacker: CharacterState, damage: number, _ctx: CharacterBehaviorContext) {
    if (target.isSuInvisible) {
      console.log(`🛡️ [은신 면역] ${target.name}이 은신 상태이므로 피해를 받지 않습니다.`);
      return { finalDamage: 0, blocked: true };
    }
    return { finalDamage: damage, blocked: false };
  },
  // #endregion DAMAGE

  // ═══════════════════════════════════════════
  // #region RENDER — laser trails, invisibility alpha, stun stars
  // ═══════════════════════════════════════════

  // Targeting exclusion when invisible
  isTargetable(char: CharacterState) {
    return !char.isSuInvisible;
  },

  // Semi-transparent when invisible
  onPreRender(char: CharacterState, canvasCtx: CanvasRenderingContext2D) {
    if (char.isSuInvisible) {
      canvasCtx.globalAlpha = SKILL_CONSTANTS.INVISIBLE_ALPHA;
    }
  },

  onRenderExtra(char: CharacterState, canvasCtx: CanvasRenderingContext2D, currentRadius: number) {
    // Laser trails
    const activeTrails = ((char as any).activeTrails || []) as LaserTrail[];
    canvasCtx.save();
    activeTrails.forEach((trail) => {
      const progress = trail.timeLeft / trail.maxTime;
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

    // Stun stars
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
  // #endregion RENDER
};
