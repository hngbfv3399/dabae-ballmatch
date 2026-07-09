import { query, mutation } from "./_generated/server";
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
      .collect();
  },
});

// Create a new patch note (or seed data)
export const create = mutation({
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

export const remove = mutation({
  args: { id: v.id("patchNotes") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});
