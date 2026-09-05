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
  urlObj.searchParams.set("schema", "mp");
  connectionUrl = urlObj.toString();
} else {
  connectionUrl = `${baseUrl}?schema=mp`;
}

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: connectionUrl
    }
  }
});

// Exact 35 parts from "Parts for MP.docx"
export const mpExact35Parts = [
  // Pumps (16 items)
  { code: "PUMP-2HP-DC-30M", description: "2HP DC 30M MONO SOLAR PUMP", category: "Pumps", hpRating: "2HP", serialTracked: true, valuationAmount: 9500.00 },
  { code: "PUMP-3HP-DC-30M", description: "3HP DC 30M MONO SOLAR PUMP", category: "Pumps", hpRating: "3HP", serialTracked: true, valuationAmount: 11000.00 },
  { code: "PUMP-3HP-DC-50M", description: "3HP DC 50M MONO SOLAR PUMP", category: "Pumps", hpRating: "3HP", serialTracked: true, valuationAmount: 11500.00 },
  { code: "PUMP-3HP-DC-70M", description: "3HP DC 70M MONO SOLAR PUMP", category: "Pumps", hpRating: "3HP", serialTracked: true, valuationAmount: 12000.00 },
  { code: "PUMP-5HP-DC-30M", description: "5HP DC 30M MONO SOLAR PUMP", category: "Pumps", hpRating: "5HP", serialTracked: true, valuationAmount: 14000.00 },
  { code: "PUMP-5HP-DC-50M", description: "5HP DC 50M MONO SOLAR PUMP", category: "Pumps", hpRating: "5HP", serialTracked: true, valuationAmount: 14500.00 },
  { code: "PUMP-5HP-DC-70M", description: "5HP DC 70M MONO SOLAR PUMP", category: "Pumps", hpRating: "5HP", serialTracked: true, valuationAmount: 15000.00 },
  { code: "PUMP-5HP-DC-100M", description: "5HP DC 100M MONO SOLAR PUMP", category: "Pumps", hpRating: "5HP", serialTracked: true, valuationAmount: 16000.00 },
  { code: "PUMP-7.5HP-DC-30M", description: "7.5HP DC 30M MONO SOLAR PUMP", category: "Pumps", hpRating: "7.5HP", serialTracked: true, valuationAmount: 18000.00 },
  { code: "PUMP-7.5HP-DC-50M", description: "7.5HP DC 50M MONO SOLAR PUMP", category: "Pumps", hpRating: "7.5HP", serialTracked: true, valuationAmount: 18500.00 },
  { code: "PUMP-7.5HP-DC-70M", description: "7.5HP DC 70M MONO SOLAR PUMP", category: "Pumps", hpRating: "7.5HP", serialTracked: true, valuationAmount: 19000.00 },
  { code: "PUMP-7.5HP-DC-100M", description: "7.5HP DC 100M MONO SOLAR PUMP", category: "Pumps", hpRating: "7.5HP", serialTracked: true, valuationAmount: 20000.00 },
  { code: "PUMP-7.5HP-AC-30M", description: "7.5HP AC 30M MONO SOLAR PUMP", category: "Pumps", hpRating: "7.5HP", serialTracked: true, valuationAmount: 17500.00 },
  { code: "PUMP-7.5HP-AC-50M", description: "7.5HP AC 50M MONO SOLAR PUMP", category: "Pumps", hpRating: "7.5HP", serialTracked: true, valuationAmount: 18000.00 },
  { code: "PUMP-7.5HP-AC-70M", description: "7.5HP AC 70M MONO SOLAR PUMP", category: "Pumps", hpRating: "7.5HP", serialTracked: true, valuationAmount: 18500.00 },
  { code: "PUMP-7.5HP-AC-100M", description: "7.5HP AC 100M MONO SOLAR PUMP", category: "Pumps", hpRating: "7.5HP", serialTracked: true, valuationAmount: 19500.00 },

  // Motors (5 items)
  { code: "MOTOR-7.5HP-AC", description: "7.5HP AC MONO SOLAR MOTOR", category: "Motors", hpRating: "7.5HP", serialTracked: true, valuationAmount: 13500.00 },
  { code: "MOTOR-7.5HP-DC", description: "7.5HP DC MONO SOLAR MOTOR", category: "Motors", hpRating: "7.5HP", serialTracked: true, valuationAmount: 14000.00 },
  { code: "MOTOR-5HP-DC", description: "5 HP DC MONO SOLAR MOTOR", category: "Motors", hpRating: "5HP", serialTracked: true, valuationAmount: 10000.00 },
  { code: "MOTOR-3HP-DC", description: "3 HP DC MONO SOLAR MOTOR", category: "Motors", hpRating: "3HP", serialTracked: true, valuationAmount: 8000.00 },
  { code: "MOTOR-2HP-DC", description: "2 HP DC MONO SOLAR MOTOR", category: "Motors", hpRating: "2HP", serialTracked: true, valuationAmount: 6500.00 },

  // Power Cards (5 items)
  { code: "PCB-2HP-DC", description: "2HP DC MONO SOLAR CONTROLLER POWER PCB", category: "Inverters", hpRating: "2HP", serialTracked: true, valuationAmount: 3800.00 },
  { code: "PCB-3HP-DC", description: "3HP DC MONO SOLAR CONTROLLER POWER PCB", category: "Inverters", hpRating: "3HP", serialTracked: true, valuationAmount: 4500.00 },
  { code: "PCB-5HP-DC", description: "5HP DC MONO SOLAR CONTROLLER POWER PCB", category: "Inverters", hpRating: "5HP", serialTracked: true, valuationAmount: 6000.00 },
  { code: "PCB-7.5HP-AC", description: "7.5HP AC MONO SOLAR CONTROLLER POWER PCB", category: "Inverters", hpRating: "7.5HP", serialTracked: true, valuationAmount: 8000.00 },
  { code: "PCB-7.5HP-DC", description: "7.5HP DC MONO SOLAR CONTROLLER POWER PCB", category: "Inverters", hpRating: "7.5HP", serialTracked: true, valuationAmount: 8500.00 },

  // Balance of System & Accessories (9 items)
  { code: "MCB-2P-16A", description: "2P 16A 500V DC MCB UPTO 5HP", category: "Balance of Systems", hpRating: "N/A", serialTracked: false, valuationAmount: 850.00 },
  { code: "MCB-2P-20A", description: "2P 20A 500V DC MCB UPTO 5HP", category: "Balance of Systems", hpRating: "N/A", serialTracked: false, valuationAmount: 950.00 },
  { code: "MCB-2P-32A", description: "2P 32A 800V DC MCB 7.5/10HP", category: "Balance of Systems", hpRating: "N/A", serialTracked: false, valuationAmount: 1200.00 },
  { code: "3PIN-30A-500V", description: "3-PIN CABLE CONNECTOR PAIR 30A 500V AC", category: "Wiring", hpRating: "N/A", serialTracked: false, valuationAmount: 550.00 },
  { code: "MC4-PV-1000V", description: "MC4 PV CABLE CONNECTOR PAIR 1000V", category: "Wiring", hpRating: "N/A", serialTracked: false, valuationAmount: 350.00 },
  { code: "MC4-CONNECTOR", description: "MC4 CONNECTOR", category: "Wiring", hpRating: "N/A", serialTracked: false, valuationAmount: 200.00 },
  { code: "RMS-4G-GPS", description: "REMOTE MONITORING SYSTEM-4G+GPS+DISPLY", category: "Balance of Systems", hpRating: "N/A", serialTracked: true, valuationAmount: 4500.00 },
  { code: "SPD-DC-1000V", description: "SPPV3T2-1000 DC SPD CLASS II 1000V", category: "Balance of Systems", hpRating: "N/A", serialTracked: false, valuationAmount: 1800.00 },
  { code: "PV-MODULES", description: "PV MODULES", category: "Solar Panels", hpRating: "N/A", serialTracked: true, valuationAmount: 8500.00 }
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

const defaultUser = {
  id: "user-default-admin",
  email: "milan@claro.com",
  fullName: "Milan — Maintenance Lead",
  role: "Warehouse"
};

async function seedMp() {
  console.log("🌱 Starting Precise Seeding for Madhya Pradesh (MP) Warehouse...");
  const whId = "wh-mp-4444";
  const mfg = "Crompton Greaves Consumer Electricals Ltd.";

  // 1. Seed User
  await prisma.user.upsert({
    where: { id: defaultUser.id },
    update: defaultUser,
    create: defaultUser
  });

  // 2. Upsert MP Warehouse
  await prisma.warehouse.deleteMany({});
  await prisma.warehouse.create({
    data: { id: whId, name: "MP", code: "MP", stateCode: "MP" }
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
  for (const eng of defaultEngineers) {
    await prisma.engineer.upsert({
      where: { email: eng.email },
      update: eng,
      create: eng
    });
  }

  // 5. Clean / Set Parts catalog to exact 35 parts
  const allowedCodes = new Set(mpExact35Parts.map(p => p.code));
  const existingParts = await prisma.part.findMany();
  for (const p of existingParts) {
    if (!allowedCodes.has(p.code)) {
      try {
        await prisma.part.delete({ where: { code: p.code } });
      } catch (e: any) {
        console.warn(`Could not delete part ${p.code}:`, e.message);
      }
    }
  }

  for (const p of mpExact35Parts) {
    await prisma.part.upsert({
      where: { code: p.code },
      update: p,
      create: p
    });
  }

  // 6. Clear existing UnitLedger for MP
  console.log("🧹 Clearing old UnitLedger entries for MP...");
  await prisma.unitLedger.deleteMany({});

  const entries: Array<{ serialNo: string; partCode: string; status: string; condition: string; currentLocation: string }> = [];
  const seen = new Set<string>();

  const addSerial = (sn: string, partCode: string, status: string, condition: string, loc: string) => {
    const clean = (sn || "").trim();
    if (!clean || clean === "") return;
    const up = clean.toUpperCase();
    if (seen.has(up)) {
      console.warn(`Duplicate serial collision for ${clean} (${partCode}). Adding distinct suffix.`);
      const suffixed = `${clean}-${partCode.startsWith("PUMP") ? "PUMP" : "MOT"}`;
      seen.add(suffixed.toUpperCase());
      entries.push({
        serialNo: suffixed,
        partCode,
        status,
        condition,
        currentLocation: loc
      });
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
  // A. FRESH SERIAL NUMBERS (Table 3)
  // ==========================================

  // 1. 2HP DC 30M MONO SOLAR PUMP (11 units)
  const fresh2HpDc30m = [
    "LPSA1ZF050006", "LPSA1ZE050008", "LPSA1ZE050010", "LPSA1ZE050009", "LPSA1ZC050004",
    "LPSA1ZC050003", "LPSA1ZC050007", "LPSA1ZC050002", "LPSA1ZC050006", "LPSA1ZC050001", "LPSA1ZC050005"
  ];
  fresh2HpDc30m.forEach(sn => addSerial(sn, "PUMP-2HP-DC-30M", "Fresh", "New", whId));

  // 2. 3HP DC 30M MONO SOLAR PUMP (8 units)
  const fresh3HpDc30m = [
    "LPSA1ZF050007", "LPSA1ZE050001", "LPSA1ZB050010", "LPSA1ZC050011",
    "LPSA1ZE050002", "LPSA1ZC050010", "LPSA1ZC050009", "LPSA1ZC050008"
  ];
  fresh3HpDc30m.forEach(sn => addSerial(sn, "PUMP-3HP-DC-30M", "Fresh", "New", whId));

  // 3. 3HP DC 50M MONO SOLAR PUMP (4 units)
  const fresh3HpDc50m = [
    "LPSA1ZC050012", "LPSA1ZE050003", "LPSA1ZC050013", "LPSA1ZC050014"
  ];
  fresh3HpDc50m.forEach(sn => addSerial(sn, "PUMP-3HP-DC-50M", "Fresh", "New", whId));

  // 4. 3HP DC 70M MONO SOLAR PUMP (1 unit)
  addSerial("LPSA1ZE050004", "PUMP-3HP-DC-70M", "Fresh", "New", whId);

  // 5. 5HP DC 30M MONO SOLAR PUMP (8 units)
  const fresh5HpDc30m = [
    "LPSA1ZE050006", "LPSA1ZC050016", "LPSA1ZC050017", "LPSA1ZC050015",
    "LPSA1ZC050018", "LPSA1ZB050011", "LPSA1ZB050013", "LPSA1ZB050012"
  ];
  fresh5HpDc30m.forEach(sn => addSerial(sn, "PUMP-5HP-DC-30M", "Fresh", "New", whId));

  // 6. 5HP DC 100M MONO SOLAR PUMP (3 units)
  const fresh5HpDc100m = [
    "LPSA1ZE050007", "LPSA1ZC050022", "LPSA1ZC050023"
  ];
  fresh5HpDc100m.forEach(sn => addSerial(sn, "PUMP-5HP-DC-100M", "Fresh", "New", whId));

  // 7. 7.5HP DC 30M MONO SOLAR PUMP (1 unit)
  addSerial("LPSA1ZC050014-PUMP", "PUMP-7.5HP-DC-30M", "Fresh", "New", whId); // Note: LPSA1ZC050014 also in 3HP DC 50M

  // 8. 7.5HP AC 30M MONO SOLAR PUMP (9 units)
  const fresh75HpAc30m = [
    "LPSA1ZF050009", "LPSA1ZE050012", "LPSA1ZE050011", "LPSA1ZB050016", "LPSA1ZC050025",
    "LPSA1ZC050026", "LPSA1ZC050024", "LPSA1ZB050015", "LPSA1ZE050027"
  ];
  fresh75HpAc30m.forEach(sn => addSerial(sn, "PUMP-7.5HP-AC-30M", "Fresh", "New", whId));

  // 9. 7.5HP AC 50M MONO SOLAR PUMP (4 units)
  const fresh75HpAc50m = [
    "LPSA1ZE050013", "LPSA1ZB050017", "LPSA1H050008", "LPSA1H050007"
  ];
  fresh75HpAc50m.forEach(sn => addSerial(sn, "PUMP-7.5HP-AC-50M", "Fresh", "New", whId));

  // 10. 7.5HP AC 70M MONO SOLAR PUMP (2 units)
  addSerial("LPSA1ZE050014", "PUMP-7.5HP-AC-70M", "Fresh", "New", whId);
  addSerial("LPSA1H050009", "PUMP-7.5HP-AC-70M", "Fresh", "New", whId);

  // 11. 7.5HP AC 100M MONO SOLAR PUMP (7 units)
  const fresh75HpAc100m = [
    "LPSA1ZF050010", "LPSA1ZE050015", "LPSA1ZC050032", "LPSA1ZB050018",
    "LPSA1ZC050030", "LPSA1ZC050031", "LPSA1H050010"
  ];
  fresh75HpAc100m.forEach(sn => addSerial(sn, "PUMP-7.5HP-AC-100M", "Fresh", "New", whId));

  // 12. 7.5HP AC MONO SOLAR MOTOR (7 units)
  const fresh75HpAcMotor = [
    "LPSA1ZE050029", "LPSA1ZC050060", "LPSA1H050005", "LPSA1H050002",
    "LPSA1H050003", "LPSA1H050001", "LPSA1H050004"
  ];
  fresh75HpAcMotor.forEach(sn => addSerial(sn, "MOTOR-7.5HP-AC", "Fresh", "New", whId));

  // 13. 5 HP DC MONO SOLAR MOTOR (2 units)
  addSerial("LPSA1ZE050020", "MOTOR-5HP-DC", "Fresh", "New", whId);
  addSerial("LPSA1ZC050055", "MOTOR-5HP-DC", "Fresh", "New", whId);

  // 14. 3 HP DC MONO SOLAR MOTOR (10 units)
  const fresh3HpDcMotor = [
    "LPSA1ZF050002", "LPSA1ZC050041", "LPSA1ZC050046", "LPSA1ZC050042", "LPSA1ZC050044",
    "LPSA1ZC050040", "LPSA1ZC050043", "LPSA1ZE050019", "LPSA1ZE050018", "LPSA1ZE050017"
  ];
  fresh3HpDcMotor.forEach(sn => addSerial(sn, "MOTOR-3HP-DC", "Fresh", "New", whId));

  // 15. 2 HP DC MONO SOLAR MOTOR (9 units)
  const fresh2HpDcMotor = [
    "LPSA1ZF050001", "LPSA1ZE050024", "LPSA1ZE050025", "LPSA1ZE050023", "LPSA1ZC050034",
    "LPSA1ZC050038", "LPSA1ZC050037", "LPSA1ZC050039", "LPSA1ZC050036"
  ];
  fresh2HpDcMotor.forEach(sn => addSerial(sn, "MOTOR-2HP-DC", "Fresh", "New", whId));

  // 16. 2HP DC MONO SOLAR CONTROLLER POWER PCB (12 units)
  const fresh2HpDcPcb = [
    "305426013475", "305426013473", "305426013476", "B45P15F0326130067", "B45P15M052518445",
    "B45P15M0326141098", "B45P15M0326141104", "B45P15M0326141106", "B45P15M0326141102",
    "B45P15M0326141080", "B45P15M0326141109", "B45P15M0326141099"
  ];
  fresh2HpDcPcb.forEach(sn => addSerial(sn, "PCB-2HP-DC", "Fresh", "New", whId));

  // 17. 3HP DC MONO SOLAR CONTROLLER POWER PCB (13 units)
  const fresh3HpDcPcb = [
    "B45P15F0326130078", "B45P15F0326130079", "B45P15F0326130081", "B45P15F0326130065",
    "B45P15F0326130077", "B45P15F0326130066", "B45P15F0326130073", "305426013474",
    "305426013472", "305426013471", "305426013470", "B45P15F012546393", "B45P15M0326126684"
  ];
  fresh3HpDcPcb.forEach(sn => addSerial(sn, "PCB-3HP-DC", "Fresh", "New", whId));

  // 18. 5HP DC MONO SOLAR CONTROLLER POWER PCB (11 units)
  const fresh5HpDcPcb = [
    "B45P15F0326130276", "B45P15F0326130333", "B45P15F0326129789", "B45P15F0326130210",
    "B45P15F0326130212", "305426013479", "305426013478", "305426013477", "B45P15R072416538",
    "B45P15M0326126682", "B45P15F0326130072"
  ];
  fresh5HpDcPcb.forEach(sn => addSerial(sn, "PCB-5HP-DC", "Fresh", "New", whId));

  // 19. 7.5HP AC MONO SOLAR CONTROLLER POWER PCB (13 units)
  const fresh75HpAcPcb = [
    "B90P15M022620457", "B90P15M022620465", "B90P15M022620469", "B90P15M062403181",
    "B90P15M022620468", "B90P15M022620464", "B90P15M052402027", "B90P15M112407437",
    "B90P15M072403627", "B90P15M052402086", "B90P15M012615974", "B90P15M022620329", "309526002964"
  ];
  fresh75HpAcPcb.forEach(sn => addSerial(sn, "PCB-7.5HP-AC", "Fresh", "New", whId));

  // 20. 7.5HP DC MONO SOLAR CONTROLLER POWER PCB (1 unit)
  addSerial("B90P15M022616866", "PCB-7.5HP-DC", "Fresh", "New", whId);

  // 21. REMOTE MONITORING SYSTEM-4G+GPS+DISPLY (60 units)
  const freshRms = [
    "865510088532272", "865510088232824", "865510088299864", "865510088309358", "865510088291655",
    "865510088503208", "865510088328333", "865510088386158", "865510088363462", "865510088108834",
    "865510088291580", "865510088419850", "865510088386299", "865510088363777", "865510088414679",
    "865510088386257", "865510088301819", "865510088090354", "865510088090636", "865510088259801",
    "865510088306651", "865510086367861", "865510086528082", "865510086291731", "865510086355890",
    "865510086358589", "865510088191004", "865510088059045", "865510088363009", "865510083856015",
    "865510086493451", "865510086412154", "865510086266394", "865510086358514", "865510086358621",
    "865510086358217", "865510088146743", "865510086538727", "865510086530302", "865510086263987",
    "865510086358860", "865510086553668", "865510086365626", "866738080255795", "866738080231325",
    "866738080231499", "866738080231465", "865510086494665", "866738080271164", "865510086367887",
    "866738080256298", "865510088062882", "865510086418573", "865510083938946", "865510084086711",
    "866738080024977", "865510086270768", "865510086367846", "866738080256389", "866738080229865"
  ];
  freshRms.forEach(sn => addSerial(sn, "RMS-4G-GPS", "Fresh", "New", whId));

  // 22. PV MODULES (112 units)
  const freshPv = [
    "GB2606CL53011630", "GB2606CL53011621", "GB2606CL53011626", "GB2606CL53011586", "GB2606CL53011671",
    "GB2606CL53011631", "GB2606CL53011627", "GB2606CL53011646", "GB2606CL53011629", "GB2606CL53011490",
    "GB2606CL53011652", "GB2606CL53011653", "GB2606CL53011654", "GB2606CL53011638", "GB2606CL53011615",
    "GB2606CL53011647", "GB2606CL53011648", "GB2606CL53011635", "GB2606CL53011640", "GB2606CL53011649",
    "GB2606CL53011641", "GB2606CL53011642", "GB2606CL53011644", "GB2606CL53011501", "GB2606CL53011493",
    "GB2606CL53011495", "GB2606CL53011484", "GB2606CL53011517", "GB2606CL53011081", "GB2606CL53011080",
    "GB2606CL53011082", "GB2606CL53011084", "GB2606CL53011070", "GB2606CL53011021", "GB2606CL53011020",
    "GB2606CL53010973", "GB2606CL53011047", "GB2606CL53011019", "GB2606CL53011055", "GB2606CL53011018",
    "GB2606CL53011066", "GB2606CL53011077", "GB2606CL53011060", "GB2606CL53011048", "GB2606CL53011046",
    "GB2606CL53011028", "GB2606CL53011015", "GB2606CL53011054", "GB2606CL53010950", "GB2606CL53011071",
    "GB2606CL53011075", "GB2606CL53011074", "GB2606CL53011045", "GB2606CL53011017", "GB2606CL53011076",
    "GB2606CL53010732", "GB2606CL53011718", "GB2606CL53010621", "GB2606CL53010623", "GB2606CL53010629",
    "GB2606CL53010062", "GB2606CL53010108", "GB2606CL53010109", "GB2606CL53010120", "GB2606CL53010041",
    "GB2606CL53010128", "GB2606CL53010129", "GB2606CL53010130", "GB2606CL53010139", "GB2606CL53010138",
    "GB2606CL53010170", "GB2606CL53010171", "GB2606CL53010011", "GB2606CL53010039", "GB2606CL53010057",
    "GB2606CL53010058", "GB2606CL53010088", "GB2606CL53010126", "GB2606CL53010127", "GB2606CL53010015",
    "GB2606CL53010066", "GB2606CL53010017", "GB2606CL53010125", "GB2606CL53010162", "GB2606CL53011699",
    "GB2606CL53011729", "GB2606CL53011705", "GB2606CL53011704", "GB2606CL53011728", "GB2606CL53011703",
    "GB2606CL53011725", "GB2606CL53011722", "GB2606CL53011689", "GB2606CL53011747", "GB2606CL53011585",
    "GB2606CL53011589", "GB2606CL53011590", "GB2606CL53011574", "GB2606CL53011570", "GB2606CL53011572",
    "GB2606CL53011513", "GB2606CL53011588", "GB2606CL53011720", "GB2606CL53011719", "GB2606CL53011527",
    "GB2606CL53011523", "GB2606CL53011580", "GB2606CL53011582", "GB2606CL53011584", "GB2606CL53011694",
    "GB2606CL53011687", "GB2606CL53011552"
  ];
  freshPv.forEach(sn => addSerial(sn, "PV-MODULES", "Fresh", "New", whId));

  // ==========================================
  // B. FAULTY SERIAL NUMBERS (Table 2)
  // ==========================================
  addSerial("LPSA1YI000629-PUMP", "PUMP-5HP-DC-30M", "Faulty-Received", "New", whId);
  addSerial("LPSA1ZA000185", "PUMP-7.5HP-AC-100M", "Faulty-Received", "New", whId);
  addSerial("LPSA1ZB001001", "MOTOR-7.5HP-AC", "Faulty-Received", "New", whId);
  addSerial("LPSA1YH000944", "MOTOR-7.5HP-AC", "Faulty-Received", "New", whId);
  addSerial("LPSA1ZB001027", "MOTOR-7.5HP-AC", "Faulty-Received", "New", whId);
  addSerial("LPSA1YI000629", "MOTOR-5HP-DC", "Faulty-Received", "New", whId);
  addSerial("B9015022616845", "PCB-7.5HP-AC", "Faulty-Received", "New", whId);
  addSerial("B9015M022620579", "PCB-7.5HP-AC", "Faulty-Received", "New", whId);
  addSerial("B90P15M022620451", "PCB-7.5HP-AC", "Faulty-Received", "New", whId);

  // ==========================================
  // C. AT CROMPTON SERIAL NUMBERS (Table 4)
  // ==========================================
  // Pumps at Crompton
  addSerial("LPSA1YI000628-PUMP", "PUMP-5HP-DC-30M", "At-Manufacturer", "New", mfg);
  addSerial("LPSA1YI000645-PUMP", "PUMP-5HP-DC-30M", "At-Manufacturer", "New", mfg);
  addSerial("LPSA1YI000663-PUMP", "PUMP-5HP-DC-70M", "At-Manufacturer", "New", mfg);
  addSerial("LPSA1ZA000072", "PUMP-5HP-DC-70M", "At-Manufacturer", "New", mfg);
  addSerial("LPSA1ZB000926", "PUMP-7.5HP-AC-30M", "At-Manufacturer", "New", mfg);
  addSerial("LPSA1ZD000327", "PUMP-7.5HP-AC-50M", "At-Manufacturer", "New", mfg);

  // Motors at Crompton
  const crompton75AcMotors = [
    "LPSA1YI000128", "LPSA1YI000151", "LPSA1YH000494", "LPSA1YH000561",
    "LPSA1ZB000872", "LPSA1YH000563", "LPSA1YH000967", "LPSA1YH000551"
  ];
  crompton75AcMotors.forEach(sn => addSerial(sn, "MOTOR-7.5HP-AC", "At-Manufacturer", "New", mfg));

  addSerial("LPSA1YH000456", "MOTOR-7.5HP-DC", "At-Manufacturer", "New", mfg);

  const crompton5DcMotors = [
    "LPSA1YI000618", "LPSA1ZB000261", "LPSA1YI000641", "LPSA1ZB00520",
    "LPSA1YI000628", "LPSA1YI000645", "LPSA1ZB000313", "LPSA1ZB000473", "LPSA1YI000663"
  ];
  crompton5DcMotors.forEach(sn => addSerial(sn, "MOTOR-5HP-DC", "At-Manufacturer", "New", mfg));

  addSerial("LPSA1ZB000024", "MOTOR-3HP-DC", "At-Manufacturer", "New", mfg);
  addSerial("LPSA1ZB000222", "MOTOR-3HP-DC", "At-Manufacturer", "New", mfg);
  addSerial("LPSA1ZB000649", "MOTOR-2HP-DC", "At-Manufacturer", "New", mfg);

  // Power Cards at Crompton
  addSerial("B45P15F112582591", "PCB-5HP-DC", "At-Manufacturer", "New", mfg);
  addSerial("B90P15M022620413", "PCB-7.5HP-AC", "At-Manufacturer", "New", mfg);

  // ==========================================
  // D. NON-SERIALIZED ITEMS
  // ==========================================
  const nonSerializedItems = [
    { code: "MCB-2P-16A", fresh: 3, faulty: 0, crompton: 0 },
    { code: "MCB-2P-20A", fresh: 37, faulty: 0, crompton: 0 },
    { code: "MCB-2P-32A", fresh: 19, faulty: 1, crompton: 0 },
    { code: "3PIN-30A-500V", fresh: 38, faulty: 0, crompton: 0 },
    { code: "MC4-PV-1000V", fresh: 35, faulty: 0, crompton: 0 },
    { code: "MC4-CONNECTOR", fresh: 29, faulty: 1, crompton: 0 }
  ];

  for (const item of nonSerializedItems) {
    for (let i = 1; i <= item.fresh; i++) {
      entries.push({
        serialNo: `MP-${item.code}-FR-${String(i).padStart(3, "0")}`,
        partCode: item.code,
        status: "Fresh",
        condition: "New",
        currentLocation: whId
      });
    }
    for (let i = 1; i <= item.faulty; i++) {
      entries.push({
        serialNo: `MP-${item.code}-FA-${String(i).padStart(3, "0")}`,
        partCode: item.code,
        status: "Faulty-Received",
        condition: "New",
        currentLocation: whId
      });
    }
    for (let i = 1; i <= item.crompton; i++) {
      entries.push({
        serialNo: `MP-${item.code}-CR-${String(i).padStart(3, "0")}`,
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
  console.log(`\n💾 Inserting ${entries.length} validated items into MP UnitLedger...`);
  await prisma.unitLedger.createMany({
    data: entries,
    skipDuplicates: true
  });

  console.log("✅ Successfully seeded MP Warehouse UnitLedger!");

  // 7. Sync Material Requests from Google Sheets
  console.log("🔄 Syncing active Material Requests for MP...");
  try {
    const syncRes = await warehouseContext.run("mp", async () => {
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
  console.log("\n📊 Final Status Breakdown in MP Database:", statusSummary);

  await prisma.$disconnect();
}

seedMp().catch(err => {
  console.error("❌ Seeding failed:", err);
  process.exit(1);
});
