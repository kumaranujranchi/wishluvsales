import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("profiles").collect();
  },
});

export const getByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("profiles")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();
  },
});

export const add = mutation({
  args: {
    employee_id: v.string(),
    full_name: v.string(),
    email: v.string(),
    phone: v.optional(v.string()),
    role: v.string(),
    department_id: v.optional(v.string()),
    reporting_manager_id: v.optional(v.string()),
    image_url: v.optional(v.string()),
    dob: v.optional(v.string()),
    marriage_anniversary: v.optional(v.string()),
    joining_date: v.optional(v.string()),
    is_active: v.boolean(),
    force_password_change: v.boolean(),
    supabase_id: v.optional(v.string()),
    created_at: v.string(),
    updated_at: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("profiles", args);
  },
});

export const update = mutation({
  args: {
    id: v.id("profiles"),
    employee_id: v.optional(v.string()),
    full_name: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    role: v.optional(v.string()),
    department_id: v.optional(v.string()),
    reporting_manager_id: v.optional(v.string()),
    image_url: v.optional(v.string()),
    dob: v.optional(v.string()),
    marriage_anniversary: v.optional(v.string()),
    joining_date: v.optional(v.string()),
    is_active: v.optional(v.boolean()),
    force_password_change: v.optional(v.boolean()),
    supabase_id: v.optional(v.string()),
    updated_at: v.string(),
  },
  handler: async (ctx, args) => {
    const { id, ...fields } = args;
    await ctx.db.patch(id, fields);
  },
});

export const remove = mutation({
  args: { id: v.id("profiles") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});
