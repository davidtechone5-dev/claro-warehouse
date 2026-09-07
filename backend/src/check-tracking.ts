import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";

dotenv.config();
const baseUrl = process.env.DIRECT_URL || process.env.DATABASE_URL || "";

async function check(schema: string) {
  const url = baseUrl.includes("?") ? `${baseUrl}&schema=${schema}` : `${baseUrl}?schema=${schema}`;
  const prisma = new PrismaClient({ datasources: { db: { url } } });
  try {
    const parts = await prisma.part.findMany();
    const strictParts = parts.filter(p => p.trackingType === "STRICT");
    const dispatchOnlyParts = parts.filter(p => p.trackingType === "DISPATCH_ONLY");
    const noneParts = parts.filter(p => p.trackingType === "NONE");
    console.log(`\n🏢 Schema [${schema.toUpperCase()}]: Total Parts = ${parts.length}`);
    console.log(`   - STRICT (Stage 1 Serial COMPULSORY): ${strictParts.length} parts (${strictParts.map(p => p.code).slice(0, 4).join(", ")}...)`);
    console.log(`   - DISPATCH_ONLY (Serial at Dispatch): ${dispatchOnlyParts.length} parts (${dispatchOnlyParts.map(p => p.code).join(", ")})`);
    console.log(`   - NONE (Non-serialized): ${noneParts.length} parts (${noneParts.map(p => p.code).slice(0, 4).join(", ")}...)`);
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  for (const s of ["jalna", "rajasthan", "haryana", "mp"]) {
    await check(s);
  }
}

main().catch(console.error);
