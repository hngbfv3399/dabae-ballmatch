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

  // 글로벌 캐릭터 전적 통계
  globalStats: defineTable({
    characterId: v.string(), // 캐릭터 고유 ID
    mode: v.string(),        // 플레이 인원 모드 (예: 'all', '2', '3', '4', '5', '6')
    wins: v.number(),
    games: v.number(),
    damageDealt: v.number(),
    damageTaken: v.number(),
  }).index("by_mode_and_char", ["mode", "characterId"]),

  // 글로벌 캐릭터 상성(카운터) 통계
  globalCounters: defineTable({
    victimId: v.string(),    // 죽은 캐릭터 ID
    killerId: v.string(),    // 죽인 캐릭터 ID
    mode: v.string(),        // 플레이 인원 모드 (예: 'all', '2', '3', '4', '5', '6')
    count: v.number(),
  }).index("by_mode_and_victim", ["mode", "victimId"]),
});
