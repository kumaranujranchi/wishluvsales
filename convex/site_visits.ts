import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

export const listAll = query({
  args: {},
  handler: async (ctx) => {
    try {
      const visits = await ctx.db.query("site_visits").order("desc").collect();
      
      const results = [];
      for (const visit of visits) {
        let requester = null;
        let driver = null;

        try {
          // Only attempt ctx.db.get if it looks like a valid Convex ID
          if (visit.requested_by && typeof visit.requested_by === "string" && visit.requested_by.length > 5) {
             // Try to get by ID, if it fails, catch it specifically
             try {
                requester = await ctx.db.get(visit.requested_by as any);
             } catch (e) {
                // If ID is invalid format, requester stays null
                console.warn(`Invalid requester ID: ${visit.requested_by}`);
             }
          }

          if (visit.driver_id && typeof visit.driver_id === "string" && visit.driver_id.length > 5) {
             try {
                driver = await ctx.db.get(visit.driver_id as any);
             } catch (e) {
                console.warn(`Invalid driver ID: ${visit.driver_id}`);
             }
          }
        } catch (innerError) {
          console.error("Inner error in site_visits mapping:", innerError);
        }

        results.push({
          ...visit,
          requester: requester ? { full_name: (requester as any).full_name } : null,
          driver: driver ? { full_name: (driver as any).full_name } : null,
        });
      }
      return results;
    } catch (error) {
      console.error("Critical error in site_visits:listAll:", error);
      return [];
    }
  },
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
