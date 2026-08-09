import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";

dotenv.config();

async function main() {
  const url = process.env.DIRECT_URL || process.env.DATABASE_URL;
  if (!url) {
    console.error("DIRECT_URL is not configured.");
    process.exit(1);
  }

  // Point to the main public/default schema first to create other schemas
  console.log("🔌 Connecting to Supabase direct database (port 5432)...");
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: url.includes("?") 
          ? url.replace(/schema=[a-zA-Z0-9_-]+/g, "schema=public")
          : `${url}?schema=public`
      }
    }
  });

  try {
    console.log("⚙️ Creating regional PostgreSQL schemas...");
    await prisma.$executeRawUnsafe("CREATE SCHEMA IF NOT EXISTS jalna;");
    await prisma.$executeRawUnsafe("CREATE SCHEMA IF NOT EXISTS rajasthan;");
    await prisma.$executeRawUnsafe("CREATE SCHEMA IF NOT EXISTS haryana;");
    await prisma.$executeRawUnsafe("CREATE SCHEMA IF NOT EXISTS mp;");
    console.log("✨ Schemas 'jalna', 'rajasthan', 'haryana', and 'mp' registered successfully in Supabase!");
  } catch (err: any) {
    console.error("❌ Failed to create schemas:", err.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
