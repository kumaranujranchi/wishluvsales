import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import { ConvexHttpClient } from 'convex/browser';
import * as dotenv from 'dotenv';
import { anyApi } from 'convex/server';

dotenv.config({ path: '.env.local' });
const client = new ConvexHttpClient(process.env.VITE_CONVEX_URL);
const CSV_DIR = path.join(process.cwd(), 'Database_csv');

async function main() {
  const fileContent = fs.readFileSync(path.join(CSV_DIR, 'sales_rows.csv'), 'utf-8');
  const records = parse(fileContent, { columns: true, skip_empty_lines: true });

  try {
    const batch = records.slice(0, 50);
    await client.mutation(anyApi.seed.insertMany, {
      table: 'sales',
      records: batch,
    });
    console.log("Success");
  } catch (error) {
    console.error("Error:", error);
  }
}
main().catch(console.error);
