import { v } from "convex/values";
import { mutation } from "./_generated/server";

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
