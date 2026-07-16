import { internalMutation, mutation, query } from "./_generated/server";
import { v } from "convex/values";

function compareVersions(v1: string, v2: string) {
  // `v3.2.3-dev` 같은 개발용 접미사는 숫자 버전 비교에서 제외한다.
  const numericParts = (version: string) =>
    (version.replace(/^v/, "").match(/^\d+(?:\.\d+)*/)?.[0] ?? "0")
      .split(".")
      .map(Number);
  const parts1 = numericParts(v1);
  const parts2 = numericParts(v2);
  for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
    const p1 = parts1[i] ?? 0;
    const p2 = parts2[i] ?? 0;
    if (p1 !== p2) {
      return p2 - p1; // descending
    }
  }
  return 0;
}

// Get the latest patch note
export const getLatest = query({
  args: {},
  handler: async (ctx) => {
    const patches = await ctx.db.query("patchNotes").withIndex("by_createdAt").order("desc").take(50);
    if (patches.length === 0) return null;
    patches.sort((a, b) => compareVersions(a.version, b.version));
    return patches[0];
  },
});

// Get all patch notes sorted by newest first
export const list = query({
  args: {},
  handler: async (ctx) => {
    const patches = await ctx.db.query("patchNotes").withIndex("by_createdAt").order("desc").take(50);
    patches.sort((a, b) => compareVersions(a.version, b.version));
    return patches.slice(0, 50);
  },
});

const V410_PATCH_NOTE = {
  version: "v4.1.0",
  title: "전투 카탈로그 · 균열 생존전",
  isImportant: true,
  content: [
    "Convex 서버 기준 전투 카탈로그: 캐릭터 20종과 경기장 6종의 전투 수치를 실시간 반영합니다.",
    "균열 생존전: 근거리·빠른·원거리·중장갑 몬스터를 버티며 웨이브 코인을 획득합니다.",
    "생존 HUD: 생존 시간, 현재 웨이브, 누적 코인을 전투 화면에 표시합니다.",
  ],
  adjustments: [
    "5웨이브마다 체력과 DEF 보호막을 회복합니다.",
    "사망 결과에 생존 시간, 웨이브, 처치 수, 가한/받은 피해, 서버 정산 코인, 선택 증강을 표시합니다.",
    "근거리 사거리를 공 표면 간격 기준으로 조정하고 원거리 기본 공격은 실제 투사체로 적용했습니다.",
  ],
  general: [
    "정찰 드론 펫, 회전 절단기, 쌍둥이 수호 펫 증강을 추가했습니다.",
    "선택한 증강은 런 종료 전까지 유지되며 결과창에서 다시 확인할 수 있습니다.",
    "생존전은 언제든 런 종료를 선택해 완료 웨이브 기준 보상과 기록을 정산할 수 있습니다.",
  ],
};

// 클라이언트가 임의의 패치 내용을 쓰지 못하도록 최신 릴리스 한 건만 고정한다.
// 배포 후 `npx convex run patchNotes:seedV410PatchNotes --prod`로 안전하게 재실행할 수 있다.
export const seedV410PatchNotes = mutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db
      .query("patchNotes")
      .withIndex("by_version", (q) => q.eq("version", V410_PATCH_NOTE.version))
      .unique();
    const patch = { ...V410_PATCH_NOTE, createdAt: Date.now() };
    if (existing) {
      await ctx.db.patch(existing._id, patch);
      return { created: false, patchId: existing._id };
    }
    const patchId = await ctx.db.insert("patchNotes", patch);
    return { created: true, patchId };
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
