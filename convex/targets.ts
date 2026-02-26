import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

export const listAll = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("targets").collect();
  },
});

export const add = mutation({
  args: {
    supabase_id: v.optional(v.string()),
    user_id: v.id("profiles"),
    period_type: v.string(),
    target_sqft: v.number(),
    target_amount: v.number(),
    target_units: v.number(),
    start_date: v.string(),
    end_date: v.string(),
    created_by: v.optional(v.string()),
    created_at: v.string(),
    updated_at: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("targets", args);
  },
});

export const update = mutation({
  args: {
    id: v.id("targets"),
    target_sqft: v.optional(v.number()),
    target_amount: v.optional(v.number()),
    target_units: v.optional(v.number()),
    start_date: v.optional(v.string()),
    end_date: v.optional(v.string()),
    updated_at: v.string(),
  },
  handler: async (ctx, args) => {
    const { id, ...rest } = args;
    await ctx.db.patch(id, rest);
  },
});

export const remove = mutation({
  args: { id: v.id("targets") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});
