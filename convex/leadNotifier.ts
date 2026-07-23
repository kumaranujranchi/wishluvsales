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
      (p: any) => p._id === args.assignedToId || p.supabase_id === args.assignedToId
    );

    if (!assignedUser) {
      console.error(
        `[LeadNotifier] Assigned user profile not found for ID: ${args.assignedToId}`
      );
      return { success: false, reason: "USER_NOT_FOUND" };
    }

    const assignedUserEmail = assignedUser.email;
    const assignedUserName = assignedUser.full_name;

    // 2. Find reporting manager (Team Leader) if exists
    let manager = null;
    if (assignedUser.reporting_manager_id) {
      manager = allProfiles.find(
        (p: any) =>
          p._id === assignedUser.reporting_manager_id ||
          p.supabase_id === assignedUser.reporting_manager_id
      );
    }

    // 3. Prepare SMTP Transporter
    const smtpHost = process.env.SMTP_HOST || "smtp.hostinger.com";
    const smtpPort = parseInt(process.env.SMTP_PORT || "465");
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;

    const actionLabel = args.isReassignment ? "re-assigned" : "assigned";

    if (!smtpUser || !smtpPass) {
      console.warn(
        "[LeadNotifier] SMTP credentials not configured in Convex Dashboard — skipping email send."
      );
      console.log(
        `[LeadNotifier LOG] Lead "${args.leadName}" assigned to ${assignedUserName} (${assignedUserEmail}). Manager TL: ${manager ? manager.full_name + ' (' + manager.email + ')' : 'None'}`
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

        // Common email table HTML
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

        const detailsTableHtml = `
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
        `;

        // 3a. Send Email to Sales Executive
        if (assignedUserEmail) {
          const execSubject = args.isReassignment
            ? `Lead Re-Assigned: ${args.leadName}`
            : `New Lead Assigned: ${args.leadName}`;

          const execHtml = `
            <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0;">
              <div style="background: linear-gradient(135deg, #0A1C37 0%, #1673FF 100%); padding: 28px 24px; text-align: center;">
                <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 700;">WishPro</h1>
                <p style="color: rgba(255,255,255,0.85); margin: 6px 0 0; font-size: 13px;">Sales Management Portal</p>
              </div>
              <div style="padding: 28px 24px;">
                <p style="color: #1e293b; font-size: 15px; margin: 0 0 6px;">Hello <strong>${assignedUserName}</strong>,</p>
                <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 20px;">
                  A new lead has been <strong>${actionLabel}</strong> to you. Please review the details below and take necessary action.
                </p>
                ${detailsTableHtml}
                <div style="text-align: center; margin-bottom: 20px;">
                  <a href="https://wishpro.netlify.app" style="display: inline-block; background: linear-gradient(135deg, #1673FF 0%, #0A1C37 100%); color: #ffffff; text-decoration: none; padding: 12px 32px; border-radius: 8px; font-size: 14px; font-weight: 600;">
                    Open WishPro Portal →
                  </a>
                </div>
              </div>
            </div>
          `;

          await transporter.sendMail({
            from: `"WishPro Leads" <${smtpUser}>`,
            to: assignedUserEmail,
            subject: execSubject,
            text: `Hello ${assignedUserName}, a new lead "${args.leadName}" (${args.leadPhone}) has been ${actionLabel} to you.`,
            html: execHtml,
          });

          console.log(`[LeadNotifier] Email sent to Sales Executive ${assignedUserEmail}`);
        }

        // 3b. Send Email to Team Leader / Reporting Manager
        if (manager && manager.email) {
          const managerSubject = args.isReassignment
            ? `[TL Notification] Lead Re-Assigned to ${assignedUserName}: ${args.leadName}`
            : `[TL Notification] New Lead Assigned to ${assignedUserName}: ${args.leadName}`;

          const managerHtml = `
            <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0;">
              <div style="background: linear-gradient(135deg, #0A1C37 0%, #1673FF 100%); padding: 28px 24px; text-align: center;">
                <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 700;">WishPro — Team Lead Alert</h1>
                <p style="color: rgba(255,255,255,0.85); margin: 6px 0 0; font-size: 13px;">Executive Lead Assignment Alert</p>
              </div>
              <div style="padding: 28px 24px;">
                <p style="color: #1e293b; font-size: 15px; margin: 0 0 6px;">Hello <strong>${manager.full_name}</strong>,</p>
                <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 20px;">
                  A new lead <strong>"${args.leadName}"</strong> has been ${actionLabel} to your team executive <strong>${assignedUserName}</strong>.
                </p>
                ${detailsTableHtml}
                <div style="text-align: center; margin-bottom: 20px;">
                  <a href="https://wishpro.netlify.app" style="display: inline-block; background: linear-gradient(135deg, #1673FF 0%, #0A1C37 100%); color: #ffffff; text-decoration: none; padding: 12px 32px; border-radius: 8px; font-size: 14px; font-weight: 600;">
                    Open WishPro Portal →
                  </a>
                </div>
              </div>
            </div>
          `;

          await transporter.sendMail({
            from: `"WishPro Leads" <${smtpUser}>`,
            to: manager.email,
            subject: managerSubject,
            text: `Hello ${manager.full_name}, a new lead "${args.leadName}" has been assigned to your executive ${assignedUserName}.`,
            html: managerHtml,
          });

          console.log(`[LeadNotifier] Email sent to Team Leader / Manager ${manager.email}`);
        }

      } catch (err: any) {
        console.error("[LeadNotifier] Failed to send email notifications:", err.message);
      }
    }

    // 4. Send in-app notification to reporting manager (if exists)
    if (manager) {
      try {
        await ctx.runMutation(api.notifications.add, {
          user_id: manager._id,
          title: args.isReassignment ? "Lead Re-Assigned" : "New Lead Assigned",
          message: `A new lead "${args.leadName}" has been ${actionLabel} to your executive ${assignedUserName}.`,
          type: "lead_assignment",
          related_entity_type: "leads",
          created_at: new Date().toISOString(),
        });
      } catch (err: any) {
        console.error("[LeadNotifier] Manager in-app notification failed:", err.message);
      }
    }

    return { success: true };
  },
});
