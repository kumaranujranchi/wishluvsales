import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

// listAll remains for full access (admin)
export const listAll = query({
  args: {},
  handler: async (ctx) => {
    try {
      const visits = await ctx.db.query("site_visits").order("desc").collect();
      
      const allProfiles = await ctx.db.query("profiles").collect();
      const convexIdToProfile = new Map(allProfiles.map(p => [p._id.toString(), p]));
      const supabaseIdToProfile = new Map();
      for (const p of allProfiles) {
        if (p.supabase_id) {
          supabaseIdToProfile.set(p.supabase_id, p);
        }
      }
      
      return visits.map((visit) => {
        let requesterProfile = null;
        if (visit.requested_by) {
          requesterProfile = convexIdToProfile.get(visit.requested_by) || 
                             supabaseIdToProfile.get(visit.requested_by);
        }
        let driverProfile = null;
        if (visit.driver_id) {
          driverProfile = convexIdToProfile.get(visit.driver_id) || 
                          supabaseIdToProfile.get(visit.driver_id);
        }
        return {
          ...visit,
          requester: requesterProfile ? { full_name: requesterProfile.full_name } : null,
          driver: driverProfile ? { full_name: driverProfile.full_name } : null,
        };
      });
    } catch (error) {
      console.error("Critical error in site_visits:listAll:", error);
      return [];
    }
  },
});

// NEW: listRecent - safer, limited version
export const listRecent = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    try {
      const limit = args.limit ?? 50;
      const visits = await ctx.db.query("site_visits")
        .order("desc")
        .take(limit);
      
      // Minimal mapping for performance
      return await Promise.all(visits.map(async (visit) => {
        let requester = null;
        if (visit.requested_by && visit.requested_by.length > 5) {
          try { requester = await ctx.db.get(visit.requested_by as any); } catch(e) {}
        }
        return {
          ...visit,
          requester: requester ? { full_name: (requester as any).full_name } : null,
          driver: null, // Skip driver for minimal query
        };
      }));
    } catch (error) {
      console.error("Error in listRecent:", error);
      return [];
    }
  }
});

export const add = mutation({
  args: {
    requested_by: v.string(),
    customer_name: v.string(),
    customer_phone: v.string(),
    pickup_location: v.optional(v.string()),
    project_ids: v.array(v.string()),
    visit_date: v.string(),
    visit_time: v.string(),
    status: v.string(),
    assigned_vehicle: v.optional(v.string()),
    driver_id: v.optional(v.string()),
    approved_by: v.optional(v.string()),
    approved_at: v.optional(v.string()),
    is_public: v.boolean(),
    notes: v.optional(v.string()),
    rejection_reason: v.optional(v.string()),
    clarification_note: v.optional(v.string()),
    start_odometer: v.optional(v.number()),
    end_odometer: v.optional(v.number()),
    created_at: v.string(),
    updated_at: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("site_visits", args);
  },
});

export const update = mutation({
  args: {
    id: v.id("site_visits"),
    status: v.optional(v.string()),
    assigned_vehicle: v.optional(v.string()),
    driver_id: v.optional(v.string()),
    approved_by: v.optional(v.string()),
    approved_at: v.optional(v.string()),
    notes: v.optional(v.string()),
    rejection_reason: v.optional(v.string()),
    clarification_note: v.optional(v.string()),
    start_odometer: v.optional(v.number()),
    end_odometer: v.optional(v.number()),
    updated_at: v.string(),
  },
  handler: async (ctx, args) => {
    const { id, ...rest } = args;
    await ctx.db.patch(id, rest);
  },
});

export const remove = mutation({
  args: { id: v.id("site_visits") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});
