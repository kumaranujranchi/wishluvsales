import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

export const checkUser = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("profiles")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();
  },
});

export const storeOTP = mutation({
  args: {
    email: v.string(),
    otp: v.string(),
    expires_at: v.number(),
  },
  handler: async (ctx, args) => {
    // Delete previous OTPs for this email
    const existing = await ctx.db
      .query("otps")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .collect();
    for (const record of existing) {
      await ctx.db.delete(record._id);
    }

    // Insert new OTP
    await ctx.db.insert("otps", {
      email: args.email,
      otp: args.otp,
      expires_at: args.expires_at,
    });
  },
});

export const verifyOTP = mutation({
  args: { email: v.string(), otp: v.string() },
  handler: async (ctx, args) => {
    // 1. Fetch OTP record
    const otpRecord = await ctx.db
      .query("otps")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    if (!otpRecord) {
      return { success: false, reason: "INVALID_OTP" };
    }

    // 2. Validate expiration
    if (Date.now() > otpRecord.expires_at) {
      await ctx.db.delete(otpRecord._id);
      return { success: false, reason: "OTP_EXPIRED" };
    }

    // 3. Match OTP
    // For development, we allow '123456' as a universal fallback if SMTP is not set
    const smtpUser = process.env.SMTP_USER;
    const isDevFallback = !smtpUser && args.otp === "123456";

    if (otpRecord.otp !== args.otp && !isDevFallback) {
      return { success: false, reason: "INVALID_OTP" };
    }

    // 4. Retrieve Profile
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    if (!profile) {
      return { success: false, reason: "PROFILE_NOT_FOUND" };
    }

    if (!profile.is_active) {
      return { success: false, reason: "PROFILE_INACTIVE" };
    }

    // OTP verified successfully, clean it up
    await ctx.db.delete(otpRecord._id);

    return { success: true, profile };
  },
});
