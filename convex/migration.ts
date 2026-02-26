import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * Internal migration helper: directly insert a profile record
 * This bypasses field validation for optional fields
 */
export const migrateProfiles = internalMutation({
  args: { records: v.any() },
  handler: async (ctx, args) => {
    for (const record of args.records) {
      // Strip Convex auto-generated fields
      const { _id, _creationTime, ...data } = record;
      await ctx.db.insert("profiles", data);
    }
    return { count: args.records.length };
  },
});

export const migrateDepartments = internalMutation({
  args: { records: v.any() },
  handler: async (ctx, args) => {
    for (const record of args.records) {
      const { _id, _creationTime, ...data } = record;
      await ctx.db.insert("departments", data);
    }
    return { count: args.records.length };
  },
});

export const migrateProjects = internalMutation({
  args: { records: v.any() },
  handler: async (ctx, args) => {
    for (const record of args.records) {
      const { _id, _creationTime, ...data } = record;
      await ctx.db.insert("projects", data);
    }
    return { count: args.records.length };
  },
});

export const migrateCustomers = internalMutation({
  args: { records: v.any() },
  handler: async (ctx, args) => {
    for (const record of args.records) {
      const { _id, _creationTime, ...data } = record;
      await ctx.db.insert("customers", data);
    }
    return { count: args.records.length };
  },
});

export const migrateAnnouncements = internalMutation({
  args: { records: v.any() },
  handler: async (ctx, args) => {
    for (const record of args.records) {
      const { _id, _creationTime, ...data } = record;
      await ctx.db.insert("announcements", data);
    }
    return { count: args.records.length };
  },
});

export const migrateTargets = internalMutation({
  args: { records: v.any() },
  handler: async (ctx, args) => {
    for (const record of args.records) {
      const { _id, _creationTime, ...data } = record;
      await ctx.db.insert("targets", data);
    }
    return { count: args.records.length };
  },
});

export const migrateSiteVisits = internalMutation({
  args: { records: v.any() },
  handler: async (ctx, args) => {
    for (const record of args.records) {
      const { _id, _creationTime, ...data } = record;
      await ctx.db.insert("site_visits", data);
    }
    return { count: args.records.length };
  },
});

export const migrateSales = internalMutation({
  args: { records: v.any() },
  handler: async (ctx, args) => {
    for (const record of args.records) {
      const { _id, _creationTime, ...data } = record;
      await ctx.db.insert("sales", data);
    }
    return { count: args.records.length };
  },
});

export const migratePayments = internalMutation({
  args: { records: v.any() },
  handler: async (ctx, args) => {
    for (const record of args.records) {
      const { _id, _creationTime, ...data } = record;
      await ctx.db.insert("payments", data);
    }
    return { count: args.records.length };
  },
});

export const migrateIncentives = internalMutation({
  args: { records: v.any() },
  handler: async (ctx, args) => {
    for (const record of args.records) {
      const { _id, _creationTime, ...data } = record;
      await ctx.db.insert("incentives", data);
    }
    return { count: args.records.length };
  },
});

export const patchSaleProjectIds = internalMutation({
  args: {
    updates: v.array(v.object({
      id: v.id("sales"),
      project_id: v.string()
    }))
  },
  handler: async (ctx, args) => {
    let updated = 0;
    for (const update of args.updates) {
      await ctx.db.patch(update.id, { project_id: update.project_id });
      updated++;
    }
    return { updated };
  }
});

export const patchSaleCustomerIds = internalMutation({
  args: {
    updates: v.array(v.object({
      id: v.any(),
      customer_id: v.string()
    }))
  },
  handler: async (ctx, args) => {
    let updated = 0;
    for (const update of args.updates) {
      await ctx.db.patch(update.id, { customer_id: update.customer_id });
      updated++;
    }
    return { updated };
  }
});

export const autoPatchSalesLinks = internalMutation({
  args: {},
  handler: async (ctx) => {
    const sales = await ctx.db.query("sales").collect();
    const profiles = await ctx.db.query("profiles").collect();
    const customers = await ctx.db.query("customers").collect();
    
    let updated = 0;
    for (const s of sales) {
      const updates: any = {};
      
      // 1. Map Sales Executive
      if (s.sales_executive_id && s.sales_executive_id.length > 30) {
        const executiveMatch = profiles.find(p => p.supabase_id === s.sales_executive_id);
        if (executiveMatch) {
          updates.sales_executive_id = executiveMatch._id;
        }
      }
      
      // 2. Map Customer
      if (s.customer_id && s.customer_id.length > 30) {
        const customerMatch = customers.find(c => c.supabase_id === s.customer_id);
        if (customerMatch) {
          updates.customer_id = customerMatch._id;
        }
      }
      
      // 3. Map Team Leader (if exists)
      if (s.team_leader_id && s.team_leader_id.length > 30) {
        const tlMatch = profiles.find(p => p.supabase_id === s.team_leader_id);
        if (tlMatch) {
          updates.team_leader_id = tlMatch._id;
        }
      }
      
      if (Object.keys(updates).length > 0) {
        await ctx.db.patch(s._id, updates);
        updated++;
      }
    }
    return { updatedCount: updated };
  }
});
