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

      const name = body.name || body.LeadName || body.Full_Name || body["Full Name"] || "Meta Lead";
      const rawPhone = String(body.phone || body.phone_number || body.Phone || body.Mobile || body["Phone Number"] || "");
      const phone = rawPhone.replace(/\D/g, "").slice(-10);
      const email = body.email || body.Email || body["Email Address"] || undefined;
      const source = body.source || body.Source || "Meta";
      const notes = body.notes || body.Notes || body.campaign_name || body.form_name || undefined;
      const project_id = body.project_id || body.projectId || undefined;

      if (!phone || phone.length < 10) {
        return new Response(
          JSON.stringify({ success: false, error: "Valid 10-digit phone number is required" }),
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
        await ctx.runAction(api.leadNotifier.sendLeadAssignmentNotification, {
          assignedToId: result.assigned_to_id,
          leadName: name,
          leadPhone: phone,
          leadEmail: email,
          projectName: "Meta Campaign",
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

export default http;
