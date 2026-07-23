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

      // Combine extra details into notes (Plot size, Budget, City)
      const extraNotes = [];
      if (body.plot_size || body["Plot Size"]) extraNotes.push(`Plot Size: ${body.plot_size || body["Plot Size"]}`);
      if (body.budget || body.Budget) extraNotes.push(`Budget: ${body.budget || body.Budget}`);
      if (body.city || body.City) extraNotes.push(`City: ${body.city || body.City}`);
      if (body.notes || body.Notes) extraNotes.push(body.notes || body.Notes);

      const notes = extraNotes.length > 0 ? extraNotes.join(" | ") : "Meta Ads Lead";

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
