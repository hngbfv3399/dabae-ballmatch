import type { CharacterState, CharacterBehaviorContext } from '../characters/character.interface';
import { checkWallCollision, resolveCollision, limitMinSpeed } from './physics';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  life: number;
  maxLife: number;
}

interface FloatingText {
  x: number;
  y: number;
  text: string;
  color: string;
  life: number; // 0 ~ 1
}

function applyNayutaControl(_nayuta: CharacterState, target: CharacterState, game: any) {
  if (target.id === 'nayuta' || target.isDead || target.nayutaControlled) return;
  // 40% 확률로 지배 상태 돌입 (10초)
  if (Math.random() < 0.40) {
    target.nayutaControlled = true;
    target.nayutaControlTimeLeft = 10.0;
    game.createParticle(target.x, target.y, '#e52b50', 4, 15);
    game.floatingTexts.push({
      x: target.x,
      y: target.y - 45,
      text: '👁️ 지배당함!',
      color: '#e52b50',
      life: 1.2
    });
    // 지배 즉시 스킬 취소 + 게이지 초기화
    if (target.skillActive) {
      target.skillActive = false;
      target.skillDurationLeft = 0;
      console.log(`🚫 [지배 스킬 취소] ${target.name}의 스킬이 지배로 인해 즉시 취소되었습니다.`);
      game.onLogMessage?.(`🚫 [지배 스킬 취소] ${target.name}의 스킬이 즉시 캔슬되었습니다.`, 'skill');
    }
    target.skillGauge = 0;
    console.log(`👁️ [지배 수립] 나유타 -> ${target.name} | 10초 지배 개시`);
    game.onLogMessage?.(`👁️ [지배 수립] 나유타 ➡️ ${target.name} | 10초간 스킬 게이지 충전 불가 및 조종`, 'skill');
  }
}

export class GameLounge {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private characters: CharacterState[] = [];
  private particles: Particle[] = [];
  private floatingTexts: FloatingText[] = [];

  private isRunning: boolean = false;
  private isPrepared: boolean = false;
  private prepTimer: number = 3.0; // 3초 카운트다운
  private animationFrameId: number | null = null;
  private lastTime: number = 0;
  private simulationSpeed: number = 1.0;
  
  // 게임 오버 애니메이션 지연을 위한 변수들
  private isGameOver: boolean = false;
  private gameOverTimer: number = 0;
  private winnerCharacter: CharacterState | null = null;

  // 초기 발사 각도 (3초 준비시간 동안 표시)
  private initialAngles: Map<string, number> = new Map();

  // 이미지 사전 로드 캐시
  private preloadedImages: Map<string, HTMLImageElement> = new Map();

  // 이벤트 콜백
  private onUpdateHUD: (chars: CharacterState[]) => void;
  private onGameEnd: (winner: CharacterState, allChars: CharacterState[]) => void;
  private onCountdown: (seconds: number) => void;
  private onCharacterDeath?: (victimId: string, killerId: string, playerCount: number) => void;
  private onLogMessage?: (msg: string, type: string) => void;

  constructor(
    canvas: HTMLCanvasElement,
    onUpdateHUD: (chars: CharacterState[]) => void,
    onGameEnd: (winner: CharacterState, allChars: CharacterState[]) => void,
    onCountdown: (seconds: number) => void,
    onCharacterDeath?: (victimId: string, killerId: string, playerCount: number) => void,
    onLogMessage?: (msg: string, type: string) => void
  ) {
    this.canvas = canvas;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Could not get Canvas 2D context');
    this.ctx = context;

    this.onUpdateHUD = onUpdateHUD;
    this.onGameEnd = onGameEnd;
    this.onCountdown = onCountdown;
    this.onCharacterDeath = onCharacterDeath;
    this.onLogMessage = onLogMessage;
  }

  /**
   * 캐릭터 행동 제어 컨텍스트 헬퍼
   */
  private getBehaviorContext(): CharacterBehaviorContext {
    return {
      characters: this.characters,
      createParticle: (x: number, y: number, color: string, size?: number, life?: number) => {
        this.createParticle(x, y, color, size, life);
      },
      createExplosion: (x: number, y: number, color: string, count?: number) => {
        this.createExplosion(x, y, color, count);
      },
      dealDamage: (attacker: CharacterState, target: CharacterState, amount: number, customText?: string) => {
        this.dealDamage(attacker, target, amount, customText);
      },
      addFloatingText: (x: number, y: number, text: string, color: string, life?: number) => {
        this.floatingTexts.push({
          x,
          y,
          text,
          color,
          life: life !== undefined ? life : 1.0
        });
      },
      logMessage: (msg: string, type: string) => {
        this.onLogMessage?.(msg, type);
      }
    };
  }

  /**
   * 게임을 초기화하고 준비 단계를 시작합니다.
   */
  public init(selectedCharacters: CharacterState[], simulationSpeed: number = 1.0) {
    this.characters = JSON.parse(JSON.stringify(selectedCharacters)); // 딥카피로 초기 상태 보존
    this.simulationSpeed = simulationSpeed;
    this.particles = [];
    this.floatingTexts = [];
    this.prepTimer = 3.0;
    this.isPrepared = false;
    this.isRunning = true;
    this.lastTime = performance.now();
    this.isGameOver = false;
    this.gameOverTimer = 0;
    this.winnerCharacter = null;

    // 캐릭터 내부의 함수 객체(훅)들은 JSON.parse(JSON.stringify()) 과정에서 손실되므로,
    // 원본 selectedCharacters 리스트에서 함수들을 다시 찾아와 연결 복원
    this.characters.forEach((char) => {
      const orig = selectedCharacters.find((c) => c.id === char.id);
      if (orig) {
        char.onSkillTrigger = orig.onSkillTrigger;
        char.onUpdate = orig.onUpdate;
        char.onCollisionWithTarget = orig.onCollisionWithTarget;
        char.onBasicAttack = orig.onBasicAttack;
        char.onRenderExtra = orig.onRenderExtra;
      }

      // 이미지 프리로딩 개시
      if (char.image && !this.preloadedImages.has(char.image)) {
        const img = new Image();
        img.src = char.image;
        img.onload = () => {
          this.preloadedImages.set(char.image!, img);
        };
      }
    });

    // 캐릭터마다 랜덤 초기 방향 결정 (3초 대기 후 이 각도로 날아감)
    this.initialAngles.clear();
    this.characters.forEach((char) => {
      this.initialAngles.set(char.id, Math.random() * Math.PI * 2);
    });

    this.onCountdown(3);
    this.onUpdateHUD(this.characters);

    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
    this.animationFrameId = requestAnimationFrame(this.loop.bind(this));
  }

  /**
   * 시뮬레이션을 정지합니다.
   */
  public stop() {
    this.isRunning = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  /**
   * 메인 게임 루프
   */
  private loop(timestamp: number) {
    if (!this.isRunning) return;

    let dt = (timestamp - this.lastTime) / 1000;
    if (dt > 0.1) dt = 0.1;
    this.lastTime = timestamp;

    const adjustedDt = dt * this.simulationSpeed;

    this.update(adjustedDt);
    this.render();

    this.animationFrameId = requestAnimationFrame(this.loop.bind(this));
  }

  /**
   * 게임 상태 업데이트
   */
  private update(dt: number) {
    if (!this.isPrepared) {
      // 1. 준비 단계 (3초 카운트다운)
      this.prepTimer -= dt;
      const displaySeconds = Math.ceil(this.prepTimer);
      this.onCountdown(displaySeconds);

      if (this.prepTimer <= 0) {
        this.isPrepared = true;
        this.onCountdown(0);
        // 준비 완료 시 속도 벡터 설정하고 발사!
        this.characters.forEach((char) => {
          const angle = this.initialAngles.get(char.id) || 0;
          const initialSpeed = 3.5 * char.speed; // 기본 속도
          char.vx = Math.cos(angle) * initialSpeed;
          char.vy = Math.sin(angle) * initialSpeed;
        });
      }
      return;
    }

    // 사망 캐릭터 데스 애니메이션 타임 업데이트
    this.characters.forEach((char) => {
      if (char.isDead && (char as any).deathAnimationTime > 0) {
        (char as any).deathAnimationTime -= dt;
        if ((char as any).deathAnimationTime < 0) {
          (char as any).deathAnimationTime = 0;
        }
        // 사망 궤적 이펙트 파티클
        if (Math.random() < 0.15) {
          this.createParticle(
            char.x + (Math.random() - 0.5) * char.radius,
            char.y + (Math.random() - 0.5) * char.radius,
            char.color,
            2,
            10
          );
        }
      }
    });

    // 2. 캐릭터 상태 및 위치 업데이트
    const aliveCharacters = this.characters.filter((c) => !c.isDead);

    // 승리 조건 검사 (데스 애니메이션을 위해 2초 지연 적용)
    if (!this.isGameOver) {
      if (aliveCharacters.length <= 1) {
        this.isGameOver = true;
        this.gameOverTimer = 2.0; // 2초간 슬로우 모션 및 데스 애니메이션 연출
        this.winnerCharacter = aliveCharacters[0] || null;
      }
    } else {
      this.gameOverTimer -= dt;
      this.simulationSpeed = 0.3; // 슬로우 모션
      if (this.gameOverTimer <= 0) {
        this.stop();
        if (this.winnerCharacter) {
          this.onGameEnd(this.winnerCharacter, this.characters);
        }
        return;
      }
    }

    const context = this.getBehaviorContext();

    aliveCharacters.forEach((char) => {
      // 2-A. 캐릭터 고유 업데이트 로직 실행 (지호의 코딩 틱, 도윤의 덩크 틱 등)
      char.onUpdate?.(char, dt, context);

      // 2-B. 타이핑 정지 상태 체크하여 물리 연산 건너뛰기 (기절 중에는 물리 비행 이동은 허용하되 공격/스킬만 차단)
      if (char.isTyping) {
        return; // 코딩 정지 중에는 이동/공격 불가
      }

      // 위치 업데이트
      char.x += char.vx * dt * 60; // 60fps 기준 속도 조절
      char.y += char.vy * dt * 60;

      // 벽 충돌 체크
      checkWallCollision(char, this.canvas.width, this.canvas.height);

      // 게임 종료 연출 중에는 공격 및 게이지 획득 중단
      if (this.isGameOver) return;

      // Cooldowns
      if (char.baseAttackCooldown > 0) {
        char.baseAttackCooldown -= dt;
      }

      // 스킬 게이지 충전 및 100% 도달 시 즉시 발동 검사 (기절 중에는 게이지 충전 불가, 지배당한 적도 충전 불가)
      if (!char.skillActive && !char.isStunned && !char.nayutaControlled) {
        let canCharge = true;
        if (char.id === 'nayuta') {
          const hasControlled = this.characters.some((c) => !c.isDead && c.nayutaControlled);
          if (!hasControlled) {
            canCharge = false;
            char.skillGauge = 0; // 지배전에는 게이지 0 고정
          }
        }

        if (canCharge && char.skillGauge < 100) {
          char.skillGauge += char.skillChargeRate * dt;
        }
        if (char.skillGauge >= 100) {
          char.skillGauge = 100;
          this.triggerSkill(char);
        }
      }

      // 기본 공격 사거리 내 적 감지 및 자동 공격 (기절 중에는 공격 불가)
      if (char.baseAttackCooldown <= 0 && !char.isStunned) {
        let closestEnemy: CharacterState | null = null;
        let minDist = Infinity;

        aliveCharacters.forEach((enemy) => {
          if (enemy.id === char.id) return;
          if (enemy.isSuInvisible) return; // 은신 중인 대상은 타겟 설정 불가
          if (char.isCharmed && enemy.id === 'seyeon') return; // 매혹 중에는 세연 공격 타겟 제외
          const dist = Math.hypot(enemy.x - char.x, enemy.y - char.y);
          if (dist < minDist) {
            minDist = dist;
            closestEnemy = enemy;
          }
        });

        if (closestEnemy && minDist <= char.baseAttackRange + (closestEnemy as CharacterState).radius) {
          this.performBasicAttack(char, closestEnemy);
        }
      }
    });

    // 3. 캐릭터 간 물리 충돌 계산
    for (let i = 0; i < aliveCharacters.length; i++) {
      for (let j = i + 1; j < aliveCharacters.length; j++) {
        const c1 = aliveCharacters[i];
        const c2 = aliveCharacters[j];

        const collided = resolveCollision(c1, c2);
        if (collided) {
          const midX = (c1.x + c2.x) / 2;
          const midY = (c1.y + c2.y) / 2;
          this.createExplosion(midX, midY, '#ffffff', 5);

          // 충돌 시 양측 스킬 게이지 충전 보너스 (+5)
          if (!c1.skillActive && !c1.isStunned && !c1.isTyping && !c1.nayutaControlled) c1.skillGauge = Math.min(100, c1.skillGauge + 5);
          if (!c2.skillActive && !c2.isStunned && !c2.isTyping && !c2.nayutaControlled) c2.skillGauge = Math.min(100, c2.skillGauge + 5);

          // 나유타 접촉 지배 판정
          if (c1.id === 'nayuta' && !c2.isDead) {
            applyNayutaControl(c1, c2, this);
          }
          if (c2.id === 'nayuta' && !c1.isDead) {
            applyNayutaControl(c2, c1, this);
          }

          // 캐릭터 고유 충돌 효과 위임
          c1.onCollisionWithTarget?.(c1, c2, context);
          c2.onCollisionWithTarget?.(c2, c1, context);
        }
      }
    }

    // 4. 파티클 업데이트
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt * 60;
      p.y += p.vy * dt * 60;
      p.life -= dt * 60;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }

    // 5. 데미지 텍스트 팝업 업데이트
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.y -= 1.2 * dt * 60;
      ft.life -= dt * 1.5;
      if (ft.life <= 0) {
        this.floatingTexts.splice(i, 1);
      }
    }

    this.onUpdateHUD(this.characters);
  }

  /**
   * 기본 공격 수행
   */
  private performBasicAttack(attacker: CharacterState, target: CharacterState) {
    attacker.baseAttackCooldown = 1.2; // 1.2초 공격 쿨타임

    this.dealDamage(attacker, target, attacker.attackPower);
    attacker.onBasicAttack?.(attacker, target, this.getBehaviorContext());

    // 나유타 지배 판정은 충돌(resolveCollision)에서만 수행 — 기본 공격 중복 판정 제거

    const midX = (attacker.x + target.x) / 2;
    const midY = (attacker.y + target.y) / 2;
    this.createExplosion(midX, midY, attacker.color, 6);

    const angle = Math.atan2(target.y - attacker.y, target.x - attacker.x);
    for (let i = 0; i < 8; i++) {
      const speed = 1.5 + Math.random() * 2;
      const scatterAngle = angle + (Math.random() - 0.5) * 0.8;
      this.particles.push({
        x: midX,
        y: midY,
        vx: Math.cos(scatterAngle) * speed,
        vy: Math.sin(scatterAngle) * speed,
        color: attacker.color,
        size: 3 + Math.random() * 3,
        life: 15 + Math.random() * 15,
        maxLife: 30
      });
    }

    if (!attacker.skillActive && !attacker.nayutaControlled) {
      attacker.skillGauge = Math.min(100, attacker.skillGauge + 10);
    }
  }

  /**
   * 데미지 일괄 계산 및 적용
   */
  private dealDamage(attacker: CharacterState, target: CharacterState, amount: number, customText?: string) {
    if (target.isDead) return;

    // 무적 상태 시 대미지 무시 (주주 보호막 등)
    if (target.isImmune) {
      console.log(`🛡️ [피해 무적] ${target.name}이 무적 상태이므로 피해를 받지 않습니다.`);
      return;
    }

    // 수 정밀 저격 은신/무적 상태 시 대미지 무시
    if (target.isSuInvisible) {
      console.log(`🛡️ [은신 면역] ${target.name}이 은신 상태이므로 피해를 받지 않습니다.`);
      return;
    }

    // 세연 매혹 대미지 무시 판정 (서로 피해 0)
    if ((target.isCharmed && attacker.id === 'seyeon') || (attacker.isCharmed && target.id === 'seyeon')) {
      console.log(`🛡️ [매혹 면역] ${attacker.name} ➡️ ${target.name} | 매혹 상태이므로 서로 피해를 입히지 못합니다.`);
      return;
    }

    let finalDamage = amount;

    // 지호 버프 상태일 때 공격력 2.2배 적용
    if (attacker.id === 'jiho' && attacker.skillActive) {
      finalDamage = Math.round(finalDamage * 2.2);
    }

    // 찬휘 신라천정 시전 중 받는 대미지 97% 감소 (3%만 받음)
    if (target.id === 'chanhwi' && target.skillActive) {
      finalDamage = Math.round(finalDamage * 0.03);
      if (finalDamage < 1 && amount >= 1) {
        finalDamage = 1; // 최소 1 피해 보장
      }
    }

    // 도윤 보호막(실드) 흡수 처리
    if (target.id === 'doyun' && target.doyunShield && target.doyunShield > 0) {
      const absorb = Math.min(finalDamage, target.doyunShield);
      target.doyunShield -= absorb;
      finalDamage -= absorb;
      console.log(`🛡️ [실드 흡수] 도윤 -> 보호막이 ${absorb} 피해를 흡수했습니다. (남은 보호막: ${target.doyunShield})`);
      if (absorb > 0) {
        this.floatingTexts.push({
          x: target.x,
          y: target.y - 45,
          text: `🛡️ ABSORB -${absorb}`,
          color: '#00ccff',
          life: 1.0
        });
      }
    }

    // 운희 벌크업 상태 시 받는 피해 50% 감소
    if (target.id === 'unhee' && (target as any).unhwiBuffActive) {
      finalDamage = Math.round(finalDamage * 0.5);
      if (finalDamage < 1 && amount >= 1) {
        finalDamage = 1; // 최소 1 피해 보장
      }
    }

    // 가한 피해량/받은 피해량 누적
    if (attacker && attacker.totalDamageDealt !== undefined) {
      attacker.totalDamageDealt += finalDamage;
    }
    if (target && target.totalDamageTaken !== undefined) {
      target.totalDamageTaken += finalDamage;
    }

    target.hp -= finalDamage;
    console.log(`⚔️ [대미지] ${attacker.name} -> ${target.name} | 최종 피해: ${finalDamage} (기본: ${amount}${customText ? `, 판정: ${customText}` : ''}) | 남은 HP: ${target.hp}/${target.maxHp}`);
    this.onLogMessage?.(`⚔️ [${customText || '기본공격'}] ${attacker.name} ➡️ ${target.name} | ${finalDamage} 피해 (HP: ${target.hp}/${target.maxHp})`, 'damage');

    this.floatingTexts.push({
      x: target.x + (Math.random() - 0.5) * 20,
      y: target.y - 20,
      text: customText ? `${customText} -${finalDamage}` : `-${finalDamage}`,
      color: customText ? '#ffcc00' : '#ff3366',
      life: 1.0
    });

    const angle = Math.atan2(target.y - attacker.y, target.x - attacker.x);
    target.vx += Math.cos(angle) * 1.5;
    target.vy += Math.sin(angle) * 1.5;
    limitMinSpeed(target);

    if (target.hp <= 0) {
      target.hp = 0;
      target.isDead = true;
      target.opacity = 0.8;
      (target as any).deathAnimationTime = 1.5; // 1.5초 데스 애니메이션 타이머
      console.log(`💀 [탈락] ${target.name}이(가) ${attacker.name}에 의해 게임에서 탈락되었습니다!`);
      this.onLogMessage?.(`💀 [탈락] ${target.name}이(가) ${attacker.name}에 의해 탈락되었습니다!`, 'death');

      if (attacker && attacker.id !== target.id) {
        this.onCharacterDeath?.(target.id, attacker.id, this.characters.length);
      }

      // 만약 사망한 캐릭터가 찬익이라면, 찬익이 생존자들에게 건 전술 감속 디버프를 모두 해제합니다.
      if (target.id === 'chanik') {
        this.characters.forEach((enemy) => {
          const opp = enemy as any;
          if (opp.chanikSlowApplied && opp.chanikOriginalSpeed !== undefined) {
            enemy.speed = opp.chanikOriginalSpeed;
            opp.chanikSlowApplied = false;
            this.floatingTexts.push({
              x: enemy.x,
              y: enemy.y - 25,
              text: '🚨 포격 취소 (이속 복구)',
              color: '#00ffcc',
              life: 1.0
            });
            console.log(`🚨 [전술 감속 해제] 찬익 사망으로 인해 ${enemy.name}의 감속이 해제되고 속도가 복구되었습니다.`);
          }
        });
      }

      // 만약 사망한 캐릭터가 나유타라면, 맵 전체의 지배 상태를 해제합니다.
      if (target.id === 'nayuta') {
        this.characters.forEach((enemy) => {
          if (enemy.nayutaControlled) {
            enemy.nayutaControlled = false;
            enemy.nayutaControlTimeLeft = 0;
            this.floatingTexts.push({
              x: enemy.x,
              y: enemy.y - 25,
              text: '해제 (나유타 사망)',
              color: '#00ffcc',
              life: 1.0
            });
            console.log(`👁️ [지배 해제] 나유타 사망으로 인해 ${enemy.name}의 지배가 해제되었습니다.`);
          }
        });
      }

      this.createExplosion(target.x, target.y, '#ffffff', 40);
      this.createExplosion(target.x, target.y, target.color, 30);
      this.floatingTexts.push({
        x: target.x,
        y: target.y - 10,
        text: 'ELIMINATED',
        color: '#ff0000',
        life: 1.5
      });
    }
  }

  /**
   * 고유 스킬 발동
   */
  private triggerSkill(char: CharacterState) {
    char.skillGauge = 0;
    char.skillActive = true;
    console.log(`✨ [스킬 발동] ${char.name} -> 스킬 [${char.skillName}] 활성화!`);

    this.floatingTexts.push({
      x: char.x,
      y: char.y - 45,
      text: `✨ ${char.skillName}!`,
      color: '#ffd700',
      life: 1.5
    });

    this.createExplosion(char.x, char.y, char.color, 15);
    this.onLogMessage?.(`✨ [스킬 발동] ${char.name} ➡️ [${char.skillName}] 시전!`, 'skill');

    // 행동 전용 훅 위임 호출
    const context = this.getBehaviorContext();
    char.onSkillTrigger?.(char, context);
  }

  /* ==================== 이펙트 도우미 메서드 ==================== */
  private createParticle(x: number, y: number, color: string, size: number = 4, life: number = 20) {
    this.particles.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 2,
      vy: (Math.random() - 0.5) * 2,
      color,
      size,
      life,
      maxLife: life
    });
  }

  private createExplosion(x: number, y: number, color: string, count: number = 10) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.0 + Math.random() * 4;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color,
        size: 2 + Math.random() * 4,
        life: 15 + Math.random() * 20,
        maxLife: 35
      });
    }
  }

  /* ==================== 렌더링 메서드 ==================== */
  private render() {
    this.ctx.save();

    // 찬휘 신라천정 시전 시 화면 흔들림 효과
    let shakeAmount = 0;
    const chanhwi = this.characters.find((c) => c.id === 'chanhwi' && c.skillActive && !c.isDead);
    if (chanhwi) {
      const elapsed = 17.4 - chanhwi.skillDurationLeft;
      if (elapsed >= 2.0 && elapsed < 17.0) {
        // 시간이 흐를수록 격렬하게 떨림 (최대 10px, 순간이동 완료 후 대사 시작할 때부터 시작)
        const ratio = (elapsed - 2.0) / 15.0;
        shakeAmount = ratio * 10;
      } else if (elapsed >= 17.0) {
        // 격발 순간 최대 25px 진동, 0.4초간 서서히 진정
        const blastElapsed = elapsed - 17.0;
        shakeAmount = (1.0 - (blastElapsed / 0.4)) * 25;
      }
    }

    if (shakeAmount > 0) {
      const dx = (Math.random() - 0.5) * shakeAmount;
      const dy = (Math.random() - 0.5) * shakeAmount;
      this.ctx.translate(dx, dy);
    }

    this.ctx.fillStyle = '#06060c';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.02)';
    this.ctx.lineWidth = 1;
    const gridSize = 40;
    for (let x = 0; x < this.canvas.width; x += gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, this.canvas.height);
      this.ctx.stroke();
    }
    for (let y = 0; y < this.canvas.height; y += gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(this.canvas.width, y);
      this.ctx.stroke();
    }

    this.ctx.strokeStyle = 'rgba(127, 0, 255, 0.2)';
    this.ctx.lineWidth = 6;
    this.ctx.strokeRect(0, 0, this.canvas.width, this.canvas.height);

    // 2. 캐릭터 렌더링
    this.characters.forEach((char) => {
      // 2-A. 사망 캐릭터 렌더링 (회전, 수축, 서서히 사라짐 연출)
      if (char.isDead) {
        const animTime = (char as any).deathAnimationTime || 0;
        if (animTime > 0) {
          this.ctx.save();
          const progress = animTime / 1.5; // 1.0 -> 0.0
          this.ctx.globalAlpha = progress * 0.8;
          
          this.ctx.translate(char.x, char.y);
          this.ctx.rotate((1.0 - progress) * Math.PI * 4); // 4바퀴 회전
          
          const radius = char.radius * progress;
          
          this.ctx.beginPath();
          this.ctx.arc(0, 0, radius, 0, Math.PI * 2);
          this.ctx.fillStyle = '#121225';
          this.ctx.fill();

          const imgObj = char.image ? this.preloadedImages.get(char.image) : null;
          if (imgObj) {
            this.ctx.save();
            this.ctx.beginPath();
            this.ctx.arc(0, 0, radius, 0, Math.PI * 2);
            this.ctx.clip();
            this.ctx.drawImage(imgObj, -radius, -radius, radius * 2, radius * 2);
            this.ctx.restore();
          } else {
            this.ctx.fillStyle = '#ffffff';
            this.ctx.font = `bold ${Math.max(6, radius * 0.45)}px "Orbit", sans-serif`;
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText(char.name, 0, 0);
          }
          
          this.ctx.strokeStyle = '#ff3366';
          this.ctx.lineWidth = 3;
          this.ctx.beginPath();
          this.ctx.arc(0, 0, radius, 0, Math.PI * 2);
          this.ctx.stroke();
          
          this.ctx.restore();
        } else {
          // 정적 그레이 처리
          this.ctx.save();
          this.ctx.globalAlpha = 0.2;
          this.ctx.fillStyle = '#333333';
          this.ctx.beginPath();
          this.ctx.arc(char.x, char.y, char.radius, 0, Math.PI * 2);
          this.ctx.fill();

          this.ctx.fillStyle = '#888888';
          this.ctx.font = `bold ${char.radius * 0.45}px "Orbit", sans-serif`;
          this.ctx.textAlign = 'center';
          this.ctx.textBaseline = 'middle';
          this.ctx.fillText(char.name, char.x, char.y);
          
          this.ctx.strokeStyle = '#ff3366';
          this.ctx.lineWidth = 2.5;
          this.ctx.beginPath();
          this.ctx.moveTo(char.x - char.radius * 0.7, char.y);
          this.ctx.lineTo(char.x + char.radius * 0.7, char.y);
          this.ctx.stroke();
          
          this.ctx.restore();
        }
        return;
      }

      this.ctx.save();

      // 수 정밀 저격 은신 상태 시 반투명화
      if (char.isSuInvisible) {
        this.ctx.globalAlpha = 0.25;
      }

      // 스케일 반영된 반경
      const currentRadius = char.radius * char.scaleMultiplier;

      // 지호 버프 상태(초록 광륜) 이펙트
      if (char.id === 'jiho' && char.skillActive) {
        this.ctx.save();
        this.ctx.strokeStyle = 'rgba(0, 255, 196, 0.4)';
        this.ctx.lineWidth = 6;
        this.ctx.shadowBlur = 15;
        this.ctx.shadowColor = '#00ffcc';
        this.ctx.beginPath();
        this.ctx.arc(char.x, char.y, currentRadius + 12 + Math.sin(Date.now() / 80) * 3, 0, Math.PI * 2);
        this.ctx.stroke();
        this.ctx.restore();
      }

      // 원형 클리핑 영역 및 배경
      this.ctx.save();
      this.ctx.beginPath();
      this.ctx.arc(char.x, char.y, currentRadius, 0, Math.PI * 2);
      this.ctx.closePath();

      this.ctx.fillStyle = '#121225';
      this.ctx.fill();

      // 원형 내부 이미지 또는 텍스트 렌더링
      const imgObj = char.image ? this.preloadedImages.get(char.image) : null;
      if (imgObj) {
        this.ctx.clip(); // 둥근 구체 내부로 마스킹 클리핑
        this.ctx.drawImage(
          imgObj,
          char.x - currentRadius,
          char.y - currentRadius,
          currentRadius * 2,
          currentRadius * 2
        );
      } else {
        // 이미지가 없으므로 centered name text fallback 드로잉
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = `bold ${Math.max(10, currentRadius * 0.45)}px "Orbit", sans-serif`;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(char.name, char.x, char.y);
      }
      this.ctx.restore(); // 클리핑 해제

      // 캐릭터 테두리 빛 효과 선
      this.ctx.save();
      this.ctx.strokeStyle = char.color;
      this.ctx.lineWidth = 3;
      if (char.skillActive) {
        this.ctx.shadowBlur = 25;
        this.ctx.shadowColor = char.color;
      } else {
        this.ctx.shadowBlur = 10;
        this.ctx.shadowColor = 'rgba(0,0,0,0.5)';
      }
      this.ctx.beginPath();
      this.ctx.arc(char.x, char.y, currentRadius, 0, Math.PI * 2);
      this.ctx.stroke();
      this.ctx.restore();

      // 캐릭터 고유 렌더링 확장 훅 위임 (코딩진행바, 기절별 등)
      char.onRenderExtra?.(char, this.ctx, currentRadius);

      // 3. 준비 모드 중 조준 화살표 그리기
      if (!this.isPrepared) {
        const angle = this.initialAngles.get(char.id) || 0;
        const arrowLength = 55;
        const arrowX = char.x + Math.cos(angle) * arrowLength;
        const arrowY = char.y + Math.sin(angle) * arrowLength;

        this.ctx.strokeStyle = char.color;
        this.ctx.lineWidth = 2.5;
        this.ctx.setLineDash([5, 3]);
        this.ctx.beginPath();
        this.ctx.moveTo(char.x, char.y);
        this.ctx.lineTo(arrowX, arrowY);
        this.ctx.stroke();
        this.ctx.setLineDash([]);

        const headlen = 10;
        this.ctx.fillStyle = char.color;
        this.ctx.beginPath();
        this.ctx.moveTo(arrowX, arrowY);
        this.ctx.lineTo(
          arrowX - headlen * Math.cos(angle - Math.PI / 6),
          arrowY - headlen * Math.sin(angle - Math.PI / 6)
        );
        this.ctx.lineTo(
          arrowX - headlen * Math.cos(angle + Math.PI / 6),
          arrowY - headlen * Math.sin(angle + Math.PI / 6)
        );
        this.ctx.closePath();
        this.ctx.fill();
      }

      // 4. 캐릭터 바깥쪽 원형 링 게이지 (HP & Skill) 렌더링
      const hpPercentage = char.hp / char.maxHp;
      this.ctx.lineWidth = 3.5;
      this.ctx.strokeStyle = 'rgba(255, 51, 102, 0.2)';
      this.ctx.beginPath();
      this.ctx.arc(char.x, char.y, currentRadius + 6, Math.PI * 0.5, Math.PI * 1.5, false);
      this.ctx.stroke();

      this.ctx.strokeStyle = varColorToHp(hpPercentage);
      this.ctx.beginPath();
      const hpStartAngle = Math.PI * 1.5;
      const hpEndAngle = Math.PI * 1.5 - Math.PI * hpPercentage;
      this.ctx.arc(char.x, char.y, currentRadius + 6, hpStartAngle, hpEndAngle, true);
      this.ctx.stroke();

      const skillPercentage = char.skillGauge / 100;
      this.ctx.strokeStyle = 'rgba(0, 242, 254, 0.15)';
      this.ctx.beginPath();
      this.ctx.arc(char.x, char.y, currentRadius + 6, Math.PI * 1.5, Math.PI * 0.5, false);
      this.ctx.stroke();

      this.ctx.strokeStyle = char.skillGauge >= 100 ? '#ffd700' : '#00f2fe';
      this.ctx.beginPath();
      const skillStartAngle = Math.PI * 1.5;
      const skillEndAngle = Math.PI * 1.5 + Math.PI * skillPercentage;
      this.ctx.arc(char.x, char.y, currentRadius + 6, skillStartAngle, skillEndAngle, false);
      this.ctx.stroke();

      this.ctx.restore();
    });

    // 5. 파티클 렌더링
    this.particles.forEach((p) => {
      this.ctx.save();
      const alpha = p.life / p.maxLife;
      this.ctx.globalAlpha = alpha;
      this.ctx.fillStyle = p.color;
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.restore();
    });

    // 6. 찬휘 신라천정 암전 및 화이트아웃 오버레이
    if (chanhwi) {
      const elapsed = 17.4 - chanhwi.skillDurationLeft;
      if (elapsed >= 2.0 && elapsed < 17.0) {
        // 캐스팅 동안 점진적 암전 (순간이동 완료 후 시작)
        const alpha = Math.min(0.55, ((elapsed - 2.0) / 15.0) * 0.55);
        this.ctx.fillStyle = `rgba(0, 0, 0, ${alpha})`;
        this.ctx.fillRect(-50, -50, this.canvas.width + 100, this.canvas.height + 100);
      } else if (elapsed >= 17.0) {
        // 격발 시 화이트아웃 섬광
        const blastElapsed = elapsed - 17.0;
        const flashAlpha = 1.0 - (blastElapsed / 0.4);
        if (flashAlpha > 0) {
          this.ctx.fillStyle = `rgba(255, 255, 255, ${flashAlpha})`;
          this.ctx.fillRect(-50, -50, this.canvas.width + 100, this.canvas.height + 100);
        }
      }

      // 7. 찬휘 자막 드로잉 (어두운 화면 오버레이 위에 배치하여 완전 선명하게 표출!)
      if ((chanhwi as any).currentQuotes && (chanhwi as any).currentQuotes.length > 0) {
        this.ctx.save();
        this.ctx.fillStyle = '#ffffff';
        this.ctx.strokeStyle = '#000000';
        this.ctx.lineWidth = 4.5;
        this.ctx.font = 'bold 20px "Noto Sans KR", Arial, sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';

        const lines = (chanhwi as any).currentQuotes as string[];
        const isFinalBlast = lines[0].includes('신라');

        if (isFinalBlast) {
          this.ctx.font = 'bold 46px "Noto Sans KR", Arial, sans-serif';
          this.ctx.fillStyle = '#ffcc00'; // 황금빛
          this.ctx.strokeText(lines[0], 400, 300);
          this.ctx.fillText(lines[0], 400, 300);
        } else {
          // 한 음절만 노출 (마지막 대사 하나만 렌더링)
          const currentLine = lines[lines.length - 1];
          this.ctx.strokeText(currentLine, 400, 300);
          this.ctx.fillText(currentLine, 400, 300);
        }
        this.ctx.restore();
      }
    }

    // 8. 데미지 플로팅 텍스트 렌더링
    this.ctx.save();
    this.ctx.font = 'bold 15px "Orbit", sans-serif';
    this.ctx.textAlign = 'center';
    this.floatingTexts.forEach((ft) => {
      this.ctx.globalAlpha = ft.life;
      this.ctx.fillStyle = ft.color;
      this.ctx.strokeStyle = '#000000';
      this.ctx.lineWidth = 3.5;
      this.ctx.strokeText(ft.text, ft.x, ft.y);
      this.ctx.fillText(ft.text, ft.x, ft.y);
    });
    this.ctx.restore();

    this.ctx.restore(); // 전체 흔들림 복구
  }
}

function varColorToHp(percent: number): string {
  if (percent > 0.5) return '#39ff14';
  if (percent > 0.2) return '#ffaa00';
  return '#ff3366';
}
