import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";

dotenv.config();

const baseUrl = process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!baseUrl) {
  console.error("❌ DATABASE_URL/DIRECT_URL is not set in environment variables!");
  process.exit(1);
}

let connectionUrl = baseUrl;
if (baseUrl.includes("?")) {
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

// Exact 31 SKUs for Maharashtra as per Parts for MH.docx (Table 0)
const defaultParts = [
  // 3HP (5 items)
  { code: "MOTOR-3HP-DC", description: "3HP Dc Mono Solar Motor", category: "Motors", hpRating: "3HP", serialTracked: true, trackingType: "STRICT", valuationAmount: 8000.00 },
  { code: "PUMP-3HP-DC-30M", description: "3HP DC 30M MONO SOLAR PUMP", category: "Pumps", hpRating: "3HP", serialTracked: true, trackingType: "STRICT", valuationAmount: 11000.00 },
  { code: "PUMP-3HP-DC-50M", description: "3HP DC 50M MONO SOLAR PUMP", category: "Pumps", hpRating: "3HP", serialTracked: true, trackingType: "STRICT", valuationAmount: 11500.00 },
  { code: "PUMP-3HP-DC-70M", description: "3HP DC 70M MONO SOLAR PUMP", category: "Pumps", hpRating: "3HP", serialTracked: true, trackingType: "STRICT", valuationAmount: 12000.00 },
  { code: "PCB-3HP-DC", description: "3HP Dc Mono Solar Controller Power Pcb", category: "Inverters", hpRating: "3HP", serialTracked: true, trackingType: "STRICT", valuationAmount: 4500.00 },

  // 5HP (6 items)
  { code: "MOTOR-5HP-DC", description: "5HP Dc Mono Solar Motor", category: "Motors", hpRating: "5HP", serialTracked: true, trackingType: "STRICT", valuationAmount: 10000.00 },
  { code: "PUMP-5HP-DC-30M", description: "5HP DC 30M MONO SOLAR PUMP", category: "Pumps", hpRating: "5HP", serialTracked: true, trackingType: "STRICT", valuationAmount: 14000.00 },
  { code: "PUMP-5HP-DC-50M", description: "5HP DC 50M MONO SOLAR PUMP", category: "Pumps", hpRating: "5HP", serialTracked: true, trackingType: "STRICT", valuationAmount: 14500.00 },
  { code: "PUMP-5HP-DC-70M", description: "5HP DC 70M MONO SOLAR PUMP", category: "Pumps", hpRating: "5HP", serialTracked: true, trackingType: "STRICT", valuationAmount: 15000.00 },
  { code: "PUMP-5HP-DC-100M", description: "5HP DC 100M MONO SOLAR PUMP", category: "Pumps", hpRating: "5HP", serialTracked: true, trackingType: "STRICT", valuationAmount: 16000.00 },
  { code: "PCB-5HP-DC", description: "5HP Dc Mono Solar Controller Power Pcb", category: "Inverters", hpRating: "5HP", serialTracked: true, trackingType: "STRICT", valuationAmount: 6000.00 },

  // 7.5HP (6 items)
  { code: "MOTOR-7.5HP-DC", description: "7.5hp Dc Mono Solar Motor", category: "Motors", hpRating: "7.5HP", serialTracked: true, trackingType: "STRICT", valuationAmount: 14000.00 },
  { code: "PUMP-7.5HP-DC-30M", description: "7.5HP DC 30M MONO SOLAR PUMP", category: "Pumps", hpRating: "7.5HP", serialTracked: true, trackingType: "STRICT", valuationAmount: 18000.00 },
  { code: "PUMP-7.5HP-DC-50M", description: "7.5HP DC 50M MONO SOLAR PUMP", category: "Pumps", hpRating: "7.5HP", serialTracked: true, trackingType: "STRICT", valuationAmount: 18500.00 },
  { code: "PUMP-7.5HP-DC-70M", description: "7.5HP DC 70M MONO SOLAR PUMP", category: "Pumps", hpRating: "7.5HP", serialTracked: true, trackingType: "STRICT", valuationAmount: 19000.00 },
  { code: "PUMP-7.5HP-DC-100M", description: "7.5HP DC 100M MONO SOLAR PUMP", category: "Pumps", hpRating: "7.5HP", serialTracked: true, trackingType: "STRICT", valuationAmount: 20000.00 },
  { code: "PCB-7.5HP-DC", description: "7.5HP Dc Mono Solar Controller Power Pcb", category: "Inverters", hpRating: "7.5HP", serialTracked: true, trackingType: "STRICT", valuationAmount: 8500.00 },

  // Balance of Systems & Accessories (14 items)
  { code: "MCB-2P-32A", description: "2P 32A 800V DC MCB 7.5/10HP", category: "Balance of Systems", hpRating: "N/A", serialTracked: false, trackingType: "NONE", valuationAmount: 1200.00 },
  { code: "MCB-2P-20A", description: "2P 20A 500V DC MCB 3HP/5HP", category: "Balance of Systems", hpRating: "N/A", serialTracked: false, trackingType: "NONE", valuationAmount: 950.00 },
  { code: "MC4-PV-1000V", description: "MC4 PV CABLE CONNECTOR PAIR 1000V", category: "Wiring", hpRating: "N/A", serialTracked: false, trackingType: "NONE", valuationAmount: 350.00 },
  { code: "MC4-CONNECTOR", description: "MC4 PANEL CONNECTOR", category: "Wiring", hpRating: "N/A", serialTracked: false, trackingType: "NONE", valuationAmount: 200.00 },
  { code: "3PIN-30A-500V", description: "3-Pin Cableconnector Pair30A 500V AC", category: "Wiring", hpRating: "N/A", serialTracked: false, trackingType: "NONE", valuationAmount: 550.00 },
  { code: "RMS-4G-GPS", description: "Remote Monittoring System 4g+Gps+Dispaly", category: "Balance of Systems", hpRating: "N/A", serialTracked: true, trackingType: "DISPATCH_ONLY", valuationAmount: 4500.00 },
  { code: "SPD-DC-1000V", description: "SPPV3T2-1000 DC SPD CLASS II 1000V", category: "Balance of Systems", hpRating: "N/A", serialTracked: false, trackingType: "NONE", valuationAmount: 1800.00 },
  { code: "SPD-DC-600V", description: "TX-DC-600V-40T2 DC SPD CLASS || 600V", category: "Balance of Systems", hpRating: "N/A", serialTracked: false, trackingType: "NONE", valuationAmount: 1500.00 },
  { code: "TOGGLE-SWITCH", description: "TOGGLE SWITCH", category: "Balance of Systems", hpRating: "N/A", serialTracked: false, trackingType: "NONE", valuationAmount: 300.00 },
  { code: "SWITCH-BUTTON", description: "SWITCH BUTTON", category: "Balance of Systems", hpRating: "N/A", serialTracked: false, trackingType: "NONE", valuationAmount: 250.00 },
  { code: "JUMPER-PCB-DISP", description: "PCB-DISPLAY JUMPER WIRE", category: "Wiring", hpRating: "N/A", serialTracked: false, trackingType: "NONE", valuationAmount: 150.00 },
  { code: "JUMPER-RMS-DISP", description: "RMS-DISPLAY JUMPER WIRE", category: "Wiring", hpRating: "N/A", serialTracked: false, trackingType: "NONE", valuationAmount: 150.00 },
  { code: "SPD-AC", description: "AC SPD", category: "Balance of Systems", hpRating: "N/A", serialTracked: false, trackingType: "NONE", valuationAmount: 1600.00 },
  { code: "PV-MODULES", description: "PANEL", category: "Solar Panels", hpRating: "N/A", serialTracked: true, trackingType: "DISPATCH_ONLY", valuationAmount: 8500.00 }
];

const defaultUser = {
  id: "user-maharashtra",
  email: "maharashtra@claro.com",
  fullName: "Maharashtra Warehouse Lead",
  role: "Warehouse"
};

const defaultWarehouse = {
  id: "wh-jalna-1111",
  name: "Jalna MH",
  code: "JAL",
  stateCode: "MH"
};

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

async function main() {
  console.log("🌱 Starting EXACT Maharashtra (Jalna) Seed from Parts for MH.docx...");

  // 1. Clean existing records in jalna schema
  console.log("🧹 Cleaning old records in schema: jalna...");
  await prisma.challan.deleteMany({});
  await prisma.movementSerialNumber.deleteMany({});
  await prisma.inventoryMovementLine.deleteMany({});
  await prisma.inventoryMovement.deleteMany({});
  await prisma.inventoryAdjustment.deleteMany({});
  await prisma.materialRequest.deleteMany({});
  await prisma.ticket.deleteMany({});
  await prisma.complaint.deleteMany({});
  await prisma.masterInstallation.deleteMany({});
  await prisma.engineer.deleteMany({});
  await prisma.unitLedger.deleteMany({});
  await prisma.part.deleteMany({});
  await prisma.warehouse.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.manufacturer.deleteMany({});

  // 2. Seed User & Warehouse
  await prisma.user.upsert({
    where: { id: defaultUser.id },
    update: defaultUser,
    create: defaultUser
  });

  await prisma.warehouse.upsert({
    where: { id: defaultWarehouse.id },
    update: defaultWarehouse,
    create: defaultWarehouse
  });

  for (const mfr of defaultManufacturers) {
    await prisma.manufacturer.upsert({
      where: { name: mfr.name },
      update: {},
      create: mfr
    });
  }

  for (const eng of defaultEngineers) {
    await prisma.engineer.upsert({
      where: { email: eng.email },
      update: eng,
      create: eng
    });
  }

  // 3. Seed Parts
  for (const part of defaultParts) {
    await prisma.part.upsert({
      where: { code: part.code },
      update: part,
      create: part
    });
  }
  console.log(`✅ Seeded ${defaultParts.length} standard parts with tracking types.`);

  // 4. Load MH Stock Data JSON
  const jsonPath = path.resolve(__dirname, "../prisma/mh-stock-data.json");
  if (!fs.existsSync(jsonPath)) {
    throw new Error(`Cannot find mh-stock-data.json at ${jsonPath}`);
  }
  const stockData = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));

  const whId = defaultWarehouse.id;
  const ledgerEntries: any[] = [];
  const seenSerials = new Set<string>();

  const addSerial = (sn: string, partCode: string, status: string, condition = "New", location = whId) => {
    const cleanSn = (sn || "").trim();
    if (!cleanSn) return;
    const upper = cleanSn.toUpperCase();
    if (seenSerials.has(upper)) {
      return;
    }
    seenSerials.add(upper);
    ledgerEntries.push({
      serialNo: cleanSn,
      partCode,
      status,
      condition,
      currentLocation: location
    });
  };

  const addBulkQuantity = (prefix: string, partCode: string, count: number, status: string, condition = "New", location = whId) => {
    for (let i = 1; i <= count; i++) {
      const sn = `${prefix}-${String(i).padStart(4, "0")}`;
      addSerial(sn, partCode, status, condition, location);
    }
  };

  console.log("📦 Processing exact serials and quantities from MH Document...");

  // --- A. FRESH SERIALS (LPSA - Table 3) ---
  const t3 = stockData.fresh_lpsa || {};
  // Exactly the 27 serials listed in Table 3
  (t3["3HP Dc Mono Solar Motor"] || []).forEach((sn: string) => addSerial(sn, "MOTOR-3HP-DC", "Fresh"));

  // Exactly the 63 serials listed in Table 3
  (t3["3HP DC 30M MONO SOLAR PUMP"] || []).forEach((sn: string) => addSerial(sn, "PUMP-3HP-DC-30M", "Fresh"));

  (t3["3HP DC 70M MONO SOLAR PUMP"] || []).forEach((sn: string) => addSerial(sn, "PUMP-3HP-DC-70M", "Fresh"));
  (t3["5HP Dc Mono Solar Motor"] || []).forEach((sn: string) => addSerial(sn, "MOTOR-5HP-DC", "Fresh"));
  (t3["5HP DC 30M MONO SOLAR PUMP"] || []).forEach((sn: string) => addSerial(sn, "PUMP-5HP-DC-30M", "Fresh"));
  (t3["5HP DC 70M MONO SOLAR PUMP"] || []).forEach((sn: string) => addSerial(sn, "PUMP-5HP-DC-70M", "Fresh"));
  (t3["7.5hp Dc Mono Solar Motor"] || []).forEach((sn: string) => addSerial(sn, "MOTOR-7.5HP-DC", "Fresh"));
  (t3["7.5HP DC 30M MONO SOLAR PUMP"] || []).forEach((sn: string) => addSerial(sn, "PUMP-7.5HP-DC-30M", "Fresh"));
  (t3["5HP POWOR CARD"] || []).forEach((sn: string) => addSerial(sn, "PCB-5HP-DC", "Fresh"));

  // Exactly the 20 serials listed in Table 3
  (t3["3HP POWOR CARD"] || []).forEach((sn: string) => addSerial(sn, "PCB-3HP-DC", "Fresh"));

  // --- B. FRESH SERIALS (LSTG - Table 5 & Table 0) ---
  const t5 = stockData.fresh_lstg || {};
  (t5["7.5HP 50MTR PUMP"] || []).forEach((sn: string) => addSerial(sn, "PUMP-7.5HP-DC-50M", "Fresh"));
  (t5["7.5HP 70MTR PUMP"] || []).forEach((sn: string) => addSerial(sn, "PUMP-7.5HP-DC-70M", "Fresh"));
  (t5["7.5HP 100MTR PUMP"] || []).forEach((sn: string) => addSerial(sn, "PUMP-7.5HP-DC-100M", "Fresh"));
  (t5["7.5HP 30MTR PUMP"] || []).forEach((sn: string) => addSerial(sn, "PUMP-7.5HP-DC-30M", "Fresh"));
  (t5["PCB 3HP"] || []).forEach((sn: string) => addSerial(sn, "PCB-3HP-DC", "Fresh"));
  (t5["PCB 5HP"] || []).forEach((sn: string) => addSerial(sn, "PCB-5HP-DC", "Fresh"));
  (t5["7.5HP PCB"] || []).forEach((sn: string) => addSerial(sn, "PCB-7.5HP-DC", "Fresh"));

  // Additional LSTG Fresh quantities from Table 0
  addBulkQuantity("MH-LSTG-3HP-MTR-FR", "MOTOR-3HP-DC", 68, "Fresh");
  addBulkQuantity("MH-LSTG-3HP-30M-FR", "PUMP-3HP-DC-30M", 58, "Fresh");
  addBulkQuantity("MH-LSTG-3HP-50M-FR", "PUMP-3HP-DC-50M", 3, "Fresh");
  addBulkQuantity("MH-LSTG-3HP-70M-FR", "PUMP-3HP-DC-70M", 18, "Fresh");
  addBulkQuantity("MH-LSTG-5HP-MTR-FR", "MOTOR-5HP-DC", 68, "Fresh");
  addBulkQuantity("MH-LSTG-5HP-30M-FR", "PUMP-5HP-DC-30M", 58, "Fresh");
  addBulkQuantity("MH-LSTG-5HP-50M-FR", "PUMP-5HP-DC-50M", 2, "Fresh");
  addBulkQuantity("MH-LSTG-5HP-70M-FR", "PUMP-5HP-DC-70M", 21, "Fresh");
  addBulkQuantity("MH-LSTG-5HP-100M-FR", "PUMP-5HP-DC-100M", 2, "Fresh");
  addBulkQuantity("MH-LSTG-7.5HP-MTR-FR", "MOTOR-7.5HP-DC", 15, "Fresh");

  // --- C. FAULTY SERIALS (LPSA - Table 1) ---
  const t1 = stockData.faulty_lpsa || {};
  (t1["3HP DC MOTOR"] || []).forEach((sn: string) => addSerial(sn, "MOTOR-3HP-DC", "Faulty-Received"));
  (t1["5HP DC MOTOR"] || []).forEach((sn: string) => addSerial(sn, "MOTOR-5HP-DC", "Faulty-Received"));
  (t1["7.5HP DC MOTOR"] || []).forEach((sn: string) => addSerial(sn, "MOTOR-7.5HP-DC", "Faulty-Received"));
  (t1["5HP DC 70 MTR PUMP"] || []).forEach((sn: string) => addSerial(sn, "PUMP-5HP-DC-70M", "Faulty-Received"));
  (t1["7.5 HP DC 30 MTR PUMP"] || []).forEach((sn: string) => addSerial(sn, "PUMP-7.5HP-DC-30M", "Faulty-Received"));
  (t1["3HP PCB LPSA"] || []).forEach((sn: string) => addSerial(sn, "PCB-3HP-DC", "Faulty-Received"));
  (t1["5HP PCB LPSA"] || []).forEach((sn: string) => addSerial(sn, "PCB-5HP-DC", "Faulty-Received"));
  (t1["7.5HP PCB LPSA"] || []).forEach((sn: string) => addSerial(sn, "PCB-7.5HP-DC", "Faulty-Received"));
  (t1["RMS"] || []).forEach((sn: string) => addSerial(sn, "RMS-4G-GPS", "Faulty-Received"));

  // --- D. FAULTY SERIALS (LSTG - Table 2) ---
  const t2 = stockData.faulty_lstg || {};
  (t2["3HP 30MTR PUMP"] || []).forEach((sn: string) => addSerial(sn, "PUMP-3HP-DC-30M", "Faulty-Received"));
  (t2["3HP 70MTR PUMP"] || []).forEach((sn: string) => addSerial(sn, "PUMP-3HP-DC-70M", "Faulty-Received"));
  (t2["3HP MOTOR"] || []).forEach((sn: string) => addSerial(sn, "MOTOR-3HP-DC", "Faulty-Received"));
  (t2["5HP MOTOR"] || []).forEach((sn: string) => addSerial(sn, "MOTOR-5HP-DC", "Faulty-Received"));
  (t2["5HP 30MTR PUMP"] || []).forEach((sn: string) => addSerial(sn, "PUMP-5HP-DC-30M", "Faulty-Received"));
  (t2["5HP 70MTR PUMP"] || []).forEach((sn: string) => addSerial(sn, "PUMP-5HP-DC-70M", "Faulty-Received"));
  (t2["7.5HP MOTOR"] || []).forEach((sn: string) => addSerial(sn, "MOTOR-7.5HP-DC", "Faulty-Received"));
  (t2["7.5HP 30MTR PUMP"] || []).forEach((sn: string) => addSerial(sn, "PUMP-7.5HP-DC-30M", "Faulty-Received"));
  (t2["3HP PCB LPSA"] || []).forEach((sn: string) => addSerial(sn, "PCB-3HP-DC", "Faulty-Received"));
  (t2["RMS"] || []).forEach((sn: string) => addSerial(sn, "RMS-4G-GPS", "Faulty-Received"));

  // --- E. SERIAL-ON-DISPATCH ITEMS (Table 0: Panels & RMS) ---
  // RMS: 189 LPSA + 140 LSTG = 329 Fresh
  addBulkQuantity("MH-RMS-FRESH", "RMS-4G-GPS", 329, "Fresh");

  // Panels: 109 LPSA Fresh
  addBulkQuantity("MH-PANEL-FRESH", "PV-MODULES", 109, "Fresh");

  // --- F. NON-SERIALIZED HARDWARE (Table 0) ---
  addBulkQuantity("MH-MCB-32A-FR", "MCB-2P-32A", 2, "Fresh");
  addBulkQuantity("MH-MCB-20A-FR", "MCB-2P-20A", 84, "Fresh");
  addBulkQuantity("MH-MC4-PV-FR", "MC4-PV-1000V", 18, "Fresh");
  addBulkQuantity("MH-MC4-PV-FA", "MC4-PV-1000V", 2, "Faulty-Received");
  addBulkQuantity("MH-MC4-CONN-FR", "MC4-CONNECTOR", 85, "Fresh");
  addBulkQuantity("MH-3PIN-FR", "3PIN-30A-500V", 45, "Fresh"); // 32 LPSA + 13 LSTG
  addBulkQuantity("MH-3PIN-FA", "3PIN-30A-500V", 1, "Faulty-Received");
  addBulkQuantity("MH-SPD-1000V-FR", "SPD-DC-1000V", 31, "Fresh"); // 3 LPSA + 28 LSTG
  addBulkQuantity("MH-SPD-600V-FR", "SPD-DC-600V", 194, "Fresh"); // 66 LPSA + 128 LSTG
  addBulkQuantity("MH-SPD-600V-FA", "SPD-DC-600V", 1, "Faulty-Received");
  addBulkQuantity("MH-SPD-AC-FR", "SPD-AC", 6, "Fresh");

  console.log(`💾 Inserting ${ledgerEntries.length} total inventory units into UnitLedger...`);

  // Batch insert into UnitLedger using createMany for fast execution & safe connection pooling
  for (let i = 0; i < ledgerEntries.length; i += 200) {
    const batch = ledgerEntries.slice(i, i + 200);
    await prisma.unitLedger.createMany({
      data: batch,
      skipDuplicates: true
    });
  }

  console.log(`✨ Successfully seeded ${ledgerEntries.length} inventory records for Maharashtra (Jalna)!`);
}

main()
  .catch(err => {
    console.error("❌ Seeding failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
