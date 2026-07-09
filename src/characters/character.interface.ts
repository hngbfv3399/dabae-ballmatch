export interface CharacterBehaviorContext {
  characters: CharacterState[];
  createParticle: (x: number, y: number, color: string, size?: number, life?: number) => void;
  createExplosion: (x: number, y: number, color: string, count?: number) => void;
  dealDamage: (attacker: CharacterState, target: CharacterState, amount: number, customText?: string) => void;
  addFloatingText: (x: number, y: number, text: string, color: string, life?: number) => void;
  logMessage?: (msg: string, type: string) => void;
}

export interface CharacterConfig {
  id: string;
  name: string;
  image?: string;          // 캐릭터 초상화 이미지 경로 (선택 사항)
  maxHp: number;
  speed: number;          // 기본 속도 배율
  attackPower: number;    // 기본 공격력
  baseAttackRange: number;// 기본 공격 사거리 (px)
  skillName: string;
  skillDescription: string;
  color: string;          // 렌더링 시 캐릭터 대표 색상
  skillChargeRate: number;// 초당 오르는 스킬 게이지 (기본 증가량)
  tier?: 'S' | 'A' | 'B' | 'C'; // 캐릭터 밸런스 등급

  // 고유 로직 라이프사이클 훅
  onSkillTrigger?: (char: CharacterState, ctx: CharacterBehaviorContext) => void;
  onUpdate?: (char: CharacterState, dt: number, ctx: CharacterBehaviorContext) => void;
  onCollisionWithTarget?: (char: CharacterState, opponent: CharacterState, ctx: CharacterBehaviorContext) => void;
  onBasicAttack?: (char: CharacterState, opponent: CharacterState, ctx: CharacterBehaviorContext) => void;
  onRenderExtra?: (char: CharacterState, canvasCtx: CanvasRenderingContext2D, currentRadius: number) => void;
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
  lastContactDmgTime?: number; // 나유타 지배 인형 자폭 충돌 피해 간격 쿨타임 (ms)
  doyunShield?: number; // 도윤 덩크슛 실드 양
  doyunShieldTimeLeft?: number; // 도윤 실드 지속 시간
  isSuInvisible?: boolean; // 수 정밀 저격 은신 및 무적 여부
  totalDamageDealt?: number; // 한 게임 내 가한 총 피해량
  totalDamageTaken?: number; // 한 게임 내 받은 총 피해량
  isCharmed?: boolean; // 세연 매혹 상태 여부
  charmTimeLeft?: number; // 매혹 남은 시간 (초)
  isPoisoned?: boolean; // 푸만 독성 상태 여부
  poisonTimeLeft?: number; // 독성 남은 시간 (초)
  poisonDamageTimer?: number; // 독성 대미지 틱 타이머 (초)
}
