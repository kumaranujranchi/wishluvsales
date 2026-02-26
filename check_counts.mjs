import { ConvexHttpClient } from 'convex/browser';
import * as dotenv from 'dotenv';
import { anyApi } from 'convex/server';

dotenv.config({ path: '.env.local' });
const client = new ConvexHttpClient(process.env.VITE_CONVEX_URL);

const TABLES = [
  'profiles', 'departments', 'projects', 'announcements', 
  'targets', 'customers', 'site_visits', 'notifications', 
  'sales', 'payments', 'activity_logs', 'audit_logs'
];

async function main() {
  console.log("Fetching row counts from Convex...\n");
  for (const table of TABLES) {
    try {
        const count = await client.mutation(anyApi.seed.countRecords, { table });
        console.log(`${table}: ${count}`);
    } catch (e) {
      console.log(`${table}: Error fetching count`, e.message);
    }
  }
}
main();
