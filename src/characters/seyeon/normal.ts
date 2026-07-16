import type { CharacterConfig, CharacterState, CharacterBehaviorContext } from '../character.interface';

// ═══════════════════════════════════════════
// #region TYPES
// ═══════════════════════════════════════════
interface SeyeonState extends CharacterState {
  charmAuraRadius?: number;
  charmDamageTimer?: number;
}
// #endregion TYPES

// ═══════════════════════════════════════════
// #region CONFIG — character stats & metadata
// ═══════════════════════════════════════════
export const seyeonConfig: CharacterConfig = {
  id: 'seyeon',
  name: '세연',
  maxHp: 130,
  speed: 1.3,
  attackPower: 14,
  defense: 12,
  baseAttackRange: 45,
  skillName: '치명적인 유혹의 댄스',
  skillDescription: '7초 쿨타임. 4초 동안 매혹의 댄스를 추며 이동 속도가 50% 증가하고 피해 면역 무적 상태가 됩니다. 주변 220px 영역에 매혹 아우라를 전개하여 범위 내 모든 적을 기절(봉쇄)시키고 세연에게로 강렬하게 끌어당깁니다. 아우라 내 적들은 매초 8의 지속 피해를 입고, 받는 모든 피해량이 50% 증폭됩니다.',
  color: '#ff66b2', // 하트 핑크
  skillChargeRate: 14.3, // 7초 쿨타임
  tier: 'S',
  role: 'Guardian',
  detailedDescription: '세연은 완전 피해 면역과 광역 매혹 어그로를 통해 난전을 종식시키는 결전형 수호형 캐릭터입니다. 스킬 발동 시 4초간 공격 면역 무적 버프와 고속 이동 효과를 얻어 댄스를 시작하며, 주변의 넓은 아우라 반경 내의 모든 적들을 기절시킨 채 자신에게로 강하게 빨아들이고 피해량을 50% 증폭시켜 아군의 킬 찬스를 완벽하게 열어줍니다.',
  luck: 22,
  attackSpeed: 1.3,
// #endregion CONFIG

  // ═══════════════════════════════════════════
  // #region SKILL_TRIGGER — start dancing & grant immunity
  // ═══════════════════════════════════════════
  onSkillTrigger(char: CharacterState, ctx) {
    char.skillActive = true;
    char.skillDurationLeft = 4.0; // 4 seconds duration

    // Increase speed by 50% and grant immunity
    char.speed = 1.3 * 1.5; // Buff speed (1.95)
    char.isImmune = true;
    char.immuneTimeLeft = 4.0;

    const sy = char as SeyeonState;
    sy.charmAuraRadius = 220;
    sy.charmDamageTimer = 1.0;

    ctx.addFloatingText(char.x, char.y - 65, '💃 치명적 유혹의 댄스! (무적)', '#ff66b2', 2.0);
    ctx.createExplosion(char.x, char.y, '#ff66b2', 20);
    ctx.logMessage?.(`💃 [유혹의 댄스] 세연 ➡️ 4초간 아우라 전개, 속도 50% 증가 및 피해 무적!`, 'skill');
  },
  // #endregion SKILL_TRIGGER

  // ═══════════════════════════════════════════
  // #region UPDATE — dance timer, dot ticks, pull enemies
  // ═══════════════════════════════════════════
  onUpdate(char: CharacterState, dt: number, ctx) {
    const sy = char as SeyeonState;

    if (char.skillActive) {
      char.skillDurationLeft -= dt;

      const auraRadius = sy.charmAuraRadius || 220;

      // Manage DOT timer (1 second ticks)
      if (sy.charmDamageTimer === undefined) sy.charmDamageTimer = 1.0;
      sy.charmDamageTimer -= dt;
      let dealTick = false;
      if (sy.charmDamageTimer <= 0) {
        sy.charmDamageTimer = 1.0;
        dealTick = true;
      }

      // Charm, pull, stun, and tick damage to all enemies in radius
      ctx.characters.forEach((enemy) => {
        if (enemy.isDead || enemy.id === char.id) return;
        // 팀전과 보스전에서는 아군/같은 도전자 팀을 매혹·기절·흡입 대상에서 제외한다.
        if (
          char.teamId !== undefined &&
          enemy.teamId !== undefined &&
          char.teamId === enemy.teamId
        ) return;

        const dx = char.x - enemy.x;
        const dy = char.y - enemy.y;
        const dist = Math.hypot(dx, dy);

        if (dist <= auraRadius) {
          // A. Set charmed and stunned states
          if (!ctx.applyCharm(char, enemy, 0.2)) return;
          if (!ctx.applyStun(char, enemy, 0.2)) return;

          // B. Pull towards Seyeon
          enemy.vx = 0;
          enemy.vy = 0;
          if (dist > 15) {
            const pullSpeed = 4.5;
            const angle = Math.atan2(dy, dx);
            enemy.x += Math.cos(angle) * pullSpeed * (dt * 60);
            enemy.y += Math.sin(angle) * pullSpeed * (dt * 60);
          }

          // C. DOT Damage (8 damage tick -> amplifies to 12 via onTakeDamage)
          if (dealTick) {
            ctx.dealDamage(char, enemy, 8, '💖 LOVE TICK');
            ctx.createExplosion(enemy.x, enemy.y, '#ff66b2', 4);
          }

          // Emit charm particles
          if (Math.random() < 0.2) {
            ctx.createParticle(enemy.x, enemy.y, '#ff66b2', 2.5, 12);
          }
        }
      });

      // Heart swirl particles around Seyeon
      if (Math.random() < 0.6) {
        const randAngle = Math.random() * Math.PI * 2;
        const dist = Math.random() * auraRadius;
        const px = char.x + Math.cos(randAngle) * dist;
        const py = char.y + Math.sin(randAngle) * dist;
        ctx.createParticle(px, py, '#ff66b2', 2, 15);
      }

      // Skill end rollback
      if (char.skillDurationLeft <= 0) {
        char.skillActive = false;
        char.speed = 1.3; // Restore speed
        char.isImmune = false;
        char.immuneTimeLeft = 0;

        // Reset charmed status of other characters
        ctx.characters.forEach((enemy) => {
          if (enemy.id !== char.id) {
            enemy.isCharmed = false;
          }
        });

        ctx.createExplosion(char.x, char.y, '#ff66b2', 15);
        ctx.addFloatingText(char.x, char.y - 45, '💨 댄스 종료', '#888888', 1.2);
        ctx.logMessage?.(`💃 [유혹의 댄스 만료] 세연 ➡️ 일반 상태 복귀 및 주변 매혹 해제`, 'skill');
      }
    }
  },
  // #endregion UPDATE

  // ═══════════════════════════════════════════
  // #region DAMAGE — charm immunity & damage amplification
  // ═══════════════════════════════════════════
  onTakeDamage(target: CharacterState, attacker: CharacterState, damage: number, _ctx: CharacterBehaviorContext) {
    // 1. Charmed targets deal 0 damage to Seyeon
    if (target.id === 'seyeon' && attacker.isCharmed) {
      console.log(`🛡️ [매혹 면역] ${attacker.name} ➡️ 세연 | 매혹 상태의 적이 세연에게 입히는 피해는 무효화됩니다.`);
      return { finalDamage: 0, blocked: true };
    }

    // 2. Charmed targets take 50% amplified damage
    if (target.isCharmed) {
      const finalDamage = Math.round(damage * 1.5);
      return { finalDamage, blocked: false };
    }

    return { finalDamage: damage, blocked: false };
  },
  // #endregion DAMAGE

  // ═══════════════════════════════════════════
  // #region RENDER — dance aura circle, head hearts
  // ═══════════════════════════════════════════
  onRenderExtra(char: CharacterState, canvasCtx: CanvasRenderingContext2D, currentRadius: number) {
    const sy = char as SeyeonState;

    // Render dance aura range
    if (char.skillActive) {
      const radius = sy.charmAuraRadius || 220;
      canvasCtx.save();
      
      const grad = canvasCtx.createRadialGradient(char.x, char.y, currentRadius, char.x, char.y, radius);
      grad.addColorStop(0, 'rgba(255, 102, 178, 0.25)');
      grad.addColorStop(0.5, 'rgba(255, 102, 178, 0.1)');
      grad.addColorStop(1, 'rgba(255, 102, 178, 0)');
      
      canvasCtx.fillStyle = grad;
      canvasCtx.beginPath();
      canvasCtx.arc(char.x, char.y, radius, 0, Math.PI * 2);
      canvasCtx.fill();

      // Outer dashed boundary
      canvasCtx.strokeStyle = 'rgba(255, 102, 178, 0.45)';
      canvasCtx.lineWidth = 1.5;
      canvasCtx.setLineDash([4, 4]);
      canvasCtx.beginPath();
      canvasCtx.arc(char.x, char.y, radius, 0, Math.PI * 2);
      canvasCtx.stroke();

      canvasCtx.restore();
    }

    // Head floating decoration hearts
    canvasCtx.save();
    canvasCtx.fillStyle = '#ff66b2';
    canvasCtx.shadowBlur = 8;
    canvasCtx.shadowColor = '#ff66b2';
    
    if (char.skillActive) {
      canvasCtx.font = '16px sans-serif';
      const bounce = Math.sin(Date.now() / 80) * 4;
      canvasCtx.fillText('💃💝', char.x - 12, char.y - currentRadius - 12 + bounce);
    } else {
      canvasCtx.font = '10px Outfit, sans-serif';
      canvasCtx.textAlign = 'center';
      canvasCtx.fillText('💝', char.x, char.y - currentRadius - 6);
    }
    canvasCtx.restore();
  }
  // #endregion RENDER
};
