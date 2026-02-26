// Decommissioned - Logic moved to Convex activity_logs migration
export const logActivity = async (action: string, details: string) => {
    console.log(`[Activity Log] ${action}: ${details}`);
};
