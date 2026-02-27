import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

// ⚠️ INCENTIVES FEATURE TEMPORARILY DISABLED
// This table is disabled to prevent Server Error crashes.
// Re-enable when rebuilding the feature from scratch.

export const listAll = query({
  args: {},
  handler: async (_ctx) => {
    // Temporarily return empty array to prevent crashes
    return [];
  },
});

export const listByUser = query({
  args: { user_id: v.string() },
  handler: async (_ctx, _args) => {
    return [];
  },
});

export const add = mutation({
  args: {
    user_id: v.string(),
    calculation_year: v.number(),
    calculation_month: v.number(),
    total_incentive_amount: v.number(),
    base_incentive: v.optional(v.number()),
    bonus_incentive: v.optional(v.number()),
    notes: v.optional(v.string()),
    created_at: v.string(),
    updated_at: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("incentives", args);
  },
});
