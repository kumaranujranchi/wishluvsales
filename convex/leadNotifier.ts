"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import { api } from "./_generated/api";
import nodemailer from "nodemailer";

/**
 * Sends an email notification to the assigned user when a lead is assigned/reassigned,
 * and creates an in-app notification for their reporting manager (if any).
 */
export const sendLeadAssignmentNotification = action({
  args: {
    assignedToId: v.string(),
    leadName: v.string(),
    leadPhone: v.string(),
    leadEmail: v.optional(v.string()),
    projectName: v.string(),
    source: v.string(),
    notes: v.optional(v.string()),
    isReassignment: v.boolean(),
  },
  handler: async (ctx, args) => {
    // 1. Fetch assigned user's profile
    const allProfiles = await ctx.runQuery(api.profiles.list);
    const assignedUser = allProfiles.find(
      (p: any) => p._id === args.assignedToId
    );

    if (!assignedUser) {
      console.error(
        `[LeadNotifier] Assigned user profile not found for ID: ${args.assignedToId}`
      );
      return { success: false, reason: "USER_NOT_FOUND" };
    }

    const assignedUserEmail = assignedUser.email;
    const assignedUserName = assignedUser.full_name;

    // 2. Send email to the assigned user
    const smtpHost = process.env.SMTP_HOST || "smtp.hostinger.com";
    const smtpPort = parseInt(process.env.SMTP_PORT || "465");
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;

    const actionLabel = args.isReassignment
      ? "re-assigned"
      : "assigned";

    if (!smtpUser || !smtpPass) {
      console.warn(
        "[LeadNotifier] SMTP credentials not configured — skipping email."
      );
      console.log(
        `[LeadNotifier DEV LOG] Would have emailed ${assignedUserEmail} about lead "${args.leadName}" being ${actionLabel}.`
      );
    } else {
      try {
        const transporter = nodemailer.createTransport({
          host: smtpHost,
          port: smtpPort,
          secure: smtpPort === 465,
          auth: {
            user: smtpUser,
            pass: smtpPass,
          },
        });

        const subject = args.isReassignment
          ? `Lead Re-Assigned: ${args.leadName}`
          : `New Lead Assigned: ${args.leadName}`;

        const notesSection = args.notes
          ? `
            <tr>
              <td style="padding: 8px 12px; color: #64748b; font-size: 13px; border-bottom: 1px solid #f1f5f9;">Notes</td>
              <td style="padding: 8px 12px; color: #1e293b; font-size: 13px; border-bottom: 1px solid #f1f5f9;">${args.notes}</td>
            </tr>`
          : "";

        const leadEmailRow = args.leadEmail
          ? `
            <tr>
              <td style="padding: 8px 12px; color: #64748b; font-size: 13px; border-bottom: 1px solid #f1f5f9;">Email</td>
              <td style="padding: 8px 12px; color: #1e293b; font-size: 13px; border-bottom: 1px solid #f1f5f9;">${args.leadEmail}</td>
            </tr>`
          : "";

        const html = `
          <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0;">
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #0A1C37 0%, #1673FF 100%); padding: 28px 24px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 700; letter-spacing: 0.5px;">WishPro</h1>
              <p style="color: rgba(255,255,255,0.85); margin: 6px 0 0; font-size: 13px;">Sales Management Portal</p>
            </div>

            <!-- Body -->
            <div style="padding: 28px 24px;">
              <p style="color: #1e293b; font-size: 15px; margin: 0 0 6px;">Hello <strong>${assignedUserName}</strong>,</p>
              <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 20px;">
                A new lead has been <strong>${actionLabel}</strong> to you. Please review the details below and take the necessary action at the earliest.
              </p>

              <!-- Lead Details Table -->
              <div style="border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; margin-bottom: 24px;">
                <div style="background: #f8fafc; padding: 10px 12px; border-bottom: 1px solid #e2e8f0;">
                  <strong style="color: #0A1C37; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">📋 Lead Details</strong>
                </div>
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 8px 12px; color: #64748b; font-size: 13px; border-bottom: 1px solid #f1f5f9; width: 120px;">Name</td>
                    <td style="padding: 8px 12px; color: #1e293b; font-size: 13px; font-weight: 600; border-bottom: 1px solid #f1f5f9;">${args.leadName}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 12px; color: #64748b; font-size: 13px; border-bottom: 1px solid #f1f5f9;">Phone</td>
                    <td style="padding: 8px 12px; color: #1e293b; font-size: 13px; border-bottom: 1px solid #f1f5f9;">${args.leadPhone}</td>
                  </tr>
                  ${leadEmailRow}
                  <tr>
                    <td style="padding: 8px 12px; color: #64748b; font-size: 13px; border-bottom: 1px solid #f1f5f9;">Project</td>
                    <td style="padding: 8px 12px; color: #1e293b; font-size: 13px; border-bottom: 1px solid #f1f5f9;">${args.projectName}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 12px; color: #64748b; font-size: 13px; border-bottom: 1px solid #f1f5f9;">Source</td>
                    <td style="padding: 8px 12px; color: #1e293b; font-size: 13px; border-bottom: 1px solid #f1f5f9;">${args.source}</td>
                  </tr>
                  ${notesSection}
                </table>
              </div>

              <!-- CTA -->
              <div style="text-align: center; margin-bottom: 20px;">
                <a href="https://wishpro.netlify.app" style="display: inline-block; background: linear-gradient(135deg, #1673FF 0%, #0A1C37 100%); color: #ffffff; text-decoration: none; padding: 12px 32px; border-radius: 8px; font-size: 14px; font-weight: 600;">
                  Open WishPro Portal →
                </a>
              </div>

              <p style="color: #94a3b8; font-size: 12px; text-align: center; margin: 0;">
                This is an automated notification from WishPro. Please do not reply to this email.
              </p>
            </div>

            <!-- Footer -->
            <div style="background: #f8fafc; padding: 16px 24px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="color: #94a3b8; font-size: 11px; margin: 0;">
                &copy; ${new Date().getFullYear()} WishPro Portal &middot; Sent on ${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}
              </p>
            </div>
          </div>
        `;

        await transporter.sendMail({
          from: `"WishPro Leads" <${smtpUser}>`,
          to: assignedUserEmail,
          subject,
          text: `Hello ${assignedUserName}, a new lead "${args.leadName}" (Phone: ${args.leadPhone}) from ${args.source} for project "${args.projectName}" has been ${actionLabel} to you. Login to WishPro to take action.`,
          html,
        });

        console.log(
          `[LeadNotifier] Email sent to ${assignedUserEmail} for lead "${args.leadName}".`
        );
      } catch (err: any) {
        console.error("[LeadNotifier] Failed to send email:", err.message);
        // Email failure should NOT block the lead assignment flow
      }
    }

    // 3. Send in-app notification to reporting manager (if exists)
    if (assignedUser.reporting_manager_id) {
      try {
        const manager = allProfiles.find(
          (p: any) => p._id === assignedUser.reporting_manager_id
        );

        if (manager) {
          await ctx.runMutation(api.notifications.add, {
            user_id: manager._id,
            title: args.isReassignment
              ? "Lead Re-Assigned"
              : "New Lead Assigned",
            message: `A new lead "${args.leadName}" has been ${actionLabel} to your executive ${assignedUserName}.`,
            type: "lead_assignment",
            related_entity_type: "leads",
            created_at: new Date().toISOString(),
          });
          console.log(
            `[LeadNotifier] In-app notification sent to manager ${manager.full_name} (${manager.email}).`
          );
        } else {
          console.warn(
            `[LeadNotifier] Reporting manager profile not found for ID: ${assignedUser.reporting_manager_id}`
          );
        }
      } catch (err: any) {
        console.error(
          "[LeadNotifier] Failed to create manager notification:",
          err.message
        );
      }
    }

    return { success: true };
  },
});
