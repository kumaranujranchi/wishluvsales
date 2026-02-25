import { mutation, action } from "./_generated/server";
import { v } from "convex/values";

// This mutation inserts an array of records into a given table
export const insertMany = mutation({
  args: {
    table: v.string(),
    records: v.array(v.any()),
  },
  handler: async (ctx, args) => {
    const tableId = args.table as any;
    
    // We do one by one because insertMany might not exist or we need to strip undefined
    for (const record of args.records) {
        // remove empty strings which CSV parser might have added for optional fields
        const cleanedRecord: any = {};
        for (const [key, value] of Object.entries(record)) {
            if (key === 'is_active' || key === 'force_password_change' || key === 'is_important' || key === 'is_published' || key === 'is_public' || key === 'is_agreement_done' || key === 'is_registry_done' || key === 'is_locked' || key === 'is_downloadable' || key === 'is_read' || key.includes('_paid')) {
                cleanedRecord[key] = String(value).toLowerCase() === "true";
            } else if (value !== "" && value !== undefined && value !== null) {
                cleanedRecord[key] = value;
            }
        }
        
        // Handle nested JSON for metadata
        if (cleanedRecord.metadata && typeof cleanedRecord.metadata === 'string') {
            try {
                cleanedRecord.metadata = JSON.parse(cleanedRecord.metadata);
            } catch(e) { /* ignore */ }
        }
        if (cleanedRecord.details && typeof cleanedRecord.details === 'string') {
             try {
                cleanedRecord.details = JSON.parse(cleanedRecord.details);
            } catch(e) { /* ignore */ }
        }
        
        // Arrays
        if (cleanedRecord.allowed_roles && typeof cleanedRecord.allowed_roles === 'string') {
            try { cleanedRecord.allowed_roles = JSON.parse(cleanedRecord.allowed_roles); } catch(e) { cleanedRecord.allowed_roles = [] }
        }
         if (cleanedRecord.site_photos && typeof cleanedRecord.site_photos === 'string') {
            try { cleanedRecord.site_photos = JSON.parse(cleanedRecord.site_photos); } catch(e) { cleanedRecord.site_photos = [] }
        }
         if (cleanedRecord.project_ids && typeof cleanedRecord.project_ids === 'string') {
            try { cleanedRecord.project_ids = JSON.parse(cleanedRecord.project_ids); } catch(e) { cleanedRecord.project_ids = [] }
        }
         if (cleanedRecord.co_owners && typeof cleanedRecord.co_owners === 'string') {
            try { cleanedRecord.co_owners = JSON.parse(cleanedRecord.co_owners); } catch(e) { cleanedRecord.co_owners = [] }
        }
        
        // Numbers
         if (cleanedRecord.target_sqft) cleanedRecord.target_sqft = Number(cleanedRecord.target_sqft) || 0;
         if (cleanedRecord.target_amount) cleanedRecord.target_amount = Number(cleanedRecord.target_amount) || 0;
         if (cleanedRecord.target_units) cleanedRecord.target_units = Number(cleanedRecord.target_units) || 0;
         if (cleanedRecord.location_lat) cleanedRecord.location_lat = Number(cleanedRecord.location_lat);
         if (cleanedRecord.location_lng) cleanedRecord.location_lng = Number(cleanedRecord.location_lng);
         if (cleanedRecord.start_odometer) cleanedRecord.start_odometer = Number(cleanedRecord.start_odometer);
         if (cleanedRecord.end_odometer) cleanedRecord.end_odometer = Number(cleanedRecord.end_odometer);
         
         const numberFields = ['area_sqft', 'rate_per_sqft', 'base_price', 'additional_charges', 'discount', 'plc', 'dev_charges', 'total_revenue', 'booking_amount', 'amount', 'calculation_year', 'total_incentive_amount', 'installment_1_amount', 'installment_2_amount', 'installment_3_amount', 'installment_4_amount'];
         numberFields.forEach(f => {
             if (cleanedRecord[f]) {
                 cleanedRecord[f] = Number(cleanedRecord[f]) || 0;
             }
         });


        // Replace 'id' with 'supabase_id' for migration reference
        if (cleanedRecord.id) {
            cleanedRecord.supabase_id = cleanedRecord.id;
            delete cleanedRecord.id;
        }

        if (cleanedRecord.supabase_id) {
            const existing = await ctx.db
                .query(tableId)
                .withIndex("by_supabase_id", (q: any) => q.eq("supabase_id", cleanedRecord.supabase_id))
                .unique();
            
            if (existing) {
                await ctx.db.patch(existing._id, cleanedRecord);
            } else {
                await ctx.db.insert(tableId, cleanedRecord);
            }
        } else {
            await ctx.db.insert(tableId, cleanedRecord);
        }
    }
    return { success: true, count: args.records.length };
  },
});

export const clearTable = mutation({
  args: { table: v.string() },
  handler: async (ctx, args) => {
    const tableId = args.table as any;
    const records = await ctx.db.query(tableId).collect();
    for (const record of records) {
      await ctx.db.delete(record._id);
    }
    return { success: true, count: records.length };
  },
});
