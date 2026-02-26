import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

export const listBySale = query({
  args: { sale_id: v.string() }, // Can be Old ID or Convex ID string
  handler: async (ctx, args) => {
    return await ctx.db
      .query("payments")
      .withIndex("by_sale", (q) => q.eq("sale_id", args.sale_id))
      .collect();
  },
});

export const listAll = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("payments").collect();
  },
});

export const add = mutation({
  args: {
    sale_id: v.string(),
    payment_date: v.string(),
    amount: v.number(),
    payment_type: v.string(),
    payment_mode: v.string(),
    transaction_reference: v.optional(v.string()),
    remarks: v.optional(v.string()),
    recorded_by: v.optional(v.string()),
    created_at: v.string(),
    updated_at: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("payments", args);
  },
});

export const update = mutation({
  args: {
    id: v.id("payments"),
    payment_date: v.optional(v.string()),
    amount: v.optional(v.number()),
    payment_type: v.optional(v.string()),
    payment_mode: v.optional(v.string()),
    transaction_reference: v.optional(v.string()),
    remarks: v.optional(v.string()),
    updated_at: v.string(),
  },
  handler: async (ctx, args) => {
    const { id, ...rest } = args;
    await ctx.db.patch(id, rest);
  },
});

export const remove = mutation({
  args: { id: v.id("payments") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});
