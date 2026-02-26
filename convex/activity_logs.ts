import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

export const log = mutation({
  args: {
    user_id: v.optional(v.string()),
    action: v.string(),
    entity_type: v.optional(v.string()),
    entity_id: v.optional(v.string()),
    details: v.any(),
    created_at: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("activity_logs", args);
  },
});
export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("activity_logs").order("desc").take(100);
  },
});
