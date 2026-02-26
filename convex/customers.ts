import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

export const getByPhone = query({
  args: { phone: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("customers")
      .filter((q) => q.eq(q.field("phone"), args.phone))
      .first();
  },
});

export const listAll = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("customers").order("desc").collect();
  },
});

export const get = query({
  args: { id: v.string() },
  handler: async (ctx, args) => {
    try {
      return await ctx.db.get(args.id as any);
    } catch {
      // If it's not a valid Convex ID, try by supabase_id
      return await ctx.db
        .query("customers")
        .withIndex("by_supabase_id", (q) => q.eq("supabase_id", args.id))
        .first();
    }
  },
});

export const add = mutation({
  args: {
    supabase_id: v.optional(v.string()),
    name: v.string(),
    email: v.optional(v.string()),
    phone: v.string(),
    alternate_phone: v.optional(v.string()),
    address: v.optional(v.string()),
    metadata: v.optional(v.any()),
    created_by: v.optional(v.string()),
    created_at: v.string(),
    updated_at: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("customers", {
      ...args,
      metadata: args.metadata ?? {},
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("customers"),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    alternate_phone: v.optional(v.string()),
    address: v.optional(v.string()),
    metadata: v.optional(v.any()),
    updated_at: v.string(),
  },
  handler: async (ctx, args) => {
    const { id, ...rest } = args;
    await ctx.db.patch(id, rest);
  },
});
