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
});
