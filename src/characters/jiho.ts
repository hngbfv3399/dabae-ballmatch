import type { CharacterConfig, CharacterState, CharacterBehaviorContext } from './character.interface';

// ═══════════════════════════════════════════
// #region CONSTANTS
// ═══════════════════════════════════════════
const SKILL_CONSTANTS = {
  COOLDOWN: 5,
  BUG_CHANCE: 0.4,
  BUG_DURATION: 3.0,
  BUG_SPEED_DEBUFF: 30, // 30% speed reduction
  CRASH_CHANCE: 0.5,
  CRASH_DMG: 20,
  CRASH_STUN_DURATION: 1.0,
  CRASH_SPLASH_RADIUS: 120,
  CRASH_SPLASH_DMG: 15,
  TYPING_DURATION: 2.0,
  COMPILE_SUCCESS_CHANCE: 0.65,
  COMPILE_SUCCESS_SPLASH_RADIUS: 150,
  COMPILE_SUCCESS_SPLASH_DMG: 25,
  COMPILE_BUFF_DURATION: 5.0,
  COMPILE_HEAL_PCT: 30, // 30% heal
  COMPILE_SPEED_MULTIPLIER: 2.0,
  COMPILE_ATK_MULTIPLIER: 2.2,
  COMPILE_FAIL_STUN_DURATION: 2.0,
  COMPILE_FAIL_SELF_DMG_MULTIPLIER: 1.5,
};
// #endregion CONSTANTS

// ═══════════════════════════════════════════
// #region CONFIG — character stats & metadata
// ═══════════════════════════════════════════
export const jihoConfig: CharacterConfig = {
  id: 'jiho',
  name: '지호',
  maxHp: 160,
  speed: 1.4,
  attackPower: 10,
  baseAttackRange: 45,
  skillName: '코드 컴파일 및 실행',
  skillDescription: `${SKILL_CONSTANTS.COOLDOWN}초 쿨타임. 기본 공격 시 ${SKILL_CONSTANTS.BUG_CHANCE * 100}% 확률로 ${SKILL_CONSTANTS.BUG_DURATION}초간 [버그] 디버프(이속 ${SKILL_CONSTANTS.BUG_SPEED_DEBUFF}% 감소)를 걸며, 디버프 적용 시 ${SKILL_CONSTANTS.CRASH_CHANCE * 100}% 확률로 [런타임 에러](${SKILL_CONSTANTS.CRASH_DMG} 피해 + ${SKILL_CONSTANTS.CRASH_STUN_DURATION}초 기절 및 주변 ${SKILL_CONSTANTS.CRASH_SPLASH_RADIUS}px 적들에게 ${SKILL_CONSTANTS.CRASH_SPLASH_DMG} 광역 피해)를 입힙니다. 스킬 성공 시 주변에 ${SKILL_CONSTANTS.COMPILE_SUCCESS_SPLASH_DMG}의 광역 피해와 넉백을 주고 버프를 얻으며, 실패 시 기절합니다.`,
  color: '#00ffcc',       // Terminal green
  skillChargeRate: 100 / SKILL_CONSTANTS.COOLDOWN,
  tier: 'A',
  role: 'Specialist',
  detailedDescription: `지호는 확률적 디버프와 컴파일 연쇄 효과를 이용하는 테크니컬한 변수형 캐릭터입니다. 기본 공격 시 일정 확률로 상대방에게 치명적인 [버그] 디버프(이동 속도 저하)를 걸고, 디버프가 적용된 적을 재타격해 ${SKILL_CONSTANTS.CRASH_STUN_DURATION}초 기절과 광역 스플래시 피해를 동반하는 [런타임 에러]를 컴파일하여 예기치 못한 전술적 혼란을 야기합니다.`,
// #endregion CONFIG

  // ═══════════════════════════════════════════
  // #region BASIC_ATTACK — basic attack hooks & effects
  // ═══════════════════════════════════════════
  onBasicAttack(char: CharacterState, opponent: CharacterState, ctx) {
    if (opponent.isDead) return;

    // 40% chance to apply bug debuff
    if (Math.random() < SKILL_CONSTANTS.BUG_CHANCE) {
      const opp = opponent as any;

      if (!opp.jihoDebuffTimeLeft || opp.jihoDebuffTimeLeft <= 0) {
        opp.jihoDebuffOriginalSpeed = opponent.speed;
        opponent.speed = opponent.speed * (1 - SKILL_CONSTANTS.BUG_SPEED_DEBUFF / 100); // Reduce speed
        console.log(`🐛 [디버프 부여] 지호 -> ${opponent.name} | [버그] 부여 (${SKILL_CONSTANTS.BUG_DURATION}초간 이동 속도 ${SKILL_CONSTANTS.BUG_SPEED_DEBUFF}% 감소)`);
        ctx.logMessage?.(`🐛 [디버프 부여] 지호 ➡️ ${opponent.name} | [버그] 디버프 (${SKILL_CONSTANTS.BUG_DURATION}초간 이속 ${SKILL_CONSTANTS.BUG_SPEED_DEBUFF}% 감소)`, 'damage');
      }
      opp.jihoDebuffTimeLeft = SKILL_CONSTANTS.BUG_DURATION; // duration

      // 50% chance for runtime error crash
      if (Math.random() < SKILL_CONSTANTS.CRASH_CHANCE) {
        console.log(`💥 [디버프 격발] 지호 -> ${opponent.name} | [런타임 에러] 연쇄 충돌 발생!`);
        ctx.logMessage?.(`💥 [런타임 에러 격발] 지호 ➡️ ${opponent.name} | 연쇄 런타임 에러 (${SKILL_CONSTANTS.CRASH_DMG} 피해, ${SKILL_CONSTANTS.CRASH_STUN_DURATION}초 기절)`, 'damage');
        ctx.dealDamage(char, opponent, SKILL_CONSTANTS.CRASH_DMG, '💻 CRASH & STUN!');
        opponent.isStunned = true;
        opponent.stunTimeLeft = SKILL_CONSTANTS.CRASH_STUN_DURATION;
        opponent.vx = 0;
        opponent.vy = 0;
        ctx.createExplosion(opponent.x, opponent.y, '#ff3366', 15);

        // Splash damage to enemies within 120px (excluding attacker and main target)
        ctx.characters.forEach((enemy) => {
          if (enemy.isDead || enemy.id === char.id || enemy.id === opponent.id) return;
          const dist = Math.hypot(enemy.x - opponent.x, enemy.y - opponent.y);
          if (dist <= SKILL_CONSTANTS.CRASH_SPLASH_RADIUS) {
            ctx.dealDamage(char, enemy, SKILL_CONSTANTS.CRASH_SPLASH_DMG, '⚡ AOE ERROR!');
            ctx.createExplosion(enemy.x, enemy.y, '#ff3366', 6);
            
            // Knockback
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
  // #endregion BASIC_ATTACK

  // ═══════════════════════════════════════════
  // #region SKILL_TRIGGER — start coding phase
  // ═══════════════════════════════════════════
  onSkillTrigger(char: CharacterState) {
    char.skillActive = false; // Waiting/coding stage, buff not active yet
    char.isTyping = true;
    char.typingTimeLeft = SKILL_CONSTANTS.TYPING_DURATION;
    char.vx = 0;
    char.vy = 0;
  },
  // #endregion SKILL_TRIGGER

  // ═══════════════════════════════════════════
  // #region UPDATE — coding timer, compile logic, debuff updates
  // ═══════════════════════════════════════════
  onUpdate(char: CharacterState, dt: number, ctx) {
    // Update bug debuffs on other characters
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

    // Coding phase logic
    if (char.isTyping) {
      char.typingTimeLeft -= dt;
      char.vx = 0;
      char.vy = 0;

      // Typing particles
      if (Math.random() < 0.4) {
        ctx.createParticle(char.x + (Math.random() - 0.5) * 20, char.y + 10, '#00ffcc', 3, 10);
      }

      // Compile check when coding ends
      if (char.typingTimeLeft <= 0) {
        char.isTyping = false;

        // Resume movement with base speed
        const randomAngle = Math.random() * Math.PI * 2;
        const baseSpeed = 3.5 * char.speed;
        char.vx = Math.cos(randomAngle) * baseSpeed;
        char.vy = Math.sin(randomAngle) * baseSpeed;

        const isSuccess = Math.random() < SKILL_CONSTANTS.COMPILE_SUCCESS_CHANCE;

        if (isSuccess) {
          console.log(`💻 [컴파일 성공] 지호 컴파일 성공! 주변 ${SKILL_CONSTANTS.COMPILE_SUCCESS_SPLASH_RADIUS}px 광역 시스템 폭발 피해 가동 및 ${SKILL_CONSTANTS.COMPILE_BUFF_DURATION}초 버프`);
          ctx.logMessage?.(`💻 [컴파일 성공] 지호 ➡️ 성공! (주변 광역 ${SKILL_CONSTANTS.COMPILE_SUCCESS_SPLASH_DMG} 피해, HP ${SKILL_CONSTANTS.COMPILE_HEAL_PCT}% 회복, ${SKILL_CONSTANTS.COMPILE_BUFF_DURATION}초간 이속 ${SKILL_CONSTANTS.COMPILE_SPEED_MULTIPLIER}배 & 공격력 ${SKILL_CONSTANTS.COMPILE_ATK_MULTIPLIER}배)`, 'skill');
          
          // Splash damage and knockback
          ctx.characters.forEach((enemy) => {
            if (enemy.isDead || enemy.id === char.id) return;
            const dist = Math.hypot(enemy.x - char.x, enemy.y - char.y);
            if (dist <= SKILL_CONSTANTS.COMPILE_SUCCESS_SPLASH_RADIUS) {
              ctx.dealDamage(char, enemy, SKILL_CONSTANTS.COMPILE_SUCCESS_SPLASH_DMG, '💻 SYSTEM BLAST!');
              ctx.createExplosion(enemy.x, enemy.y, '#00ffcc', 8);
              
              // Knockback
              const kAngle = Math.atan2(enemy.y - char.y, enemy.x - char.x);
              enemy.vx += Math.cos(kAngle) * 5;
              enemy.vy += Math.sin(kAngle) * 5;
            }
          });

          // Gain buff & heal
          const wasActive = char.skillActive;
          char.skillActive = true;
          char.skillDurationLeft = SKILL_CONSTANTS.COMPILE_BUFF_DURATION;

          ctx.addFloatingText(char.x, char.y - 45, '💻 [SUCCESS] 컴파일 완료!', '#00ffcc', 1.8);
          ctx.createExplosion(char.x, char.y, '#00ffcc', 20);

          // Healing
          const healAmount = Math.round(char.maxHp * (SKILL_CONSTANTS.COMPILE_HEAL_PCT / 100));
          char.hp = Math.min(char.maxHp, char.hp + healAmount);
          ctx.addFloatingText(char.x, char.y - 25, `+${healAmount} HEAL`, '#39ff14', 1.5);

          // Green healing particles
          for (let i = 0; i < 12; i++) {
            ctx.createParticle(
              char.x + (Math.random() - 0.5) * 30,
              char.y + (Math.random() - 0.5) * 30,
              '#39ff14',
              3 + Math.random() * 3,
              15 + Math.random() * 12
            );
          }

          // Multiply velocity by speed buff factor
          if (!wasActive) {
            char.vx *= SKILL_CONSTANTS.COMPILE_SPEED_MULTIPLIER;
            char.vy *= SKILL_CONSTANTS.COMPILE_SPEED_MULTIPLIER;
          }
        } else {
          console.log(`⚠️ [컴파일 실패] 지호 컴파일 실패! ${SKILL_CONSTANTS.COMPILE_FAIL_STUN_DURATION}초 기절 및 자해 피해 발생`);
          ctx.logMessage?.(`⚠️ [컴파일 실패] 지호 ➡️ 실패! 자해 및 ${SKILL_CONSTANTS.COMPILE_FAIL_STUN_DURATION}초간 기절`, 'skill');
          ctx.addFloatingText(char.x, char.y - 45, '⚠️ [ERROR] 컴파일 실패! (역디버프)', '#ff3366', 1.8);
          ctx.createExplosion(char.x, char.y, '#ff3366', 25);

          char.isStunned = true;
          char.stunTimeLeft = SKILL_CONSTANTS.COMPILE_FAIL_STUN_DURATION;
          char.vx = 0;
          char.vy = 0;

          const selfDamage = Math.round(char.attackPower * SKILL_CONSTANTS.COMPILE_FAIL_SELF_DMG_MULTIPLIER);
          ctx.dealDamage(char, char, selfDamage, 'RUNTIME ERROR!');
        }
      }
      return;
    }

    // Stun logic
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
      return;
    }

    // Buff duration tick & rollback
    if (char.skillActive) {
      char.skillDurationLeft -= dt;
      if (char.skillDurationLeft <= 0) {
        char.skillActive = false;
        // Rollback speed
        char.vx /= SKILL_CONSTANTS.COMPILE_SPEED_MULTIPLIER;
        char.vy /= SKILL_CONSTANTS.COMPILE_SPEED_MULTIPLIER;
      }
    }
  },
  // #endregion UPDATE

  // ═══════════════════════════════════════════
  // #region DAMAGE — compile success damage multiplier
  // ═══════════════════════════════════════════
  onDealDamage(char: CharacterState, _target: CharacterState, damage: number, _ctx: CharacterBehaviorContext) {
    if (char.skillActive) {
      // 2.2x damage multiplier during compile success buff
      return Math.round(damage * SKILL_CONSTANTS.COMPILE_ATK_MULTIPLIER);
    }
    return damage;
  },
  // #endregion DAMAGE

  // ═══════════════════════════════════════════
  // #region RENDER — glow effect, coding progress bar, stun stars
  // ═══════════════════════════════════════════
  onPreRender(char: CharacterState, canvasCtx: CanvasRenderingContext2D) {
    // Green glow effect around Jiho during skill active
    if (char.skillActive) {
      canvasCtx.save();
      canvasCtx.strokeStyle = 'rgba(0, 255, 196, 0.4)';
      canvasCtx.lineWidth = 6;
      canvasCtx.shadowBlur = 15;
      canvasCtx.shadowColor = '#00ffcc';
      canvasCtx.beginPath();
      // Current radius includes scaling, but jiho doesn't scale normally. Use radius * scaleMultiplier
      const r = char.radius * char.scaleMultiplier;
      canvasCtx.arc(char.x, char.y, r + 12 + Math.sin(Date.now() / 80) * 3, 0, Math.PI * 2);
      canvasCtx.stroke();
      canvasCtx.restore();
    }
  },

  onRenderExtra(char: CharacterState, canvasCtx: CanvasRenderingContext2D, currentRadius: number) {
    // Coding progress bar
    if (char.isTyping) {
      canvasCtx.save();
      canvasCtx.fillStyle = 'rgba(0, 255, 196, 0.9)';
      canvasCtx.font = '16px "Orbit", Arial';
      canvasCtx.textAlign = 'center';
      canvasCtx.fillText('⌨️ 코딩 중...', char.x, char.y - currentRadius - 28);
      
      const barW = 40;
      const barH = 5;
      const progress = (SKILL_CONSTANTS.TYPING_DURATION - char.typingTimeLeft) / SKILL_CONSTANTS.TYPING_DURATION;
      canvasCtx.fillStyle = 'rgba(255,255,255,0.1)';
      canvasCtx.fillRect(char.x - barW / 2, char.y - currentRadius - 18, barW, barH);
      canvasCtx.fillStyle = '#00ffcc';
      canvasCtx.fillRect(char.x - barW / 2, char.y - currentRadius - 18, barW * progress, barH);
      canvasCtx.restore();
    }

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
