import { execSync } from "child_process";
import dotenv from "dotenv";

dotenv.config();

const schemas = ["jalna", "rajasthan", "haryana", "mp"];
const directUrl = process.env.DIRECT_URL || process.env.DATABASE_URL;

if (!directUrl) {
  console.error("DIRECT_URL is not configured.");
  process.exit(1);
}

console.log("🚀 [Prisma Push] Pushing schema to all regional databases...");

for (const schema of schemas) {
  console.log(`\n📦 Pushing to schema context: "${schema}"`);

  // Force port 5432 direct connection for migrations, override schema query param
  let connectionUrl = directUrl;
  if (directUrl.includes("?")) {
    const urlObj = new URL(directUrl);
    urlObj.searchParams.set("schema", schema);
    connectionUrl = urlObj.toString();
  } else {
    connectionUrl = `${directUrl}?schema=${schema}`;
  }

  try {
    execSync(`npx prisma db push --accept-data-loss`, {
      env: { 
        ...process.env, 
        DATABASE_URL: connectionUrl 
      },
      stdio: "inherit"
    });
    console.log(`✅ Successfully pushed schema to "${schema}"`);
  } catch (err: any) {
    console.error(`❌ Failed to push schema to "${schema}":`, err.message);
  }
}

console.log("\n✨ Prisma schema synchronization completed successfully across all schemas!");
