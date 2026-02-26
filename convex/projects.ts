import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("projects").collect();
  },
});

export const get = query({
  args: { id: v.string() },
  handler: async (ctx, args) => {
    try {
      return await ctx.db.get(args.id as any);
    } catch {
      return await ctx.db
        .query("projects")
        .withIndex("by_supabase_id", (q) => q.eq("supabase_id", args.id))
        .first();
    }
  },
});

export const add = mutation({
  args: {
    name: v.string(),
    address: v.optional(v.string()),
    google_maps_url: v.optional(v.string()),
    is_active: v.boolean(),
    site_photos: v.array(v.string()),
    created_at: v.string(),
    updated_at: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("projects", args);
  },
});

export const update = mutation({
  args: {
    id: v.id("projects"),
    name: v.optional(v.string()),
    address: v.optional(v.string()),
    google_maps_url: v.optional(v.string()),
    is_active: v.optional(v.boolean()),
    site_photos: v.optional(v.array(v.string())),
    updated_at: v.string(),
  },
  handler: async (ctx, args) => {
    const { id, ...fields } = args;
    await ctx.db.patch(id, fields);
  },
});

export const remove = mutation({
  args: { id: v.id("projects") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});
