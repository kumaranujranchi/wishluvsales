"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import { api } from "./_generated/api";
import nodemailer from "nodemailer";

export const sendOTP = action({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    // 1. Verify user exists in database
    const profile = await ctx.runQuery(api.auth.checkUser, { email: args.email });
    if (!profile) {
      return { success: false, reason: "USER_NOT_FOUND" };
    }
    if (!profile.is_active) {
      return { success: false, reason: "USER_INACTIVE" };
    }

    // 2. Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

    // 3. Store in DB
    await ctx.runMutation(api.auth.storeOTP, {
      email: args.email,
      otp,
      expires_at: expiresAt,
    });

    // 4. Send Email
    const smtpHost = process.env.SMTP_HOST || "smtp.hostinger.com";
    const smtpPort = parseInt(process.env.SMTP_PORT || "465");
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;

    if (!smtpUser || !smtpPass) {
      console.warn("SMTP credentials are not configured in Convex environment!");
      console.log(`[DEV OTP LOG] OTP for ${args.email} is: ${otp}`);
      return { 
        success: true, 
        devMode: true, 
        reason: "SMTP_NOT_CONFIGURED",
        otp: otp // return for easier login in development when not configured
      };
    }

    try {
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465, // true for 465, false for 587
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      });

      const mailOptions = {
        from: `"WishPro Security" <${smtpUser}>`,
        to: args.email,
        subject: "Your WishPro Login OTP",
        text: `Your login OTP is: ${otp}. It is valid for 10 minutes.`,
        html: `
          <div style="font-family: sans-serif; padding: 20px; max-width: 600px; margin: auto; border: 1px solid #e2e8f0; border-radius: 8px;">
            <h2 style="color: #0A1C37; text-align: center;">WishPro Security Verification</h2>
            <p>Hello,</p>
            <p>You requested a one-time password (OTP) to sign in to your WishPro portal account.</p>
            <div style="background: #f7fafc; padding: 15px; border-radius: 8px; text-align: center; margin: 20px 0; border: 1px solid #edf2f7;">
              <span style="font-size: 32px; font-weight: bold; letter-spacing: 4px; color: #1673FF;">${otp}</span>
            </div>
            <p style="color: #4a5568; font-size: 14px;">This OTP is valid for 10 minutes. If you did not request this code, please ignore this email.</p>
            <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
            <p style="font-size: 12px; color: #a0aec0; text-align: center;">&copy; WishPro Portal. Secure Connection.</p>
          </div>
        `,
      };

      await transporter.sendMail(mailOptions);
      return { success: true };
    } catch (err: any) {
      console.error("Error sending email:", err);
      return { success: false, reason: "EMAIL_SEND_FAILED", errorDetail: err.message };
    }
  },
});
