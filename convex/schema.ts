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
  }),

  // v3.0.0: 캐릭터는 계정이 아닌 서버 전체가 함께 성장시킨다.
  characterProgress: defineTable({
    characterId: v.string(),
    level: v.number(),
    experience: v.number(),
    totalDungeonClears: v.number(),
    updatedAt: v.number(),
  }).index("by_characterId", ["characterId"]),

  // 던전 해금 상태도 서버 공용이다. 개별 클리어 기록은 dungeonCharacterRecords에서 관리한다.
  dungeonProgress: defineTable({
    dungeonId: v.string(),
    isUnlocked: v.boolean(),
    clearCount: v.number(),
    lastClearedAt: v.optional(v.number()),
  }).index("by_dungeonId", ["dungeonId"]),

  // 캐릭터별 던전 최고 기록은 별도 문서로 두어 이후 PvE 순위표를 지원한다.
  dungeonCharacterRecords: defineTable({
    dungeonId: v.string(),
    characterId: v.string(),
    clearCount: v.number(),
    fastestClearMs: v.optional(v.number()),
    updatedAt: v.number(),
  })
    .index("by_dungeonId_and_characterId", ["dungeonId", "characterId"])
    .index("by_dungeonId_and_fastestClearMs", ["dungeonId", "fastestClearMs"]),

  // 스테이지 보상은 개별 클리어 단위로 지급하되, 첫 클리어와 반복 클리어를 구분한다.
  dungeonStageRecords: defineTable({
    dungeonId: v.string(),
    characterId: v.string(),
    stageNumber: v.number(),
    clearCount: v.number(),
    updatedAt: v.number(),
  }).index("by_dungeonId_and_characterId_and_stageNumber", ["dungeonId", "characterId", "stageNumber"]),

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

  // 8주 시즌 전환 시 던전 진행·가챠 카운트를 한 번만 초기화하기 위한 단일 상태 문서다.
  v3SeasonStates: defineTable({
    key: v.literal("global"),
    seasonId: v.string(),
    updatedAt: v.number(),
  }).index("by_key", ["key"]),

  // 스킨 정의는 향후 이동 흔적·이름표 등 다른 코스메틱 종류로 확장할 수 있다.
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

  // 한 번 해금된 스킨은 전 서버가 사용할 수 있는 공용 도감에 남는다.
  cosmeticUnlocks: defineTable({
    cosmeticId: v.string(),
    unlockedAt: v.number(),
    unlockedByClientId: v.optional(v.string()),
  }).index("by_cosmeticId", ["cosmeticId"]),

  // 캐릭터별 현재 공용 장착 스킨. 다른 클라이언트도 이 값을 구독해 같은 외형을 렌더링한다.
  characterCosmeticLoadouts: defineTable({
    characterId: v.string(),
    cosmeticId: v.string(),
    updatedAt: v.number(),
    updatedByClientId: v.optional(v.string()),
  }).index("by_characterId", ["characterId"]),

  // 로그인 없는 환경의 일일 뽑기·플레이·경험치 포인트 상태. 브라우저 익명 ID 단위로만 관리한다.
  anonymousGachaStates: defineTable({
    clientId: v.string(),
    dailyResetDate: v.string(),
    dailyDrawsUsed: v.number(),
    completedPlayCount: v.number(),
    bonusDrawsUsed: v.number(),
    experiencePoints: v.optional(v.number()),
    updatedAt: v.number(),
  }).index("by_clientId", ["clientId"]),

  // 가챠 이력은 계속 늘어나므로 상태 문서와 분리한다.
  gachaDrawHistory: defineTable({
    clientId: v.string(),
    targetCharacterId: v.optional(v.string()),
    cosmeticId: v.string(),
    result: v.union(v.literal("unlocked"), v.literal("duplicateExperience")),
    experienceGranted: v.number(),
    createdAt: v.number(),
  }).index("by_clientId_and_createdAt", ["clientId", "createdAt"]),
});
