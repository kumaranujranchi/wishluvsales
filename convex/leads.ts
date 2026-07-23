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

/**
 * Automatically assigns incoming Meta / Google Sheet leads to active Sales Executives in a round-robin loop.
 */
export const autoAssignMetaLead = mutation({
  args: {
    name: v.string(),
    phone: v.string(),
    email: v.optional(v.string()),
    project_id: v.optional(v.string()),
    source: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // 1. Fetch active sales executives
    const allProfiles = await ctx.db.query("profiles").collect();
    let executives = allProfiles.filter(
      (p) => (p.role === "sales_executive" || p.role === "team_leader") && p.is_active !== false
    );

    if (executives.length === 0) {
      executives = allProfiles.filter((p) => p.is_active !== false);
    }

    if (executives.length === 0) {
      throw new Error("No active sales executives or staff members found to assign the lead.");
    }

    // Sort executives deterministically by ID
    executives.sort((a, b) => a._id.localeCompare(b._id));

    // 2. Find last assigned executive to determine round-robin index
    const lastLead = await ctx.db.query("leads").order("desc").first();
    let nextIndex = 0;

    if (lastLead && lastLead.assigned_to) {
      const lastIndex = executives.findIndex(
        (exec) => exec._id === lastLead.assigned_to || exec.supabase_id === lastLead.assigned_to
      );
      if (lastIndex !== -1) {
        nextIndex = (lastIndex + 1) % executives.length;
      }
    }

    const assignedExecutive = executives[nextIndex];

    // 3. Resolve project_id (match by name e.g. "Vrinda Green City" or fallback to Vrinda project)
    let projectId = args.project_id;
    const allProjects = await ctx.db.query("projects").collect();
    
    if (projectId) {
      const matchByName = allProjects.find(
        (p) => p._id === projectId || p.name.toLowerCase().includes(projectId.toLowerCase())
      );
      if (matchByName) {
        projectId = matchByName._id;
      }
    }

    if (!projectId || !allProjects.some((p) => p._id === projectId)) {
      const vrindaProject = allProjects.find((p) => p.name.toLowerCase().includes("vrinda"));
      projectId = vrindaProject ? vrindaProject._id : (allProjects[0] ? allProjects[0]._id : "general");
    }

    // 4. Create the new lead
    const now = new Date().toISOString();
    const leadId = await ctx.db.insert("leads", {
      name: args.name,
      phone: args.phone,
      email: args.email,
      project_id: projectId,
      assigned_to: assignedExecutive._id,
      source: args.source || "Meta",
      status: "pending",
      notes: args.notes || "Auto-assigned via Meta / Google Sheet Integration",
      created_at: now,
      updated_at: now,
    });

    return {
      success: true,
      lead_id: leadId,
      assigned_to_id: assignedExecutive._id,
      assigned_to_name: assignedExecutive.full_name,
      assigned_to_email: assignedExecutive.email,
      project_id: projectId,
    };
  },
});

