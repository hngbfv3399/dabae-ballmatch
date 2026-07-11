import type { CharacterConfig, CharacterState, CharacterBehaviorContext } from '../character.interface';

// ═══════════════════════════════════════════
// #region TYPES
// ═══════════════════════════════════════════
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
// #endregion TYPES

// ═══════════════════════════════════════════
// #region CONFIG — character stats & metadata
// ═══════════════════════════════════════════
export const jujuConfig: CharacterConfig = {
  id: 'juju',
  name: '주주',
  maxHp: 135,
  speed: 1.25,
  attackPower: 14,
  baseAttackRange: 45,
  skillName: '전술적 특이점 블랙홀',
  skillDescription: '7초 쿨타임. 스킬 시전 시 현재 위치에 3초간 블랙홀을 소환합니다. 주변 250px 내 적들의 움직임을 원천 봉쇄(기절)하고 블랙홀 중심부로 강력하게 끌고 들어갑니다. 블랙홀 지속 중 주주는 완전 무적입니다. 만료 시 30 광역 충격파 피해와 초강력 넉백을 선사합니다. 패시브: 죽음 직전 위기(체력 10% 이하) 처할 시 1회 한정으로 최다 HP 생존자와 자리를 바꾸고 3초 무적 보호막을 얻습니다.',
  color: '#00bfff', // 홀로그램 하늘색
  skillChargeRate: 14.3, // 7초 쿨타임
  tier: 'S',
  role: 'Disabler',
  detailedDescription: '주주는 다수를 일거에 무력화하는 무적 영역 전개 능력을 가진 제어형 특수 포지션 캐릭터입니다. 스킬 작동 시 3초 동안 자신은 완전 무적(Invulnerable) 상태가 되며 적들을 기절시킨 채 한 지점으로 빨아들이는 블랙홀을 배치합니다. 소멸 시 강력한 충격파를 주고 튕겨내며, 빈사 상태 돌입 시 전장에 가장 건강한 적과 자리를 바꾸고 3초 보호막을 받는 강력한 생존 패시브도 탑재하고 있습니다.',
// #endregion CONFIG

  // ═══════════════════════════════════════════
  // #region SKILL_TRIGGER — spawn black hole & grant immunity
  // ═══════════════════════════════════════════
  onSkillTrigger(char: CharacterState, ctx) {
    char.skillActive = true;
    char.skillDurationLeft = 3.0; // 3 seconds duration

    const js = char as JujuState;
    // Set center of black hole at current location
    js.blackHoleX = js.x;
    js.blackHoleY = js.y;
    
    // Apply damage immunity
    char.isImmune = true;
    char.immuneTimeLeft = 3.0;

    ctx.addFloatingText(char.x, char.y - 65, '🌀 특이점 블랙홀 소환! (무적)', '#00bfff', 1.8);
    ctx.createExplosion(char.x, char.y, '#00bfff', 15);
    ctx.logMessage?.(`🌀 [블랙홀 시동] 주주 ➡️ 현재 위치(${Math.round(js.blackHoleX)}, ${Math.round(js.blackHoleY)})에 블랙홀 기동 및 3초 피해 면역 무적!`, 'skill');
  },
  // #endregion SKILL_TRIGGER

  // ═══════════════════════════════════════════
  // #region UPDATE — suction effect, black hole decay, immune timer
  // ═══════════════════════════════════════════
  onUpdate(char: CharacterState, dt: number, ctx) {
    const js = char as JujuState;
    if (js.swapPortals === undefined) js.swapPortals = [];

    // 1. Decay portal effects
    js.swapPortals.forEach((p) => {
      p.life -= dt * 1.8;
    });
    js.swapPortals = js.swapPortals.filter((p) => p.life > 0);

    // 2. Active: suction and collapse of black hole
    if (js.skillActive) {
      js.skillDurationLeft -= dt;

      if (js.blackHoleX !== undefined && js.blackHoleY !== undefined) {
        const bX = js.blackHoleX;
        const bY = js.blackHoleY;

        // Pull nearby enemies within 250px (exclude self)
        ctx.characters.forEach((enemy: CharacterState) => {
          if (enemy.isDead || enemy.id === js.id) return;
          
          const dx = bX - enemy.x;
          const dy = bY - enemy.y;
          const dist = Math.hypot(dx, dy);

          if (dist <= 250) {
            // A. Stun opponent to block movement (refresh 0.2s duration)
            enemy.isStunned = true;
            enemy.stunTimeLeft = Math.max(enemy.stunTimeLeft || 0, 0.2);

            // B. Cancel velocity
            enemy.vx = 0;
            enemy.vy = 0;

            // C. Force coordinate draw towards center
            if (dist > 15) {
              const pullSpeed = 4.8;
              const angle = Math.atan2(dy, dx);
              enemy.x += Math.cos(angle) * pullSpeed * (dt * 60);
              enemy.y += Math.sin(angle) * pullSpeed * (dt * 60);
            }
          }
        });

        // Suction particle trail effects
        if (Math.random() < 0.7) {
          const randAngle = Math.random() * Math.PI * 2;
          const startDist = 120 + Math.random() * 120;
          const px = bX + Math.cos(randAngle) * startDist;
          const py = bY + Math.sin(randAngle) * startDist;
          ctx.createParticle(px, py, '#00bfff', 2.2, 25);
        }
      }

      // Black hole collapse (30 splash damage & extreme knockback)
      if (js.skillDurationLeft <= 0) {
        js.skillActive = false;
        js.skillDurationLeft = 0;

        if (js.blackHoleX !== undefined && js.blackHoleY !== undefined) {
          const bX = js.blackHoleX;
          const bY = js.blackHoleY;

          ctx.createExplosion(bX, bY, '#1c0d24', 45); // Dark core explosion
          ctx.createExplosion(bX, bY, '#00bfff', 35);
          ctx.addFloatingText(bX, bY - 20, '💥 블랙홀 붕괴!', '#ff007f', 2.2);

          // Apply damage and knockback
          ctx.characters.forEach((enemy: CharacterState) => {
            if (enemy.isDead || enemy.id === js.id) return;
            
            const dx = enemy.x - bX;
            const dy = enemy.y - bY;
            const dist = Math.hypot(dx, dy);

            if (dist <= 250) {
              ctx.dealDamage(js, enemy, 30, '💥 SINGULARITY!');
              
              // Knockback outwards (speed 28.5)
              const angle = Math.atan2(dy, dx);
              enemy.vx = Math.cos(angle) * 28.5;
              enemy.vy = Math.sin(angle) * 28.5;
            }
          });

          ctx.logMessage?.(`💥 [블랙홀 붕괴] 주주 ➡️ 블랙홀 특이점 폭발! 주변 적에게 30 광역 피해 및 초강력 외곽 넉백!`, 'skill');
        }
      }
    }

    // 3. Decrement immunity barrier duration
    if (js.isImmune && js.immuneTimeLeft !== undefined) {
      js.immuneTimeLeft -= dt;
      if (js.immuneTimeLeft <= 0) {
        js.isImmune = false;
        js.immuneTimeLeft = 0;
        ctx.addFloatingText(js.x, js.y - 45, '🛡️ 보호막 만료', '#888888', 1.0);
      }
    }

    // Grid particles decoration
    if (Math.random() < 0.08) {
      ctx.createParticle(js.x, js.y, '#00bfff', 2, 8);
    }
  },
  // #endregion UPDATE

  // ═══════════════════════════════════════════
  // #region DAMAGE — damage immunity & emergency dimension swap
  // ═══════════════════════════════════════════
  onTakeDamage(target: CharacterState, _attacker: CharacterState, damage: number, ctx: CharacterBehaviorContext) {
    // 1. Damage immunity (Black hole active state etc.)
    if (target.isImmune) {
      console.log(`🛡️ [피해 무적] ${target.name}이 무적 상태이므로 피해를 받지 않습니다.`);
      return { finalDamage: 0, blocked: true };
    }

    // 2. Emergency Swap Passive (triggers once when HP drops to 10% or below)
    const js = target as JujuState;
    if (!js.hasEmergencySwapped) {
      const nextHp = target.hp - damage;
      if (nextHp <= target.maxHp * 0.10) {
        js.hasEmergencySwapped = true;

        // Find the alive survivor with the highest HP
        let maxHp = -Infinity;
        let swapTarget: any = null;
        ctx.characters.forEach((enemy) => {
          if (enemy.isDead || enemy.id === 'juju') return;
          if (enemy.hp > maxHp) {
            maxHp = enemy.hp;
            swapTarget = enemy;
          }
        });

        if (swapTarget) {
          const jX = target.x;
          const jY = target.y;
          const tX = swapTarget.x;
          const tY = swapTarget.y;

          // Swap positions
          target.x = tX;
          target.y = tY;
          swapTarget.x = jX;
          swapTarget.y = jY;

          // Grant 3 seconds immunity shield
          target.isImmune = true;
          target.immuneTimeLeft = 3.0;

          // Portal trails
          if (!js.swapPortals) js.swapPortals = [];
          js.swapPortals.push({ x: jX, y: jY, life: 0.8 });
          js.swapPortals.push({ x: tX, y: tY, life: 0.8 });

          ctx.createExplosion(jX, jY, '#00bfff', 18);
          ctx.createExplosion(tX, tY, '#00bfff', 18);
          ctx.addFloatingText(target.x, target.y - 70, '🛡️ 비상 차원 탈출! (무적 3초)', '#00bfff', 2.0);
          console.log(`🛡️ [비상 탈출] 주주가 치사 피해를 회피하고 ${(swapTarget as CharacterState).name}와 스왑 후 3초 무적막을 얻었습니다!`);
        } else {
          // If only self survives, grant 3 seconds immunity
          target.isImmune = true;
          target.immuneTimeLeft = 3.0;
          ctx.addFloatingText(target.x, target.y - 70, '🛡️ 비상 무적! (3초)', '#00bfff', 2.0);
        }
        return { finalDamage: 0, blocked: true }; // Negate original damage completely
      }
    }

    return { finalDamage: damage, blocked: false };
  },
  // #endregion DAMAGE

  // ═══════════════════════════════════════════
  // #region RENDER — portal effects, black hole visual, barrier drawing
  // ═══════════════════════════════════════════
  onRenderExtra(char: CharacterState, canvasCtx: CanvasRenderingContext2D, currentRadius: number) {
    const js = char as JujuState;
    const swapPortals = js.swapPortals || [];

    // 1. Swap portals visual effect
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

    // 2. Black hole rendering
    if (js.blackHoleX !== undefined && js.blackHoleY !== undefined && (js.skillActive || js.skillDurationLeft > 0)) {
      canvasCtx.save();
      const bX = js.blackHoleX;
      const bY = js.blackHoleY;
      
      // Black core
      canvasCtx.fillStyle = 'rgba(10, 5, 20, 0.85)';
      canvasCtx.beginPath();
      canvasCtx.arc(bX, bY, 45, 0, Math.PI * 2);
      canvasCtx.fill();

      // Rotating gravity ring
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

    // 3. Immunity barrier dome drawing
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

    // 4. Base hologram grid circle decoration
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
  // #endregion RENDER
};
