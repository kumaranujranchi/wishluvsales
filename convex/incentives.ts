import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

export const listAll = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("incentives").collect();
  },
});

export const add = mutation({
  args: {
    supabase_id: v.optional(v.string()),
    sale_id: v.string(),
    sales_executive_id: v.string(),
    calculation_month: v.string(),
    calculation_year: v.number(),
    total_incentive_amount: v.number(),
    installment_1_amount: v.number(),
    installment_1_paid: v.boolean(),
    installment_1_date: v.optional(v.string()),
    installment_2_amount: v.number(),
    installment_2_paid: v.boolean(),
    installment_2_date: v.optional(v.string()),
    installment_3_amount: v.number(),
    installment_3_paid: v.boolean(),
    installment_3_date: v.optional(v.string()),
    installment_4_amount: v.number(),
    installment_4_paid: v.boolean(),
    installment_4_date: v.optional(v.string()),
    is_locked: v.boolean(),
    created_at: v.string(),
    updated_at: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("incentives", args);
  },
});

export const update = mutation({
  args: {
    id: v.id("incentives"),
    total_incentive_amount: v.optional(v.number()),
    installment_1_paid: v.optional(v.boolean()),
    installment_1_date: v.optional(v.string()),
    installment_2_paid: v.optional(v.boolean()),
    installment_2_date: v.optional(v.string()),
    installment_3_paid: v.optional(v.boolean()),
    installment_3_date: v.optional(v.string()),
    installment_4_paid: v.optional(v.boolean()),
    installment_4_date: v.optional(v.string()),
    is_locked: v.optional(v.boolean()),
    updated_at: v.string(),
  },
  handler: async (ctx, args) => {
    const { id, ...rest } = args;
    await ctx.db.patch(id, rest);
  },
});
