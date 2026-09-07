import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";

dotenv.config();
const baseUrl = process.env.DIRECT_URL || process.env.DATABASE_URL || "";

const schemas = ["jalna", "rajasthan", "haryana", "mp"];

async function updateSchemaTracking(schema: string) {
  const url = baseUrl.includes("?") ? `${baseUrl}&schema=${schema}` : `${baseUrl}?schema=${schema}`;
  const prisma = new PrismaClient({ datasources: { db: { url } } });

  try {
    const parts = await prisma.part.findMany();
    for (const part of parts) {
      let targetType = "STRICT";

      if (part.code.startsWith("MCB-") ||
          part.code.startsWith("SPD-") ||
          part.code.startsWith("MC4-") ||
          part.code.startsWith("3PIN-") ||
          part.code.includes("SWITCH") ||
          part.code.includes("JUMPER") ||
          part.category === "Wiring" ||
          (part.category === "Balance of Systems" && part.code !== "RMS-4G-GPS")) {
        targetType = "NONE";
      } else if (part.code === "RMS-4G-GPS" || part.code === "PV-MODULES" || part.category === "Solar Panels") {
        targetType = "DISPATCH_ONLY";
      } else {
        targetType = "STRICT";
      }

      const isSerialTracked = targetType !== "NONE";

      await prisma.part.update({
        where: { code: part.code },
        data: {
          trackingType: targetType,
          serialTracked: isSerialTracked
        }
      });
    }

    console.log(`✅ Standardized tracking types for schema: ${schema}`);
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  for (const s of schemas) {
    await updateSchemaTracking(s);
  }
}

main().catch(console.error);
