import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";

dotenv.config();

const schemas = ["jalna", "rajasthan", "haryana", "mp"];

// Standard AP 2kW kit material list from the specification (Section 5)
const defaultParts = [
  { code: "PV-330W", description: "Solar Panels 330W (Tier A)", category: "Panels", hpRating: "N/A", serialTracked: true, valuationAmount: 8500.00 },
  { code: "INV-5HP", description: "Inverter Box 5HP w/ RMS (Tier A)", category: "Inverters", hpRating: "5HP", serialTracked: true, valuationAmount: 22000.00 },
  { code: "ACDB-01", description: "AC Distribution Box (Tier B)", category: "Balance of Systems", hpRating: "N/A", serialTracked: false, valuationAmount: 2500.00 },
  { code: "DCDB-01", description: "DC Distribution Box (Tier B)", category: "Balance of Systems", hpRating: "N/A", serialTracked: false, valuationAmount: 2800.00 },
  { code: "LA-01", description: "Lightning Arrestor Kit (Tier B)", category: "Balance of Systems", hpRating: "N/A", serialTracked: false, valuationAmount: 1500.00 },
  { code: "STRUCT-RAF", description: "Solar Structure Rafters (Tier D)", category: "Structures", hpRating: "N/A", serialTracked: false, valuationAmount: 4000.00 },
  { code: "WIRE-DC4", description: "4 SQMM Solar DC Wire (Tier E)", category: "Wiring", hpRating: "N/A", serialTracked: false, valuationAmount: 3500.00 }
];

const defaultManufacturers = [
  { name: "Crompton Greaves Consumer Electricals Ltd." },
  { name: "Lubi Pumps" },
  { name: "Shakti Pumps" }
];

const defaultEngineers = [
  { name: "Pruthviraj Borde", email: "pruthviraj@claro.com", phone: "9001163111", isActive: true },
  { name: "Shaikh Shoeb Ahmed", email: "shoeb@claro.com", phone: "9001163222", isActive: true },
  { name: "Sikander", email: "sikander@claro.com", phone: "9001163333", isActive: true }
];

const defaultInstallations = [
  { applicationId: "MS1605206532", clientName: "Jalna Client 1" },
  { applicationId: "MS1603302551", clientName: "Jalna Client 2" },
  { applicationId: "SWPS/2024/01008", clientName: "Haryana Client 1" }
];

const defaultUser = {
  id: "user-default-admin",
  email: "milan@claro.com",
  fullName: "Milan — Maintenance Lead",
  role: "Warehouse"
};

async function main() {
  const baseUrl = process.env.DIRECT_URL || process.env.DATABASE_URL;
  if (!baseUrl) {
    console.error("❌ DATABASE_URL/DIRECT_URL is not set in environment variables!");
    process.exit(1);
  }

  for (const schema of schemas) {
    console.log(`\n🌱 Seeding database schema: "${schema}"...`);

    // Override connection URL schema
    let connectionUrl = baseUrl;
    if (baseUrl.includes("?")) {
      const urlObj = new URL(baseUrl);
      urlObj.searchParams.set("schema", schema);
      connectionUrl = urlObj.toString();
    } else {
      connectionUrl = `${baseUrl}?schema=${schema}`;
    }

    const prisma = new PrismaClient({
      datasources: {
        db: {
          url: connectionUrl
        }
      }
    });

    try {
      // 1. Seed User
      await prisma.user.upsert({
        where: { id: defaultUser.id },
        update: defaultUser,
        create: defaultUser
      });

      // 2. Seed Warehouse record
      const whName = schema === "jalna" ? "Jalna MH" : schema.charAt(0).toUpperCase() + schema.slice(1);
      const whCode = schema === "jalna" ? "JAL" : schema.substring(0, 3).toUpperCase();
      const stateCode = schema === "jalna" ? "MH" : schema.substring(0, 2).toUpperCase();
      const whId = `wh-${schema}-1111`;

      await prisma.warehouse.upsert({
        where: { name: whName },
        update: { code: whCode, stateCode },
        create: { id: whId, name: whName, code: whCode, stateCode }
      });

      // 3. Seed Manufacturers
      for (const mfr of defaultManufacturers) {
        await prisma.manufacturer.upsert({
          where: { name: mfr.name },
          update: {},
          create: mfr
        });
      }

      // 4. Seed Parts
      for (const part of defaultParts) {
        await prisma.part.upsert({
          where: { code: part.code },
          update: part,
          create: part
        });
      }

      // 5. Seed Engineers
      for (const eng of defaultEngineers) {
        await prisma.engineer.upsert({
          where: { email: eng.email },
          update: eng,
          create: eng
        });
      }

      // 6. Seed Master Installations
      for (const inst of defaultInstallations) {
        await prisma.masterInstallation.upsert({
          where: { applicationId: inst.applicationId },
          update: inst,
          create: inst
        });
      }

      // Clear existing ledgers
      await prisma.unitLedger.deleteMany({});
      await prisma.movementSerialNumber.deleteMany({});
      await prisma.inventoryMovementLine.deleteMany({});
      await prisma.inventoryMovement.deleteMany({});

      // 7. Seed sample stock counts
      const sampleLedgerItems = [
        { serialNo: `${schema.toUpperCase()}-PV-SN-001`, partCode: "PV-330W", status: "Fresh", condition: "New", currentLocation: whId },
        { serialNo: `${schema.toUpperCase()}-PV-SN-002`, partCode: "PV-330W", status: "Fresh", condition: "New", currentLocation: whId },
        { serialNo: `${schema.toUpperCase()}-PV-SN-003`, partCode: "PV-330W", status: "Faulty-Received", condition: "New", currentLocation: whId },
        { serialNo: `${schema.toUpperCase()}-INV-SN-101`, partCode: "INV-5HP", status: "Faulty-Received", condition: "New", currentLocation: whId }
      ];

      for (const ledger of sampleLedgerItems) {
        await prisma.unitLedger.create({ data: ledger });
      }

      console.log(`✅ [Seed] Successfully completed seeding for schema: "${schema}"`);
    } catch (err: any) {
      console.error(`❌ [Seed] Error seeding schema "${schema}":`, err.message);
    } finally {
      await prisma.$disconnect();
    }
  }

  console.log("\n✨ Seeding completed successfully with standard parts list!");
}

main().catch((err) => {
  console.error("❌ Seeding script failed:", err);
  process.exit(1);
});
