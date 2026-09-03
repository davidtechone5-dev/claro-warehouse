import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { warehouseContext } from "./db";

dotenv.config();

const baseUrl = process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!baseUrl) {
  console.error("❌ DATABASE_URL is not set in environment variables!");
  process.exit(1);
}

let connectionUrl = baseUrl;
if (baseUrl.includes("?")) {
  const urlObj = new URL(baseUrl);
  urlObj.searchParams.set("schema", "haryana");
  connectionUrl = urlObj.toString();
} else {
  connectionUrl = `${baseUrl}?schema=haryana`;
}

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: connectionUrl
    }
  }
});

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
  { code: "SPD-DC-1000V", description: "SPPV3T2-1000 DC SPD CLASS II 1000V", category: "Balance of Systems", hpRating: "N/A", serialTracked: false, valuationAmount: 1800.00 },
  { code: "PV-MODULES", description: "PV MODULES", category: "Solar Panels", hpRating: "N/A", serialTracked: false, valuationAmount: 8500.00 },
  { code: "TOGGLE-SWITCH", description: "TOGAL SWITCH", category: "Balance of Systems", hpRating: "N/A", serialTracked: false, valuationAmount: 300.00 }
];

function cleanString(str: string): string {
  return (str || "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

function resolvePartCode(rawHeader: string): string | null {
  const c = cleanString(rawHeader);
  const maps: Record<string, string> = {
    "10hpacmotor": "MOTOR-10HP-AC",
    "10hpacmonosolarmotor": "MOTOR-10HP-AC",
    "10hpdcmotor": "MOTOR-10HP-DC",
    "10hpdcmonosolarmotor": "MOTOR-10HP-DC",
    "75hpdcmotor": "MOTOR-7.5HP-DC",
    "75hpdcmonosolarmotor": "MOTOR-7.5HP-DC",
    "75hpacmotor": "MOTOR-7.5HP-AC",
    "75hpacmonosolarmotor": "MOTOR-7.5HP-AC",

    "75hpdc30mmonosolarpump": "PUMP-7.5HP-DC-30M",
    "75hpdc30mtrpump": "PUMP-7.5HP-DC-30M",
    "75hpdc50mmonosolarpump": "PUMP-7.5HP-DC-50M",
    "75hpdc70mmonosolarpump": "PUMP-7.5HP-DC-70M",
    "75hpdc100mmonosolarpump": "PUMP-7.5HP-DC-100M",
    "75hpdc100mtrpump": "PUMP-7.5HP-DC-100M",

    "10hpdcmono30msolarpump": "PUMP-10HP-DC-30M",
    "10hpdc30mmonosolarpump": "PUMP-10HP-DC-30M",
    "10hpdc30mtrpump": "PUMP-10HP-DC-30M",
    "10hpdc50mmonosolarpump": "PUMP-10HP-DC-50M",
    "10hpdc50mtrpump": "PUMP-10HP-DC-50M",
    "10hpdc70mmonosolarpump": "PUMP-10HP-DC-70M",
    "10hpdc70mtrpump": "PUMP-10HP-DC-70M",
    "10hpdc100mmonosolarpump": "PUMP-10HP-DC-100M",

    "10hpac30mmonosolarpump": "PUMP-10HP-AC-30M",
    "10hpac30mtrpump": "PUMP-10HP-AC-30M",
    "10hpac50mmonosolarpump": "PUMP-10HP-AC-50M",
    "10hpac50mtrpump": "PUMP-10HP-AC-50M",
    "10hpac70mmonosolarpump": "PUMP-10HP-AC-70M",
    "10hpac70mtrpump": "PUMP-10HP-AC-70M",
    "10hpac100mmonosolarpump": "PUMP-10HP-AC-100M",

    "75hpdcmonosolarcontrollerpowerpcb": "PCB-7.5HP-DC",
    "10hpdcmonosolarcontrollerpowerpcb": "PCB-10HP-DC",
    "10hpacmonosolarcontrollerpowerpcb": "PCB-10HP-AC",
    "powercard": "PCB-7.5HP-DC",
    "poworcard": "PCB-7.5HP-DC",

    "remotemonittoringsystem4ggpsdispaly": "RMS-4G-GPS",
    "rmsdisplay": "RMS-4G-GPS",
    "rms": "RMS-4G-GPS",

    "2p32a800vdcmcb7510hp": "MCB-2P-32A",
    "mc4pvcableconnectorpair1000v": "MC4-PV-1000V",
    "3pincableconnectorpair30a500vac": "3PIN-30A-500V",
    "sppv3t21000dcspdclassii1000v": "SPD-DC-1000V",
    "pvmodules": "PV-MODULES",
    "togalswitch": "TOGGLE-SWITCH"
  };

  if (maps[c]) return maps[c];
  const found = defaultParts.find(p => cleanString(p.code) === c || cleanString(p.description) === c);
  return found ? found.code : null;
}

async function seedHaryana() {
  console.log("🌱 Starting Exact Seeding for Haryana Warehouse...");
  const whId = "wh-haryana-3333";

  // 1. Upsert Haryana Warehouse
  await prisma.warehouse.upsert({
    where: { name: "Haryana" },
    update: { code: "HR", stateCode: "HR" },
    create: { id: whId, name: "Haryana", code: "HR", stateCode: "HR" }
  });

  // 2. Upsert Parts Catalog
  for (const p of defaultParts) {
    await prisma.part.upsert({
      where: { code: p.code },
      update: p,
      create: p
    });
  }

  // 3. Clear existing UnitLedger for Haryana to start fresh
  await prisma.unitLedger.deleteMany({});

  const entries: Array<{ serialNo: string; partCode: string; status: string; condition: string; currentLocation: string }> = [];
  const seen = new Set<string>();

  const addSerial = (sn: string, partCode: string, status: string, condition: string, loc: string) => {
    let clean = (sn || "").trim();
    if (!clean || clean === "" || clean.toLowerCase().includes("no number") || clean.toLowerCase().includes("no nu mber") || clean.toLowerCase().includes("total")) {
      return;
    }
    const up = clean.toUpperCase();
    if (seen.has(up)) {
      console.warn(`Duplicate serial encountered: ${clean} for ${partCode}`);
      return;
    }
    seen.add(up);
    entries.push({
      serialNo: clean,
      partCode,
      status,
      condition,
      currentLocation: loc
    });
  };

  // --- FAULTY SERIAL NUMBERS (Haryana Warehouse) ---
  // Table 2: 10 HP AC MOTOR (Faulty remaining in warehouse)
  const t2Serials = [
    "LPSA1WJ000414","LPSA1XC000448","LPSA1WJ000192","LPSA1XC000207","LPSA1YE000118","LPSA1YE000132",
    "LPSA1XC000422","LPSA1XC000154","LPSA1XC000321","LPSA1WJ000193","LPSA1XA000048","LPSA1XG000170",
    "LPSA1WJ000436","LPSA1XG050044","LPSA1WJ000369","LPSA1XK000152","LPSA1YE050011","LPSA1XG000142",
    "LPSA1YE000095","LPSA1XK000096","LPSA1XK000125"
  ];
  t2Serials.forEach(sn => addSerial(sn, "MOTOR-10HP-AC", "Faulty-Received", "New", whId));

  // Table 3: 10 HP AC 30 MTR PUMP (Faulty remaining in warehouse)
  const t3Serials = [
    "LPSA1YE000118","LPSA1XC000154","LPSA1XC000321","LPSA1WJ000424","LPSA1XC000249"
  ];
  t3Serials.forEach(sn => addSerial(sn, "PUMP-10HP-AC-30M", "Faulty-Received", "New", whId));

  // Table 4: 10 HP AC 70 MTR PUMP
  addSerial("LPSA1XC000412", "PUMP-10HP-AC-70M", "Faulty-Received", "New", whId);

  // Table 5: 10 HP DC MOTOR (Faulty remaining in warehouse)
  const t5Serials = [
    "LPSA1WJ000405","LPSA1WJ000075","LPSA1WJ000301","LPSA1XC000141","LPSA1XK000074","LPSA1XG050033",
    "LPSA1WJ000500","LPSA1WJ000083"
  ];
  t5Serials.forEach(sn => addSerial(sn, "MOTOR-10HP-DC", "Faulty-Received", "New", whId));

  // Table 6: 10 HP DC 30 MTR PUMP
  addSerial("LPSA1XC000121", "PUMP-10HP-DC-30M", "Faulty-Received", "New", whId);
  addSerial("LPSA1WJ000407", "PUMP-10HP-DC-30M", "Faulty-Received", "New", whId);

  // Table 8: 10 HP DC 70 MTR PUMP
  addSerial("LPSA1WJ000500-PUMP", "PUMP-10HP-DC-70M", "Faulty-Received", "New", whId);

  // Table 9: 7.5 HP DC MOTOR (Faulty remaining in warehouse)
  const t9Serials = [
    "LPSA1XG000027","LPSA1WJ000026","LPSA1YE000052","LPSA1XG000011","LPSA1XC000049"
  ];
  t9Serials.forEach(sn => addSerial(sn, "MOTOR-7.5HP-DC", "Faulty-Received", "New", whId));

  // Table 10: 7.5 HP DC 30 MTR PUMP (Faulty remaining in warehouse)
  const t10Serials = [
    "LPSA1XG000011-PUMP","LPSA1YE000052-PUMP"
  ];
  t10Serials.forEach(sn => addSerial(sn, "PUMP-7.5HP-DC-30M", "Faulty-Received", "New", whId));

  // Table 11: POWER CARD (Faulty remaining in warehouse)
  const t11Serials = [
    "H8020102300355","B9015062403002","B9015032513589","B9015112301689"
  ];
  t11Serials.forEach(sn => addSerial(sn, "PCB-10HP-AC", "Faulty-Received", "New", whId));

  // Table 12: RMS DISPLAY (Faulty remaining in warehouse)
  const t12Serials = [
    "867950071909020","864180054443531","864180054431239"
  ];
  t12Serials.forEach(sn => addSerial(sn, "RMS-4G-GPS", "Faulty-Received", "New", whId));

  // --- FRESH SERIAL NUMBERS (Table 13) ---
  // Columns:
  // 1. POWER CARD
  const freshPcb1 = [
    "B9015202405629","B9015052502914","B9015052502772","B9015082404989","B9015082405327","B9015012511002",
    "309526003546","B9015052502774","H8020012220017","P8020052201470","B9015062403150","B9015022406541",
    "B9015052502709","B9015052501413","B9015052501377","B9015072403691","B9015122513115","B9015122513113",
    "P8020052201460","H8020042300002","P8020052201484","P8020052201479","P8020052201481","H8020072200259"
  ];
  freshPcb1.forEach(sn => addSerial(sn, "PCB-10HP-AC", "Fresh", "New", whId));

  // 2. RMS DISPLAY (Fresh)
  const freshRms = [
    "864180054424747","862211074110222","867409074382446","862211074111956","864180055027085",
    "864180057666153","861657072345221","864180057750155","864180057689874","864180055029214",
    "864180054435933","865577078968493","862211071696777","862211072889488","864180057741584",
    "864180055026079","864180055024306","863877076174553","860617089486542","864180054444818",
    "869833080105053","860617089504746","869833080104973","869833080101029","864180057724648",
    "864180055903913","869833080126943","869833080101664","860617089471965","869833080104866",
    "869833080100583","869833080082898","860617089473805","869833080104668","864180054432062",
    "869833080105327","869833080100237","860617089477384","869833080082690","869833080082401",
    "869833080127289","860617089486542-ALT","869833080100260"
  ];
  freshRms.forEach(sn => addSerial(sn, "RMS-4G-GPS", "Fresh", "New", whId));

  // 3. 7.5 HP DC MOTOR (Fresh)
  addSerial("LPSA1XG050020", "MOTOR-7.5HP-DC", "Fresh", "New", whId);
  addSerial("LPSA1WJ000019", "MOTOR-7.5HP-DC", "Fresh", "New", whId);

  // 4. 7.5 HP DC 30 MTR PUMP (Fresh)
  addSerial("LPSA1XG050001", "PUMP-7.5HP-DC-30M", "Fresh", "New", whId);

  // 5. 10 HP AC 30 MTR PUMP (Fresh)
  addSerial("LPSA1WJ000150", "PUMP-10HP-AC-30M", "Fresh", "New", whId);
  addSerial("LPSA1WJ000122", "PUMP-10HP-AC-30M", "Fresh", "New", whId);

  // 6. 10 HP DC 70 MTR PUMP (Fresh)
  addSerial("LPSA1XC000105", "PUMP-10HP-DC-70M", "Fresh", "New", whId);

  // 7. 10 HP AC 50 MTR PUMP (Fresh)
  const fresh10Ac50 = [
    "LPSA1XK000097","LPSA1XK000158","LPSA1XG050014","LPSA1WJ000448","LPSA1XC000173","LPSA1XA000053"
  ];
  fresh10Ac50.forEach(sn => addSerial(sn, "PUMP-10HP-AC-50M", "Fresh", "New", whId));

  // 8. 10 HP DC 50 MTR PUMP (Fresh)
  addSerial("LPSA1XA000182", "PUMP-10HP-DC-50M", "Fresh", "New", whId);
  addSerial("LPSA1XA000339", "PUMP-10HP-DC-50M", "Fresh", "New", whId);

  // 9. 10 HP DC MOTOR (Fresh)
  addSerial("LPSA1XA000023", "MOTOR-10HP-DC", "Fresh", "New", whId);

  // 10. 7.5 HP DC 100 MTR PUMP (Fresh)
  addSerial("LPSA1XG050004", "PUMP-7.5HP-DC-100M", "Fresh", "New", whId);

  // --- AT CROMPTON (Table 14) ---
  const mfg = "Crompton Greaves Consumer Electricals Ltd.";

  // 10 HP AC MOTOR (At Crompton)
  const crompton10AcMotor = [
    "LPSA1XC000249","LPSA1XC000372","LPSA1XG000113","LPSA1XC000369","LPSA1YE000142",
    "LPSA1WJ000441","LPSA1XA000131","LPSA1XA000028","LPSA1XK000135","LPSA1XG000069",
    "LPSA1XG050058"
  ];
  crompton10AcMotor.forEach(sn => addSerial(sn, "MOTOR-10HP-AC", "At-Manufacturer", "New", mfg));

  // 10 HP AC 30 MTR PUMP (At Crompton)
  const crompton10AcPump = [
    "LPSA1XA000051","LPSA1XK000113","LPSA1XC000243","LPSA1XC000324","LPSA1XC000204","LPSA1YE000106"
  ];
  crompton10AcPump.forEach(sn => addSerial(sn, "PUMP-10HP-AC-30M", "At-Manufacturer", "New", mfg));

  // 10 HP DC MOTOR (At Crompton)
  const crompton10DcMotor = [
    "LPSA1XK000048","LPSA1XC000104","LPSA1XK000063","LPSA1WJ000082"
  ];
  crompton10DcMotor.forEach(sn => addSerial(sn, "MOTOR-10HP-DC", "At-Manufacturer", "New", mfg));

  // 10 HP DC 50 MTR PUMP (At Crompton)
  addSerial("LPSA1WJ000066", "PUMP-10HP-DC-50M", "At-Manufacturer", "New", mfg);

  // 7.5 HP DC MOTOR (At Crompton)
  const crompton75DcMotor = [
    "LPSA1XK000045","LPSA1WJ000004","LPSA1XC000079","LPSA1WJ000049","LPSA1WJ000047",
    "LPSA1WJ000043","LPSA1WJ000005","LPSA1WJ000389"
  ];
  crompton75DcMotor.forEach(sn => addSerial(sn, "MOTOR-7.5HP-DC", "At-Manufacturer", "New", mfg));

  // 7.5 HP DC 30 MTR PUMP (At Crompton)
  const crompton75DcPump = [
    "LPSA1WJ000049-PUMP","LPSA1XA000162","LPSA1WJ000387","LPSA1WJ000389-PUMP"
  ];
  crompton75DcPump.forEach(sn => addSerial(sn, "PUMP-7.5HP-DC-30M", "At-Manufacturer", "New", mfg));

  // POWER CARD (At Crompton)
  const cromptonPcb = [
    "B9015052403222","B9015062402233","B9015112300680","B9015062403117","B9015062403488",
    "B9015062406067","B9015052400776","B9015102300102","B9015042400632"
  ];
  cromptonPcb.forEach(sn => addSerial(sn, "PCB-10HP-AC", "At-Manufacturer", "New", mfg));

  // RMS DISPLAY (At Crompton)
  const cromptonRms = [
    "864180055052299","864180055860493","864180057699824","862211072870058",
    "864180055052786","863877076177465","865577078927150"
  ];
  cromptonRms.forEach(sn => addSerial(sn, "RMS-4G-GPS", "At-Manufacturer", "New", mfg));

  // --- NON-SERIALIZED ITEMS (From Table 1 Summary) ---
  const nonSerialized = [
    { code: "MCB-2P-32A", fresh: 30, faulty: 3, crompton: 0 },
    { code: "MC4-PV-1000V", fresh: 15, faulty: 13, crompton: 15 },
    { code: "3PIN-30A-500V", fresh: 20, faulty: 11, crompton: 15 },
    { code: "SPD-DC-1000V", fresh: 38, faulty: 2, crompton: 0 },
    { code: "PV-MODULES", fresh: 40, faulty: 0, crompton: 0 },
    { code: "TOGGLE-SWITCH", fresh: 0, faulty: 0, crompton: 0 }
  ];

  for (const item of nonSerialized) {
    for (let i = 1; i <= item.fresh; i++) {
      entries.push({
        serialNo: `HR-${item.code}-FR-${String(i).padStart(3, "0")}`,
        partCode: item.code,
        status: "Fresh",
        condition: "New",
        currentLocation: whId
      });
    }
    for (let i = 1; i <= item.faulty; i++) {
      entries.push({
        serialNo: `HR-${item.code}-FA-${String(i).padStart(3, "0")}`,
        partCode: item.code,
        status: "Faulty-Received",
        condition: "New",
        currentLocation: whId
      });
    }
    for (let i = 1; i <= item.crompton; i++) {
      entries.push({
        serialNo: `HR-${item.code}-CR-${String(i).padStart(3, "0")}`,
        partCode: item.code,
        status: "At-Manufacturer",
        condition: "New",
        currentLocation: mfg
      });
    }
  }

  // Insert all entries into database via fast bulk insert
  console.log(`Writing ${entries.length} UnitLedger entries into Haryana database...`);
  await prisma.unitLedger.createMany({
    data: entries,
    skipDuplicates: true
  });

  console.log("✅ Successfully seeded Haryana Warehouse UnitLedger!");

  // Print Summary
  const summary = await prisma.unitLedger.groupBy({
    by: ["status"],
    _count: { serialNo: true }
  });
  console.log("📊 Status Breakdown in DB:", summary);

  await prisma.$disconnect();
}

seedHaryana().catch(err => {
  console.error("❌ Seed Haryana Failed:", err);
  process.exit(1);
});
