import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import { ConvexHttpClient } from 'convex/browser';
import * as dotenv from 'dotenv';
import { anyApi } from 'convex/server';

dotenv.config({ path: '.env.local' });

const convexUrl = process.env.VITE_CONVEX_URL;
if (!convexUrl) {
  console.error("VITE_CONVEX_URL not found in .env.local");
  process.exit(1);
}

const client = new ConvexHttpClient(convexUrl);

const CSV_DIR = path.join(process.cwd(), 'Database_csv');

// Mapping CSV filenames to Convex table names
const TABLE_MAP = {
  'profiles_export.csv': 'profiles',
  'departments_export.csv': 'departments',
  'projects_export.csv': 'projects',
  'announcements_export.csv': 'announcements',
  'sales_targets_export.csv': 'targets', // Supabase table was sales_targets, UI says targets
  'customers_export.csv': 'customers',
  'site_visits_export.csv': 'site_visits',
  'notifications_export.csv': 'notifications',
  'sales_export.csv': 'sales',
  'payments_export.csv': 'payments',
  // 'incentives_export.csv': 'incentives', // No data anyway
  // 'reports_export.csv': 'reports',       // No data anyway
  'activity_log_export.csv': 'activity_logs',
};

async function main() {
  console.log("Starting data migration to Convex...");

  for (const [filename, tableName] of Object.entries(TABLE_MAP)) {
    const filePath = path.join(CSV_DIR, filename);
    
    if (!fs.existsSync(filePath)) {
      console.log(`Skipping ${tableName} - file not found: ${filename}`);
      continue;
    }

    try {
      console.log(`\nImporting ${filename} to table -> ${tableName}...`);
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      
      const records = parse(fileContent, {
        columns: true,
        skip_empty_lines: true,
      });

      console.log(`Parsed ${records.length} records.`);
      
      if (records.length === 0) {
        console.log(`Skipping - no data in ${tableName}.`);
        continue;
      }

      // Process in batches of 50 to avoid size limits on mutation args
      const batchSize = 50;
      for (let i = 0; i < records.length; i += batchSize) {
        const batch = records.slice(i, i + batchSize);
        console.log(`  Sending batch ${i / batchSize + 1} (${batch.length} records)...`);
        
        // Call the seed:insertMany mutation
        await client.mutation(anyApi.seed.insertMany, {
          table: tableName,
          records: batch,
        });
      }
      
      console.log(`✅ Successfully imported ${tableName}.`);
    } catch (error) {
      console.error(`❌ Failed to import ${tableName}:`, error);
    }
  }

  console.log("\nMigration completed!");
}

main().catch(console.error);
