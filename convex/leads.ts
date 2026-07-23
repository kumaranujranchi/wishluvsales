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

// Returns per-sales-executive lead count breakdown (for lead distribution cards)
export const getExecutiveLeadStats = query({
  args: {},
  handler: async (ctx) => {
    // Fetch all sales_executive profiles
    const executives = await ctx.db
      .query("profiles")
      .filter((q) => q.eq(q.field("role"), "sales_executive"))
      .collect();

    // Fetch all leads once
    const allLeads = await ctx.db.query("leads").collect();

    // All possible sources
    const SOURCE_LIST = ["Referral", "99acres", "MagicBrick", "Housing", "Meta", "Google", "Walk-in"];

    return executives.map((exec) => {
      const execLeads = allLeads.filter(
        (l) => l.assigned_to === exec._id || l.assigned_to === exec.supabase_id
      );
      const total = execLeads.length;

      // Source-wise counts — only include sources with at least 1 lead
      const sources: Record<string, number> = {};
      for (const src of SOURCE_LIST) {
        const count = execLeads.filter((l) => l.source === src).length;
        if (count > 0) sources[src] = count;
      }

      return {
        id: exec._id,
        name: exec.full_name,
        avatar: (exec as any).avatar_url ?? null,
        total,
        sources,
      };
    });
  },
});
