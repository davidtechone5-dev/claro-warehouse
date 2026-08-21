import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import * as XLSX from "xlsx";
import { wmsService } from "../src/services/wms.service";
import { warehouseContext } from "../src/db";

dotenv.config();

const schemas = ["jalna", "rajasthan", "haryana", "mp"];

// Catalog containing all variants of Pumps, Motors, Controllers, and Cables
const defaultParts = [
  // 3HP
  { code: "PUMP-3HP-DC-30M", description: "3HP DC 30M MONO SOLAR PUMP", category: "Pumps", hpRating: "3HP", serialTracked: true, valuationAmount: 11000.00 },
  { code: "PUMP-3HP-DC-70M", description: "3HP DC 70M MONO SOLAR PUMP", category: "Pumps", hpRating: "3HP", serialTracked: true, valuationAmount: 12000.00 },
  { code: "PUMP-3HP-AC-50M", description: "3 HP AC HEAD 50M PUMP", category: "Pumps", hpRating: "3HP", serialTracked: true, valuationAmount: 11500.00 },
  { code: "PUMP-3HP-AC-70M", description: "3 HP AC HEAD 70M PUMP", category: "Pumps", hpRating: "3HP", serialTracked: true, valuationAmount: 12000.00 },
  { code: "MOTOR-3HP-DC", description: "3HP Dc Mono Solar Motor", category: "Motors", hpRating: "3HP", serialTracked: true, valuationAmount: 8000.00 },
  { code: "MOTOR-3HP-AC", description: "3HP AC MONO SOLAR MOTOR", category: "Motors", hpRating: "3HP", serialTracked: true, valuationAmount: 7500.00 },
  { code: "PCB-3HP-DC", description: "3HP DC POWOR CARD", category: "Inverters", hpRating: "3HP", serialTracked: true, valuationAmount: 4500.00 },
  { code: "PCB-3HP-AC", description: "3HP AC MONO SOLAR CONTROLLERPOWER PCB", category: "Inverters", hpRating: "3HP", serialTracked: true, valuationAmount: 4200.00 },

  // 5HP
  { code: "PUMP-5HP-DC-30M", description: "5HP DC 30M MONO SOLAR PUMP", category: "Pumps", hpRating: "5HP", serialTracked: true, valuationAmount: 14000.00 },
  { code: "PUMP-5HP-DC-70M", description: "5HP DC 70M MONO SOLAR PUMP", category: "Pumps", hpRating: "5HP", serialTracked: true, valuationAmount: 15000.00 },
  { code: "PUMP-5HP-DC-50M", description: "5 HP DC HEAD 50M PUMP", category: "Pumps", hpRating: "5HP", serialTracked: true, valuationAmount: 14500.00 },
  { code: "PUMP-5HP-AC-30M", description: "5 HP AC HEAD 30M PUMP", category: "Pumps", hpRating: "5HP", serialTracked: true, valuationAmount: 13500.00 },
  { code: "PUMP-5HP-AC-50M", description: "5 HP AC HEAD 50M PUMP", category: "Pumps", hpRating: "5HP", serialTracked: true, valuationAmount: 14000.00 },
  { code: "PUMP-5HP-AC-100M", description: "5 HP AC HEAD 100M PUMP", category: "Pumps", hpRating: "5HP", serialTracked: true, valuationAmount: 15500.00 },
  { code: "MOTOR-5HP-DC", description: "5HP Dc Mono Solar Motor", category: "Motors", hpRating: "5HP", serialTracked: true, valuationAmount: 10000.00 },
  { code: "MOTOR-5HP-AC", description: "5HP AC MONO SOLAR MOTOR", category: "Motors", hpRating: "5HP", serialTracked: true, valuationAmount: 9500.00 },
  { code: "PCB-5HP-DC", description: "5HP POWOR CARD", category: "Inverters", hpRating: "5HP", serialTracked: true, valuationAmount: 6000.00 },
  { code: "PCB-5HP-AC", description: "5 HP AC POWER CARD", category: "Inverters", hpRating: "5HP", serialTracked: true, valuationAmount: 5800.00 },

  // 7.5HP
  { code: "PUMP-7.5HP-DC-30M", description: "7.5HP DC 30M MONO SOLAR PUMP", category: "Pumps", hpRating: "7.5HP", serialTracked: true, valuationAmount: 18000.00 },
  { code: "PUMP-7.5HP-DC-50M", description: "7.5HP DC 50M MONO SOLAR PUMP", category: "Pumps", hpRating: "7.5HP", serialTracked: true, valuationAmount: 18500.00 },
  { code: "PUMP-7.5HP-DC-70M", description: "7.5HP DC 70M MONO SOLAR PUMP", category: "Pumps", hpRating: "7.5HP", serialTracked: true, valuationAmount: 19000.00 },
  { code: "PUMP-7.5HP-DC-100M", description: "7.5HP DC 100M MONO SOLAR PUMP", category: "Pumps", hpRating: "7.5HP", serialTracked: true, valuationAmount: 20000.00 },
  { code: "PUMP-7.5HP-AC-30M", description: "7.5 HP AC HEAD 30M PUMP", category: "Pumps", hpRating: "7.5HP", serialTracked: true, valuationAmount: 17500.00 },
  { code: "PUMP-7.5HP-AC-50M", description: "7.5 HP AC HEAD 50M PUMP", category: "Pumps", hpRating: "7.5HP", serialTracked: true, valuationAmount: 18000.00 },
  { code: "MOTOR-7.5HP-DC", description: "7.5hp Dc Mono Solar Motor", category: "Motors", hpRating: "7.5HP", serialTracked: true, valuationAmount: 14000.00 },
  { code: "MOTOR-7.5HP-AC", description: "7.5HP AC MONO SOLAR MOTOR", category: "Motors", hpRating: "7.5HP", serialTracked: true, valuationAmount: 13500.00 },
  { code: "PCB-7.5HP-DC", description: "7.5HP Dc Mono Solar Controller Power Pcb", category: "Inverters", hpRating: "7.5HP", serialTracked: true, valuationAmount: 8500.00 },
  { code: "PCB-7.5HP-AC", description: "7.5hp Ac Mono Solar Controller Power Pcb", category: "Inverters", hpRating: "7.5HP", serialTracked: true, valuationAmount: 8000.00 },

  // 10HP
  { code: "PUMP-10HP-DC-30M", description: "10HP DC MONO 30M SOLAR PUMP", category: "Pumps", hpRating: "10HP", serialTracked: true, valuationAmount: 21000.00 },
  { code: "PUMP-10HP-DC-50M", description: "10HP DC 50M MONO SOLAR PUMP", category: "Pumps", hpRating: "10HP", serialTracked: true, valuationAmount: 21500.00 },
  { code: "PUMP-10HP-DC-70M", description: "10HP DC 70M MONO SOLAR PUMP", category: "Pumps", hpRating: "10HP", serialTracked: true, valuationAmount: 22000.00 },
  { code: "PUMP-10HP-DC-100M", description: "10HP DC 100M MONO SOLAR PUMP", category: "Pumps", hpRating: "10HP", serialTracked: true, valuationAmount: 23000.00 },
  { code: "PUMP-10HP-AC-30M", description: "10HP AC 30M MONO SOLAR PUMP", category: "Pumps", hpRating: "10HP", serialTracked: true, valuationAmount: 20000.00 },
  { code: "PUMP-10HP-AC-50M", description: "10HP AC 50M MONO SOLAR PUMP", category: "Pumps", hpRating: "10HP", serialTracked: true, valuationAmount: 20500.00 },
  { code: "PUMP-10HP-AC-70M", description: "10HP AC 70M MONO SOLAR PUMP", category: "Pumps", hpRating: "10HP", serialTracked: true, valuationAmount: 21000.00 },
  { code: "PUMP-10HP-AC-100M", description: "10HP AC 100M MONO SOLAR PUMP", category: "Pumps", hpRating: "10HP", serialTracked: true, valuationAmount: 22000.00 },
  { code: "MOTOR-10HP-DC", description: "10HP Dc Mono Solar Motor", category: "Motors", hpRating: "10HP", serialTracked: true, valuationAmount: 17000.00 },
  { code: "MOTOR-10HP-AC", description: "10HP AC MONO SOLAR MOTOR", category: "Motors", hpRating: "10HP", serialTracked: true, valuationAmount: 16000.00 },
  { code: "PCB-10HP-DC", description: "10hp Dc Mono Solar Controller Power Pcb", category: "Inverters", hpRating: "10HP", serialTracked: true, valuationAmount: 10500.00 },
  { code: "PCB-10HP-AC", description: "10hp Ac Mono Solar Controller Power Pcb", category: "Inverters", hpRating: "10HP", serialTracked: true, valuationAmount: 9500.00 },

  // General & Accessories
  { code: "MCB-2P-32A", description: "2P 32A 800V DC MCB 7.5/10HP", category: "Balance of Systems", hpRating: "N/A", serialTracked: false, valuationAmount: 1200.00 },
  { code: "MC4-PV-1000V", description: "MC4 PV CABLE CONNECTOR PAIR 1000V", category: "Wiring", hpRating: "N/A", serialTracked: false, valuationAmount: 350.00 },
  { code: "3PIN-30A-500V", description: "3-Pin Cableconnector Pair30A 500V AC", category: "Wiring", hpRating: "N/A", serialTracked: false, valuationAmount: 550.00 },
  { code: "RMS-4G-GPS", description: "Remote Monittoring System 4g+Gps+Dispaly", category: "Balance of Systems", hpRating: "N/A", serialTracked: true, valuationAmount: 4500.00 },
  { code: "SPD-DC-1000V", description: "SPPV3T2-1000 DC SPD CLASS II 1000V", category: "Balance of Systems", hpRating: "N/A", serialTracked: false, valuationAmount: 1800.00 }
];

function cleanString(str: string): string {
  return (str || "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

function resolvePart(header: string, partsList: any[]): any {
  const cleanHeader = cleanString(header);

  // Common direct maps for messy Excel sheet headers
  const directMaps: Record<string, string> = {
    "10hpacmotor": "MOTOR-10HP-AC",
    "10hpdcmotor": "MOTOR-10HP-DC",
    "75hpdcmotor": "MOTOR-7.5HP-DC",
    "75hpacmotor": "MOTOR-7.5HP-AC",
    "5hpacmotor": "MOTOR-5HP-AC",
    "5hpdcmotor": "MOTOR-5HP-DC",
    "3hpdcmotor": "MOTOR-3HP-DC",
    "3hpacmotor": "MOTOR-3HP-AC",
    "3hpdcmonosolarmotor": "MOTOR-3HP-DC",
    "3hpdcmonosolarpump": "PUMP-3HP-DC-30M",
    "3hpdc30mmonosolarpump": "PUMP-3HP-DC-30M",
    "3hpdc70mmonosolarpump": "PUMP-3HP-DC-70M",
    "3hpacmonosolarmotor": "MOTOR-3HP-AC",
    "3hpacmonosolarcontrollerpowerpcb": "PCB-3HP-AC",
    "3hpdcpoworcard": "PCB-3HP-DC",
    "3hppoworcard": "PCB-3HP-DC",
    "5hpdcmonosolarmotor": "MOTOR-5HP-DC",
    "5hpdc30mmonosolarpump": "PUMP-5HP-DC-30M",
    "5hpdc70mmonosolarpump": "PUMP-5HP-DC-70M",
    "5hpacmonosolarmotor": "MOTOR-5HP-AC",
    "5hpac100mmonosolarbarepump": "PUMP-5HP-AC-100M",
    "5hpac70mmonosolarbarepump": "PUMP-5HP-AC-50M",
    "5hpdc100mmonosolarbarepump": "PUMP-5HP-DC-70M",
    "5hpdc50mheadpump": "PUMP-5HP-DC-50M",
    "5hpdc30mheadpump": "PUMP-5HP-DC-30M",
    "5hpac100mheadpump": "PUMP-5HP-AC-100M",
    "5hpac50mheadpump": "PUMP-5HP-AC-50M",
    "5hpac30mheadpump": "PUMP-5HP-AC-30M",
    "5hppoworcard": "PCB-5HP-DC",
    "5hpacpowercard": "PCB-5HP-AC",
    "75hpdcmonosolarpump": "PUMP-7.5HP-DC-30M",
    "75hpdc30mmonosolarpump": "PUMP-7.5HP-DC-30M",
    "75hpdc30mtrpump": "PUMP-7.5HP-DC-30M",
    "75hpdc30mtrheadpump": "PUMP-7.5HP-DC-30M",
    "75hpdc100mtrheadpump": "PUMP-7.5HP-DC-100M",
    "75hpdc100mtrpump": "PUMP-7.5HP-DC-100M",
    "75hpdc100mheadpump": "PUMP-7.5HP-DC-100M",
    "75hpdc30mheadpump": "PUMP-7.5HP-DC-30M",
    "75hpac30mheadpump": "PUMP-7.5HP-AC-30M",
    "75hpac50mheadpump": "PUMP-7.5HP-AC-50M",
    "75hpacmonosolarcontrollerpowerpcb": "PCB-7.5HP-AC",
    "75hpacmonosolarmotor": "MOTOR-7.5HP-AC",
    "75hppoworcard": "PCB-7.5HP-DC",
    "75hppowercard": "PCB-7.5HP-DC",
    "10hpac30mtrpump": "PUMP-10HP-AC-30M",
    "10hpac50mtrpump": "PUMP-10HP-AC-50M",
    "10hpac70mtrpump": "PUMP-10HP-AC-70M",
    "10hpdc30mtrpump": "PUMP-10HP-DC-30M",
    "10hpdc50mtrpump": "PUMP-10HP-DC-50M",
    "10hpdc70mtrpump": "PUMP-10HP-DC-70M",
    "10hpac30mtrheadpump": "PUMP-10HP-AC-30M",
    "10hpdc30mtrheadpump": "PUMP-10HP-DC-30M",
    "3pincableconnector": "3PIN-30A-500V",
    "rms": "RMS-4G-GPS",
    "rmsdisplay": "RMS-4G-GPS",
    "powercard": "PCB-7.5HP-DC",
    "poworcard": "PCB-7.5HP-DC",
  };

  if (directMaps[cleanHeader]) {
    const code = directMaps[cleanHeader];
    return partsList.find(p => p.code === code) || null;
  }

  let part = partsList.find(p => cleanString(p.code) === cleanHeader || cleanString(p.description) === cleanHeader);
  if (part) return part;

  part = partsList.find(p => cleanString(p.description).includes(cleanHeader) || cleanHeader.includes(cleanString(p.description)));
  return part || null;
}

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



      // 7. Seed stock counts
      let seededFromExcel = false;
      const fileNames: Record<string, string> = {
        jalna: "MH Warehouse Live Stock sheet_21-08-2026.xlsx",
        mp: "MP Warehouse Stock Sheet_21-08-2026.xlsx",
        rajasthan: "RJ Warehouse Live Stock sheet_21-08-2026.xlsx",
        haryana: "HR Warehouse Live Stock sheet_11-08-2026.xlsx"
      };

      const filename = fileNames[schema];
      if (filename) {
        let excelPath = path.resolve(process.cwd(), filename);
        if (!fs.existsSync(excelPath)) {
          excelPath = path.resolve(__dirname, "../../..", filename);
        }
        if (!fs.existsSync(excelPath)) {
          excelPath = path.resolve(__dirname, "../..", filename);
        }

        if (fs.existsSync(excelPath)) {
          console.log(`📊 Found Excel stock sheet for "${schema}" at: ${excelPath}. Importing...`);
          try {
            const workbook = XLSX.readFile(excelPath);
            const ledgerEntries: any[] = [];
                        const seenSerials = new Set<string>();

            const addEntry = (serial: any, partCode: string, status: string, location: string) => {
              if (serial === null || serial === undefined) return;
              const cleanSn = serial.toString().trim();
              if (!cleanSn || cleanSn === "" || cleanSn.toLowerCase().includes("enter serial") || cleanSn.toLowerCase().includes("faulty")) return;
              
              const upperSn = cleanSn.toUpperCase();
              if (seenSerials.has(upperSn)) {
                return;
              }
              seenSerials.add(upperSn);
              ledgerEntries.push({
                serialNo: cleanSn,
                partCode,
                status,
                condition: "New",
                currentLocation: location
              });
            };

            const findSheetName = (name: string) => {
              const cleanTarget = name.trim().toLowerCase();
              return workbook.SheetNames.find(n => n.trim().toLowerCase() === cleanTarget) || null;
            };

            const freshSheetName = findSheetName("Fresh Serial Numbers");
            const faultySheetName = findSheetName("Faulty Serial Numbers");
            const cromptonSheetName = findSheetName("At Crompton");

            // Sheet 1: Fresh Serial Numbers
            if (freshSheetName) {
              const sheet = workbook.Sheets[freshSheetName];
              const rows = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1 });
              if (rows.length > 0) {
                const headers = rows[0] || [];
                for (let colIdx = 0; colIdx < headers.length; colIdx++) {
                  const header = headers[colIdx];
                  if (!header) continue;
                  const part = resolvePart(header.toString(), defaultParts);
                  if (part) {
                    for (let rowIdx = 1; rowIdx < rows.length; rowIdx++) {
                      const val = rows[rowIdx]?.[colIdx];
                      if (val) addEntry(val, part.code, "Fresh", whId);
                    }
                  }
                }
              }
            }

            // Sheet 2: Faulty Serial Numbers
            if (faultySheetName) {
              const sheet = workbook.Sheets[faultySheetName];
              const rows = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1 });
              if (rows.length > 2) {
                const headers = rows[2] || [];
                for (let colIdx = 0; colIdx < headers.length; colIdx++) {
                  const header = headers[colIdx];
                  if (!header) continue;
                  const part = resolvePart(header.toString(), defaultParts);
                  if (part) {
                    for (let rowIdx = 3; rowIdx < rows.length; rowIdx++) {
                      const val = rows[rowIdx]?.[colIdx];
                      if (val) addEntry(val, part.code, "Faulty-Received", whId);
                    }
                  }
                }
              }
            }

            // Sheet 3: At Crompton
            if (cromptonSheetName) {
              const sheet = workbook.Sheets[cromptonSheetName];
              const rows = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1 });
              if (rows.length > 0) {
                const headers = rows[0] || [];
                for (let colIdx = 0; colIdx < headers.length; colIdx++) {
                  const header = headers[colIdx];
                  if (!header) continue;
                  const part = resolvePart(header.toString(), defaultParts);
                  if (part) {
                    for (let rowIdx = 1; rowIdx < rows.length; rowIdx++) {
                      const val = rows[rowIdx]?.[colIdx];
                      if (val) addEntry(val, part.code, "At-Manufacturer", "Crompton Greaves Consumer Electricals Ltd.");
                    }
                  }
                }
              }
            }

            if (ledgerEntries.length > 0) {
              // Upsert entries into DB
              for (const entry of ledgerEntries) {
                await prisma.unitLedger.upsert({
                  where: { serialNo: entry.serialNo },
                  update: entry,
                  create: entry
                });
              }
              console.log(`✅ Successfully seeded ${ledgerEntries.length} real stock serials from Excel for schema: "${schema}"`);
              seededFromExcel = true;
            } else {
              console.log(`⚠️ Excel sheet for "${schema}" had 0 serial numbers. Falling back to mock stock...`);
              seededFromExcel = false;
            }
          } catch (excelErr: any) {
            console.error(`❌ Failed to parse Excel sheet for "${schema}":`, excelErr.message);
          }
        }
      }

      if (!seededFromExcel) {
        console.log(`🌱 Seeding mock dummy stock for "${schema}"...`);
        const sampleLedgerItems: any[] = [];
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
          for (let i = 1; i <= stock.fresh; i++) {
            sampleLedgerItems.push({
              serialNo: `${schema.toUpperCase()}-${stock.partCode}-FR-${String(i).padStart(3, "0")}`,
              partCode: stock.partCode,
              status: "Fresh",
              condition: "New",
              currentLocation: whId
            });
          }
          for (let i = 1; i <= stock.faulty; i++) {
            sampleLedgerItems.push({
              serialNo: `${schema.toUpperCase()}-${stock.partCode}-FA-${String(i).padStart(3, "0")}`,
              partCode: stock.partCode,
              status: "Faulty-Received",
              condition: "New",
              currentLocation: whId
            });
          }
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
          await prisma.unitLedger.upsert({
            where: { serialNo: ledger.serialNo },
            update: ledger,
            create: ledger
          });
        }
      }

      // 8. Run sync requests from Google Sheets to populate active Material Requests immediately!
      console.log(`🔄 [Seed] Syncing material requests from Google Sheets for "${schema}"...`);
      try {
        const syncResult = await warehouseContext.run(schema, async () => {
          return wmsService.syncRequests();
        });
        console.log(`✅ [Seed] Successfully synced requests for "${schema}". Result:`, syncResult);
      } catch (syncErr: any) {
        console.warn(`⚠️ [Seed] Warning: Failed to sync requests for "${schema}":`, syncErr.message);
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
