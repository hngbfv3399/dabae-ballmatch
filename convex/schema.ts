import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  patchNotes: defineTable({
    version: v.string(),        // e.g. "v1.0.0"
    title: v.string(),          // Patch Title
    isImportant: v.boolean(),   // If true, forces popup even if already read
    createdAt: v.number(),      // Creation timestamp
    content: v.optional(v.array(v.string())), // for backward compatibility
    buffs: v.optional(v.array(v.string())),
    nerfs: v.optional(v.array(v.string())),
    adjustments: v.optional(v.array(v.string())),
    general: v.optional(v.array(v.string())),
  })
    .index("by_version", ["version"])
    .index("by_createdAt", ["createdAt"]),

  // v4.0.0: 캐릭터(계정) 매핑 기반 성장 정보
  characterProgress: defineTable({
    characterId: v.string(),         // 계정 식별자 (예: "doyun", "jiho")
    level: v.number(),
    experience: v.number(),
    coins: v.number(),               // 보유 코인 (가챠 재화)
    skillPoints: v.number(),         // 남은 스킬 포인트
    totalDungeonClears: v.number(),
    updatedAt: v.number(),
  }).index("by_characterId", ["characterId"]),

  // 캐릭터별 스킬 트리 투자 현황
  characterSkills: defineTable({
    characterId: v.string(),
    skillId: v.string(),             // e.g. "skill_1", "skill_2", "passive_1"
    investedPoints: v.number(),      // 투자한 스킬 포인트 레벨 (최대 3 또는 5)
  })
    .index("by_characterId", ["characterId"])
    .index("by_characterId_and_skillId", ["characterId", "skillId"]),

  // 전투 수치의 서버 기준 카탈로그. 캐릭터 파일은 행동 훅만 보관하고,
  // HP/공격 방식/사거리/공격 간격 등의 밸런스 원본은 이 테이블에서 관리한다.
  characterCombatCatalog: defineTable({
    characterId: v.string(),
    archetype: v.union(
      v.literal("contact"),
      v.literal("projectile"),
      v.literal("hybrid"),
      v.literal("control"),
      v.literal("summoner"),
    ),
    basicAttackType: v.union(v.literal("contact"), v.literal("projectile"), v.literal("hybrid")),
    maxHp: v.number(),
    attackPower: v.number(),
    speed: v.number(),
    defense: v.number(),
    luck: v.number(),
    attackInterval: v.number(),
    // 실제 사거리는 현재 맵의 min(width, height) × 이 비율로 계산한다.
    attackRangeRatio: v.number(),
    projectileSpeed: v.optional(v.number()),
    traits: v.array(v.object({ label: v.string(), value: v.string() })),
    isActive: v.boolean(),
    updatedAt: v.number(),
  }).index("by_characterId", ["characterId"]),

  // 맵의 크기 역시 서버 기준 카탈로그로 관리한다. 모드 선택 로직은 프론트에
  // 남기되, 실제 캔버스 크기와 배경색은 이 카탈로그 값으로 덮어쓴다.
  arenaCombatCatalog: defineTable({
    arenaId: v.string(),
    width: v.number(),
    height: v.number(),
    backgroundColor: v.string(),
    isActive: v.boolean(),
    updatedAt: v.number(),
  }).index("by_arenaId", ["arenaId"]),

  // 던전 해금 상태도 서버 공용이다. 개별 클리어 기록은 dungeonCharacterRecords에서 관리한다.
  dungeonProgress: defineTable({
    dungeonId: v.string(),
    isUnlocked: v.boolean(),
    clearCount: v.number(),
    lastClearedAt: v.optional(v.number()),
  }).index("by_dungeonId", ["dungeonId"]),

  // 캐릭터별 던전 최고 기록
  dungeonCharacterRecords: defineTable({
    dungeonId: v.string(),
    characterId: v.string(),
    clearCount: v.number(),
    fastestClearMs: v.optional(v.number()),
    updatedAt: v.number(),
  })
    .index("by_dungeonId_and_characterId", ["dungeonId", "characterId"])
    .index("by_dungeonId_and_fastestClearMs", ["dungeonId", "fastestClearMs"]),

  // 스테이지 보상 기록
  dungeonStageRecords: defineTable({
    dungeonId: v.string(),
    characterId: v.string(),
    stageNumber: v.number(),
    clearCount: v.number(),
    updatedAt: v.number(),
  }).index("by_dungeonId_and_characterId_and_stageNumber", ["dungeonId", "characterId", "stageNumber"]),

  // 무한 생존전의 개인 최고 기록과 누적 보상. 매 런의 증강 목록처럼 커질 수 있는
  // 데이터는 이 문서에 보관하지 않고, 결과 화면에만 해당 런의 메모리를 사용한다.
  survivalCharacterRecords: defineTable({
    characterId: v.string(),
    bestWave: v.number(),
    bestSurvivalSeconds: v.number(),
    bestKills: v.number(),
    bestDamageDealt: v.number(),
    bestDamageTaken: v.number(),
    totalRuns: v.number(),
    totalCoinsEarned: v.number(),
    updatedAt: v.number(),
  }).index("by_characterId", ["characterId"]),

  // 시즌별 개인전·팀전·토너먼트 캐릭터 랭킹. 한 시즌은 8주다.
  pvpSeasons: defineTable({
    seasonId: v.string(),
    status: v.union(v.literal("planned"), v.literal("active"), v.literal("ended")),
    startedAt: v.number(),
    endsAt: v.number(),
  })
    .index("by_seasonId", ["seasonId"])
    .index("by_status", ["status"]),

  pvpCharacterRankings: defineTable({
    seasonId: v.string(),
    mode: v.union(v.literal("solo"), v.literal("team"), v.literal("tournament")),
    characterId: v.string(),
    score: v.number(),
    wins: v.number(),
    games: v.number(),
    draws: v.number(),
    updatedAt: v.number(),
  })
    .index("by_seasonId_and_mode_and_characterId", ["seasonId", "mode", "characterId"])
    .index("by_seasonId_and_mode_and_score", ["seasonId", "mode", "score"]),

  // 스킨 정의
  cosmetics: defineTable({
    cosmeticId: v.string(),
    name: v.string(),
    rarity: v.union(
      v.literal("common"),
      v.literal("rare"),
      v.literal("epic"),
      v.literal("legendary"),
      v.literal("unique"),
    ),
    scope: v.union(v.literal("global"), v.literal("character")),
    characterId: v.optional(v.string()),
    // 파일 본문은 Convex Storage에, 카탈로그에는 참조 ID만 보관한다.
    imageStorageId: v.optional(v.id("_storage")),
    style: v.object({
      textColor: v.string(),
      borderColor: v.string(),
      fillColor: v.string(),
      glowColor: v.optional(v.string()),
      borderAnimation: v.union(
        v.literal("none"),
        v.literal("pulse"),
        v.literal("aurora"),
        v.literal("flame"),
        v.literal("frost"),
        v.literal("glitch"),
      ),
      trail: v.union(v.literal("none"), v.literal("fade"), v.literal("spark")),
    }),
    isActive: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_cosmeticId", ["cosmeticId"])
    .index("by_scope_and_rarity", ["scope", "rarity"]),

  // 캐릭터별 스킨 해금 정보
  cosmeticUnlocks: defineTable({
    characterId: v.string(),
    cosmeticId: v.string(),
    unlockedAt: v.number(),
  }).index("by_characterId_and_cosmeticId", ["characterId", "cosmeticId"]),

  // 캐릭터별 현재 장착 스킨/세레모니 정보
  characterCosmeticLoadouts: defineTable({
    characterId: v.string(),
    equippedCosmeticId: v.optional(v.string()),
    equippedActionId: v.optional(v.string()),
    equippedBackgroundId: v.optional(v.string()),
    equippedSpecialEventId: v.optional(v.string()),
    updatedAt: v.number(),
  }).index("by_characterId", ["characterId"]),

  // 세레모니 액션 정보
  victoryActions: defineTable({
    actionId: v.string(),
    name: v.string(),
    characterId: v.optional(v.string()),
    rarity: v.union(v.literal("common"), v.literal("rare"), v.literal("epic"), v.literal("legendary"), v.literal("unique")),
    animation: v.union(v.literal("wave"), v.literal("jump"), v.literal("clap"), v.literal("dance"), v.literal("trophy"), v.literal("fireworks"), v.literal("sniper")),
    isActive: v.boolean(),
    createdAt: v.number(),
  }).index("by_actionId", ["actionId"]),

  victoryActionUnlocks: defineTable({
    actionId: v.string(),
    characterId: v.string(),
    unlockedAt: v.number(),
  })
    .index("by_actionId", ["actionId"])
    .index("by_characterId", ["characterId"])
    .index("by_characterId_and_actionId", ["characterId", "actionId"]),

  // 세레모니 배경 정보
  victoryBackgrounds: defineTable({
    backgroundId: v.string(),
    name: v.string(),
    characterId: v.optional(v.string()),
    rarity: v.union(v.literal("common"), v.literal("rare"), v.literal("epic"), v.literal("legendary"), v.literal("unique")),
    animation: v.union(v.literal("wave"), v.literal("jump"), v.literal("clap"), v.literal("dance"), v.literal("trophy"), v.literal("fireworks"), v.literal("sniper")),
    isActive: v.boolean(),
    createdAt: v.number(),
  }).index("by_backgroundId", ["backgroundId"]),

  victoryBackgroundUnlocks: defineTable({
    backgroundId: v.string(),
    characterId: v.string(),
    unlockedAt: v.number(),
  })
    .index("by_backgroundId", ["backgroundId"])
    .index("by_characterId", ["characterId"])
    .index("by_characterId_and_backgroundId", ["characterId", "backgroundId"]),

  // 특수 연출 정보
  victorySpecialEvents: defineTable({
    specialEventId: v.string(),
    name: v.string(),
    characterId: v.optional(v.string()),
    rarity: v.union(v.literal("common"), v.literal("rare"), v.literal("epic"), v.literal("legendary"), v.literal("unique")),
    effect: v.union(v.literal("sniper")),
    isActive: v.boolean(),
    createdAt: v.number(),
  }).index("by_specialEventId", ["specialEventId"]),

  victorySpecialEventUnlocks: defineTable({
    specialEventId: v.string(),
    characterId: v.string(),
    unlockedAt: v.number(),
  })
    .index("by_specialEventId", ["specialEventId"])
    .index("by_characterId", ["characterId"])
    .index("by_characterId_and_specialEventId", ["characterId", "specialEventId"]),

  // 영구 플레이어 아이템 도감 정의
  persistentItemCatalog: defineTable({
    itemId: v.string(),
    name: v.string(),
    description: v.string(),
    rarity: v.union(
      v.literal("common"),
      v.literal("rare"),
      v.literal("epic"),
      v.literal("legendary"),
      v.literal("unique")
    ),
    characterId: v.optional(v.string()),
    isActive: v.boolean(),
    createdAt: v.number(),
    effects: v.object({
      maxHpBonus: v.optional(v.number()),
      maxHpMultiplier: v.optional(v.number()),
      speedMultiplier: v.optional(v.number()),
      baseAttackRangeBonus: v.optional(v.number()),
      defenseShieldBonus: v.optional(v.number()),
      attackPowerBonus: v.optional(v.number()),
      defenseBonus: v.optional(v.number()),
      attackSpeedMultiplier: v.optional(v.number()),
      cooldownReductionBonus: v.optional(v.number()),
      luckBonus: v.optional(v.number()),
      attackMultiplier: v.optional(v.number()),
      skillChargeRateMultiplier: v.optional(v.number()),
      damageReductionMultiplier: v.optional(v.number()),
      orbitDamage: v.optional(v.number()),
      orbitRadius: v.optional(v.number()),
      orbitInterval: v.optional(v.number()),
      pulseDamage: v.optional(v.number()),
      pulseRadius: v.optional(v.number()),
      pulseInterval: v.optional(v.number()),
    }),
  }).index("by_itemId", ["itemId"]),

  // 캐릭터(계정)별 장비 인벤토리 및 장착 상태
  playerItems: defineTable({
    characterId: v.string(),         // 소유 캐릭터 ID (계정)
    itemId: v.string(),              // 고유 인스턴스 ID (UUID 또는 랜덤 스트링)
    itemCatalogId: v.string(),       // e.g. "inertial_bearing"
    name: v.string(),
    rarity: v.union(v.literal("common"), v.literal("rare"), v.literal("epic"), v.literal("legendary"), v.literal("unique")),
    level: v.number(),               // 장비 강화 레벨
    experience: v.number(),          // 장비 누적 강화 XP
    equippedSlot: v.number(),        // 0: 미장착, 1~8: 장착 슬롯 번호
    effects: v.object({
      maxHpBonus: v.optional(v.number()),
      maxHpMultiplier: v.optional(v.number()),
      speedMultiplier: v.optional(v.number()),
      baseAttackRangeBonus: v.optional(v.number()),
      defenseShieldBonus: v.optional(v.number()),
      attackPowerBonus: v.optional(v.number()),
      defenseBonus: v.optional(v.number()),
      attackSpeedMultiplier: v.optional(v.number()),
      cooldownReductionBonus: v.optional(v.number()),
      luckBonus: v.optional(v.number()),
      attackMultiplier: v.optional(v.number()),
      skillChargeRateMultiplier: v.optional(v.number()),
      damageReductionMultiplier: v.optional(v.number()),
      orbitDamage: v.optional(v.number()),
      orbitRadius: v.optional(v.number()),
      orbitInterval: v.optional(v.number()),
      pulseDamage: v.optional(v.number()),
      pulseRadius: v.optional(v.number()),
      pulseInterval: v.optional(v.number()),
    }),
    unlockedAt: v.number(),
  })
    .index("by_characterId", ["characterId"])
    .index("by_characterId_and_equippedSlot", ["characterId", "equippedSlot"]),
});
