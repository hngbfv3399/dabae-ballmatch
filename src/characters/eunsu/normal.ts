import type { CharacterConfig, CharacterState, CharacterBehaviorContext } from '../character.interface';

// ═══════════════════════════════════════════
// #region CONFIG — character stats & metadata
// ═══════════════════════════════════════════
export const eunsuConfig: CharacterConfig = {
  id: 'eunsu',
  name: '은수',
  maxHp: 130,
  speed: 1.3,
  attackPower: 16,
  defense: 8,
  baseAttackRange: 45,
  skillName: '색욕의 도플갱어',
  skillDescription: '10초 쿨타임. 스킬 사용 시 80% 확률로 자신과 비슷한 약체 분신(은수 분신)을 소환하고, 20% 확률로 실패합니다. 패시브: 적과 접촉 충돌 시 25% 확률로 상대를 0.8초간 기절시키며 "팡! 팡!" 연속 2연타 타격 대미지를 입힙니다.',
  color: '#ff007f', // 딥 마젠타
  skillChargeRate: 10, // 10초 쿨타임
  tier: 'A',
  role: 'Summoner',
  detailedDescription: '은수는 다수의 분신을 실시간으로 생산하여 전장을 대혼란에 빠뜨리는 소환형 포지션의 캐릭터입니다. 80% 확률로 본체 사양의 약화 버전인 도플갱어 분신을 연속으로 생성해 대전 상대들의 공격 표적을 어지럽히며, 본체는 안전하게 숨은 채 분신들의 누적 타격과 기절 유도를 통해 교란 전술을 펼칩니다.',
// #endregion CONFIG

  // ═══════════════════════════════════════════
  // #region SKILL_TRIGGER — spawn clone
  // ═══════════════════════════════════════════
  onSkillTrigger(char: CharacterState, ctx) {
    // Restart cooldown immediately
    char.skillActive = false;
    char.skillDurationLeft = 0;

    // 20% chance to fail clone spawn
    if (Math.random() < 0.2) {
      ctx.addFloatingText(char.x, char.y - 50, '⚠️ 분신 소환 실패!', '#888888', 1.5);
      ctx.logMessage?.(`⚠️ [분신 실패] 은수 ➡️ 20% 소환 실패 확률을 뚫지 못했습니다.`, 'skill');
      return;
    }

    // Success: create clone state
    const cloneId = `eunsu_clone_${Date.now()}`;
    const angle = Math.random() * Math.PI * 2;
    const spawnDist = 45;
    
    const cloneState: CharacterState = {
      id: cloneId,
      name: '은수 분신',
      maxHp: 60,
      hp: 60,
      speed: 1.0,
      attackPower: 11,
      baseAttackRange: 45,
      skillName: '분신 일격',
      skillDescription: '소환된 은수의 복제품입니다.',
      color: '#ff007f',
      skillChargeRate: 0,
      role: 'Summoner',
      detailedDescription: '은수가 소환한 복제 분신체입니다.',
      
      x: char.x + Math.cos(angle) * spawnDist,
      y: char.y + Math.sin(angle) * spawnDist,
      vx: Math.cos(angle + 1) * 3,
      vy: Math.sin(angle + 1) * 3,
      radius: 24, // slightly smaller radius
      opacity: 0.6, // translucent clone opacity
      isDead: false,
      skillGauge: 0,
      baseAttackCooldown: 0,
      skillCooldown: 0,
      skillActive: false,
      skillDurationLeft: 0,
      damageTakenQueue: [],
      isTyping: false,
      typingTimeLeft: 0,
      isStunned: false,
      stunTimeLeft: 0,
      scaleMultiplier: 1,
      totalDamageDealt: 0,
      totalDamageTaken: 0,
      kills: 0,
      rank: 0,
      isMvp: false,
      mvpScore: 0,
      deathAnimationTime: 0,

      // Simple clone basic attack hook
      onBasicAttack(c, opp, cx) {
        cx.createExplosion((c.x + opp.x) / 2, (c.y + opp.y) / 2, '#ff007f', 4);
      }
    };

    // Dynamically push to characters array
    ctx.characters.push(cloneState);

    ctx.addFloatingText(char.x, char.y - 65, '👥 분신 소환 완료!', '#ff007f', 1.8);
    ctx.createExplosion(char.x, char.y, '#ff007f', 20);
    ctx.logMessage?.(`👥 [분신 성공] 은수 ➡️ 체력 60, 공 6의 분신을 소환했습니다.`, 'skill');
  },
  // #endregion SKILL_TRIGGER

  // ═══════════════════════════════════════════
  // #region COLLISION — passive stun & double strike
  // ═══════════════════════════════════════════
  onCollisionWithTarget(char: CharacterState, opponent: CharacterState, ctx) {
    if (opponent.isDead || opponent.id.includes('clone')) return;

    // Passive: 25% chance to stun (0.8s) and deal double strike
    if (Math.random() < 0.25) {
      ctx.applyStun(char, opponent, 0.8);

      ctx.dealDamage(char, opponent, 6, '🥊 팡!');
      ctx.dealDamage(char, opponent, 6, '🥊 팡!');

      ctx.addFloatingText(opponent.x, opponent.y - 50, '🥊 팡! 팡! (기절)', '#ff007f', 1.6);
      ctx.createExplosion((char.x + opponent.x) / 2, (char.y + opponent.y) / 2, '#ff007f', 15);
      ctx.logMessage?.(`🥊 [패시브] 은수 ➡️ ${opponent.name}에게 충돌 기절(0.8초) 및 2연격 대미지(12)`, 'damage');
    }
  },
  // #endregion COLLISION

  // ═══════════════════════════════════════════
  // #region UPDATE — passive aura particles
  // ═══════════════════════════════════════════
  onUpdate(char: CharacterState, _dt: number, ctx) {
    if (Math.random() < 0.08) {
      ctx.createParticle(char.x, char.y, '#ff007f', 2.5, 12);
    }
  },
  // #endregion UPDATE

  // ═══════════════════════════════════════════
  // #region DEATH — destroy all clones on main death
  // ═══════════════════════════════════════════
  onDeath(char: CharacterState, _killer: CharacterState, ctx: CharacterBehaviorContext) {
    if (char.id === 'eunsu') {
      ctx.characters.forEach((clone) => {
        if (!clone.isDead && clone.id.includes('eunsu_clone')) {
          clone.hp = 0;
          clone.isDead = true;
          clone.opacity = 0.8;
          (clone as any).deathAnimationTime = 1.5;
          ctx.createExplosion(clone.x, clone.y, '#ff007f', 20);
          ctx.addFloatingText(clone.x, clone.y - 10, '분신 소멸', '#ff007f', 1.5);
          console.log(`👥 [분신 소멸] 은수 본체 사망으로 인해 분신(${clone.id})이 제거되었습니다.`);
        }
      });
    }
  },
  // #endregion DEATH

  // ═══════════════════════════════════════════
  // #region RENDER — pink glow ring
  // ═══════════════════════════════════════════
  onRenderExtra(char: CharacterState, canvasCtx: CanvasRenderingContext2D, currentRadius: number) {
    canvasCtx.save();
    canvasCtx.strokeStyle = '#ff007f';
    canvasCtx.lineWidth = 1.5;
    canvasCtx.shadowBlur = 8;
    canvasCtx.shadowColor = '#ff007f';
    canvasCtx.beginPath();
    canvasCtx.arc(char.x, char.y, currentRadius + 3, 0, Math.PI * 2);
    canvasCtx.stroke();
    canvasCtx.restore();
  }
  // #endregion RENDER
};
