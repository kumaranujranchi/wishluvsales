import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("sales").order("desc").collect();
  },
});

export const add = mutation({
  args: {
    sale_number: v.string(),
    customer_id: v.string(),
    project_id: v.string(),
    sales_executive_id: v.string(),
    team_leader_id: v.optional(v.string()),
    sale_date: v.string(),
    property_type: v.optional(v.string()),
    unit_number: v.optional(v.string()),
    area_sqft: v.optional(v.number()),
    rate_per_sqft: v.optional(v.number()),
    base_price: v.optional(v.number()),
    additional_charges: v.optional(v.number()),
    discount: v.optional(v.number()),
    plc: v.optional(v.number()),
    dev_charges: v.optional(v.number()),
    is_agreement_done: v.boolean(),
    agreement_date: v.optional(v.string()),
    is_registry_done: v.boolean(),
    registry_date: v.optional(v.string()),
    total_revenue: v.optional(v.number()),
    booking_amount: v.optional(v.number()),
    co_owners: v.optional(v.any()),
    registry_status: v.optional(v.string()),
    possession_date: v.optional(v.string()),
    legal_status: v.optional(v.string()),
    payment_plan: v.optional(v.string()),
    notes: v.optional(v.string()),
    metadata: v.any(),
    created_at: v.string(),
    updated_at: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("sales", args);
  },
});

export const update = mutation({
  args: {
    id: v.id("sales"),
    sale_number: v.optional(v.string()),
    customer_id: v.optional(v.string()),
    project_id: v.optional(v.string()),
    sales_executive_id: v.optional(v.string()),
    team_leader_id: v.optional(v.string()),
    sale_date: v.optional(v.string()),
    property_type: v.optional(v.string()),
    unit_number: v.optional(v.string()),
    area_sqft: v.optional(v.number()),
    rate_per_sqft: v.optional(v.number()),
    base_price: v.optional(v.number()),
    additional_charges: v.optional(v.number()),
    discount: v.optional(v.number()),
    plc: v.optional(v.number()),
    dev_charges: v.optional(v.number()),
    is_agreement_done: v.optional(v.boolean()),
    agreement_date: v.optional(v.string()),
    is_registry_done: v.optional(v.boolean()),
    registry_date: v.optional(v.string()),
    total_revenue: v.optional(v.number()),
    booking_amount: v.optional(v.number()),
    co_owners: v.optional(v.any()),
    registry_status: v.optional(v.string()),
    possession_date: v.optional(v.string()),
    legal_status: v.optional(v.string()),
    payment_plan: v.optional(v.string()),
    notes: v.optional(v.string()),
    metadata: v.optional(v.any()),
    updated_at: v.string(),
  },
  handler: async (ctx, args) => {
    const { id, ...rest } = args;
    await ctx.db.patch(id, rest);
  },
});

export const remove = mutation({
  args: { id: v.id("sales") },
  handler: async (ctx, args) => {
    // Delete associated payments first
    const payments = await ctx.db
      .query("payments")
      .withIndex("by_sale", (q) => q.eq("sale_id", args.id))
      .collect();
    
    for (const payment of payments) {
      await ctx.db.delete(payment._id);
    }

    await ctx.db.delete(args.id);
  },
});
