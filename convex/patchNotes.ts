import { internalMutation, query } from "./_generated/server";
import { v } from "convex/values";

// Get the latest patch note
export const getLatest = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("patchNotes")
      .order("desc")
      .first();
  },
});

// Get all patch notes sorted by newest first
export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("patchNotes")
      .order("desc")
      .take(50);
  },
});

// Create a new patch note (or seed data)
export const create = internalMutation({
  args: {
    version: v.string(),
    title: v.string(),
    isImportant: v.boolean(),
    content: v.optional(v.array(v.string())),
    buffs: v.optional(v.array(v.string())),
    nerfs: v.optional(v.array(v.string())),
    adjustments: v.optional(v.array(v.string())),
    general: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const patchId = await ctx.db.insert("patchNotes", {
      version: args.version,
      title: args.title,
      isImportant: args.isImportant,
      content: args.content,
      buffs: args.buffs,
      nerfs: args.nerfs,
      adjustments: args.adjustments,
      general: args.general,
      createdAt: Date.now(),
    });
    return patchId;
  },
});

export const remove = internalMutation({
  args: { id: v.id("patchNotes") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

export const update = internalMutation({
  args: {
    id: v.id("patchNotes"),
    version: v.optional(v.string()),
    title: v.optional(v.string()),
    isImportant: v.optional(v.boolean()),
    content: v.optional(v.array(v.string())),
    buffs: v.optional(v.array(v.string())),
    nerfs: v.optional(v.array(v.string())),
    adjustments: v.optional(v.array(v.string())),
    general: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    await ctx.db.patch(id, updates);
  },
});

export const cleanOutdated = internalMutation({
  args: {},
  handler: async (ctx) => {
    const patches = await ctx.db.query("patchNotes").collect();
    for (const patch of patches) {
      let needsUpdate = false;
      const updates: any = {};

      if (patch.version === "1.7.0" || patch.version === "v1.7.0") {
        if (patch.buffs) {
          const newBuffs = patch.buffs.map(b => {
            if (b.includes("식물 공격 터렛")) {
              needsUpdate = true;
              return b.replace("하며, 50% 확률로 그 자리에 식물 공격 터렛(4초간 사거리 150px 적에게 초당 7 피해)을 소환하고,", "");
            }
            return b;
          });
          if (needsUpdate) {
            updates.buffs = newBuffs;
          }
        }
      }

      if (patch.version === "v1.3.0" || patch.version === "1.3.0") {
        if (patch.general) {
          const newGeneral = patch.general.map(g => {
            if (g.includes("5초간 미섭취 및 미타격 시 스택 초기화")) {
              needsUpdate = true;
              return g.replace(" (5초간 미섭취 및 미타격 시 스택 초기화)", "");
            }
            return g;
          });
          if (needsUpdate) {
            updates.general = newGeneral;
          }
        }
      }

      if (patch.version === "v1.2.0" || patch.version === "1.2.0") {
        if (patch.general) {
          const newGeneral = patch.general.map(g => {
            if (g.includes("5초간 벽과 적을 반사")) {
              needsUpdate = true;
              g = g.replace("5초간 벽과 적을 반사", "3초간 벽과 적을 반사");
            }
            if (g.includes("3.5초 미타격 시 스탯이 초기화되며")) {
              needsUpdate = true;
              g = g.replace(" 3.5초 미타격 시 스탯이 초기화되며,", "");
            }
            if (g.includes("즉시 [만기 전역]하여 매치에서 즉시 최종 승리합니다")) {
              needsUpdate = true;
              g = g.replace("즉시 [만기 전역]하여 매치에서 즉시 최종 승리합니다", "즉시 [만기 전역]하여 주변에 광역 대미지를 주고 버프를 획득합니다");
            }
            if (g.includes("70% 확률로")) {
              needsUpdate = true;
              g = g.replace("70% 확률로", "80% 확률로");
            }
            if (g.includes("HP 5% 이하 시")) {
              needsUpdate = true;
              g = g.replace("HP 5% 이하 시", "HP 10% 이하 시");
            }
            return g;
          });
          if (needsUpdate) {
            updates.general = newGeneral;
          }
        }
      }

      if (patch.version === "v1.1.0" || patch.version === "1.1.0") {
        if (patch.buffs) {
          const newBuffs = patch.buffs.map(b => {
            if (b.includes("10 흡수 실드 획득")) {
              needsUpdate = true;
              return b.replace("10 흡수 실드 획득", "6 흡수 실드 획득");
            }
            return b;
          });
          if (needsUpdate) {
            updates.buffs = newBuffs;
          }
        }
      }

      if (needsUpdate) {
        await ctx.db.patch(patch._id, updates);
      }
    }
  }
});




