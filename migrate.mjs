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

// Mapping table names to possible CSV suffixes
const TABLES = [
  { table: 'profiles', files: ['profiles_export.csv', 'profiles_rows.csv'] },
  { table: 'departments', files: ['departments_export.csv', 'departments_rows.csv'] },
  { table: 'projects', files: ['projects_export.csv', 'projects_rows.csv'] },
  { table: 'announcements', files: ['announcements_export.csv', 'announcements_rows.csv'] },
  { table: 'targets', files: ['sales_targets_export.csv', 'sales_targets_rows.csv'] },
  { table: 'customers', files: ['customers_export.csv', 'customers_rows.csv'] },
  { table: 'site_visits', files: ['site_visits_export.csv', 'site_visits_rows.csv'] },
  { table: 'notifications', files: ['notifications_export.csv', 'notifications_rows.csv'] },
  { table: 'sales', files: ['sales_export.csv', 'sales_rows.csv'] },
  { table: 'payments', files: ['payments_export.csv', 'payments_rows.csv'] },
  { table: 'activity_logs', files: ['activity_log_export.csv', 'activity_log_rows.csv'] },
  { table: 'audit_logs', files: ['audit_logs_rows.csv'] },
];

async function main() {
  console.log("Starting data migration to Convex...");

  for (const tableConfig of TABLES) {
    let filePath = null;
    let foundFilename = null;

    for (const filename of tableConfig.files) {
      const p = path.join(CSV_DIR, filename);
      if (fs.existsSync(p)) {
        filePath = p;
        foundFilename = filename;
        break;
      }
    }
    
    const tableName = tableConfig.table;

    if (!filePath) {
      console.log(`Skipping ${tableName} - no matching CSV file found.`);
      continue;
    }

    try {
      console.log(`\nImporting ${foundFilename} to table -> ${tableName}...`);
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

      console.log(`  Clearing existing data in ${tableName}...`);
      await client.mutation(anyApi.seed.clearTable, { table: tableName });

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
