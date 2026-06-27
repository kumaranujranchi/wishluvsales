import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

export const listAll = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("leads").order("desc").collect();
  },
});

export const add = mutation({
  args: {
    name: v.string(),
    phone: v.string(),
    email: v.optional(v.string()),
    project_id: v.string(),
    assigned_to: v.string(),
    source: v.string(),
    status: v.string(),
    notes: v.optional(v.string()),
    created_at: v.string(),
    updated_at: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("leads", args);
  },
});

export const update = mutation({
  args: {
    id: v.id("leads"),
    name: v.optional(v.string()),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    project_id: v.optional(v.string()),
    assigned_to: v.optional(v.string()),
    source: v.optional(v.string()),
    status: v.optional(v.string()),
    notes: v.optional(v.string()),
    updated_at: v.string(),
  },
  handler: async (ctx, args) => {
    const { id, ...rest } = args;
    await ctx.db.patch(id, rest);
  },
});

export const remove = mutation({
  args: { id: v.id("leads") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});
