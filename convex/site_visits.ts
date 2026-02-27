import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

export const listAll = query({
  args: {},
  handler: async (ctx) => {
    console.log("Entering site_visits:listAll");
    try {
      // Step 1: Raw query without ordering to rule out index issues
      const visits = await ctx.db.query("site_visits").collect();
      console.log(`Fetched ${visits.length} raw site visits`);
      
      const results = [];
      for (const visit of visits) {
        try {
          let requester = null;
          let driver = null;

          // Extreme caution with ID lookups
          if (visit.requested_by && typeof visit.requested_by === "string") {
            try {
              // Convex IDs usually start with "j" or similar if they are generic
              // If it's a Supabase UUID, db.get will throw
              requester = await ctx.db.get(visit.requested_by as any);
            } catch (e) {
              // Silently ignore invalid IDs during this phase
            }
          }

          if (visit.driver_id && typeof visit.driver_id === "string") {
            try {
              driver = await ctx.db.get(visit.driver_id as any);
            } catch (e) {
              // Silently ignore
            }
          }

          results.push({
            ...visit,
            requester: requester ? { full_name: (requester as any).full_name } : null,
            driver: driver ? { full_name: (driver as any).full_name } : null,
          });
        } catch (itemError) {
          console.error("Error processing individual visit:", itemError);
          // Still push the basic visit info even if lookup fails
          results.push({
            ...visit,
            requester: null,
            driver: null
          });
        }
      }
      
      // Sort manually in JS to avoid DB ordering issues
      return results.sort((a, b) => {
        const timeA = new Date(a.created_at || a._creationTime).getTime();
        const timeB = new Date(b.created_at || b._creationTime).getTime();
        return timeB - timeA;
      });
    } catch (error) {
      console.error("FATAL error in site_visits:listAll:", error);
      // If we are here, something is very wrong with the DB access or schema
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
