import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

export const list = query({
  args: { user_id: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("notifications")
      .withIndex("by_user", (q) => q.eq("user_id", args.user_id))
      .order("desc")
      .take(50);
  },
});

export const add = mutation({
  args: {
    user_id: v.string(),
    title: v.string(),
    message: v.string(),
    type: v.string(),
    related_entity_type: v.optional(v.string()),
    related_entity_id: v.optional(v.string()),
    created_at: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("notifications", {
      ...args,
      is_read: false,
    });
  },
});

export const markRead = mutation({
  args: { id: v.id("notifications") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { is_read: true });
  },
});

export const markAllRead = mutation({
  args: { user_id: v.string() },
  handler: async (ctx, args) => {
    const unread = await ctx.db
      .query("notifications")
      .withIndex("by_user", (q) => q.eq("user_id", args.user_id))
      .filter((q) => q.eq(q.field("is_read"), false))
      .collect();

    for (const notif of unread) {
      await ctx.db.patch(notif._id, { is_read: true });
    }
  },
});
