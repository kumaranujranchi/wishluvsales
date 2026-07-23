import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api } from "./_generated/api";

const http = httpRouter();

http.route({
  path: "/api/webhook/meta-lead",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const body = await request.json();

      const name = body.name || body.LeadName || body.Full_Name || body["Full Name"] || body.full_name || "Meta Lead";
      const rawPhone = String(body.phone || body.phone_number || body.Phone || body.Mobile || body["Phone Number"] || "");
      const digitsOnly = rawPhone.replace(/\D/g, "");
      const phone = digitsOnly.length >= 10 ? digitsOnly.slice(-10) : digitsOnly;

      const email = body.email || body.Email || body["Email Address"] || undefined;
      const source = body.source || body.Source || "Meta";
      const project_id = body.project_id || body.projectId || body.project_name || "Vrinda Green City";

      // Combine ONLY Plot size, Budget, City into notes (ignoring Meta ID junk)
      const extraNotes = [];
      if (body.plot_size || body["Plot Size"]) extraNotes.push(`Plot Size: ${body.plot_size || body["Plot Size"]}`);
      if (body.budget || body.Budget) extraNotes.push(`Budget: ${body.budget || body.Budget}`);
      if (body.city || body.City) extraNotes.push(`City: ${body.city || body.City}`);

      const notes = extraNotes.length > 0 ? extraNotes.join(" | ") : "Meta Lead";

      if (!phone || phone.length < 7) {
        return new Response(
          JSON.stringify({ success: false, error: "Valid phone number with at least 7 digits is required" }),
          {
            status: 400,
            headers: {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*",
            },
          }
        );
      }

      // Run Round-Robin Assignment Mutation
      const result = await ctx.runMutation(api.leads.autoAssignMetaLead, {
        name,
        phone,
        email,
        source,
        notes,
        project_id,
      });

      // Send email/manager notification asynchronously
      try {
        let projectName = "Vrinda Green City";
        if (result.project_id) {
          const allProjects = await ctx.runQuery(api.projects.list);
          const p = allProjects.find((prj: any) => prj._id === result.project_id || prj.supabase_id === result.project_id);
          if (p) projectName = p.name;
        }

        await ctx.runAction(api.leadNotifier.sendLeadAssignmentNotification, {
          assignedToId: result.assigned_to_id,
          leadName: name,
          leadPhone: phone,
          leadEmail: email,
          projectName: projectName,
          source: source,
          notes: notes,
          isReassignment: false,
        });
      } catch (notifyErr: any) {
        console.error("[MetaWebhook] Notification error:", notifyErr?.message || notifyErr);
      }

      return new Response(JSON.stringify(result), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      });
    } catch (err: any) {
      console.error("[MetaWebhook] Internal error:", err);
      return new Response(JSON.stringify({ success: false, error: err.message || "Internal server error" }), {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }
  }),
});

// Handle CORS preflight requests
http.route({
  path: "/api/webhook/meta-lead",
  method: "OPTIONS",
  handler: httpAction(async () => {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }),
});

// 99acres Dedicated Webhook Endpoint
http.route({
  path: "/api/webhook/99acres-lead",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const body = await request.json();

      const name = body.name || body.LeadName || body.buyerName || body.clientName || body.full_name || "99acres Lead";
      const rawPhone = String(body.phone || body.mobile || body.phone_number || body.contactNumber || body.mobileNumber || "");
      const digitsOnly = rawPhone.replace(/\D/g, "");
      const phone = digitsOnly.length >= 10 ? digitsOnly.slice(-10) : digitsOnly;

      const email = body.email || body.emailId || body.email_id || undefined;
      const source = "99acres";
      const project_id = body.project_name || body.projectName || body.project || "Vrinda Green City";
      const notes = body.notes || body.query || body.userQuery || body.budget || "99acres Lead";

      if (!phone || phone.length < 7) {
        return new Response(
          JSON.stringify({ success: false, error: "Valid phone number required" }),
          { status: 400, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
        );
      }

      const result = await ctx.runMutation(api.leads.autoAssignMetaLead, {
        name,
        phone,
        email,
        source,
        notes,
        project_id,
      });

      // Send email/manager notification asynchronously
      try {
        let projectName = "Vrinda Green City";
        if (result.project_id) {
          const allProjects = await ctx.runQuery(api.projects.list);
          const p = allProjects.find((prj: any) => prj._id === result.project_id || prj.supabase_id === result.project_id);
          if (p) projectName = p.name;
        }

        await ctx.runAction(api.leadNotifier.sendLeadAssignmentNotification, {
          assignedToId: result.assigned_to_id,
          leadName: name,
          leadPhone: phone,
          leadEmail: email,
          projectName: projectName,
          source: source,
          notes: notes,
          isReassignment: false,
        });
      } catch (notifyErr: any) {
        console.error("[99acresWebhook] Notification error:", notifyErr?.message || notifyErr);
      }

      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    } catch (err: any) {
      return new Response(JSON.stringify({ success: false, error: err.message }), {
        status: 500,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }
  }),
});

http.route({
  path: "/api/webhook/99acres-lead",
  method: "OPTIONS",
  handler: httpAction(async () => {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }),
});

export default http;
