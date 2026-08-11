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
  { code: "WIRE-DC4", description: "4 SQMM Solar DC Wire (Tier E)", category: "Wiring", hpRating: "N/A", serialTracked: false, valuationAmount: 3500.00 },
  { code: "PCB-3HP", description: "PCB Controller Board 3HP (Tier A)", category: "Inverters", hpRating: "3HP", serialTracked: true, valuationAmount: 6000.00 },
  { code: "PCB-5HP", description: "PCB Controller Board 5HP (Tier A)", category: "Inverters", hpRating: "5HP", serialTracked: true, valuationAmount: 7500.00 },
  { code: "PCB-7.5HP", description: "PCB Controller Board 7.5HP (Tier A)", category: "Inverters", hpRating: "7.5HP", serialTracked: true, valuationAmount: 9000.00 },
  { code: "PCB-10HP", description: "PCB Controller Board 10HP (Tier A)", category: "Inverters", hpRating: "10HP", serialTracked: true, valuationAmount: 11000.00 },
  { code: "PUMP-3HP", description: "Submersible Pump 3HP (Tier A)", category: "Pumps", hpRating: "3HP", serialTracked: true, valuationAmount: 12000.00 },
  { code: "PUMP-5HP", description: "Submersible Pump 5HP (Tier A)", category: "Pumps", hpRating: "5HP", serialTracked: true, valuationAmount: 15000.00 },
  { code: "PUMP-7.5HP", description: "Submersible Pump 7.5HP (Tier A)", category: "Pumps", hpRating: "7.5HP", serialTracked: true, valuationAmount: 18000.00 },
  { code: "PUMP-10HP", description: "Submersible Pump 10HP (Tier A)", category: "Pumps", hpRating: "10HP", serialTracked: true, valuationAmount: 21000.00 },
  { code: "MOTOR-3HP", description: "Solar Pump Motor 3HP (Tier A)", category: "Motors", hpRating: "3HP", serialTracked: true, valuationAmount: 10000.00 },
  { code: "MOTOR-5HP", description: "Solar Pump Motor 5HP (Tier A)", category: "Motors", hpRating: "5HP", serialTracked: true, valuationAmount: 12500.00 },
  { code: "MOTOR-7.5HP", description: "Solar Pump Motor 7.5HP (Tier A)", category: "Motors", hpRating: "7.5HP", serialTracked: true, valuationAmount: 15000.00 },
  { code: "MOTOR-10HP", description: "Solar Pump Motor 10HP (Tier A)", category: "Motors", hpRating: "10HP", serialTracked: true, valuationAmount: 18000.00 },
  { code: "MC4-CON", description: "MC4 Connector Kit (10 pairs)", category: "Wiring", hpRating: "N/A", serialTracked: false, valuationAmount: 250.00 },
  { code: "3PIN-CON", description: "3-Pin Waterproof Connector", category: "Wiring", hpRating: "N/A", serialTracked: false, valuationAmount: 450.00 },
  { code: "TOGGLE-SW", description: "Heavy Duty Toggle Switch", category: "Balance of Systems", hpRating: "N/A", serialTracked: false, valuationAmount: 150.00 },
  { code: "MCB-16A", description: "DC MCB 16A Double Pole", category: "Balance of Systems", hpRating: "N/A", serialTracked: false, valuationAmount: 850.00 },
  { code: "RMS-DISP", description: "RMS LCD Display Unit", category: "Balance of Systems", hpRating: "N/A", serialTracked: true, valuationAmount: 3200.00 },
  
  // Custom solar pump and motor SKUs specified for Haryana stock list
  { code: "PUMP-7.5HP-DC-30M", description: "7.5HP DC 30M MONO SOLAR PUMP", category: "Pumps", hpRating: "7.5HP", serialTracked: true, valuationAmount: 18000.00 },
  { code: "PUMP-7.5HP-DC-50M", description: "7.5HP DC 50M MONO SOLAR PUMP", category: "Pumps", hpRating: "7.5HP", serialTracked: true, valuationAmount: 18500.00 },
  { code: "PUMP-7.5HP-DC-70M", description: "7.5HP DC 70M MONO SOLAR PUMP", category: "Pumps", hpRating: "7.5HP", serialTracked: true, valuationAmount: 19000.00 },
  { code: "PUMP-7.5HP-DC-100M", description: "7.5HP DC 100M MONO SOLAR PUMP", category: "Pumps", hpRating: "7.5HP", serialTracked: true, valuationAmount: 20000.00 },
  { code: "PUMP-10HP-DC-30M", description: "10HP DC MONO 30M SOLAR PUMP", category: "Pumps", hpRating: "10HP", serialTracked: true, valuationAmount: 21000.00 },
  { code: "PUMP-10HP-DC-50M", description: "10HP DC 50M MONO SOLAR PUMP", category: "Pumps", hpRating: "10HP", serialTracked: true, valuationAmount: 21500.00 },
  { code: "PUMP-10HP-DC-70M", description: "10HP DC 70M MONO SOLAR PUMP", category: "Pumps", hpRating: "10HP", serialTracked: true, valuationAmount: 22000.00 },
  { code: "PUMP-10HP-DC-100M", description: "10HP DC 100M MONO SOLAR PUMP", category: "Pumps", hpRating: "10HP", serialTracked: true, valuationAmount: 23000.00 },
  { code: "PUMP-10HP-AC-30M", description: "10HP AC 30M MONO SOLAR PUMP", category: "Pumps", hpRating: "10HP", serialTracked: true, valuationAmount: 20000.00 },
  { code: "PUMP-10HP-AC-50M", description: "10HP AC 50M MONO SOLAR PUMP", category: "Pumps", hpRating: "10HP", serialTracked: true, valuationAmount: 20500.00 },
  { code: "PUMP-10HP-AC-70M", description: "10HP AC 70M MONO SOLAR PUMP", category: "Pumps", hpRating: "10HP", serialTracked: true, valuationAmount: 21000.00 },
  { code: "PUMP-10HP-AC-100M", description: "10HP AC 100M MONO SOLAR PUMP", category: "Pumps", hpRating: "10HP", serialTracked: true, valuationAmount: 22000.00 },
  { code: "MOTOR-7.5HP-DC", description: "7.5hp Dc Mono Solar Motor", category: "Motors", hpRating: "7.5HP", serialTracked: true, valuationAmount: 14000.00 },
  { code: "MOTOR-10HP-AC", description: "10HP AC MONO SOLAR MOTOR", category: "Motors", hpRating: "10HP", serialTracked: true, valuationAmount: 16000.00 },
  { code: "MOTOR-10HP-DC", description: "10HP Dc Mono Solar Motor", category: "Motors", hpRating: "10HP", serialTracked: true, valuationAmount: 17000.00 },
  { code: "PCB-7.5HP-DC", description: "7.5HP Dc Mono Solar Controller Power Pcb", category: "Inverters", hpRating: "7.5HP", serialTracked: true, valuationAmount: 8500.00 },
  { code: "PCB-10HP-DC", description: "10hp Dc Mono Solar Controller Power Pcb", category: "Inverters", hpRating: "10HP", serialTracked: true, valuationAmount: 10500.00 },
  { code: "PCB-10HP-AC", description: "10hp Ac Mono Solar Controller Power Pcb", category: "Inverters", hpRating: "10HP", serialTracked: true, valuationAmount: 9500.00 },
  { code: "PCB-7.5HP-AC", description: "7.5hp Ac Mono Solar Controller Power Pcb", category: "Inverters", hpRating: "7.5HP", serialTracked: true, valuationAmount: 8000.00 },
  { code: "MCB-2P-32A", description: "2P 32A 800V DC MCB 7.5/10HP", category: "Balance of Systems", hpRating: "N/A", serialTracked: false, valuationAmount: 1200.00 },
  { code: "MC4-PV-1000V", description: "MC4 PV CABLE CONNECTOR PAIR 1000V", category: "Wiring", hpRating: "N/A", serialTracked: false, valuationAmount: 350.00 },
  { code: "3PIN-30A-500V", description: "3-Pin Cableconnector Pair30A 500V AC", category: "Wiring", hpRating: "N/A", serialTracked: false, valuationAmount: 550.00 },
  { code: "RMS-4G-GPS", description: "Remote Monittoring System 4g+Gps+Dispaly", category: "Balance of Systems", hpRating: "N/A", serialTracked: true, valuationAmount: 4500.00 },
  { code: "SPD-DC-1000V", description: "SPPV3T2-1000 DC SPD CLASS II 1000V", category: "Balance of Systems", hpRating: "N/A", serialTracked: false, valuationAmount: 1800.00 }
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
      // Clear existing data to prevent conflicts and key mismatches
      await prisma.unitLedger.deleteMany({});
      await prisma.movementSerialNumber.deleteMany({});
      await prisma.inventoryMovementLine.deleteMany({});
      await prisma.inventoryMovement.deleteMany({});
      await prisma.warehouse.deleteMany({});

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
      
      let whId = `wh-${schema}-1111`;
      if (schema === "rajasthan") whId = "wh-rajasthan-2222";
      if (schema === "haryana") whId = "wh-haryana-3333";
      if (schema === "mp") whId = "wh-mp-4444";

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



      // 7. Seed sample stock counts
      const sampleLedgerItems = [
        { serialNo: `${schema.toUpperCase()}-PV-SN-001`, partCode: "PV-330W", status: "Fresh", condition: "New", currentLocation: whId },
        { serialNo: `${schema.toUpperCase()}-PV-SN-002`, partCode: "PV-330W", status: "Fresh", condition: "New", currentLocation: whId },
        { serialNo: `${schema.toUpperCase()}-PV-SN-003`, partCode: "PV-330W", status: "Faulty-Received", condition: "New", currentLocation: whId },
        { serialNo: `${schema.toUpperCase()}-INV-SN-101`, partCode: "INV-5HP", status: "Faulty-Received", condition: "New", currentLocation: whId }
      ];

      // Seed initial starting stock levels from the Excel specification sheet
      const startingStocks = [
        { partCode: "PUMP-7.5HP-DC-30M", fresh: 0, faulty: 2, crompton: 4 },
        { partCode: "PUMP-7.5HP-DC-50M", fresh: 0, faulty: 0, crompton: 0 },
        { partCode: "PUMP-7.5HP-DC-70M", fresh: 0, faulty: 0, crompton: 0 },
        { partCode: "PUMP-7.5HP-DC-100M", fresh: 2, faulty: 0, crompton: 0 },
        { partCode: "PUMP-10HP-DC-30M", fresh: 0, faulty: 2, crompton: 0 },
        { partCode: "PUMP-10HP-DC-50M", fresh: 1, faulty: 0, crompton: 1 },
        { partCode: "PUMP-10HP-DC-70M", fresh: 0, faulty: 1, crompton: 0 },
        { partCode: "PUMP-10HP-DC-100M", fresh: 0, faulty: 0, crompton: 0 },
        { partCode: "PUMP-10HP-AC-30M", fresh: 0, faulty: 5, crompton: 6 },
        { partCode: "PUMP-10HP-AC-50M", fresh: 6, faulty: 0, crompton: 0 },
        { partCode: "PUMP-10HP-AC-70M", fresh: 0, faulty: 1, crompton: 0 },
        { partCode: "PUMP-10HP-AC-100M", fresh: 0, faulty: 0, crompton: 0 },
        { partCode: "MOTOR-7.5HP-DC", fresh: 2, faulty: 5, crompton: 8 },
        { partCode: "MOTOR-10HP-AC", fresh: 0, faulty: 21, crompton: 11 },
        { partCode: "MOTOR-10HP-DC", fresh: 0, faulty: 8, crompton: 4 },
        { partCode: "PCB-7.5HP-DC", fresh: 2, faulty: 0, crompton: 0 },
        { partCode: "PCB-10HP-DC", fresh: 5, faulty: 0, crompton: 2 },
        { partCode: "PCB-10HP-AC", fresh: 10, faulty: 5, crompton: 8 },
        { partCode: "MCB-2P-32A", fresh: 30, faulty: 3, crompton: 0 },
        { partCode: "MC4-PV-1000V", fresh: 15, faulty: 13, crompton: 15 },
        { partCode: "3PIN-30A-500V", fresh: 20, faulty: 11, crompton: 15 },
        { partCode: "RMS-4G-GPS", fresh: 23, faulty: 4, crompton: 7 },
        { partCode: "SPD-DC-1000V", fresh: 38, faulty: 2, crompton: 0 }
      ];

      for (const stock of startingStocks) {
        // 1. Fresh stock
        for (let i = 1; i <= stock.fresh; i++) {
          sampleLedgerItems.push({
            serialNo: `${schema.toUpperCase()}-${stock.partCode}-FR-${String(i).padStart(3, "0")}`,
            partCode: stock.partCode,
            status: "Fresh",
            condition: "New",
            currentLocation: whId
          });
        }
        // 2. Faulty stock
        for (let i = 1; i <= stock.faulty; i++) {
          sampleLedgerItems.push({
            serialNo: `${schema.toUpperCase()}-${stock.partCode}-FA-${String(i).padStart(3, "0")}`,
            partCode: stock.partCode,
            status: "Faulty-Received",
            condition: "New",
            currentLocation: whId
          });
        }
        // 3. Crompton / RMA stock
        for (let i = 1; i <= stock.crompton; i++) {
          sampleLedgerItems.push({
            serialNo: `${schema.toUpperCase()}-${stock.partCode}-CR-${String(i).padStart(3, "0")}`,
            partCode: stock.partCode,
            status: "At-Manufacturer",
            condition: "New",
            currentLocation: "Crompton Greaves Consumer Electricals Ltd."
          });
        }
      }

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
