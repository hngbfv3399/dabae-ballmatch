import type { CharacterConfig, CharacterState, CharacterBehaviorContext } from './character.interface';

// ═══════════════════════════════════════════
// #region CONSTANTS
// ═══════════════════════════════════════════
const SKILL_CONSTANTS = {
  TOTAL_DURATION: 17.4,       // 2.0s slide + 15.0s casting + 0.4s blast
  SLIDE_DURATION: 2.0,        // teleport slide to center
  CASTING_DURATION: 15.0,     // casting phase with quotes
  BLAST_DURATION: 0.4,        // shockwave expansion
  BLAST_TRIGGER_TIME: 17.0,   // when blast fires (TOTAL - BLAST)
  CENTER_X: 400,
  CENTER_Y: 300,
  DMG_REDUCTION: 0.03,        // 97% reduction = only 3% taken
  // Distance-based HP ratio thresholds
  CLOSE_RANGE: 200,           // <= 200px
  CLOSE_HP_RATIO: 0.03,       // leave 3% HP
  MID_RANGE: 400,             // <= 400px
  MID_HP_RATIO: 0.18,         // leave 18% HP
  FAR_HP_RATIO: 0.38,         // leave 38% HP
  KNOCKBACK_SPEED: 32,
  STUN_DURATION: 1.8,
  BLAST_VISUAL_RADIUS: 850,
  SHAKE_MAX_CASTING: 10,      // max screen shake px during casting
  SHAKE_MAX_BLAST: 25,        // max screen shake px at blast
  QUOTE_INTERVAL: 2.1,        // seconds between quote lines
};

const QUOTES = [
  '이타미오 칸지로',
  '이타미오 칸가에로',
  '이타미오 우케토레',
  '이타미오 시레',
  '이타미오 시라노 모노니 혼또노 헤이와오 와카란',
  '오레와 야히코노 이타미오 와스레나이',
  '코코요이 세카이니 이타미오',
];

const FINAL_QUOTE = '신라... 텐세!!!';
// #endregion CONSTANTS

// ═══════════════════════════════════════════
// #region CONFIG — character stats & metadata
// ═══════════════════════════════════════════
export const chanhwiConfig: CharacterConfig = {
  id: 'chanhwi',
  name: '찬휘',
  maxHp: 70,
  speed: 1.6,
  attackPower: 25,
  baseAttackRange: 45,
  skillName: '신라천정 (Shinra Tensei)',
  skillDescription: '6초 쿨타임. 스킬 시전 시 2초간 화면 중앙(400, 300)으로 부드럽게 이끌려가며 순간이동 궤적을 그리고, 이후 15초 동안 공중 부양(부동 상태)한 채 화면을 암전시키고 신라천정 대사를 일본어 발음으로 화면 중앙에 렌더링합니다. 이후 전장의 모든 적들의 체력을 거리 비례(200px 이하 3%, 200px~400px 18%, 400px 초과 38%)로 남기고 사방 외벽으로 튕겨 날려보냅니다. 캐스팅 및 방출 동안 받는 피해가 97% 감소(3%만 피해 적용)합니다.',
  color: '#8a2be2', // 보라색
  skillChargeRate: 16.67,
  tier: 'S',
  role: 'Nuker',
  detailedDescription: '찬휘는 엄청난 충격파로 필드의 모든 적을 궤멸시키는 맵 지배형 누커 캐릭터입니다. 스킬 게이지가 완료되면 화면 중앙으로 공중 도약하여 대사를 외치며, 전장의 모든 캐릭터에게 거리 비례 파멸적인 체력 고정 대미지(외곽일수록 피해 급증)를 가해 사방 벽으로 거칠게 튕겨내는 가공할 화력을 지니고 있습니다.',
// #endregion CONFIG

  // ═══════════════════════════════════════════
  // #region SKILL_TRIGGER — skill activation
  // ═══════════════════════════════════════════
  onSkillTrigger(char: CharacterState) {
    char.skillActive = true;
    char.skillDurationLeft = SKILL_CONSTANTS.TOTAL_DURATION;
    (char as any).blastTriggered = false;

    // Record starting position for slide animation
    (char as any).preX = char.x;
    (char as any).preY = char.y;
    char.vx = 0;
    char.vy = 0;
  },
  // #endregion SKILL_TRIGGER

  // ═══════════════════════════════════════════
  // #region UPDATE — per-frame update logic
  // ═══════════════════════════════════════════
  onUpdate(char: CharacterState, dt: number, ctx) {
    if (char.skillActive) {
      char.skillDurationLeft -= dt;

      // Lock movement during skill
      char.vx = 0;
      char.vy = 0;

      const elapsed = SKILL_CONSTANTS.TOTAL_DURATION - char.skillDurationLeft;

      // Phase 1: Teleport slide (0.0 ~ 2.0s)
      if (elapsed < SKILL_CONSTANTS.SLIDE_DURATION) {
        const t = elapsed / SKILL_CONSTANTS.SLIDE_DURATION;
        char.x = (char as any).preX + (SKILL_CONSTANTS.CENTER_X - (char as any).preX) * t;
        char.y = (char as any).preY + (SKILL_CONSTANTS.CENTER_Y - (char as any).preY) * t;

        // Trail particles
        if (Math.random() < 0.6) {
          ctx.createParticle(char.x, char.y, '#da70d6', 3.0, 12);
        }
        (char as any).currentQuotes = undefined;
      } else {
        // Lock at center after slide
        char.x = SKILL_CONSTANTS.CENTER_X;
        char.y = SKILL_CONSTANTS.CENTER_Y;

        // Phase 2: Quote display
        const quoteElapsed = elapsed - SKILL_CONSTANTS.SLIDE_DURATION;
        const quotes: string[] = [];

        for (let i = 0; i < QUOTES.length; i++) {
          if (quoteElapsed >= i * SKILL_CONSTANTS.QUOTE_INTERVAL) {
            quotes.push(QUOTES[i]);
          }
        }

        if (quoteElapsed >= SKILL_CONSTANTS.CASTING_DURATION) {
          (char as any).currentQuotes = [FINAL_QUOTE];
        } else {
          (char as any).currentQuotes = quotes;
        }

        // Casting suction particles
        if (quoteElapsed < SKILL_CONSTANTS.CASTING_DURATION) {
          if (Math.random() < 0.4) {
            const angle = Math.random() * Math.PI * 2;
            const dist = 120 + Math.random() * 180;
            const spawnX = char.x + Math.cos(angle) * dist;
            const spawnY = char.y + Math.sin(angle) * dist;
            ctx.createParticle(spawnX, spawnY, '#9933ff', 2.5, 8);
          }
        }

        // Phase 3: Blast trigger at 17.0s
        if (elapsed >= SKILL_CONSTANTS.BLAST_TRIGGER_TIME && !(char as any).blastTriggered) {
          (char as any).blastTriggered = true;

          console.log(`💥 [신라천정 격발] 찬휘 -> 전 화면 무차별 전탄 척력파 방출! 전원 체력 거리 비례 감소 및 초강력 벽 반사 넉백!`);
          ctx.logMessage?.(`💥 [신라천정 격발] 찬휘 ➡️ 전 화면 무차별 척력파 방출!`, 'skill');
          ctx.addFloatingText(char.x, char.y - 60, 'SHINRA TENSEI!!!', '#ffcc00', 2.0);
          ctx.createExplosion(char.x, char.y, '#da70d6', 50);
          ctx.createExplosion(char.x, char.y, '#8a2be2', 35);

          // Hit all alive enemies
          const chars = (ctx as any).characters as CharacterState[];
          chars.forEach((enemy) => {
            if (enemy.isDead || enemy.id === char.id) return;

            const dist = Math.hypot(enemy.x - char.x, enemy.y - char.y);
            let hpRatio = SKILL_CONSTANTS.FAR_HP_RATIO;
            if (dist <= SKILL_CONSTANTS.CLOSE_RANGE) {
              hpRatio = SKILL_CONSTANTS.CLOSE_HP_RATIO;
            } else if (dist <= SKILL_CONSTANTS.MID_RANGE) {
              hpRatio = SKILL_CONSTANTS.MID_HP_RATIO;
            }

            const targetHp = Math.round(enemy.maxHp * hpRatio);
            const damage = Math.max(1, enemy.hp - targetHp);

            ctx.dealDamage(char, enemy, damage, `💥 신라천정(${Math.round(hpRatio * 100)}%)`);

            // Massive knockback
            const kAngle = Math.atan2(enemy.y - char.y, enemy.x - char.x);
            enemy.vx = Math.cos(kAngle) * SKILL_CONSTANTS.KNOCKBACK_SPEED;
            enemy.vy = Math.sin(kAngle) * SKILL_CONSTANTS.KNOCKBACK_SPEED;

            // Stun
            enemy.isStunned = true;
            enemy.stunTimeLeft = SKILL_CONSTANTS.STUN_DURATION;

            console.log(`💥 [신라천정 타격] 찬휘 -> ${enemy.name} | 대미지: ${damage} (거리: ${Math.round(dist)}px, 남은 체력 ${Math.round(hpRatio * 100)}% 유도) | 초강력 벽 반사 넉백 (${SKILL_CONSTANTS.STUN_DURATION}초 기절)`);
            ctx.logMessage?.(`💥 [신라천정 타격] 찬휘 ➡️ ${enemy.name} | ${damage} 피해 (거리: ${Math.round(dist)}px, HP ${Math.round(hpRatio * 100)}%만 남김, ${SKILL_CONSTANTS.STUN_DURATION}초 기절)`, 'skill');
          });
        }
      }

      // Skill end
      if (char.skillDurationLeft <= 0) {
        char.skillActive = false;
        (char as any).currentQuotes = undefined;

        const randomAngle = Math.random() * Math.PI * 2;
        const baseSpeed = 3.5 * char.speed;
        char.vx = Math.cos(randomAngle) * baseSpeed;
        char.vy = Math.sin(randomAngle) * baseSpeed;
      }
    } else {
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
    }
  },
  // #endregion UPDATE

  // ═══════════════════════════════════════════
  // #region DAMAGE — damage reduction while casting
  // ═══════════════════════════════════════════
  onTakeDamage(target: CharacterState, _attacker: CharacterState, damage: number, _ctx: CharacterBehaviorContext) {
    if (target.skillActive) {
      // 97% damage reduction during Shinra Tensei
      let finalDamage = Math.round(damage * SKILL_CONSTANTS.DMG_REDUCTION);
      if (finalDamage < 1 && damage >= 1) {
        finalDamage = 1; // Minimum 1 damage
      }
      return { finalDamage, blocked: false };
    }
    return { finalDamage: damage, blocked: false };
  },
  // #endregion DAMAGE

  // ═══════════════════════════════════════════
  // #region RENDER — visual effects
  // ═══════════════════════════════════════════

  // Pre-render: screen shake calculation is done in onRenderOverlay
  onPreRender(_char: CharacterState, _canvasCtx: CanvasRenderingContext2D) {
    // No per-character pre-render needed for chanhwi
  },

  // Fullscreen overlay: screen darkening, subtitles, screen shake
  onRenderOverlay(char: CharacterState, canvasCtx: CanvasRenderingContext2D, canvasWidth: number, canvasHeight: number) {
    if (!char.skillActive || char.isDead) return;

    const elapsed = SKILL_CONSTANTS.TOTAL_DURATION - char.skillDurationLeft;

    // Screen shake
    if (elapsed >= SKILL_CONSTANTS.SLIDE_DURATION && elapsed < SKILL_CONSTANTS.BLAST_TRIGGER_TIME) {
      const ratio = (elapsed - SKILL_CONSTANTS.SLIDE_DURATION) / SKILL_CONSTANTS.CASTING_DURATION;
      const shakeAmount = ratio * SKILL_CONSTANTS.SHAKE_MAX_CASTING;
      const dx = (Math.random() - 0.5) * shakeAmount;
      const dy = (Math.random() - 0.5) * shakeAmount;
      canvasCtx.translate(dx, dy);
    } else if (elapsed >= SKILL_CONSTANTS.BLAST_TRIGGER_TIME) {
      const blastElapsed = elapsed - SKILL_CONSTANTS.BLAST_TRIGGER_TIME;
      const shakeAmount = (1.0 - (blastElapsed / SKILL_CONSTANTS.BLAST_DURATION)) * SKILL_CONSTANTS.SHAKE_MAX_BLAST;
      if (shakeAmount > 0) {
        const dx = (Math.random() - 0.5) * shakeAmount;
        const dy = (Math.random() - 0.5) * shakeAmount;
        canvasCtx.translate(dx, dy);
      }
    }

    // Screen darkening during casting
    if (elapsed >= SKILL_CONSTANTS.SLIDE_DURATION && elapsed < SKILL_CONSTANTS.BLAST_TRIGGER_TIME) {
      const alpha = Math.min(0.55, ((elapsed - SKILL_CONSTANTS.SLIDE_DURATION) / SKILL_CONSTANTS.CASTING_DURATION) * 0.55);
      canvasCtx.fillStyle = `rgba(0, 0, 0, ${alpha})`;
      canvasCtx.fillRect(-50, -50, canvasWidth + 100, canvasHeight + 100);
    } else if (elapsed >= SKILL_CONSTANTS.BLAST_TRIGGER_TIME) {
      // White flash at blast
      const blastElapsed = elapsed - SKILL_CONSTANTS.BLAST_TRIGGER_TIME;
      const flashAlpha = 1.0 - (blastElapsed / SKILL_CONSTANTS.BLAST_DURATION);
      if (flashAlpha > 0) {
        canvasCtx.fillStyle = `rgba(255, 255, 255, ${flashAlpha})`;
        canvasCtx.fillRect(-50, -50, canvasWidth + 100, canvasHeight + 100);
      }
    }

    // Subtitle rendering (on top of darkened overlay)
    if ((char as any).currentQuotes && (char as any).currentQuotes.length > 0) {
      canvasCtx.save();
      canvasCtx.fillStyle = '#ffffff';
      canvasCtx.strokeStyle = '#000000';
      canvasCtx.lineWidth = 4.5;
      canvasCtx.font = 'bold 20px "Noto Sans KR", Arial, sans-serif';
      canvasCtx.textAlign = 'center';
      canvasCtx.textBaseline = 'middle';

      const lines = (char as any).currentQuotes as string[];
      const isFinalBlast = lines[0].includes('신라');

      if (isFinalBlast) {
        canvasCtx.font = 'bold 46px "Noto Sans KR", Arial, sans-serif';
        canvasCtx.fillStyle = '#ffcc00';
        canvasCtx.strokeText(lines[0], SKILL_CONSTANTS.CENTER_X, SKILL_CONSTANTS.CENTER_Y);
        canvasCtx.fillText(lines[0], SKILL_CONSTANTS.CENTER_X, SKILL_CONSTANTS.CENTER_Y);
      } else {
        const currentLine = lines[lines.length - 1];
        canvasCtx.strokeText(currentLine, SKILL_CONSTANTS.CENTER_X, SKILL_CONSTANTS.CENTER_Y);
        canvasCtx.fillText(currentLine, SKILL_CONSTANTS.CENTER_X, SKILL_CONSTANTS.CENTER_Y);
      }
      canvasCtx.restore();
    }
  },

  // Character-level render: energy lines, barrier, shockwave
  onRenderExtra(char: CharacterState, canvasCtx: CanvasRenderingContext2D, currentRadius: number) {
    if (char.skillActive) {
      const elapsed = SKILL_CONSTANTS.TOTAL_DURATION - char.skillDurationLeft;

      // Gravity energy lines during casting
      if (elapsed >= SKILL_CONSTANTS.SLIDE_DURATION && elapsed < SKILL_CONSTANTS.BLAST_TRIGGER_TIME) {
        canvasCtx.save();
        canvasCtx.strokeStyle = 'rgba(138, 43, 226, 0.2)';
        canvasCtx.lineWidth = 1.4;
        const timeSeed = Date.now() / 300;
        for (let i = 0; i < 12; i++) {
          const angle = timeSeed + (i * Math.PI * 2) / 12;
          const startDist = 240 - ((Date.now() / 3.5) % 220);
          const sX = char.x + Math.cos(angle) * startDist;
          const sY = char.y + Math.sin(angle) * startDist;
          canvasCtx.beginPath();
          canvasCtx.moveTo(sX, sY);
          canvasCtx.lineTo(char.x, char.y);
          canvasCtx.stroke();
        }

        // Gravity barrier circle
        const shieldPulse = currentRadius + 6 + Math.abs(Math.sin(Date.now() / 80)) * 6;
        canvasCtx.strokeStyle = 'rgba(186, 85, 211, 0.7)';
        canvasCtx.lineWidth = 2.5;
        canvasCtx.fillStyle = 'rgba(138, 43, 226, 0.08)';
        canvasCtx.beginPath();
        canvasCtx.arc(char.x, char.y, shieldPulse, 0, Math.PI * 2);
        canvasCtx.fill();
        canvasCtx.stroke();
        canvasCtx.restore();
      } else if (elapsed >= SKILL_CONSTANTS.BLAST_TRIGGER_TIME) {
        // Shockwave expansion
        const blastElapsed = elapsed - SKILL_CONSTANTS.BLAST_TRIGGER_TIME;
        const blastRatio = blastElapsed / SKILL_CONSTANTS.BLAST_DURATION;
        const blastRadius = blastRatio * SKILL_CONSTANTS.BLAST_VISUAL_RADIUS;

        canvasCtx.save();
        const alpha = 1.0 - blastRatio;
        canvasCtx.strokeStyle = `rgba(230, 230, 250, ${alpha})`;
        canvasCtx.lineWidth = 9 * (1 - blastRatio) + 2;
        canvasCtx.beginPath();
        canvasCtx.arc(char.x, char.y, blastRadius, 0, Math.PI * 2);
        canvasCtx.stroke();

        canvasCtx.fillStyle = `rgba(186, 85, 211, ${alpha * 0.18})`;
        canvasCtx.beginPath();
        canvasCtx.arc(char.x, char.y, blastRadius, 0, Math.PI * 2);
        canvasCtx.fill();
        canvasCtx.restore();
      }
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
