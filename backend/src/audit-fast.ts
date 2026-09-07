import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";

dotenv.config();

const baseUrl = process.env.DIRECT_URL || process.env.DATABASE_URL;
let connectionUrl = baseUrl;
if (baseUrl?.includes("?")) {
  const urlObj = new URL(baseUrl);
  urlObj.searchParams.set("schema", "jalna");
  connectionUrl = urlObj.toString();
} else {
  connectionUrl = `${baseUrl}?schema=jalna`;
}

const prisma = new PrismaClient({ datasources: { db: { url: connectionUrl } } });

async function main() {
  const parts = await prisma.part.findMany();
  const partMap = new Map(parts.map(p => [p.code, p]));

  const grouped = await prisma.unitLedger.groupBy({
    by: ["partCode", "status"],
    _count: { serialNo: true }
  });

  const report: Record<string, any> = {};

  for (const g of grouped) {
    if (!report[g.partCode]) {
      const p = partMap.get(g.partCode);
      report[g.partCode] = {
        Part: g.partCode,
        Description: p?.description || "",
        Tracking: p?.trackingType || "STRICT",
        Fresh: 0,
        Faulty: 0,
        Total: 0
      };
    }
    if (g.status === "Fresh") report[g.partCode].Fresh += g._count.serialNo;
    if (g.status === "Faulty-Received") report[g.partCode].Faulty += g._count.serialNo;
    report[g.partCode].Total += g._count.serialNo;
  }

  console.log("\n=======================================================");
  console.log("📊 MAHARASHTRA (JALNA) WAREHOUSE LIVE STOCK IN DATABASE");
  console.log("=======================================================");
  console.table(Object.values(report));
  const total = await prisma.unitLedger.count();
  console.log(`✨ Total units in database for Maharashtra: ${total}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
