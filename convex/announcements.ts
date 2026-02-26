import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

export const listAll = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("announcements").order("desc").collect();
  },
});

export const add = mutation({
  args: {
    title: v.string(),
    content: v.string(),
    is_important: v.boolean(),
    is_published: v.boolean(),
    created_by: v.optional(v.string()),
    created_at: v.string(),
    updated_at: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("announcements", args);
  },
});

export const update = mutation({
  args: {
    id: v.id("announcements"),
    title: v.optional(v.string()),
    content: v.optional(v.string()),
    is_important: v.optional(v.boolean()),
    is_published: v.optional(v.boolean()),
    updated_at: v.string(),
  },
  handler: async (ctx, args) => {
    const { id, ...rest } = args;
    await ctx.db.patch(id, rest);
  },
});

export const remove = mutation({
  args: { id: v.id("announcements") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});
