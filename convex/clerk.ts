import { action } from "./_generated/server";
import { v } from "convex/values";

export const createUser = action({
  args: {
    email: v.string(),
    fullName: v.string(),
  },
  handler: async (ctx, args) => {
    const clerkSecretKey = process.env.CLERK_SECRET_KEY;
    if (!clerkSecretKey) {
      console.warn("CLERK_SECRET_KEY is not configured in Convex environment. Skipping Clerk user creation.");
      return { success: false, reason: "CLERK_SECRET_KEY_MISSING" };
    }

    const nameParts = args.fullName.trim().split(/\s+/);
    const firstName = nameParts[0] || "";
    const lastName = nameParts.slice(1).join(" ") || "";

    try {
      const response = await fetch("https://api.clerk.com/v1/users", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${clerkSecretKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email_address: [args.email],
          first_name: firstName,
          last_name: lastName,
          skip_password_requirement: true,
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        const errorMessage = errData.errors?.[0]?.message || "Unknown error";
        console.error("Clerk user creation failed:", errData);
        return { success: false, reason: errorMessage };
      }

      const userData = await response.json();
      return { success: true, userId: userData.id };
    } catch (error: any) {
      console.error("Error creating user in Clerk:", error);
      return { success: false, reason: error.message || "Network error" };
    }
  },
});
