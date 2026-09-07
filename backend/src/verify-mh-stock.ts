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

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: connectionUrl
    }
  }
});

async function main() {
  const parts = await prisma.part.findMany({ orderBy: { category: "asc" } });
  console.log(`\n======================================================`);
  console.log(`📊 MAHARASHTRA (JALNA) WAREHOUSE STOCK AUDIT REPORT`);
  console.log(`======================================================`);
  console.log(`Total Parts in Catalog: ${parts.length}\n`);

  const summary: any[] = [];

  for (const part of parts) {
    const fresh = await prisma.unitLedger.count({
      where: { partCode: part.code, status: "Fresh" }
    });
    const faulty = await prisma.unitLedger.count({
      where: { partCode: part.code, status: "Faulty-Received" }
    });
    const atMfg = await prisma.unitLedger.count({
      where: { partCode: part.code, status: "At-Manufacturer" }
    });
    const dispatched = await prisma.unitLedger.count({
      where: { partCode: part.code, status: "Sent-to Farmer" }
    });

    if (fresh > 0 || faulty > 0 || atMfg > 0 || dispatched > 0) {
      summary.push({
        Part: part.code,
        Category: part.category,
        Tracking: part.trackingType,
        Fresh: fresh,
        Faulty: faulty,
        Total: fresh + faulty + atMfg + dispatched
      });
    }
  }

  console.table(summary);
  const totalUnits = await prisma.unitLedger.count();
  console.log(`\n✨ Total units in ledger: ${totalUnits}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
