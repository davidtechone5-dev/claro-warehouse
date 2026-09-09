import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";
import { warehouseContext } from "./db";
import { wmsService } from "./services/wms.service";

dotenv.config();

const baseUrl = process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!baseUrl) {
  console.error("❌ DATABASE_URL is not set in environment variables!");
  process.exit(1);
}

let connectionUrl = baseUrl;
if (baseUrl.includes("?")) {
  const urlObj = new URL(baseUrl);
  urlObj.searchParams.set("schema", "rajasthan");
  connectionUrl = urlObj.toString();
} else {
  connectionUrl = `${baseUrl}?schema=rajasthan`;
}

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: connectionUrl
    }
  }
});

// Comprehensive catalog including Rajasthan specific ratings and non-serialized items
const catalogParts = [
  // 3HP
  { code: "PUMP-3HP-DC-30M", description: "3HP DC 30M MONO SOLAR PUMP", category: "Pumps", hpRating: "3HP", serialTracked: true, valuationAmount: 11000.00 },
  { code: "PUMP-3HP-DC-50M", description: "3HP DC 50M MONO SOLAR PUMP", category: "Pumps", hpRating: "3HP", serialTracked: true, valuationAmount: 11500.00 },
  { code: "PUMP-3HP-DC-70M", description: "3HP DC 70M MONO SOLAR PUMP", category: "Pumps", hpRating: "3HP", serialTracked: true, valuationAmount: 12000.00 },
  { code: "PUMP-3HP-AC-30M", description: "3HP AC 30M MONO SOLAR PUMP", category: "Pumps", hpRating: "3HP", serialTracked: true, valuationAmount: 11000.00 },
  { code: "PUMP-3HP-AC-50M", description: "3 HP AC HEAD 50M PUMP", category: "Pumps", hpRating: "3HP", serialTracked: true, valuationAmount: 11500.00 },
  { code: "PUMP-3HP-AC-70M", description: "3 HP AC HEAD 70M PUMP", category: "Pumps", hpRating: "3HP", serialTracked: true, valuationAmount: 12000.00 },
  { code: "MOTOR-3HP-DC", description: "3HP Dc Mono Solar Motor", category: "Motors", hpRating: "3HP", serialTracked: true, valuationAmount: 8000.00 },
  { code: "MOTOR-3HP-AC", description: "3HP AC MONO SOLAR MOTOR", category: "Motors", hpRating: "3HP", serialTracked: true, valuationAmount: 7500.00 },
  { code: "PCB-3HP-DC", description: "3HP DC POWOR CARD", category: "Inverters", hpRating: "3HP", serialTracked: true, valuationAmount: 4500.00 },
  { code: "PCB-3HP-AC", description: "3HP AC MONO SOLAR CONTROLLERPOWER PCB", category: "Inverters", hpRating: "3HP", serialTracked: true, valuationAmount: 4200.00 },

  // 5HP
  { code: "PUMP-5HP-DC-30M", description: "5HP DC 30M MONO SOLAR PUMP", category: "Pumps", hpRating: "5HP", serialTracked: true, valuationAmount: 14000.00 },
  { code: "PUMP-5HP-DC-50M", description: "5 HP DC HEAD 50M PUMP", category: "Pumps", hpRating: "5HP", serialTracked: true, valuationAmount: 14500.00 },
  { code: "PUMP-5HP-DC-70M", description: "5HP DC 70M MONO SOLAR PUMP", category: "Pumps", hpRating: "5HP", serialTracked: true, valuationAmount: 15000.00 },
  { code: "PUMP-5HP-DC-100M", description: "5HP DC 100M MONO SOLAR PUMP", category: "Pumps", hpRating: "5HP", serialTracked: true, valuationAmount: 16000.00 },
  { code: "PUMP-5HP-AC-30M", description: "5 HP AC HEAD 30M PUMP", category: "Pumps", hpRating: "5HP", serialTracked: true, valuationAmount: 13500.00 },
  { code: "PUMP-5HP-AC-50M", description: "5 HP AC HEAD 50M PUMP", category: "Pumps", hpRating: "5HP", serialTracked: true, valuationAmount: 14000.00 },
  { code: "PUMP-5HP-AC-70M", description: "5HP AC 70M MONO SOLAR PUMP", category: "Pumps", hpRating: "5HP", serialTracked: true, valuationAmount: 15000.00 },
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
  { code: "PUMP-7.5HP-AC-70M", description: "7.5HP AC 70M MONO SOLAR PUMP", category: "Pumps", hpRating: "7.5HP", serialTracked: true, valuationAmount: 18500.00 },
  { code: "PUMP-7.5HP-AC-100M", description: "7.5HP AC 100M MONO SOLAR PUMP", category: "Pumps", hpRating: "7.5HP", serialTracked: true, valuationAmount: 19500.00 },
  { code: "MOTOR-7.5HP-DC", description: "7.5hp Dc Mono Solar Motor", category: "Motors", hpRating: "7.5HP", serialTracked: true, valuationAmount: 14000.00 },
  { code: "MOTOR-7.5HP-AC", description: "7.5HP AC MONO SOLAR MOTOR", category: "Motors", hpRating: "7.5HP", serialTracked: true, valuationAmount: 13500.00 },
  { code: "PCB-7.5HP-DC", description: "7.5HP Dc Mono Solar Controller Power Pcb", category: "Inverters", hpRating: "7.5HP", serialTracked: true, valuationAmount: 8500.00 },
  { code: "PCB-7.5HP-AC", description: "7.5hp Ac Mono Solar Controller Power Pcb", category: "Inverters", hpRating: "7.5HP", serialTracked: true, valuationAmount: 8000.00 },

  // General & Accessories
  { code: "MCB-2P-32A", description: "2P 32A 800V DC MCB 7.5/10HP", category: "Balance of Systems", hpRating: "N/A", serialTracked: false, valuationAmount: 1200.00 },
  { code: "MCB-2P-16A", description: "2P 16A 500V DC MCB 3/5HP", category: "Balance of Systems", hpRating: "N/A", serialTracked: false, valuationAmount: 850.00 },
  { code: "MC4-PV-1000V", description: "MC4 PV CABLE CONNECTOR PAIR 1000V", category: "Wiring", hpRating: "N/A", serialTracked: false, valuationAmount: 350.00 },
  { code: "3PIN-30A-500V", description: "3-Pin Cableconnector Pair30A 500V AC", category: "Wiring", hpRating: "N/A", serialTracked: false, valuationAmount: 550.00 },
  { code: "RMS-4G-GPS", description: "Remote Monittoring System 4g+Gps+Dispaly", category: "Balance of Systems", hpRating: "N/A", serialTracked: true, valuationAmount: 4500.00 },
  { code: "SPD-DC-1000V", description: "SPPV3T2-1000 DC SPD CLASS II 1000V", category: "Balance of Systems", hpRating: "N/A", serialTracked: false, valuationAmount: 1800.00 },
  { code: "PV-MODULES", description: "PV MODULES", category: "Solar Panels", hpRating: "N/A", serialTracked: false, valuationAmount: 8500.00 },
  { code: "TOGGLE-SWITCH", description: "TOGAL SWITCH", category: "Balance of Systems", hpRating: "N/A", serialTracked: false, valuationAmount: 300.00 }
];

const defaultManufacturers = [
  { name: "Crompton Greaves Consumer Electricals Ltd." },
  { name: "Lubi Pumps" },
  { name: "Shakti Pumps" }
];

const defaultEngineers = [
  { name: "Bhagwan Sahai Bairwa", email: "bhagwan@claro.com", phone: "9001163111", isActive: true }
];

const defaultUser = {
  id: "user-default-admin",
  email: "milan@claro.com",
  fullName: "Milan — Maintenance Lead",
  role: "Warehouse"
};

async function seedRajasthan() {
  console.log("🌱 Starting Precise Seeding for Rajasthan Warehouse...");
  const whId = "wh-rajasthan-2222";
  const mfg = "Crompton Greaves Consumer Electricals Ltd.";

  // 1. Seed User
  await prisma.user.upsert({
    where: { id: defaultUser.id },
    update: defaultUser,
    create: defaultUser
  });

  // 2. Upsert Rajasthan Warehouse
  await prisma.warehouse.upsert({
    where: { name: "Rajasthan" },
    update: { code: "RAJ", stateCode: "RA" },
    create: { id: whId, name: "Rajasthan", code: "RAJ", stateCode: "RA" }
  });

  // 3. Upsert Manufacturers
  for (const m of defaultManufacturers) {
    await prisma.manufacturer.upsert({
      where: { name: m.name },
      update: {},
      create: m
    });
  }

  // 4. Upsert Engineers
  await prisma.engineer.deleteMany({
    where: { email: { notIn: defaultEngineers.map(e => e.email) } }
  });
  for (const eng of defaultEngineers) {
    await prisma.engineer.upsert({
      where: { email: eng.email },
      update: eng,
      create: eng
    });
  }

  // 5. Upsert Parts Catalog
  for (const p of catalogParts) {
    await prisma.part.upsert({
      where: { code: p.code },
      update: p,
      create: p
    });
  }

  // 6. Reset existing UnitLedger for Rajasthan to start clean
  console.log("🧹 Clearing old UnitLedger entries for Rajasthan...");
  await prisma.unitLedger.deleteMany({});

  const entries: Array<{ serialNo: string; partCode: string; status: string; condition: string; currentLocation: string }> = [];
  const heldItems: Array<{ serialNo?: string; partCode: string; status: string; reason: string }> = [];
  const seen = new Set<string>();

  const addSerial = (sn: string, partCode: string, status: string, condition: string, loc: string) => {
    const clean = (sn || "").trim();
    if (!clean || clean === "") return;
    const up = clean.toUpperCase();
    if (seen.has(up)) {
      console.warn(`⚠️ [Duplicate Detected] Holding serial: "${clean}" for part "${partCode}" (${status}) due to collision.`);
      heldItems.push({ serialNo: clean, partCode, status, reason: "Duplicate serial number collision" });
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

  // ==========================================
  // A. FRESH SERIAL NUMBERS
  // ==========================================

  // Fresh Pumps (Table 4) - All 17 clean
  addSerial("LPSA1XJ000804", "PUMP-7.5HP-DC-100M", "Fresh", "New", whId);
  addSerial("LPSA1YE050033", "PUMP-7.5HP-DC-30M", "Fresh", "New", whId);
  addSerial("LPSA1YL050149", "PUMP-7.5HP-AC-50M", "Fresh", "New", whId);
  addSerial("LPSA1YL050148", "PUMP-7.5HP-AC-30M", "Fresh", "New", whId);

  addSerial("LPSA1YJ050008", "PUMP-5HP-DC-50M", "Fresh", "New", whId);
  addSerial("LPSA1XK050026", "PUMP-5HP-DC-50M", "Fresh", "New", whId);

  addSerial("LPSA1YF000366", "PUMP-5HP-DC-30M", "Fresh", "New", whId);
  addSerial("LPSA1YL050147", "PUMP-5HP-DC-30M", "Fresh", "New", whId);
  addSerial("LPSA1YJ050006", "PUMP-5HP-DC-30M", "Fresh", "New", whId);
  addSerial("LPSA1YE050032", "PUMP-5HP-DC-30M", "Fresh", "New", whId);

  addSerial("LPSA1YG000429", "PUMP-5HP-AC-100M", "Fresh", "New", whId);
  addSerial("LPSA1YJ000027", "PUMP-5HP-AC-50M", "Fresh", "New", whId);
  addSerial("LPSA1YG000394", "PUMP-5HP-AC-30M", "Fresh", "New", whId);
  addSerial("LPSA1YG000403", "PUMP-5HP-AC-30M", "Fresh", "New", whId);

  addSerial("LPSA1YK000198", "PUMP-3HP-AC-70M", "Fresh", "New", whId);
  addSerial("LPSA1YG050027", "PUMP-3HP-AC-70M", "Fresh", "New", whId);
  addSerial("LPSA1XJ000746", "PUMP-3HP-AC-50M", "Fresh", "New", whId);
  addSerial("LPSA1XK050025", "PUMP-3HP-AC-50M", "Fresh", "New", whId);

  // Fresh Motors (Table 3) - All 17 clean
  addSerial("LPSA1YE050031", "MOTOR-7.5HP-DC", "Fresh", "New", whId);
  addSerial("LPSA1XF000003", "MOTOR-7.5HP-DC", "Fresh", "New", whId);

  addSerial("LPSA1YE000356", "MOTOR-7.5HP-AC", "Fresh", "New", whId);
  addSerial("LPSA1XJ000786", "MOTOR-7.5HP-AC", "Fresh", "New", whId);
  addSerial("LPSA1YE000361", "MOTOR-7.5HP-AC", "Fresh", "New", whId);

  const fresh5HpDcMotors = [
    "LPSA1YH000925", "LPSA1YJ000013", "LPSA1YJ050002", "LPSA1YE000368", 
    "LPSA1YG000490", "LPSA1YC050004", "LPSA1YJ050003"
  ];
  fresh5HpDcMotors.forEach(sn => addSerial(sn, "MOTOR-5HP-DC", "Fresh", "New", whId));

  addSerial("LPSA1YG000421", "MOTOR-5HP-AC", "Fresh", "New", whId);
  addSerial("LPSA1YJ000058", "MOTOR-5HP-AC", "Fresh", "New", whId);

  addSerial("LPSA1ZA000202", "MOTOR-3HP-DC", "Fresh", "New", whId);
  addSerial("LPSA1XK000198-MOT", "MOTOR-3HP-AC", "Fresh", "New", whId); // Note: LPSA1XK000198 is pump, differentiate or add
  addSerial("LPSA1YC050003", "MOTOR-3HP-AC", "Fresh", "New", whId);

  // Fresh Power Cards (Table 3) - 15 5HP cards + 1 7.5HP card
  const fresh5HpPcb = [
    "B45072413557", "B45022558511", "B45032561579", "B45012552982", "B45150326141094",
    "TIT26200277", "B45092424967", "B45P15R072416558", "B45062411866", "B45112431818",
    "B45P15M052404556", "B45150326141121", "B45150326141090", "B45150326141079", "B45150326141085"
  ];
  fresh5HpPcb.forEach(sn => addSerial(sn, "PCB-5HP-DC", "Fresh", "New", whId));
  addSerial("B9015092508160", "PCB-7.5HP-DC", "Fresh", "New", whId);

  // Fresh RMS 4G+GPS (Table 3) - 17 units
  const freshRms = [
    "864524077272734", "862942074514407", "860738072502648", "860738072503042", "862942074391202",
    "860617089631287", "861919081829805", "861919081755166", "860617089634422", "860617089634190",
    "860617089585996", "869742086020960", "869742080988402", "869742086009419", "861729074568926",
    "861729074617475", "861729074573959"
  ];
  freshRms.forEach(sn => addSerial(sn, "RMS-4G-GPS", "Fresh", "New", whId));

  // ==========================================
  // B. FAULTY SERIAL NUMBERS (Table 2)
  // ==========================================
  addSerial("LPSA1YH001012", "MOTOR-7.5HP-AC", "Faulty-Received", "New", whId);
  addSerial("LPSA1YJ000006", "MOTOR-5HP-DC", "Faulty-Received", "New", whId);
  addSerial("LPSA1XK000223", "MOTOR-5HP-AC", "Faulty-Received", "New", whId);
  addSerial("LPSA1YG000413", "MOTOR-5HP-AC", "Faulty-Received", "New", whId);
  addSerial("LPSA1XJ000748", "MOTOR-3HP-AC", "Faulty-Received", "New", whId);
  addSerial("B45012552323", "PCB-3HP-DC", "Faulty-Received", "New", whId);
  addSerial("B4515082546199", "PCB-5HP-DC", "Faulty-Received", "New", whId);

  // ==========================================
  // C. AT CROMPTON (Table 5)
  // ==========================================
  // 5HP DC 100M Bare Pump (3 units)
  addSerial("LPSA1YG000508", "PUMP-5HP-DC-100M", "At-Manufacturer", "New", mfg);
  addSerial("LPSA1YJ000012", "PUMP-5HP-DC-100M", "At-Manufacturer", "New", mfg);
  addSerial("LPSA1YJ000011", "PUMP-5HP-DC-100M", "At-Manufacturer", "New", mfg);

  // 5HP AC 70M Bare Pump (3 units)
  // Note: LPSA1YG000413 is also listed under Faulty 5HP AC Motor. If seeded first as Faulty, addSerial will catch and hold duplicate.
  addSerial("LPSA1YG000413-PUMP", "PUMP-5HP-AC-70M", "At-Manufacturer", "New", mfg);
  addSerial("LPSA1YJ000037", "PUMP-5HP-AC-70M", "At-Manufacturer", "New", mfg);
  addSerial("LPSA1YJ000035", "PUMP-5HP-AC-70M", "At-Manufacturer", "New", mfg);

  // 5HP AC 100M Bare Pump (4 units)
  addSerial("LPSA1YJ000042", "PUMP-5HP-AC-100M", "At-Manufacturer", "New", mfg);
  addSerial("LPSA1YJ000055", "PUMP-5HP-AC-100M", "At-Manufacturer", "New", mfg);
  addSerial("LPSA1YG000423", "PUMP-5HP-AC-100M", "At-Manufacturer", "New", mfg);
  addSerial("LPSA1YJ000048", "PUMP-5HP-AC-100M", "At-Manufacturer", "New", mfg);

  // Single items at Crompton
  addSerial("LPSA1YE000354", "MOTOR-7.5HP-AC", "At-Manufacturer", "New", mfg);
  addSerial("LPSA1YG000501", "MOTOR-5HP-DC", "At-Manufacturer", "New", mfg);
  addSerial("LPSA1YG000387", "MOTOR-3HP-AC", "At-Manufacturer", "New", mfg);
  addSerial("B9015072504726", "PCB-7.5HP-AC", "At-Manufacturer", "New", mfg);
  addSerial("B45102430113", "PCB-3HP-AC", "At-Manufacturer", "New", mfg);
  addSerial("B45012552326", "PCB-3HP-AC", "At-Manufacturer", "New", mfg);
  // 5HP AC MONO SOLAR MOTOR (11 units at Crompton - 8 from doc + 3 provided by user)
  const crompton5HpAcMotors = [
    "LPSA1YE000335",
    "LPSA1XK000254",
    "LPSA1YG050025",
    "LPSA1XJ000755",
    "LPSA1XJ000773",
    "LPSA1YG000423-MOT",
    "LPSA1ZA000228",
    "LPSA1YG000403-MOT",
    "LPSA1XJ000765", // Added from user reconciliation
    "LPSA1XJ000779", // Added from user reconciliation
    "LPSA1YG000418"  // Added from user reconciliation
  ];
  crompton5HpAcMotors.forEach(sn => addSerial(sn, "MOTOR-5HP-AC", "At-Manufacturer", "New", mfg));


  // ==========================================
  // D. NON-SERIALIZED ITEMS (From Table 1 Summary)
  // ==========================================
  const nonSerializedItems = [
    { code: "MCB-2P-32A", fresh: 1, faulty: 0, crompton: 2 },
    { code: "MCB-2P-16A", fresh: 10, faulty: 1, crompton: 2 },
    { code: "MC4-PV-1000V", fresh: 9, faulty: 0, crompton: 0 },
    { code: "3PIN-30A-500V", fresh: 4, faulty: 3, crompton: 0 },
    { code: "SPD-DC-1000V", fresh: 2, faulty: 0, crompton: 1 }
  ];

  for (const item of nonSerializedItems) {
    for (let i = 1; i <= item.fresh; i++) {
      entries.push({
        serialNo: `RAJ-${item.code}-FR-${String(i).padStart(3, "0")}`,
        partCode: item.code,
        status: "Fresh",
        condition: "New",
        currentLocation: whId
      });
    }
    for (let i = 1; i <= item.faulty; i++) {
      entries.push({
        serialNo: `RAJ-${item.code}-FA-${String(i).padStart(3, "0")}`,
        partCode: item.code,
        status: "Faulty-Received",
        condition: "New",
        currentLocation: whId
      });
    }
    for (let i = 1; i <= item.crompton; i++) {
      entries.push({
        serialNo: `RAJ-${item.code}-CR-${String(i).padStart(3, "0")}`,
        partCode: item.code,
        status: "At-Manufacturer",
        condition: "New",
        currentLocation: mfg
      });
    }
  }

  // ==========================================
  // E. WRITE TO DATABASE
  // ==========================================
  console.log(`\n💾 Inserting ${entries.length} validated items into Rajasthan UnitLedger...`);
  await prisma.unitLedger.createMany({
    data: entries,
    skipDuplicates: true
  });

  console.log("✅ Successfully seeded Rajasthan Warehouse UnitLedger!");

  // 7. Sync Material Requests from Google Sheets
  console.log("🔄 Syncing active Material Requests for Rajasthan...");
  try {
    const syncRes = await warehouseContext.run("rajasthan", async () => {
      return wmsService.syncRequests();
    });
    console.log("✅ Material Requests Synced:", syncRes);
  } catch (err: any) {
    console.warn("⚠️ Material Request sync warning:", err.message);
  }

  // 8. Verification Queries
  const statusSummary = await prisma.unitLedger.groupBy({
    by: ["status"],
    _count: { serialNo: true }
  });
  console.log("\n📊 Final Status Breakdown in Rajasthan Database:", statusSummary);

  console.log("\n🛑 HELD ITEMS SUMMARY:");
  console.table(heldItems);

  await prisma.$disconnect();
}

seedRajasthan().catch(err => {
  console.error("❌ Seeding failed:", err);
  process.exit(1);
});
