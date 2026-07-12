import type {
  CharacterState,
  CharacterBehaviorContext,
  BossDropDefinition,
  MapCutDefinition,
  CharacterStatusEffect,
  CinematicRequest,
} from "../characters/character.interface";
import { checkWallCollision, resolveCollision, limitMinSpeed } from "./physics";
import { finalizeMatchResults } from "./matchResults";
import type { TeamGameType } from "../maps";

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

interface RelicGem {
  x: number;
  y: number;
}

type BossDrop = BossDropDefinition;
interface MapCut extends MapCutDefinition { source: CharacterState; timeLeft: number; hitIds: string[]; }
type ActiveCinematic = CinematicRequest & { timeLeft: number; totalDuration: number };

function overlapsMapCut(target: CharacterState, cut: MapCut): boolean {
  const angle = cut.angle ?? 0;
  const centerX = cut.x + cut.width / 2;
  const centerY = cut.y + cut.height / 2;
  const dx = target.x - centerX;
  const dy = target.y - centerY;
  const localX = dx * Math.cos(angle) + dy * Math.sin(angle);
  const localY = -dx * Math.sin(angle) + dy * Math.cos(angle);
  return Math.abs(localX) < cut.width / 2 + target.radius && Math.abs(localY) < cut.height / 2 + target.radius;
}

function traceTornEdge(ctx: CanvasRenderingContext2D, cut: MapCut, y: number, reverse = false) {
  const halfWidth = cut.width / 2;
  const segmentCount = 26;
  const seed = (cut.x * 0.017 + cut.y * 0.023) % (Math.PI * 2);
  for (let index = 0; index <= segmentCount; index += 1) {
    const progress = index / segmentCount;
    const x = reverse ? halfWidth - progress * cut.width : -halfWidth + progress * cut.width;
    const tear = Math.sin(progress * 29 + seed) * 8 + Math.sin(progress * 61 + seed * 1.7) * 4;
    if (index === 0) ctx.moveTo(x, y + tear);
    else ctx.lineTo(x, y + tear);
  }
}

export class GameLounge {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private characters: CharacterState[] = [];
  private particles: Particle[] = [];
  private floatingTexts: FloatingText[] = [];
  private activeCinematic: ActiveCinematic | null = null;

  private isRunning: boolean = false;
  private isPrepared: boolean = false;
  private prepTimer: number = 3.0; // 3초 카운트다운
  private animationFrameId: number | null = null;
  private lastTime: number = 0;
  private simulationSpeed: number = 1.0;
  private roundTimer: number = 90.0;

  // 게임 오버 애니메이션 지연을 위한 변수들
  private isGameOver: boolean = false;
  private gameOverTimer: number = 0;
  private winnerCharacter: CharacterState | null = null;
  private eliminationCount: number = 0;
  private eliminationOrder: string[] = [];
  private teamGameType: TeamGameType = "deathmatch";
  private controlScores = { red: 0, blue: 0 };
  private relicGems: RelicGem[] = [];
  private bossDrops: BossDrop[] = [];
  private mapCuts: MapCut[] = [];
  private relicSpawnTimer = 0;
  private relicGeneratedCount = 0;
  private relicDeathmatchPhase = false;
  private relicWinningTeam: 1 | 2 | null = null;
  private relicWinCountdown = 0;
  private readonly objectiveScoreToWin = 100;
  private readonly objectiveRespawnTime = 3;
  private readonly controlRadius = 150;
  private readonly relicGoal = 10;
  private readonly relicWinDelay = 5;
  private readonly relicSpawnInterval = 1.8;
  private readonly relicTotalSpawnLimit = 12;
  private readonly relicPickupRadius = 30;
  private readonly relicCarrierSlowPerGem = 0.025;
  private readonly relicCarrierSlowCap = 0.18;
  private readonly knockbackInertiaDuration = 0.45;
  private readonly knockbackInertiaSpeedMultiplier = 1.75;

  // 초기 발사 각도 (3초 준비시간 동안 표시)
  private initialAngles: Map<string, number> = new Map();

  // 이미지 사전 로드 캐시
  private preloadedImages: Map<string, HTMLImageElement> = new Map();

  // 이벤트 콜백
  private onUpdateHUD: (chars: CharacterState[]) => void;
  private onGameEnd: (
    winner: CharacterState | null,
    allChars: CharacterState[],
  ) => void;
  private onCountdown: (seconds: number) => void;
  private onCharacterDeath?: (
    victimId: string,
    killerId: string,
    playerCount: number,
  ) => void;
  private onLogMessage?: (msg: string, type: string) => void;

  constructor(
    canvas: HTMLCanvasElement,
    onUpdateHUD: (chars: CharacterState[]) => void,
    onGameEnd: (
      winner: CharacterState | null,
      allChars: CharacterState[],
    ) => void,
    onCountdown: (seconds: number) => void,
    onCharacterDeath?: (
      victimId: string,
      killerId: string,
      playerCount: number,
    ) => void,
    onLogMessage?: (msg: string, type: string) => void,
  ) {
    this.canvas = canvas;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Could not get Canvas 2D context");
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
      createParticle: (
        x: number,
        y: number,
        color: string,
        size?: number,
        life?: number,
      ) => {
        this.createParticle(x, y, color, size, life);
      },
      createExplosion: (
        x: number,
        y: number,
        color: string,
        count?: number,
      ) => {
        this.createExplosion(x, y, color, count);
      },
      dealDamage: (
        attacker: CharacterState,
        target: CharacterState,
        amount: number,
        customText?: string,
      ) => {
        this.dealDamage(attacker, target, amount, customText);
      },
      applyStun: (source, target, duration, isReflected = false) => {
        if (!isReflected && target.onReceiveCrowdControl?.(target, source, 'stun', duration, this.getBehaviorContext())) return false;
        if (target.isCcImmune) return false;
        target.isStunned = true;
        target.stunTimeLeft = Math.max(target.stunTimeLeft ?? 0, duration);
        source.totalCcDuration = (source.totalCcDuration ?? 0) + duration;
        target.vx = 0;
        target.vy = 0;
        return true;
      },
      applyConfusion: (
        source: CharacterState,
        target: CharacterState,
        duration: number,
        rerollInterval: number,
        isReflected = false,
      ) => {
        if (!isReflected && target.onReceiveCrowdControl?.(target, source, 'confusion', duration, this.getBehaviorContext())) return false;
        if (target.isCcImmune) return false;
        target.isConfused = true;
        target.confusedTimeLeft = duration;
        target.confusionRerollTimer = 0;
        target.confusionRerollInterval = rerollInterval;
        source.totalCcDuration = (source.totalCcDuration ?? 0) + duration;
        return true;
      },
      applyCharm: (source, target, duration, isReflected = false) => {
        if (!isReflected && target.onReceiveCrowdControl?.(target, source, 'charm', duration, this.getBehaviorContext())) return false;
        if (target.isCcImmune) return false;
        target.isCharmed = true;
        target.charmTimeLeft = Math.max(target.charmTimeLeft ?? 0, duration);
        source.totalCcDuration = (source.totalCcDuration ?? 0) + duration;
        return true;
      },
      applyDomination: (source, target, duration, isReflected = false) => {
        // 지배는 적 전용 CC다. 어떤 캐릭터 훅에서 호출해도 아군에게는 적용하지 않는다.
        if (
          source.teamId !== undefined &&
          target.teamId !== undefined &&
          source.teamId === target.teamId
        ) return false;
        if (!isReflected && target.onReceiveCrowdControl?.(target, source, 'domination', duration, this.getBehaviorContext())) return false;
        if (target.isCcImmune) return false;
        target.nayutaControlled = true;
        target.nayutaControlTimeLeft = Math.max(target.nayutaControlTimeLeft ?? 0, duration);
        source.totalCcDuration = (source.totalCcDuration ?? 0) + duration;
        return true;
      },
      addFloatingText: (
        x: number,
        y: number,
        text: string,
        color: string,
        life?: number,
      ) => {
        this.floatingTexts.push({
          x,
          y,
          text,
          color,
          life: life !== undefined ? life : 1.0,
        });
      },
      spawnBossDrop: (drop) => {
        if (this.bossDrops.length > 0) return;
        this.bossDrops.push(drop);
        this.floatingTexts.push({ x: drop.x, y: drop.y - 28, text: `${drop.icon} ${drop.name} 출현!`, color: drop.color, life: 1.5 });
      },
      spawnMapCut: (source, cut) => {
        this.mapCuts.push({ ...cut, source, timeLeft: cut.warningDuration + cut.activeDuration, hitIds: [] });
      },
      startCinematic: (request) => {
        this.activeCinematic = { ...request, timeLeft: request.duration, totalDuration: request.duration };
      },
      arenaWidth: this.canvas.width,
      arenaHeight: this.canvas.height,
      logMessage: (msg: string, type: string) => {
        this.onLogMessage?.(msg, type);
      },
    };
  }

  private isCinematicLocked() {
    return this.activeCinematic?.freezePlayers === true && this.activeCinematic.timeLeft > 0;
  }

  private updateCinematic(dt: number) {
    if (!this.activeCinematic) return;
    this.activeCinematic.timeLeft -= dt;
    if (this.activeCinematic.timeLeft <= 0) this.activeCinematic = null;
  }

  private updateKnockbackInertia(char: CharacterState, dt: number) {
    const speed = Math.hypot(char.vx, char.vy);
    const threshold = 3.5 * char.speed * this.knockbackInertiaSpeedMultiplier;
    const isAboveThreshold = speed >= threshold;
    if (isAboveThreshold && !char.wasAboveKnockbackThreshold) {
      char.knockbackInertiaLeft = this.knockbackInertiaDuration;
      this.floatingTexts.push({ x: char.x, y: char.y - 48, text: '💨 충격 관성', color: '#b7fbff', life: 0.55 });
    }
    char.wasAboveKnockbackThreshold = isAboveThreshold;
    if ((char.knockbackInertiaLeft ?? 0) > 0) {
      char.knockbackInertiaLeft = Math.max(0, (char.knockbackInertiaLeft ?? 0) - dt);
    }
  }

  private updateBossDrops() {
    for (let index = this.bossDrops.length - 1; index >= 0; index -= 1) {
      const drop = this.bossDrops[index];
      const collector = this.characters.find((char) => !char.isDead && !char.isBoss && Math.hypot(char.x - drop.x, char.y - drop.y) <= char.radius + 24);
      if (!collector) continue;
      const recipients = this.characters.filter((char) => !char.isDead && !char.isBoss);
      recipients.forEach((recipient) => {
        recipient.hp = Math.min(recipient.maxHp, recipient.hp + drop.heal);
        if (drop.damageMultiplier > 1) recipient.raidDamageMultiplier = Math.max(recipient.raidDamageMultiplier ?? 1, drop.damageMultiplier);
        if (drop.speedMultiplier > 1) recipient.raidSpeedMultiplier = Math.max(recipient.raidSpeedMultiplier ?? 1, drop.speedMultiplier);
        if (drop.duration > 0) recipient.raidBuffTimeLeft = Math.max(recipient.raidBuffTimeLeft ?? 0, drop.duration);
        if (drop.immunityDuration > 0) recipient.raidImmunityTimeLeft = Math.max(recipient.raidImmunityTimeLeft ?? 0, drop.immunityDuration);
        recipient.statusIndicators = (recipient.statusIndicators ?? []).filter((effect) => !effect.label.startsWith('레이드:'));
        if (drop.duration > 0 || drop.immunityDuration > 0) recipient.statusIndicators.push({ icon: drop.icon, label: `레이드: ${drop.name}`, timeLeft: Math.max(drop.duration, drop.immunityDuration), duration: Math.max(drop.duration, drop.immunityDuration), color: drop.color });
        this.floatingTexts.push({ x: recipient.x, y: recipient.y - 58, text: `${drop.icon} ${drop.name}!`, color: drop.color, life: 1.3 });
      });
      this.createExplosion(collector.x, collector.y, drop.color, 20);
      this.bossDrops.splice(index, 1);
    }
  }

  private updateMapCuts(dt: number) {
    this.mapCuts.forEach((cut) => {
      cut.timeLeft -= dt;
      if (cut.timeLeft > cut.activeDuration) return;
      this.characters.forEach((target) => {
        if (target.isDead || target.id === cut.source.id || cut.hitIds.includes(target.id)) return;
        if (cut.source.teamId !== undefined && target.teamId !== undefined && cut.source.teamId === target.teamId) return;
        if (!overlapsMapCut(target, cut)) return;
        cut.hitIds.push(target.id);
        this.dealDamage(cut.source, target, cut.damage, '⬛ 공간 삭제');
      });
    });
    this.mapCuts = this.mapCuts.filter((cut) => cut.timeLeft > 0);
  }

  public getTeamObjectiveState() {
    return {
      type: this.teamGameType,
      redScore: this.controlScores.red,
      blueScore: this.controlScores.blue,
      scoreToWin: this.objectiveScoreToWin,
      redRelics: this.getTeamRelicCount(1),
      blueRelics: this.getTeamRelicCount(2),
      relicGoal: this.relicGoal,
      relicWinningTeam: this.relicWinningTeam,
      relicWinCountdown: this.relicWinCountdown,
      relicDeathmatchPhase: this.relicDeathmatchPhase,
    };
  }

  private isObjectiveTeamMode(): boolean {
    return this.teamGameType === "control" || this.teamGameType === "relic";
  }

  private getTeamRelicCount(teamId: 1 | 2) {
    return this.characters
      .filter((char) => !char.isDead && char.teamId === teamId)
      .reduce((total, char) => total + (char.relicGems ?? 0), 0);
  }

  private dropRelics(char: CharacterState) {
    const count = char.relicGems ?? 0;
    if (count <= 0) return;
    for (let index = 0; index < count; index += 1) {
      const angle = (Math.PI * 2 * index) / count + Math.random() * 0.45;
      const distance = char.radius + 18 + Math.random() * 26;
      this.relicGems.push({ x: char.x + Math.cos(angle) * distance, y: char.y + Math.sin(angle) * distance });
    }
    char.relicGems = 0;
    char.relicSpeedMultiplier = 1;
    this.floatingTexts.push({ x: char.x, y: char.y - 55, text: `💎 보석 ${count}개 드롭`, color: "#c084fc", life: 1.3 });
  }

  private finishTeamObjective(winningTeam: 1 | 2) {
    this.isGameOver = true;
    this.gameOverTimer = 2;
    this.winnerCharacter =
      this.characters.find(
        (char) => char.teamId === winningTeam && !char.id.includes("clone"),
      ) || null;
  }

  private respawnObjectivePlayers(dt: number) {
    if (this.teamGameType === "relic" && this.relicDeathmatchPhase) return;
    if (!this.isObjectiveTeamMode()) return;
    this.characters.forEach((char) => {
      const state = char as CharacterState & { respawnTimeLeft?: number };
      if (!char.isDead || state.respawnTimeLeft === undefined) return;
      state.respawnTimeLeft -= dt;
      if (state.respawnTimeLeft > 0) return;
      char.isDead = false;
      char.opacity = 1;
      char.hp = char.maxHp;
      char.skillGauge = 0;
      const spawnX =
        char.teamId === 1
          ? char.radius * 3
          : this.canvas.width - char.radius * 3;
      char.x = spawnX;
      char.y =
        char.radius * 2 +
        Math.random() * (this.canvas.height - char.radius * 4);
      const travelAngle = char.teamId === 1 ? 0 : Math.PI;
      const travelSpeed = 3.5 * char.speed;
      char.vx = Math.cos(travelAngle) * travelSpeed;
      char.vy = Math.sin(travelAngle) * travelSpeed;
      state.respawnTimeLeft = undefined;
      this.floatingTexts.push({
        x: char.x,
        y: char.y - 45,
        text: "♻️ 부활!",
        color: "#ffffff",
        life: 1,
      });
    });
  }

  private updateTeamObjective(dt: number) {
    if ((this.teamGameType !== "control" && this.teamGameType !== "relic") || this.isGameOver) return;
    const players = this.characters.filter(
      (char) => !char.isDead && !char.id.includes("clone"),
    );
    if (this.teamGameType === "control") {
      const centerX = this.canvas.width / 2;
      const centerY = this.canvas.height / 2;
      const redCount = players.filter(
        (char) =>
          char.teamId === 1 &&
          Math.hypot(char.x - centerX, char.y - centerY) <= this.controlRadius,
      ).length;
      const blueCount = players.filter(
        (char) =>
          char.teamId === 2 &&
          Math.hypot(char.x - centerX, char.y - centerY) <= this.controlRadius,
      ).length;
      if (redCount > 0 && blueCount === 0)
        this.controlScores.red = Math.min(
          this.objectiveScoreToWin,
          this.controlScores.red + dt * 10,
        );
      if (redCount > 0 && blueCount === 0)
        players.filter((char) => char.teamId === 1 && Math.hypot(char.x - centerX, char.y - centerY) <= this.controlRadius)
          .forEach((char) => { char.objectiveContribution = (char.objectiveContribution ?? 0) + dt; });
      if (blueCount > 0 && redCount === 0)
        this.controlScores.blue = Math.min(
          this.objectiveScoreToWin,
          this.controlScores.blue + dt * 10,
        );
      if (blueCount > 0 && redCount === 0)
        players.filter((char) => char.teamId === 2 && Math.hypot(char.x - centerX, char.y - centerY) <= this.controlRadius)
          .forEach((char) => { char.objectiveContribution = (char.objectiveContribution ?? 0) + dt; });
      if (this.controlScores.red >= this.objectiveScoreToWin)
        this.finishTeamObjective(1);
      if (this.controlScores.blue >= this.objectiveScoreToWin)
        this.finishTeamObjective(2);
      return;
    }

    // 보석 균열 포탈은 전장 세 곳에서 보석을 주기적으로 생성한다.
    this.relicSpawnTimer -= dt;
    if (this.relicSpawnTimer <= 0 && this.relicGeneratedCount < this.relicTotalSpawnLimit) {
      const portals = [
        { x: this.canvas.width * 0.25, y: this.canvas.height * 0.3 },
        { x: this.canvas.width * 0.5, y: this.canvas.height * 0.68 },
        { x: this.canvas.width * 0.75, y: this.canvas.height * 0.3 },
      ];
      const portal = portals[Math.floor(Math.random() * portals.length)];
      this.relicGems.push({ x: portal.x, y: portal.y });
      this.relicGeneratedCount += 1;
      this.relicSpawnTimer = this.relicSpawnInterval;
      this.floatingTexts.push({ x: portal.x, y: portal.y - 28, text: "💎 보석 생성", color: "#d8b4fe", life: 1 });
      if (this.relicGeneratedCount >= this.relicTotalSpawnLimit) {
        this.relicDeathmatchPhase = true;
        this.onLogMessage?.("⚔️ [보석 쟁탈전] 보석 공급 종료! 이제 부활 없는 데스매치입니다.", "skill");
        this.floatingTexts.push({ x: this.canvas.width / 2, y: this.canvas.height / 2 - 60, text: "⚔️ 보석 공급 종료 · 데스매치!", color: "#ffcc00", life: 2 });
      }
    }

    for (let index = this.relicGems.length - 1; index >= 0; index -= 1) {
      const gem = this.relicGems[index];
      const collector = players.find((char) => Math.hypot(char.x - gem.x, char.y - gem.y) <= char.radius + this.relicPickupRadius);
      if (!collector) continue;
      collector.relicGems = (collector.relicGems ?? 0) + 1;
      collector.relicSpeedMultiplier = 1 - Math.min(
        this.relicCarrierSlowCap,
        collector.relicGems * this.relicCarrierSlowPerGem,
      );
      collector.objectiveContribution = (collector.objectiveContribution ?? 0) + 1;
      this.relicGems.splice(index, 1);
      this.floatingTexts.push({ x: collector.x, y: collector.y - 42, text: `💎 ${collector.relicGems}`, color: "#d8b4fe", life: 0.9 });
    }

    if (this.relicWinningTeam === null) {
      const winningTeam = this.getTeamRelicCount(1) >= this.relicGoal ? 1 : this.getTeamRelicCount(2) >= this.relicGoal ? 2 : null;
      if (winningTeam) {
        this.relicWinningTeam = winningTeam;
        this.relicWinCountdown = this.relicWinDelay;
        this.onLogMessage?.(`💎 [보석 쟁탈전] ${winningTeam === 1 ? "레드" : "블루"}팀이 보석 10개 확보! 5초를 지켜내면 승리합니다.`, "skill");
      }
    } else {
      if (this.getTeamRelicCount(this.relicWinningTeam) < this.relicGoal) {
        this.onLogMessage?.("💎 [보석 쟁탈전] 보석이 떨어져 승리 카운트가 취소되었습니다!", "default");
        this.relicWinningTeam = null;
        this.relicWinCountdown = 0;
      } else {
        this.relicWinCountdown -= dt;
        if (this.relicWinCountdown <= 0) this.finishTeamObjective(this.relicWinningTeam);
      }
    }
  }

  /**
   * 게임을 초기화하고 준비 단계를 시작합니다.
   */
  public init(
    selectedCharacters: CharacterState[],
    simulationSpeed: number = 1.0,
    teamGameType: TeamGameType = "deathmatch",
  ) {
    this.characters = JSON.parse(JSON.stringify(selectedCharacters)); // 딥카피로 초기 상태 보존
    this.simulationSpeed = simulationSpeed;
    this.particles = [];
    this.floatingTexts = [];
    this.activeCinematic = null;
    this.prepTimer = 3.0;
    this.isPrepared = false;
    this.isRunning = true;
    this.lastTime = performance.now();
    this.isGameOver = false;
    this.gameOverTimer = 0;
    this.winnerCharacter = null;
    this.roundTimer = 90.0;
    this.eliminationOrder = [];
    this.eliminationCount = 0;
    this.teamGameType = teamGameType;
    this.controlScores = { red: 0, blue: 0 };
    this.relicGems = [];
    this.bossDrops = [];
    this.mapCuts = [];
    this.relicSpawnTimer = 0;
    this.relicGeneratedCount = 0;
    this.relicDeathmatchPhase = false;
    this.relicWinningTeam = null;
    this.relicWinCountdown = 0;

    // 캐릭터 내부의 함수 객체(훅)들은 JSON.parse(JSON.stringify()) 과정에서 손실되므로,
    // 원본 selectedCharacters 리스트에서 함수들을 다시 찾아와 연결 복원
    this.characters.forEach((char) => {
      char.kills = 0;
      char.rank = 0;
      char.isMvp = false;
      char.mvpScore = 0;
      char.deathAnimationTime = 0;

      const orig = selectedCharacters.find((c) => c.id === char.id);
      if (orig) {
        char.onSkillTrigger = orig.onSkillTrigger;
        char.onUpdate = orig.onUpdate;
        char.onCollisionWithTarget = orig.onCollisionWithTarget;
        char.onBasicAttack = orig.onBasicAttack;
        char.onRenderExtra = orig.onRenderExtra;

        // Restore new lifecycle hooks
        char.onTakeDamage = orig.onTakeDamage;
        char.onDealDamage = orig.onDealDamage;
        char.onReceiveCrowdControl = orig.onReceiveCrowdControl;
        char.onDeath = orig.onDeath;
        char.onPreRender = orig.onPreRender;
        char.onRenderBackground = orig.onRenderBackground;
        char.onRenderOverlay = orig.onRenderOverlay;
        char.isTargetable = orig.isTargetable;
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

    const isBossGame = this.characters.some((char) => char.isBoss && !char.id.includes("clone"));
    if (isBossGame) {
      // 보스전은 카운트다운 대신 보스 전용 첫 등장 시네마틱으로 시작한다.
      this.prepTimer = 0;
      this.isPrepared = true;
      const challengers = this.characters.filter((char) => !char.isBoss && !char.id.includes("clone"));
      if (challengers.length === 4) {
        // 맵 모서리가 아닌 중앙 전투 구역의 네 꼭짓점에 4명의 도전자를 배치한다.
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        const offsetX = this.canvas.width * 0.19;
        const offsetY = this.canvas.height * 0.2;
        const vertices = [
          { x: centerX - offsetX, y: centerY - offsetY },
          { x: centerX + offsetX, y: centerY - offsetY },
          { x: centerX - offsetX, y: centerY + offsetY },
          { x: centerX + offsetX, y: centerY + offsetY },
        ];
        challengers.forEach((char, index) => {
          char.x = vertices[index].x;
          char.y = vertices[index].y;
        });
      }
      this.characters.forEach((char) => {
        const angle = this.initialAngles.get(char.id) || 0;
        const initialSpeed = 3.5 * char.speed;
        char.vx = Math.cos(angle) * initialSpeed;
        char.vy = Math.sin(angle) * initialSpeed;
      });
      this.onCountdown(0);
    } else {
      this.onCountdown(3);
    }
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

    this.respawnObjectivePlayers(dt);
    this.updateCinematic(dt);

    // 사망 캐릭터 데스 애니메이션 타임 업데이트
    this.characters.forEach((char) => {
      if (char.isDead && char.deathAnimationTime > 0) {
        char.deathAnimationTime -= dt;
        if (char.deathAnimationTime < 0) {
          char.deathAnimationTime = 0;
        }
        // 사망 궤적 이펙트 파티클
        if (Math.random() < 0.15) {
          this.createParticle(
            char.x + (Math.random() - 0.5) * char.radius,
            char.y + (Math.random() - 0.5) * char.radius,
            char.color,
            2,
            10,
          );
        }
      }
    });

    // 2. 캐릭터 상태 및 위치 업데이트
    const aliveCharacters = this.characters.filter((c) => !c.isDead);
    // 분신(eunsu_clone)은 플레이어가 아니므로 승리 조건 판정에서 제외
    const aliveRealPlayers = aliveCharacters.filter(
      (c) => !c.id.includes("eunsu_clone"),
    );

    // 보스전은 제한시간 없이 보스 또는 도전자의 전멸까지 진행한다.
    const isPractice = this.characters.some((c) => c.id === "dummy");
    const isBossGame = this.characters.some(
      (c) => c.isBoss && !c.id.includes("clone"),
    );

    if (this.isPrepared && !this.isGameOver && !isPractice && !isBossGame && !this.isObjectiveTeamMode()) {
      this.roundTimer -= dt;
      if (this.roundTimer <= 0) {
        this.roundTimer = 0;
        this.isGameOver = true;
        this.gameOverTimer = 2.0;

        if (this.teamGameType === "control") {
          const winningTeam =
            this.controlScores.red === this.controlScores.blue
              ? null
              : this.controlScores.red > this.controlScores.blue
                ? 1
                : 2;
          this.winnerCharacter = winningTeam
            ? this.characters.find((char) => char.teamId === winningTeam) ||
              null
            : null;
        } else if (this.teamGameType === "relic") {
          const redRelics = this.getTeamRelicCount(1);
          const blueRelics = this.getTeamRelicCount(2);
          const winningTeam = redRelics === blueRelics ? null : redRelics > blueRelics ? 1 : 2;
          this.winnerCharacter = winningTeam ? this.characters.find((char) => char.teamId === winningTeam) || null : null;
        } else {
          // 판정: 체력 낮은 캐릭터 사망
          const sortedAlive = [...aliveRealPlayers].sort((a, b) => b.hp - a.hp);
          if (sortedAlive.length > 0) {
            const topHp = sortedAlive[0].hp;
            const topPlayers = sortedAlive.filter((p) => p.hp === topHp);

            if (topPlayers.length === 1) {
              this.winnerCharacter = topPlayers[0];
              this.onLogMessage?.(
                `⏱️ [시간초과] 체력이 가장 많은 ${this.winnerCharacter.name}(HP: ${this.winnerCharacter.hp})이 승리하였습니다!`,
                "skill",
              );
            } else {
              this.winnerCharacter = null;
              const names = topPlayers.map((p) => p.name).join(", ");
              this.onLogMessage?.(
                `⏱️ [시간초과] 체력이 동일한 캐릭터들(${names}, HP: ${topHp})로 인해 무승부 처리되었습니다!`,
                "default",
              );
            }

            // 우승자(만약 있다면)를 제외한 모든 플레이어를 처치 처리하여 eliminationOrder에 등록
            aliveRealPlayers.forEach((char) => {
              if (char !== this.winnerCharacter) {
                char.hp = 0;
                char.isDead = true;
                char.opacity = 0.8;
                char.deathAnimationTime = 1.5;
                if (!this.eliminationOrder.includes(char.id)) {
                  this.eliminationOrder.push(char.id);
                }
              }
            });
          } else {
            this.winnerCharacter = null;
            this.onLogMessage?.(
              `⏱️ [시간초과] 생존자가 없어 무승부 처리되었습니다!`,
              "default",
            );
          }
        }
      }
    }

    // 승리 조건 검사 (데스 애니메이션을 위해 2초 지연 적용)
    if (!this.isGameOver) {
      const isBossGame = this.characters.some(
        (p) => p.isBoss && !p.id.includes("clone"),
      );
      const isTeamGame = this.characters.some(
        (p) => p.teamId !== undefined && !p.id.includes("clone"),
      );

      if (isBossGame) {
        const bossAlive = aliveRealPlayers.some((p) => p.isBoss);
        const challengersAlive = aliveRealPlayers.some((p) => !p.isBoss);

        if (!bossAlive || !challengersAlive) {
          this.isGameOver = true;
          this.gameOverTimer = 2.0;

          if (!bossAlive && challengersAlive) {
            this.winnerCharacter =
              aliveRealPlayers.find((p) => !p.isBoss) || null;
            this.onLogMessage?.(
              `👑 [보스 레이드 성공] 도전자들이 보스를 처치하였습니다!`,
              "skill",
            );
          } else if (bossAlive && !challengersAlive) {
            this.winnerCharacter =
              aliveRealPlayers.find((p) => p.isBoss) || null;
            this.onLogMessage?.(
              `👑 [보스 레이드 방어 성공] 보스가 모든 도전자를 전멸시켰습니다!`,
              "skill",
            );
          } else {
            this.winnerCharacter = null;
            this.onLogMessage?.(
              `⚔️ [보스 레이드 종료] 동시 처치로 무승부 처리되었습니다!`,
              "default",
            );
          }
        }
      } else if (isTeamGame && (!this.isObjectiveTeamMode() || this.relicDeathmatchPhase)) {
        const redTeamAlive = aliveRealPlayers.some((p) => p.teamId === 1);
        const blueTeamAlive = aliveRealPlayers.some((p) => p.teamId === 2);

        if (!redTeamAlive || !blueTeamAlive) {
          this.isGameOver = true;
          this.gameOverTimer = 2.0;

          if (redTeamAlive && !blueTeamAlive) {
            this.winnerCharacter =
              aliveRealPlayers.find((p) => p.teamId === 1) || null;
            this.onLogMessage?.(
              `🔴 [팀전 종료] 레드팀(RED)이 블루팀을 전멸시키고 승리하였습니다!`,
              "skill",
            );
          } else if (blueTeamAlive && !redTeamAlive) {
            this.winnerCharacter =
              aliveRealPlayers.find((p) => p.teamId === 2) || null;
            this.onLogMessage?.(
              `🔵 [팀전 종료] 블루팀(BLUE)이 레드팀을 전멸시키고 승리하였습니다!`,
              "skill",
            );
          } else {
            this.winnerCharacter = null;
            this.onLogMessage?.(
              `⚔️ [팀전 종료] 양 팀 동시 전멸로 무승부 처리되었습니다!`,
              "default",
            );
          }
        }
      } else if (!isTeamGame) {
        if (aliveRealPlayers.length <= 1) {
          this.isGameOver = true;
          this.gameOverTimer = 2.0; // 2초간 슬로우 모션 및 데스 애니메이션 연출
          this.winnerCharacter = aliveRealPlayers[0] || null;

          if (!this.winnerCharacter) {
            this.onLogMessage?.(
              `⚔️ [전투 종료] 양측 동시 사망으로 인해 무승부(러브샷) 처리되었습니다!`,
              "default",
            );
          }
        }
      }
    } else {
      this.gameOverTimer -= dt;
      this.simulationSpeed = 0.3; // 슬로우 모션
      if (this.gameOverTimer <= 0) {
        this.stop();

        const realChars = this.characters.filter(
          (c) => !c.id.includes("eunsu_clone") && c.id !== "dummy",
        );

        // 결과 계산은 렌더링·루프와 분리된 순수 모듈에서 수행한다.
        const { mvp: mvpChar } = finalizeMatchResults(realChars, this.eliminationOrder);

        // 전투력 분석 리포트 출력 (순위, MVP, 가한 대미지, 킬수 등)
        console.log(`\n🏆🏆🏆 [전투 종료 결산 리포트] 🏆🏆🏆`);
        if (mvpChar) {
          console.log(
            `🎖️ MATCH MVP: ${mvpChar.name} (MVP 점수: ${Math.round(mvpChar.mvpScore)})`,
          );
        }
        if (this.winnerCharacter) {
          console.log(`👑 최종 우승자: ${this.winnerCharacter.name}`);
        } else {
          console.log(`💀 무승부 (생존자 없음)`);
        }
        console.log(`-----------------------------------------`);
        console.log(`📊 캐릭터별 최종 순위 및 통계 (전투력 분석):`);
        const stats = realChars
          .map((c) => ({
            순위: `${c.rank}위`,
            이름: c.name,
            상태: c.isDead ? "💀 탈락" : "👑 생존",
            처치수: `${c.kills}킬`,
            "가한 대미지": c.totalDamageDealt || 0,
            "피격 대미지": c.totalDamageTaken || 0,
            "최대 체력": c.maxHp,
            "MVP 점수": Math.round(c.mvpScore),
            "MVP 여부": c.isMvp ? "🎖️ MVP" : "",
          }))
          .sort((a, b) => parseInt(a.순위) - parseInt(b.순위));
        console.table(stats);
        console.log(`=========================================\n`);

        this.onGameEnd(this.winnerCharacter, this.characters);
        return;
      }
    }

    this.updateTeamObjective(dt);
    this.updateBossDrops();
    this.updateMapCuts(dt);

    const context = this.getBehaviorContext();

    aliveCharacters.forEach((char) => {
      // 보스 시네마틱 중 도전자는 스킬·이동·공격을 모두 멈춘다.
      if (this.isCinematicLocked() && !char.isBoss) {
        return;
      }
      if ((char.raidBuffTimeLeft ?? 0) > 0) {
        char.raidBuffTimeLeft! -= dt;
        char.statusIndicators = (char.statusIndicators ?? []).filter((effect) => !effect.label.startsWith('레이드:'));
        if (char.raidBuffTimeLeft! > 0) {
          char.statusIndicators.push({ icon: '✦', label: '레이드 강화', timeLeft: char.raidBuffTimeLeft!, duration: 8, color: '#67e8f9' });
        } else {
          char.raidDamageMultiplier = 1;
          char.raidSpeedMultiplier = 1;
        }
      }
      if ((char.raidImmunityTimeLeft ?? 0) > 0) {
        char.raidImmunityTimeLeft! -= dt;
        char.statusIndicators = (char.statusIndicators ?? []).filter((effect) => effect.label !== '레이드: 시간 보호막');
        if (char.raidImmunityTimeLeft! > 0) char.statusIndicators.push({ icon: '🛡', label: '레이드: 시간 보호막', timeLeft: char.raidImmunityTimeLeft!, duration: 3, color: '#67e8f9' });
      }
      // 2-A. 캐릭터 고유 업데이트 로직 실행 (지호의 코딩 틱, 도윤의 덩크 틱 등)
      char.onUpdate?.(char, dt, context);
      if (isBossGame && !char.isBoss) char.bossSurvivalTime = (char.bossSurvivalTime ?? 0) + dt;
      this.updateKnockbackInertia(char, dt);

      if (char.isConfused) {
        char.confusedTimeLeft = (char.confusedTimeLeft ?? 0) - dt;
        char.confusionRerollTimer = (char.confusionRerollTimer ?? 0) - dt;
        if (char.confusedTimeLeft <= 0) {
          char.isConfused = false;
          char.confusedTimeLeft = 0;
        } else if (char.confusionRerollTimer <= 0) {
          const angle = Math.random() * Math.PI * 2;
          const speed = 3.5 * char.speed;
          char.vx = Math.cos(angle) * speed;
          char.vy = Math.sin(angle) * speed;
          char.confusionRerollTimer = char.confusionRerollInterval ?? 0;
        }
      }

      if (char.isCharmed && (char.charmTimeLeft ?? 0) > 0) {
        char.charmTimeLeft = Math.max(0, (char.charmTimeLeft ?? 0) - dt);
        if (char.charmTimeLeft <= 0) char.isCharmed = false;
      }

      // 2-C. 기절 지속 시간 차감 및 속도 복원 (신규 캐릭터 포함 공통 엔진화)
      if (
        char.isStunned &&
        char.stunTimeLeft !== undefined &&
        char.stunTimeLeft > 0
      ) {
        char.stunTimeLeft -= dt;
        // 기절은 공격만 막는 상태가 아니라 완전한 이동 정지다.
        // 캐릭터 고유 업데이트가 속도를 다시 넣어도 공통 엔진에서 매 프레임 제거한다.
        char.vx = 0;
        char.vy = 0;
        if (char.stunTimeLeft <= 0) {
          char.isStunned = false;
          char.stunTimeLeft = 0;

          // 기절 해제 즉시 속도 복구 및 비행 시작
          const randomAngle = Math.random() * Math.PI * 2;
          const baseSpeed = 3.5 * char.speed;
          char.vx = Math.cos(randomAngle) * baseSpeed;
          char.vy = Math.sin(randomAngle) * baseSpeed;

          const isUnhee = char.id === "unhee";
          this.floatingTexts.push({
            x: char.x,
            y: char.y - 45,
            text: isUnhee ? "🏋️ 기절 해제 (운동 끝)" : "🧼 기절 해제!",
            color: isUnhee ? "#ff9900" : "#00ffcc",
            life: 1.2,
          });
          console.log(
            `🧼 [기절 해제] ${char.name}의 기절이 만료되어 비행을 재개합니다.`,
          );
        }
      }

      // 2-B. 타이핑 정지 상태 체크하여 물리 연산 건너뛰기 (기절 중에는 물리 비행 이동은 허용하되 공격/스킬만 차단)
      if (char.isTyping) {
        return; // 코딩 정지 중에는 이동/공격 불가
      }

      // 위치 업데이트
      const moveMultiplier = (char.relicSpeedMultiplier ?? 1) * (char.raidSpeedMultiplier ?? 1);
      char.x += char.vx * dt * 60 * moveMultiplier; // 60fps 기준 속도 조절
      char.y += char.vy * dt * 60 * moveMultiplier;

      // 벽 충돌 체크
      checkWallCollision(char, this.canvas.width, this.canvas.height);

      // 게임 종료 연출 중에는 공격 및 게이지 획득 중단
      if (this.isGameOver) return;

      // Cooldowns
      if (char.baseAttackCooldown > 0) {
        char.baseAttackCooldown -= dt;
      }

      // 스킬 게이지 충전 및 100% 도달 시 즉시 발동 검사 (기절 중에는 게이지 충전 불가, 지배당한 적도 충전 불가)
      const ccBlocksSkill = (char.isStunned || char.isConfused) && !char.canUseSkillWhileCc;
      if (!char.skillActive && !ccBlocksSkill && !char.nayutaControlled) {
        let canCharge = true;
        if (char.id === "nayuta") {
          const hasControlled = this.characters.some(
            (c) => !c.isDead && c.nayutaControlled,
          );
          if (!hasControlled) {
            canCharge = false;
            char.skillGauge = 0; // 지배전에는 게이지 0 고정
          }
        }

        if (canCharge && char.skillGauge < 100) {
          const rateMultiplier =
            char.cooldownMultiplier !== undefined
              ? 1.0 / char.cooldownMultiplier
              : 1.0;
          char.skillGauge += char.skillChargeRate * rateMultiplier * dt;
        }
        if (char.skillGauge >= 100) {
          char.skillGauge = 100;
          this.triggerSkill(char);
        }
      }

      // 운희(unhee), 세연(seyeon) 스킬 게이지 충전 상태 1초 주기 콘솔 로그 출력
      if (char.id === "unhee" || char.id === "seyeon") {
        const now = Date.now();
        if (char.lastGaugeLogTime === undefined) {
          char.lastGaugeLogTime = 0;
        }
        if (now - char.lastGaugeLogTime >= 1000) {
          char.lastGaugeLogTime = now;
          const isCharging =
            !char.skillActive && !char.isStunned && !char.nayutaControlled;
          console.log(
            `⏱️ [충전 로그] ${char.name} | 게이지: ${char.skillGauge.toFixed(1)}/100 | 충전여부: ${isCharging ? "🟢 충전중" : "🔴 정지"} (skillActive: ${char.skillActive}, isStunned: ${char.isStunned}, nayutaControlled: ${!!char.nayutaControlled})`,
          );
        }
      }

      // 기본 공격 사거리 내 적 감지 및 자동 공격 (기절 중에는 공격 불가)
      if (char.baseAttackCooldown <= 0 && !char.isStunned && !char.isConfused) {
        let closestEnemy: CharacterState | null = null;
        let minDist = Infinity;

        aliveCharacters.forEach((enemy) => {
          if (enemy.id === char.id) return;
          if (enemy.isTargetable && !enemy.isTargetable(enemy)) return; // hook-based targetable check (e.g. Su invisibility)
          if (char.isCharmed && enemy.id === "seyeon") return; // 매혹 중에는 세연 공격 타겟 제외

          // 팀전 아군 및 보스전 도전자 아군은 공격 대상에서 제외 (타겟팅 차단)
          if (
            char.teamId !== undefined &&
            enemy.teamId !== undefined &&
            char.teamId === enemy.teamId
          ) {
            return;
          }

          // 은수 본체와 분신 관계 간의 아군 판정 (상호 타격 타겟 제외)
          if (
            (char.id === "eunsu" && enemy.id.includes("eunsu_clone")) ||
            (char.id.includes("eunsu_clone") && enemy.id === "eunsu") ||
            (char.id.includes("eunsu_clone") &&
              enemy.id.includes("eunsu_clone"))
          ) {
            return;
          }

          const dist = Math.hypot(enemy.x - char.x, enemy.y - char.y);
          if (dist < minDist) {
            minDist = dist;
            closestEnemy = enemy;
          }
        });

        if (
          closestEnemy &&
          minDist <=
            char.baseAttackRange + (closestEnemy as CharacterState).radius
        ) {
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
          this.createExplosion(midX, midY, "#ffffff", 5);

          // 충돌 시 양측 스킬 게이지 충전 보너스 (+5, 보스는 배율 적용)
          if (
            !c1.skillActive &&
            (!c1.isStunned || c1.canUseSkillWhileCc) &&
            !c1.isTyping &&
            !c1.nayutaControlled
          ) {
            const mult =
              c1.cooldownMultiplier !== undefined
                ? 1.0 / c1.cooldownMultiplier
                : 1.0;
            c1.skillGauge = Math.min(100, c1.skillGauge + 5 * mult);
          }
          if (
            !c2.skillActive &&
            (!c2.isStunned || c2.canUseSkillWhileCc) &&
            !c2.isTyping &&
            !c2.nayutaControlled
          ) {
            const mult =
              c2.cooldownMultiplier !== undefined
                ? 1.0 / c2.cooldownMultiplier
                : 1.0;
            c2.skillGauge = Math.min(100, c2.skillGauge + 5 * mult);
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
        maxLife: 30,
      });
    }

    if (!attacker.skillActive && !attacker.nayutaControlled) {
      attacker.skillGauge = Math.min(100, attacker.skillGauge + 10);
    }
  }

  /**
   * 데미지 일괄 계산 및 적용
   */
  private dealDamage(
    attacker: CharacterState,
    target: CharacterState,
    amount: number,
    customText?: string,
  ) {
    if (target.isDead) return;
    if ((target.raidImmunityTimeLeft ?? 0) > 0) return;

    // 팀전 아군 피해 면역 및 보스전 도전자 간 피해 면역 (팀 킬 방지)
    if (
      attacker.teamId !== undefined &&
      target.teamId !== undefined &&
      attacker.teamId === target.teamId
    ) {
      return;
    }

    // 은수 본체와 분신 간 상호 피해 무시 (분신 시스템 아군 판정이므로 엔진 레벨 유지)
    if (
      (attacker.id === "eunsu" && target.id.includes("eunsu_clone")) ||
      (attacker.id.includes("eunsu_clone") && target.id === "eunsu") ||
      (attacker.id.includes("eunsu_clone") && target.id.includes("eunsu_clone"))
    ) {
      return;
    }

    let finalDamage = amount;

    // 공격자가 보스이거나 대미지 배율이 설정되어 있을 경우 보정 적용 (2배 대미지)
    if (attacker && attacker.damageMultiplier !== undefined) {
      finalDamage *= attacker.damageMultiplier;
    }
    finalDamage *= attacker.raidDamageMultiplier ?? 1;

    const context = this.getBehaviorContext();

    // 1. Invoke outgoing damage modifier hook (e.g. Jiho's 2.2x damage buff)
    if (attacker.onDealDamage) {
      finalDamage = attacker.onDealDamage(
        attacker,
        target,
        finalDamage,
        context,
      );
    }

    // 2. Invoke incoming damage protection & passive hook (e.g. Juju emergency swap, Su invisible immune, Seyeon charm immunity, Doyun shield, Chanhwi/Unhee dmg reduction)
    if (target.onTakeDamage) {
      const result = target.onTakeDamage(
        target,
        attacker,
        finalDamage,
        context,
      );
      finalDamage = result.finalDamage;
      if (result.blocked) {
        return; // Damage fully blocked or processed by passive Swaps
      }
    }

    // 가한 피해량/받은 피해량 누적 (즉사 대미지 등으로 인한 전적 인플레이션 방지를 위해 대상의 남은 체력 한도로 제한)
    const statDamage = Math.min(finalDamage, Math.max(0, target.hp));

    let dmgAttacker = attacker;
    if (attacker && attacker.id.includes("eunsu_clone")) {
      const mainEunsu = this.characters.find((c) => c.id === "eunsu");
      if (mainEunsu) dmgAttacker = mainEunsu;
    }
    if (dmgAttacker && dmgAttacker.totalDamageDealt !== undefined) {
      dmgAttacker.totalDamageDealt += statDamage;
    }
    if (customText === '🪞 허식 반사') {
      attacker.reflectedDamage = (attacker.reflectedDamage ?? 0) + statDamage;
    }
    if (target && target.totalDamageTaken !== undefined) {
      target.totalDamageTaken += statDamage;
    }

    target.hp -= finalDamage;

    // 상세 전투 로그 콘솔 출력
    if (customText) {
      console.log(
        `🔥 [스킬 피해] ${attacker.name} ➡️ ${target.name} | 피해량: ${finalDamage} (${customText}) | 대상 HP: ${target.hp}/${target.maxHp}`,
      );
    } else {
      console.log(
        `⚔️ [기본 공격] ${attacker.name} ➡️ ${target.name} | 피해량: ${finalDamage} | 대상 HP: ${target.hp}/${target.maxHp}`,
      );
    }
    this.onLogMessage?.(
      `⚔️ [${customText || "기본공격"}] ${attacker.name} ➡️ ${target.name} | ${finalDamage} 피해 (HP: ${target.hp}/${target.maxHp})`,
      "damage",
    );

    this.floatingTexts.push({
      x: target.x + (Math.random() - 0.5) * 20,
      y: target.y - 20,
      text: customText ? `${customText} -${finalDamage}` : `-${finalDamage}`,
      color: customText ? "#ffcc00" : "#ff3366",
      life: 1.0,
    });

    const angle = Math.atan2(target.y - attacker.y, target.x - attacker.x);
    target.vx += Math.cos(angle) * 1.5;
    target.vy += Math.sin(angle) * 1.5;
    limitMinSpeed(target);

    if (target.hp <= 0) {
      target.hp = 0;
      target.isDead = true;
      if (this.teamGameType === "relic") this.dropRelics(target);
      target.opacity = 0.8;
      if (
        this.isObjectiveTeamMode() &&
        target.teamId !== undefined &&
        !target.id.includes("clone")
      ) {
        (
          target as CharacterState & { respawnTimeLeft?: number }
        ).respawnTimeLeft = this.objectiveRespawnTime;
      }
      target.deathAnimationTime = 1.5; // 1.5초 데스 애니메이션 타이머

      this.eliminationCount++;
      const totalRealCount = this.characters.filter(
        (c) => !c.id.includes("eunsu_clone") && c.id !== "dummy",
      ).length;

      // 실물 캐릭터인 경우 탈락 순서 및 처치 기록 누적
      if (!target.id.includes("eunsu_clone") && target.id !== "dummy") {
        if (!this.eliminationOrder.includes(target.id)) {
          this.eliminationOrder.push(target.id);
        }

        if (attacker && attacker.id !== target.id) {
          let killAttacker = attacker;
          if (attacker.id.includes("eunsu_clone")) {
            const mainEunsu = this.characters.find((c) => c.id === "eunsu");
            if (mainEunsu) killAttacker = mainEunsu;
          }
          killAttacker.kills += 1;
        }
      }

      const currentRank = totalRealCount - this.eliminationOrder.length + 1;

      console.log(
        `💀 [탈락] #${currentRank}위 탈락: ${target.name} | 처치자: ${attacker.name} (탈락 누적: ${this.eliminationCount}/${this.characters.length})`,
      );
      this.onLogMessage?.(
        `💀 [탈락] #${currentRank}위: ${target.name} (처치자: ${attacker.name})`,
        "death",
      );

      if (attacker && attacker.id !== target.id) {
        this.onCharacterDeath?.(target.id, attacker.id, this.characters.length);
      }

      // Trigger character-specific death hook (e.g. Chanik slow release, Nayuta domination release, Eunsu clone destruction)
      target.onDeath?.(target, attacker, context);

      this.createExplosion(target.x, target.y, "#ffffff", 40);
      this.createExplosion(target.x, target.y, target.color, 30);
      this.floatingTexts.push({
        x: target.x,
        y: target.y - 10,
        text: "ELIMINATED",
        color: "#ff0000",
        life: 1.5,
      });
    }
  }

  /**
   * 고유 스킬 발동
   */
  private triggerSkill(char: CharacterState) {
    char.skillGauge = 0;
    char.skillActive = true;
    console.log(
      `✨ [스킬 발동] ${char.name} -> 스킬 [${char.skillName}] 활성화!`,
    );

    this.floatingTexts.push({
      x: char.x,
      y: char.y - 45,
      text: `✨ ${char.skillName}!`,
      color: "#ffd700",
      life: 1.5,
    });

    this.createExplosion(char.x, char.y, char.color, 15);
    this.onLogMessage?.(
      `✨ [스킬 발동] ${char.name} ➡️ [${char.skillName}] 시전!`,
      "skill",
    );

    // 행동 전용 훅 위임 호출
    const context = this.getBehaviorContext();
    char.onSkillTrigger?.(char, context);
  }

  /* ==================== 이펙트 도우미 메서드 ==================== */
  private createParticle(
    x: number,
    y: number,
    color: string,
    size: number = 4,
    life: number = 20,
  ) {
    this.particles.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 2,
      vy: (Math.random() - 0.5) * 2,
      color,
      size,
      life,
      maxLife: life,
    });
  }

  private createExplosion(
    x: number,
    y: number,
    color: string,
    count: number = 10,
  ) {
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
        maxLife: 35,
      });
    }
  }

  private renderStatusEffects(char: CharacterState, currentRadius: number) {
    const timed = (icon: string, label: string, timeLeft: number | undefined, color: string): CharacterStatusEffect => ({
      icon, label, timeLeft: Math.max(0, timeLeft ?? 0), duration: Math.max(1, timeLeft ?? 1), color,
    });
    const effects: CharacterStatusEffect[] = [
      ...(char.isStunned ? [timed('💫', '기절', char.stunTimeLeft, '#facc15')] : []),
      ...(char.isConfused ? [timed('🌀', '혼란', char.confusedTimeLeft, '#fb7185')] : []),
      ...(char.nayutaControlled ? [timed('⛓', '지배', char.nayutaControlTimeLeft, '#ef4444')] : []),
      ...(char.isPoisoned ? [timed('☠', '독', char.poisonTimeLeft, '#84cc16')] : []),
      ...(char.isImmune || char.isSuInvisible ? [timed('🛡', '무적', char.immuneTimeLeft, '#67e8f9')] : []),
      ...(char.statusIndicators ?? []),
      ...(char.getStatusEffects?.(char) ?? []),
    ].slice(0, 3);
    if (effects.length === 0) return;

    const width = Math.max(82, currentRadius * 2.7);
    const height = 23;
    const baseY = char.y - currentRadius - 35 - effects.length * (height + 5);
    this.ctx.save();
    this.ctx.textAlign = 'left';
    this.ctx.textBaseline = 'middle';
    effects.forEach((effect, index) => {
      const y = baseY + index * (height + 5);
      this.ctx.fillStyle = 'rgba(5, 5, 16, 0.94)';
      this.ctx.fillRect(char.x - width / 2, y, width, height);
      this.ctx.fillStyle = effect.color;
      this.ctx.fillRect(char.x - width / 2, y + height - 5, width * Math.max(0, Math.min(1, effect.timeLeft / Math.max(effect.duration, 0.01))), 5);
      this.ctx.strokeStyle = `${effect.color}aa`;
      this.ctx.lineWidth = 2;
      this.ctx.strokeRect(char.x - width / 2, y, width, height);
      this.ctx.fillStyle = '#fff';
      this.ctx.font = 'bold 12px Orbit';
      this.ctx.fillText(`${effect.icon} ${effect.label}`, char.x - width / 2 + 6, y + 9);
      this.ctx.textAlign = 'right';
      this.ctx.fillText(`${Math.max(0, effect.timeLeft).toFixed(1)}s`, char.x + width / 2 - 6, y + 9);
      this.ctx.textAlign = 'left';
    });
    this.ctx.restore();
  }

  private render() {
    this.ctx.save();

    // Screen shake, screen darkening, subtitles are now handled via onRenderOverlay hooks on characters.

    this.ctx.fillStyle = "#06060c";
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    this.characters.forEach((char) => {
      char.onRenderBackground?.(char, this.ctx, this.canvas.width, this.canvas.height);
    });

    this.ctx.strokeStyle = "rgba(255, 255, 255, 0.02)";
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

    this.ctx.strokeStyle = "rgba(127, 0, 255, 0.2)";
    this.ctx.lineWidth = 6;
    this.ctx.strokeRect(0, 0, this.canvas.width, this.canvas.height);

    this.mapCuts.forEach((cut) => {
      const active = cut.timeLeft <= cut.activeDuration;
      this.ctx.save();
      const centerX = cut.x + cut.width / 2;
      const centerY = cut.y + cut.height / 2;
      const halfHeight = cut.height / 2;
      this.ctx.translate(centerX, centerY);
      this.ctx.rotate(cut.angle ?? 0);
      this.ctx.beginPath();
      traceTornEdge(this.ctx, cut, -halfHeight);
      traceTornEdge(this.ctx, cut, halfHeight, true);
      this.ctx.closePath();
      this.ctx.fillStyle = active ? 'rgba(0,0,0,0.96)' : 'rgba(244,114,182,0.13)';
      this.ctx.fill();

      this.ctx.shadowColor = active ? '#c084fc' : '#f0abfc';
      this.ctx.shadowBlur = active ? 24 : 12;
      this.ctx.strokeStyle = active ? '#f5d0fe' : '#f0abfc';
      this.ctx.lineWidth = active ? 7 : 3;
      this.ctx.setLineDash(active ? [] : [16, 9]);
      this.ctx.beginPath();
      traceTornEdge(this.ctx, cut, -halfHeight);
      this.ctx.stroke();
      this.ctx.beginPath();
      traceTornEdge(this.ctx, cut, halfHeight);
      this.ctx.stroke();
      this.ctx.setLineDash([]);

      if (active) {
        this.ctx.fillStyle = 'rgba(196,181,253,0.26)';
        this.ctx.fillRect(-cut.width / 2, -halfHeight - 14, cut.width, 10);
        this.ctx.fillStyle = 'rgba(91,33,182,0.5)';
        this.ctx.fillRect(-cut.width / 2, halfHeight + 4, cut.width, 10);
      } else {
        this.ctx.shadowBlur = 0;
        this.ctx.fillStyle = '#f5d0fe';
        this.ctx.font = 'bold 15px Orbit';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(`✂ 전장 절단 ${(cut.timeLeft - cut.activeDuration).toFixed(1)}s`, 0, 5);
      }
      this.ctx.restore();
    });

    if (this.teamGameType === "control") {
      const centerX = this.canvas.width / 2;
      const centerY = this.canvas.height / 2;
      this.ctx.save();
      this.ctx.fillStyle = "rgba(255, 215, 0, 0.12)";
      this.ctx.strokeStyle = "#ffd700";
      this.ctx.lineWidth = 4;
      this.ctx.setLineDash([10, 8]);
      this.ctx.lineDashOffset = -performance.now() / 35;
      this.ctx.beginPath();
      this.ctx.arc(centerX, centerY, this.controlRadius, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.stroke();
      this.ctx.setLineDash([]);
      const clockAngle =
        -Math.PI / 2 + (performance.now() / 1000) * (Math.PI / 3);
      this.ctx.strokeStyle = "rgba(255, 215, 0, 0.72)";
      this.ctx.lineWidth = 3;
      this.ctx.beginPath();
      this.ctx.moveTo(centerX, centerY);
      this.ctx.lineTo(
        centerX + Math.cos(clockAngle) * (this.controlRadius - 24),
        centerY + Math.sin(clockAngle) * (this.controlRadius - 24),
      );
      this.ctx.stroke();
      this.ctx.beginPath();
      this.ctx.arc(centerX, centerY, 9, 0, Math.PI * 2);
      this.ctx.fillStyle = "#ffd700";
      this.ctx.fill();
      this.ctx.fillStyle = "#ffd700";
      this.ctx.font = "bold 18px Orbit";
      this.ctx.textAlign = "center";
      this.ctx.fillText("CAPTURE", centerX, centerY + 40);
      this.ctx.restore();
    }
    if (this.teamGameType === "relic") {
      this.ctx.save();
      const portals = [
        { x: this.canvas.width * 0.25, y: this.canvas.height * 0.3 },
        { x: this.canvas.width * 0.5, y: this.canvas.height * 0.68 },
        { x: this.canvas.width * 0.75, y: this.canvas.height * 0.3 },
      ];
      portals.forEach((portal) => {
        this.ctx.strokeStyle = "rgba(192,132,252,0.65)";
        this.ctx.lineWidth = 4;
        this.ctx.beginPath();
        this.ctx.arc(portal.x, portal.y, 28 + Math.sin(performance.now() / 260) * 4, 0, Math.PI * 2);
        this.ctx.stroke();
        this.ctx.fillStyle = "rgba(139,92,246,0.14)";
        this.ctx.fill();
      });
      this.relicGems.forEach((gem) => {
        this.ctx.fillStyle = "#d8b4fe";
        this.ctx.shadowBlur = 14;
        this.ctx.shadowColor = "#a855f7";
        this.ctx.beginPath();
        this.ctx.arc(gem.x, gem.y, 10, 0, Math.PI * 2);
        this.ctx.fill();
      });
      this.ctx.shadowBlur = 0;
      this.ctx.restore();
    }

    this.bossDrops.forEach((drop) => {
      const pulse = 0.85 + Math.sin(performance.now() / 110) * 0.15;
      this.ctx.save();
      this.ctx.shadowBlur = 18; this.ctx.shadowColor = drop.color;
      this.ctx.fillStyle = `${drop.color}44`; this.ctx.beginPath(); this.ctx.arc(drop.x, drop.y, 24 * pulse, 0, Math.PI * 2); this.ctx.fill();
      this.ctx.strokeStyle = drop.color; this.ctx.lineWidth = 3; this.ctx.beginPath(); this.ctx.arc(drop.x, drop.y, 20, 0, Math.PI * 2); this.ctx.stroke();
      this.ctx.shadowBlur = 0; this.ctx.fillStyle = '#fff'; this.ctx.font = 'bold 20px Orbit'; this.ctx.textAlign = 'center'; this.ctx.fillText(drop.icon, drop.x, drop.y + 7);
      this.ctx.font = 'bold 11px Orbit'; this.ctx.fillStyle = drop.color; this.ctx.fillText(`${drop.name} · 전체 적용`, drop.x, drop.y - 31); this.ctx.restore();
    });

    // 보스전에서는 제한시간 HUD를 표시하지 않는다.
    const isPractice = this.characters.some((c) => c.id === "dummy");
    const isBossGame = this.characters.some(
      (c) => c.isBoss && !c.id.includes("clone"),
    );

    if (this.isPrepared && !this.isGameOver && !isPractice && !isBossGame && !this.isObjectiveTeamMode()) {
      this.ctx.save();
      this.ctx.fillStyle = this.roundTimer <= 10.0 ? "#ff3366" : "#ffffff";
      this.ctx.shadowBlur = 15;
      this.ctx.shadowColor =
        this.roundTimer <= 10.0 ? "#ff3366" : "rgba(255, 255, 255, 0.4)";
      this.ctx.font = 'bold 24px "Orbit", sans-serif';
      this.ctx.textAlign = "center";
      this.ctx.textBaseline = "top";
      this.ctx.fillText(
        `${Math.ceil(this.roundTimer)}s`,
        this.canvas.width / 2,
        20,
      );
      this.ctx.restore();
    }

    // 2. 캐릭터 렌더링
    this.characters.forEach((char) => {
      if (this.activeCinematic?.hidePlayers && !char.isBoss && !char.isDead) return;
      // 2-A. 사망 캐릭터 렌더링 (회전, 수축, 서서히 사라짐 연출)
      if (char.isDead) {
        const animTime = char.deathAnimationTime;
        if (animTime > 0) {
          this.ctx.save();
          const progress = animTime / 1.5; // 1.0 -> 0.0
          this.ctx.globalAlpha = progress * 0.8;

          this.ctx.translate(char.x, char.y);
          this.ctx.rotate((1.0 - progress) * Math.PI * 4); // 4바퀴 회전

          const radius = char.radius * progress;

          this.ctx.beginPath();
          this.ctx.arc(0, 0, radius, 0, Math.PI * 2);
          this.ctx.fillStyle = "#121225";
          this.ctx.fill();

          const imgObj = char.image
            ? this.preloadedImages.get(char.image)
            : null;
          if (imgObj) {
            this.ctx.save();
            this.ctx.beginPath();
            this.ctx.arc(0, 0, radius, 0, Math.PI * 2);
            this.ctx.clip();
            this.ctx.drawImage(
              imgObj,
              -radius,
              -radius,
              radius * 2,
              radius * 2,
            );
            this.ctx.restore();
          } else {
            this.ctx.fillStyle = "#ffffff";
            this.ctx.font = `bold ${Math.max(6, radius * 0.45)}px "Orbit", sans-serif`;
            this.ctx.textAlign = "center";
            this.ctx.textBaseline = "middle";
            this.ctx.fillText(char.name, 0, 0);
          }

          this.ctx.strokeStyle = "#ff3366";
          this.ctx.lineWidth = 3;
          this.ctx.beginPath();
          this.ctx.arc(0, 0, radius, 0, Math.PI * 2);
          this.ctx.stroke();

          this.ctx.restore();
        } else {
          // 정적 그레이 처리
          this.ctx.save();
          this.ctx.globalAlpha = 0.2;
          this.ctx.fillStyle = "#333333";
          this.ctx.beginPath();
          this.ctx.arc(char.x, char.y, char.radius, 0, Math.PI * 2);
          this.ctx.fill();

          this.ctx.fillStyle = "#888888";
          this.ctx.font = `bold ${char.radius * 0.45}px "Orbit", sans-serif`;
          this.ctx.textAlign = "center";
          this.ctx.textBaseline = "middle";
          this.ctx.fillText(char.name, char.x, char.y);

          this.ctx.strokeStyle = "#ff3366";
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

      // Invoke character-specific pre-render adjustments (e.g. Su alpha, Jiho aura glow)
      char.onPreRender?.(char, this.ctx);

      // 스케일 반영된 반경
      const currentRadius = char.radius * char.scaleMultiplier;

      // 원형 클리핑 영역 및 배경
      this.ctx.save();
      this.ctx.beginPath();
      this.ctx.arc(char.x, char.y, currentRadius, 0, Math.PI * 2);
      this.ctx.closePath();

      this.ctx.fillStyle = "#121225";
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
          currentRadius * 2,
        );
      } else {
        // 이미지가 없으므로 centered name text fallback 드로잉
        this.ctx.fillStyle = "#ffffff";
        this.ctx.font = `bold ${Math.max(10, currentRadius * 0.45)}px "Orbit", sans-serif`;
        this.ctx.textAlign = "center";
        this.ctx.textBaseline = "middle";
        this.ctx.fillText(char.name, char.x, char.y);
      }
      this.ctx.restore(); // 클리핑 해제

      // 캐릭터 테두리 빛 효과 선 (팀전/보스전일 경우 전용 테두리 링 및 글로우 적용)
      this.ctx.save();

      let strokeColor = char.color;
      let strokeWidth = 3;
      let shadowB = char.skillActive ? 25 : 10;
      let shadowC = char.skillActive ? char.color : "rgba(0,0,0,0.5)";

      if (char.isBoss) {
        strokeColor = "#ffd700"; // 보스는 눈부신 골드색
        strokeWidth = 6;
        shadowB = 25;
        shadowC = "#ffd700";
      } else if (char.teamId !== undefined) {
        strokeColor = char.teamId === 1 ? "#ff3b30" : "#007aff"; // 1: 레드팀(도전자), 2: 블루팀
        strokeWidth = 4.5;
        shadowB = 15;
        shadowC = strokeColor;
      }

      this.ctx.strokeStyle = strokeColor;
      this.ctx.lineWidth = strokeWidth;
      this.ctx.shadowBlur = shadowB;
      this.ctx.shadowColor = shadowC;

      this.ctx.beginPath();
      this.ctx.arc(char.x, char.y, currentRadius, 0, Math.PI * 2);
      this.ctx.stroke();
      this.ctx.restore();

      // 캐릭터 고유 렌더링 확장 훅 위임 (코딩진행바, 기절별 등)
      char.onRenderExtra?.(char, this.ctx, currentRadius);
      this.renderStatusEffects(char, currentRadius);

      // 2-B. 팀전/보스전 소속 머리 위 텍스트 라벨 렌더링
      if (!char.isDead) {
        this.ctx.save();
        this.ctx.shadowBlur = 6;
        this.ctx.textAlign = "center";
        this.ctx.textBaseline = "bottom";

        let labelText = "";
        let labelColor = "#ffffff";

        const isBossGame = this.characters.some(
          (p) => p.isBoss && !p.id.includes("clone"),
        );
        const isTeamGame = this.characters.some(
          (p) => p.teamId !== undefined && !p.id.includes("clone"),
        );

        if (isBossGame && !char.isBoss) {
          labelText = "🔴 도전자";
          labelColor = "#ff3b30";
        } else if (isTeamGame) {
          if (char.teamId === 1) {
            labelText = "🔴 RED";
            labelColor = "#ff3b30";
          } else if (char.teamId === 2) {
            labelText = "🔵 BLUE";
            labelColor = "#007aff";
          }
        }

        if (labelText) {
          this.ctx.fillStyle = labelColor;
          this.ctx.shadowColor = labelColor;
          this.ctx.font = `bold ${Math.max(10, currentRadius * 0.32)}px "Orbit", sans-serif`;
          this.ctx.fillText(labelText, char.x, char.y - currentRadius - 8);
        }
        this.ctx.restore();
      }

      // 2-C. 보스 캐릭터 추가 장식 (머리 위 왕관 👑 렌더링 및 하단 BOSS 표기)
      if (char.isBoss) {
        this.ctx.save();
        this.ctx.shadowBlur = 10;
        this.ctx.shadowColor = "#ffd700";

        // 캐릭터 머리 위에 왕관 이모지를 둥실둥실 뜨는 효과와 함께 띄웁니다.
        const bobbing = Math.sin(Date.now() / 200) * 3;
        this.ctx.font = `${currentRadius * 0.5}px "Orbit", sans-serif`;
        this.ctx.textAlign = "center";
        this.ctx.textBaseline = "bottom";
        this.ctx.fillText("👑", char.x, char.y - currentRadius - 5 + bobbing);

        // BOSS 라벨 텍스트
        this.ctx.fillStyle = "#ffd700";
        this.ctx.font = `bold ${Math.max(9, currentRadius * 0.25)}px "Orbit", sans-serif`;
        this.ctx.textBaseline = "top";
        this.ctx.fillText("BOSS", char.x, char.y + currentRadius + 18);
        this.ctx.restore();
      }

      if ((char.relicGems ?? 0) > 0) {
        this.ctx.save();
        const slowPercent = Math.round((1 - (char.relicSpeedMultiplier ?? 1)) * 100);
        this.ctx.strokeStyle = '#d8b4fe';
        this.ctx.lineWidth = 4;
        this.ctx.setLineDash([5, 4]);
        this.ctx.beginPath();
        this.ctx.arc(char.x, char.y, currentRadius + 12, 0, Math.PI * 2);
        this.ctx.stroke();
        this.ctx.setLineDash([]);
        this.ctx.fillStyle = '#f3e8ff';
        this.ctx.font = 'bold 11px Orbit';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(`💎 ${char.relicGems}  -${slowPercent}%`, char.x, char.y + currentRadius + 31);
        this.ctx.restore();
      }

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
          arrowY - headlen * Math.sin(angle - Math.PI / 6),
        );
        this.ctx.lineTo(
          arrowX - headlen * Math.cos(angle + Math.PI / 6),
          arrowY - headlen * Math.sin(angle + Math.PI / 6),
        );
        this.ctx.closePath();
        this.ctx.fill();
      }

      // 4. 캐릭터 바깥쪽 원형 링 게이지 (HP & Skill) 렌더링
      const hpPercentage = char.hp / char.maxHp;
      this.ctx.lineWidth = 3.5;
      this.ctx.strokeStyle = "rgba(255, 51, 102, 0.2)";
      this.ctx.beginPath();
      this.ctx.arc(
        char.x,
        char.y,
        currentRadius + 6,
        Math.PI * 0.5,
        Math.PI * 1.5,
        false,
      );
      this.ctx.stroke();

      this.ctx.strokeStyle = varColorToHp(hpPercentage);
      this.ctx.beginPath();
      const hpStartAngle = Math.PI * 1.5;
      const hpEndAngle = Math.PI * 1.5 - Math.PI * hpPercentage;
      this.ctx.arc(
        char.x,
        char.y,
        currentRadius + 6,
        hpStartAngle,
        hpEndAngle,
        true,
      );
      this.ctx.stroke();

      const skillPercentage = char.skillGauge / 100;
      this.ctx.strokeStyle = "rgba(0, 242, 254, 0.15)";
      this.ctx.beginPath();
      this.ctx.arc(
        char.x,
        char.y,
        currentRadius + 6,
        Math.PI * 1.5,
        Math.PI * 0.5,
        false,
      );
      this.ctx.stroke();

      this.ctx.strokeStyle = char.skillGauge >= 100 ? "#ffd700" : "#00f2fe";
      this.ctx.beginPath();
      const skillStartAngle = Math.PI * 1.5;
      const skillEndAngle = Math.PI * 1.5 + Math.PI * skillPercentage;
      this.ctx.arc(
        char.x,
        char.y,
        currentRadius + 6,
        skillStartAngle,
        skillEndAngle,
        false,
      );
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

    // 6. 캐릭터 전용 전체화면 오버레이 훅 실행 (예: 찬휘 신라천정 암전/자막/화면흔들림)
    this.characters.forEach((char) => {
      char.onRenderOverlay?.(
        char,
        this.ctx,
        this.canvas.width,
        this.canvas.height,
      );
    });

    this.renderCinematic();

    // 8. 데미지 플로팅 텍스트 렌더링
    this.ctx.save();
    this.ctx.font = 'bold 15px "Orbit", sans-serif';
    this.ctx.textAlign = "center";
    this.floatingTexts.forEach((ft) => {
      this.ctx.globalAlpha = ft.life;
      this.ctx.fillStyle = ft.color;
      this.ctx.strokeStyle = "#000000";
      this.ctx.lineWidth = 3.5;
      this.ctx.strokeText(ft.text, ft.x, ft.y);
      this.ctx.fillText(ft.text, ft.x, ft.y);
    });
    this.ctx.restore();

    this.ctx.restore(); // 전체 흔들림 복구
  }

  private renderCinematic() {
    const cinematic = this.activeCinematic;
    if (!cinematic) return;
    const progress = 1 - cinematic.timeLeft / cinematic.totalDuration;
    const fade = Math.min(1, Math.min(progress * 4, cinematic.timeLeft * 3));
    const isEnd = cinematic.tone === "end";
    const isTime = cinematic.tone === "time";
    this.ctx.save();
    this.ctx.fillStyle = isEnd
      ? `rgba(255, 255, 255, ${0.72 * fade})`
      : isTime
        ? `rgba(0, 0, 0, ${0.76 * fade})`
        : `rgba(0, 0, 8, ${0.9 * fade})`;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    if (isTime) this.ctx.filter = "grayscale(1)";
    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;
    if (cinematic.tone === "void") {
      const elapsed = cinematic.totalDuration - cinematic.timeLeft;
      const lightDelay = cinematic.lightDelay ?? 0;
      const lightDuration = cinematic.lightDuration ?? cinematic.totalDuration;
      const explosionProgress = Math.max(0, Math.min(1, (elapsed - lightDelay) / lightDuration));
      const remainingDuration = Math.max(0.001, cinematic.totalDuration - lightDelay - lightDuration);
      const fadeAfterExplosion = Math.max(0, 1 - Math.max(0, elapsed - lightDelay - lightDuration) / remainingDuration);
      const lightIntensity = explosionProgress * fadeAfterExplosion;
      const radius = 16 + explosionProgress * Math.hypot(this.canvas.width, this.canvas.height);
      const glow = this.ctx.createRadialGradient(centerX, centerY, 1, centerX, centerY, radius);
      glow.addColorStop(0, "#ffffff"); glow.addColorStop(0.08, "#ffffff"); glow.addColorStop(0.22, "#b9e8ff"); glow.addColorStop(0.42, "#8b5cf6"); glow.addColorStop(1, "rgba(225,242,255,0.22)");
      this.ctx.fillStyle = `rgba(225,242,255,${lightIntensity * 0.72})`;
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
      this.ctx.fillStyle = glow; this.ctx.beginPath(); this.ctx.arc(centerX, centerY, radius, 0, Math.PI * 2); this.ctx.fill();
    }
    this.ctx.filter = "none";
    this.ctx.textAlign = "center";
    this.ctx.shadowBlur = 18;
    this.ctx.shadowColor = isEnd ? "#ffffff" : "#c4b5fd";
    const showQuote = cinematic.quoteDuration === undefined || (cinematic.totalDuration - cinematic.timeLeft) <= cinematic.quoteDuration;
    this.ctx.fillStyle = isEnd ? "#1f1438" : "#f5f3ff";
    this.ctx.font = 'bold 30px "Orbit", sans-serif';
    if (showQuote) this.ctx.fillText(cinematic.title, centerX, centerY - 28);
    if (cinematic.quote && showQuote) {
      this.ctx.font = '18px "Orbit", sans-serif';
      this.ctx.fillStyle = isEnd ? "#38255c" : "#ddd6fe";
      this.ctx.fillText(`“${cinematic.quote}”`, centerX, centerY + 18);
    }
    this.ctx.restore();
  }
}

function varColorToHp(percent: number): string {
  if (percent > 0.5) return "#39ff14";
  if (percent > 0.2) return "#ffaa00";
  return "#ff3366";
}
