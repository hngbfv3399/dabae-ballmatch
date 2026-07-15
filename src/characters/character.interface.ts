export type CrowdControlType = 'stun' | 'confusion' | 'charm' | 'domination';

export interface CharacterStatusEffect {
  icon: string;
  label: string;
  timeLeft: number;
  duration: number;
  color: string;
}

export interface CharacterCosmeticStyle {
  textColor: string;
  borderColor: string;
  fillColor: string;
  glowColor: string;
  borderAnimation: 'none' | 'pulse' | 'aurora' | 'flame' | 'frost' | 'glitch';
  trail: 'none' | 'fade' | 'spark';
}

export interface BossDropDefinition {
  x: number;
  y: number;
  name: string;
  icon: string;
  color: string;
  duration: number;
  heal: number;
  damageMultiplier: number;
  speedMultiplier: number;
  immunityDuration: number;
}

export interface MapCutDefinition {
  x: number;
  y: number;
  width: number;
  height: number;
  angle?: number;
  warningDuration: number;
  activeDuration: number;
  damage: number;
}

export interface CinematicRequest {
  duration: number;
  title: string;
  quote?: string;
  tone: 'void' | 'time' | 'end';
  freezePlayers?: boolean;
  hidePlayers?: boolean;
  quoteDuration?: number;
  lightDelay?: number;
  lightDuration?: number;
}

export interface ProjectileDefinition {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  damage: number;
  color: string;
  life: number;
  label?: string;
}

export interface CharacterBehaviorContext {
  characters: CharacterState[];
  createParticle: (x: number, y: number, color: string, size?: number, life?: number) => void;
  createExplosion: (x: number, y: number, color: string, count?: number) => void;
  dealDamage: (attacker: CharacterState, target: CharacterState, amount: number, customText?: string) => void;
  applyStun: (source: CharacterState, target: CharacterState, duration: number, isReflected?: boolean) => boolean;
  applyConfusion: (source: CharacterState, target: CharacterState, duration: number, rerollInterval: number, isReflected?: boolean) => boolean;
  applyCharm: (source: CharacterState, target: CharacterState, duration: number, isReflected?: boolean) => boolean;
  applyDomination: (source: CharacterState, target: CharacterState, duration: number, isReflected?: boolean) => boolean;
  addFloatingText: (x: number, y: number, text: string, color: string, life?: number) => void;
  spawnBossDrop: (drop: BossDropDefinition) => void;
  spawnMapCut: (source: CharacterState, cut: MapCutDefinition) => void;
  startCinematic: (request: CinematicRequest) => void;
  spawnProjectile: (source: CharacterState, projectile: ProjectileDefinition) => void;
  arenaWidth: number;
  arenaHeight: number;
  logMessage?: (msg: string, type: string) => void;
}

export interface CharacterConfig {
  id: string;
  name: string;
  image?: string;          // 캐릭터 초상화 이미지 경로 (선택 사항)
  characterFamilyId?: string; // 일반/보스 버전을 묶는 동일 캐릭터 계열 ID
  radius?: number;         // 전용 보스 등 캐릭터별 기본 충돌 반지름
  maxHp: number;
  speed: number;          // 기본 속도 배율
  attackPower: number;    // 기본 공격력
  defense?: number;       // 기본 방어 보호막. 피해를 HP보다 먼저 정수로 흡수한다.
  baseAttackRange: number;// 기본 공격 사거리 (px)
  skillName: string;
  skillDescription: string;
  color: string;          // 렌더링 시 캐릭터 대표 색상
  skillChargeRate: number;// 초당 오르는 스킬 게이지 (기본 증가량)
  canUseSkillWhileCc?: boolean; // 기절·혼란 중에도 스킬 게이지 충전 및 발동 허용
  tier?: 'S' | 'A' | 'B' | 'C' | 'D' | 'E' | 'F'; // 캐릭터 밸런스 등급
  role: 'Nuker' | 'Sniper' | 'Speedster' | 'Guardian' | 'Juggernaut' | 'Disabler' | 'Summoner' | 'Specialist' | 'Supporter'; // 캐릭터 역할군
  detailedDescription: string; // 상세 플레이 스타일 설명

  // === Lifecycle Hooks (character-specific logic) ===
  onSkillTrigger?: (char: CharacterState, ctx: CharacterBehaviorContext) => void;
  onUpdate?: (char: CharacterState, dt: number, ctx: CharacterBehaviorContext) => void;
  onCollisionWithTarget?: (char: CharacterState, opponent: CharacterState, ctx: CharacterBehaviorContext) => void;
  onBasicAttack?: (char: CharacterState, opponent: CharacterState, ctx: CharacterBehaviorContext) => void;
  onRenderExtra?: (char: CharacterState, canvasCtx: CanvasRenderingContext2D, currentRadius: number) => void;
  onRenderBackground?: (char: CharacterState, canvasCtx: CanvasRenderingContext2D, canvasWidth: number, canvasHeight: number) => void;

  // === Damage Hooks (called from dealDamage) ===
  // Return modified damage. If blocked=true, damage is fully negated.
  onTakeDamage?: (target: CharacterState, attacker: CharacterState, damage: number, ctx: CharacterBehaviorContext) => { finalDamage: number; blocked: boolean };
  // Called after permanent/temporary shields absorb damage and HP is deducted.
  // Use this for character-specific HP state that must never bypass the common shield flow.
  onDamageApplied?: (target: CharacterState, attacker: CharacterState, damage: number, ctx: CharacterBehaviorContext) => void;
  // Return modified outgoing damage amount.
  onDealDamage?: (attacker: CharacterState, target: CharacterState, damage: number, ctx: CharacterBehaviorContext) => number;
  // Return true to cancel the original CC application.
  onReceiveCrowdControl?: (target: CharacterState, source: CharacterState, type: CrowdControlType, duration: number, ctx: CharacterBehaviorContext) => boolean;

  // === Death Hook (cleanup when this character dies) ===
  onDeath?: (char: CharacterState, killer: CharacterState, ctx: CharacterBehaviorContext) => void;

  // === Render Hooks ===
  // Called before the character circle is drawn (e.g., globalAlpha, glow).
  onPreRender?: (char: CharacterState, canvasCtx: CanvasRenderingContext2D) => void;
  // Called after all characters are drawn, for fullscreen overlays (e.g., screen darkening, subtitles).
  onRenderOverlay?: (char: CharacterState, canvasCtx: CanvasRenderingContext2D, canvasWidth: number, canvasHeight: number) => void;
  getStatusEffects?: (char: CharacterState) => CharacterStatusEffect[];

  // === Targeting Hook ===
  // Return false to exclude this character from being targeted by enemies.
  isTargetable?: (char: CharacterState) => boolean;
}

export interface CharacterState extends CharacterConfig {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;         // 캐릭터 충돌 구체 반지름
  hp: number;
  skillGauge: number;     // 0 ~ 100
  isDead: boolean;
  baseAttackCooldown: number; // 초 단위/dt
  skillCooldown: number;      
  skillActive: boolean;       // 스킬 활성화 상태
  skillDurationLeft: number;  // 스킬 지속시간 남은 시간
  opacity: number;            // 렌더링 투명도
  damageTakenQueue: { amount: number; time: number }[]; 
  isTyping: boolean;          // 지호 코딩 중 정지 상태
  typingTimeLeft: number;     // 코딩 남은 시간 (초)
  isStunned: boolean;         // 기절 상태
  stunTimeLeft: number;       // 기절 남은 시간 (초)
  scaleMultiplier: number;    // 도윤 덩크 슬램 도약 시 렌더링 크기 스케일 배율
  nayutaControlled?: boolean; // 나유타 지배 상태 여부
  nayutaControlTimeLeft?: number; // 나유타 지배 상태 남은 시간 (초)
  nayutaControllerId?: string; // 지배를 적용한 캐릭터 ID
  lastContactDmgTime?: number; // 나유타 지배 인형 자폭 충돌 피해 간격 쿨타임 (ms)
  doyunShield?: number; // 도윤 덩크슛 실드 양
  doyunShieldTimeLeft?: number; // 도윤 실드 지속 시간
  defenseShield?: number; // 기본 DEF에서 생성된 영구 보호막의 현재 값
  maxDefenseShield?: number; // 기본 DEF와 레벨 성장으로 계산한 보호막 최대값
  runShield?: number; // PvE 런 아이템으로 얻는 보호막
  isSuInvisible?: boolean; // 수 정밀 저격 은신 및 무적 여부
  totalDamageDealt?: number; // 한 게임 내 가한 총 피해량
  totalDamageTaken?: number; // 한 게임 내 받은 총 피해량
  totalCcDuration?: number; // 한 게임 내 적에게 적용한 CC 시간
  reflectedDamage?: number; // 한 게임 내 반사한 피해량
  objectiveContribution?: number; // 점령 시간 또는 보석 수집 기여도
  bossSurvivalTime?: number; // 보스전 도전자 생존 시간
  statusIndicators?: CharacterStatusEffect[]; // 캐릭터 고유 상태 UI 데이터
  isCharmed?: boolean; // 세연 매혹 상태 여부
  charmTimeLeft?: number; // 매혹 남은 시간 (초)
  isPoisoned?: boolean; // 푸만 독성 상태 여부
  poisonTimeLeft?: number; // 독성 남은 시간 (초)
  poisonDamageTimer?: number; // 독성 대미지 틱 타이머 (초)
  isImmune?: boolean; // 주주 피해 무적 보호막 여부
  immuneTimeLeft?: number; // 무적 보호막 남은 시간 (초)
  isConfused?: boolean; // 혼란 상태: 이동 방향이 무작위로 전환되고 공격/스킬 사용 불가
  confusedTimeLeft?: number;
  confusionRerollTimer?: number;
  confusionRerollInterval?: number;
  isCcImmune?: boolean;
  knockbackInertiaLeft?: number;
  wasAboveKnockbackThreshold?: boolean;
  relicGems?: number; // 보석 쟁탈전에서 현재 보유 중인 보석 수
  relicSpeedMultiplier?: number; // 보석 보유에 따른 이동 속도 배율
  raidDamageMultiplier?: number;
  raidSpeedMultiplier?: number;
  raidBuffTimeLeft?: number;
  raidImmunityTimeLeft?: number;
  // 영구 아이템의 공통 전투 효과. 캐릭터별 분기 없이 엔진에서 처리한다.
  persistentItemDamageReductionMultiplier?: number;
  persistentItemOrbitDamage?: number;
  persistentItemOrbitRadius?: number;
  persistentItemOrbitInterval?: number;
  persistentItemOrbitTimer?: number;
  persistentItemPulseDamage?: number;
  persistentItemPulseRadius?: number;
  persistentItemPulseInterval?: number;
  persistentItemPulseTimer?: number;
  
  // === 게임 모드 관련 확장 프로퍼티 ===
  teamId?: number;            // 1: 레드팀/도전자팀, 2: 블루팀/보스팀
  isBoss?: boolean;           // 보스전의 보스 여부
  cooldownMultiplier?: number;// 스킬 충전 쿨타임 배율 (기본 1.0, 보스는 2.0)
  damageMultiplier?: number;  // 대미지 가산 배율 (기본 1.0, 보스는 2.0)

  // === 경기 공통 결과 상태 ===
  // 엔진과 결과 UI가 공유하는 값이다. 캐릭터 구현에서 any로 주입하지 않는다.
  kills: number;
  rank: number;
  isMvp: boolean;
  mvpScore: number;
  deathAnimationTime: number;
  lastGaugeLogTime?: number;
  // 전역 장착 스킨의 시각 효과. 전투 판정 색상(char.color)과 분리한다.
  cosmeticStyle?: CharacterCosmeticStyle;
}
