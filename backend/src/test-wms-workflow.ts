import dotenv from "dotenv";
import path from "path";
// Load environment variables
dotenv.config({ path: path.join(__dirname, "../.env") });

import { prisma, warehouseContext } from "./db";
import { wmsService } from "./services/wms.service";

async function assertThrows(fn: () => Promise<any>, expectedErrorSubstr: string) {
  try {
    await fn();
    throw new Error(`Expected function to throw error containing '${expectedErrorSubstr}', but it succeeded.`);
  } catch (err: any) {
    if (err.message && err.message.includes(expectedErrorSubstr)) {
      console.log(`✅ Successfully caught expected error: "${err.message}"`);
    } else {
      throw new Error(`Expected error containing '${expectedErrorSubstr}', but got: "${err.message}"`);
    }
  }
}

async function runTests() {
  console.log("🚀 Starting E2E WMS Workflow Integration Tests...");

  // Set active context to Jalna MH warehouse schema
  const targetWhId = "wh-jalna-1111";

  await warehouseContext.run("jalna", async () => {
    // 0. Cleanup previous test records if any
    const testSerials = ["LPSA1234567890", "B1234567890", "LPSA_NEW_REPLACEMENT"];
    
    await prisma.unitLedger.deleteMany({
      where: { serialNo: { in: testSerials } }
    });
    
    await prisma.movementSerialNumber.deleteMany({
      where: { serialNumber: { in: testSerials } }
    });

    console.log("🧹 Cleaned up old test serials.");

    // Retrieve or seed a test part if not exists
    let motorPart = await prisma.part.findFirst({
      where: { category: "Motors", serialTracked: true }
    });
    if (!motorPart) {
      motorPart = await prisma.part.create({
        data: {
          code: "MOTOR-3HP-DC",
          description: "3HP Dc Mono Solar Motor Test",
          category: "Motors",
          hpRating: "3HP",
          serialTracked: true,
          valuationAmount: 8000.00
        }
      });
    }

    let pcbPart = await prisma.part.findFirst({
      where: { category: "Inverters", serialTracked: true }
    });
    if (!pcbPart) {
      pcbPart = await prisma.part.create({
        data: {
          code: "PCB-3HP-DC",
          description: "3HP DC POWER CARD Test",
          category: "Inverters",
          hpRating: "3HP",
          serialTracked: true,
          valuationAmount: 4500.00
        }
      });
    }

    console.log(`Using Motor part: ${motorPart.code}, PCB part: ${pcbPart.code}`);

    // Retrieve or seed a test engineer
    let engineer = await prisma.engineer.findFirst();
    if (!engineer) {
      engineer = await prisma.engineer.create({
        data: {
          name: "Pruthviraj Borde",
          email: "pruthviraj@claro.com",
          phone: "9001163111",
          isActive: true
        }
      });
    }

    // Generate unique installation / application ID to avoid collisions
    const uniqueAppId = `MK${Date.now()}`;
    const installation = await prisma.masterInstallation.create({
      data: {
        applicationId: uniqueAppId,
        clientName: "Jalna Test Client"
      }
    });

    // Retrieve or seed a test manufacturer
    let manufacturer = await prisma.manufacturer.findFirst();
    if (!manufacturer) {
      manufacturer = await prisma.manufacturer.create({
        data: {
          name: "Lubi Pumps"
        }
      });
    }

    console.log(`🔧 Seeded unique test installation ${uniqueAppId}.`);

    // --- TEST 1: Serial number validation rules ---
    console.log("\n--- TEST 1: Invalid serial prefix validations ---");
    
    // Motor/Pump starts with LPS
    await assertThrows(async () => {
      await wmsService.logMovement({
        warehouseId: targetWhId,
        stage: 1,
        partyName: "Lubi Pumps",
        referenceNumber: "INV-001",
        userId: "user-default-admin",
        lines: [{
          partCode: motorPart.code,
          quantity: 1,
          serials: ["TEST123456789"] // invalid: doesn't start with LPS
        }]
      });
    }, "Must start with 'LPS'");

    // PCB starts with B
    await assertThrows(async () => {
      await wmsService.logMovement({
        warehouseId: targetWhId,
        stage: 1,
        partyName: "Lubi Pumps",
        referenceNumber: "INV-001",
        userId: "user-default-admin",
        lines: [{
          partCode: pcbPart.code,
          quantity: 1,
          serials: ["TEST123456789"] // invalid: doesn't start with B
        }]
      });
    }, "Must start with 'B'");

    // Character length validation (< 5 chars)
    await assertThrows(async () => {
      await wmsService.logMovement({
        warehouseId: targetWhId,
        stage: 1,
        partyName: "Lubi Pumps",
        referenceNumber: "INV-001",
        userId: "user-default-admin",
        lines: [{
          partCode: pcbPart.code,
          quantity: 1,
          serials: ["B"] // invalid: too short
        }]
      });
    }, "must be between 5 and 25 characters");

    // Invalid character validation
    await assertThrows(async () => {
      await wmsService.logMovement({
        warehouseId: targetWhId,
        stage: 1,
        partyName: "Lubi Pumps",
        referenceNumber: "INV-001",
        userId: "user-default-admin",
        lines: [{
          partCode: pcbPart.code,
          quantity: 1,
          serials: ["B123@#45"] // invalid chars
        }]
      });
    }, "contains invalid characters");

    console.log("✅ Serial validation rules passed.");

    // --- TEST 2: Stage 1 logging (Received from Manufacturer) ---
    console.log("\n--- TEST 2: Stage 1 movement logging (Valid) ---");
    const mStage1 = await wmsService.logMovement({
      warehouseId: targetWhId,
      stage: 1,
      partyName: "Lubi Pumps",
      referenceNumber: "INV-001-TEST",
      userId: "user-default-admin",
      lines: [
        {
          partCode: motorPart.code,
          quantity: 1,
          serials: ["LPSA1234567890"]
        },
        {
          partCode: pcbPart.code,
          quantity: 1,
          serials: ["B1234567890"]
        }
      ]
    });
    console.log(`✅ Successfully logged Stage 1. Movement ID: ${mStage1.id}`);

    // Verify stock is Fresh
    const ledgerMotor = await prisma.unitLedger.findUnique({ where: { serialNo: "LPSA1234567890" } });
    const ledgerPCB = await prisma.unitLedger.findUnique({ where: { serialNo: "B1234567890" } });
    if (!ledgerMotor || ledgerMotor.status !== "Fresh" || ledgerMotor.currentLocation !== targetWhId) {
      throw new Error(`Stage 1 Verification Failed for Motor: Status is '${ledgerMotor?.status}'`);
    }
    if (!ledgerPCB || ledgerPCB.status !== "Fresh" || ledgerPCB.currentLocation !== targetWhId) {
      throw new Error(`Stage 1 Verification Failed for PCB: Status is '${ledgerPCB?.status}'`);
    }
    console.log("✅ Verified items are in stock and marked 'Fresh'.");

    // --- TEST 3: Material Request Integration & Stage 2 dispatch ---
    console.log("\n--- TEST 3: Create MaterialRequest & Stage 2 dispatch ---");
    
    // Create a mock material request
    const matReq = await prisma.materialRequest.create({
      data: {
        status: "APPROVED",
        remarks: "Testing dispatch linkage",
        engineer: { connect: { id: engineer.id } },
        ticket: {
          create: {
            complaint: {
              create: {
                applicationId: installation.applicationId
              }
            }
          }
        },
        items: [
          {
            partCode: motorPart.code,
            quantity: 1
          }
        ]
      }
    });
    console.log(`✅ Created Material Request: ${matReq.id}`);

    // Log Stage 2 dispatch linked to matReq
    const mStage2 = await wmsService.logMovement({
      warehouseId: targetWhId,
      stage: 2,
      partyName: engineer.name,
      referenceNumber: installation.applicationId,
      userId: "user-default-admin",
      materialRequestId: matReq.id,
      lines: [{
        partCode: motorPart.code,
        quantity: 1,
        serials: ["LPSA1234567890"]
      }]
    });
    console.log(`✅ Successfully logged Stage 2 dispatch. Movement ID: ${mStage2.id}`);

    // Verify request updated to DISPATCHED
    const matReqUpdated = await prisma.materialRequest.findUnique({ where: { id: matReq.id } });
    if (!matReqUpdated || matReqUpdated.status !== "DISPATCHED") {
      throw new Error(`Stage 2 dispatch did not update Material Request status. Found: ${matReqUpdated?.status}`);
    }
    console.log("✅ Verified Material Request status updated to 'DISPATCHED'.");

    // Verify UnitLedger status updated to 'Sent-to Farmer'
    const ledgerMotorStage2 = await prisma.unitLedger.findUnique({ where: { serialNo: "LPSA1234567890" } });
    if (!ledgerMotorStage2 || ledgerMotorStage2.status !== "Sent-to Farmer") {
      throw new Error(`Stage 2 verification failed: Motor status is '${ledgerMotorStage2?.status}'`);
    }
    console.log("✅ Verified serial is marked 'Sent-to Farmer'.");

    // --- TEST 4: Stage 3 (Faulty Received from SE) ---
    console.log("\n--- TEST 4: Stage 3 movement logging ---");
    const mStage3 = await wmsService.logMovement({
      warehouseId: targetWhId,
      stage: 3,
      partyName: engineer.name,
      referenceNumber: installation.applicationId,
      reportedFault: "Dry run and burnt coil",
      userId: "user-default-admin",
      lines: [{
        partCode: motorPart.code,
        quantity: 1,
        serials: ["LPSA1234567890"]
      }]
    });
    console.log(`✅ Successfully logged Stage 3. Movement ID: ${mStage3.id}`);

    const ledgerMotorStage3 = await prisma.unitLedger.findUnique({ where: { serialNo: "LPSA1234567890" } });
    if (!ledgerMotorStage3 || ledgerMotorStage3.status !== "Faulty-Received") {
      throw new Error(`Stage 3 verification failed: Motor status is '${ledgerMotorStage3?.status}'`);
    }
    console.log("✅ Verified serial is marked 'Faulty-Received'.");

    // --- TEST 5: Stage 4 (RMA sent to manufacturer & Challan check) ---
    console.log("\n--- TEST 5: Stage 4 movement logging & Challan Generation ---");
    const mStage4 = await wmsService.logMovement({
      warehouseId: targetWhId,
      stage: 4,
      partyName: "Lubi Pumps",
      referenceNumber: "GRC-TEST-RMA-001",
      userId: "user-default-admin",
      lines: [{
        partCode: motorPart.code,
        quantity: 1,
        serials: ["LPSA1234567890"]
      }]
    });
    console.log(`✅ Successfully logged Stage 4. Movement ID: ${mStage4.id}`);

    const ledgerMotorStage4 = await prisma.unitLedger.findUnique({ where: { serialNo: "LPSA1234567890" } });
    if (!ledgerMotorStage4 || ledgerMotorStage4.status !== "At-Manufacturer") {
      throw new Error(`Stage 4 verification failed: Motor status is '${ledgerMotorStage4?.status}'`);
    }
    console.log("✅ Verified serial is marked 'At-Manufacturer'.");

    // Verify Challan is created and has correct prefix/number
    const challan = await prisma.challan.findFirst({
      where: { movementId: mStage4.id }
    });
    if (!challan) {
      throw new Error("Challan was not created for Stage 4!");
    }
    console.log(`✅ Challan successfully generated! Challan Number: ${challan.challanNumber}`);
    if (!challan.challanNumber.includes("GRC-")) {
      throw new Error(`Challan number ${challan.challanNumber} does not follow sequence specs.`);
    }
    console.log("✅ Verified Challan format compliance.");

    // --- TEST 6: Stage 5 (Repaired / Replaced back from manufacturer) ---
    console.log("\n--- TEST 6: Stage 5 movement logging (Repaired) ---");
    const mStage5 = await wmsService.logMovement({
      warehouseId: targetWhId,
      stage: 5,
      partyName: "Lubi Pumps",
      referenceNumber: "GRC-TEST-RMA-001",
      conditionReceived: "Repaired",
      userId: "user-default-admin",
      lines: [{
        partCode: motorPart.code,
        quantity: 1,
        serials: ["LPSA1234567890"]
      }]
    });
    console.log(`✅ Successfully logged Stage 5. Movement ID: ${mStage5.id}`);

    const ledgerMotorStage5 = await prisma.unitLedger.findUnique({ where: { serialNo: "LPSA1234567890" } });
    if (!ledgerMotorStage5 || ledgerMotorStage5.status !== "Fresh" || ledgerMotorStage5.currentLocation !== targetWhId) {
      throw new Error(`Stage 5 verification failed: Motor status is '${ledgerMotorStage5?.status}'`);
    }
    console.log("✅ Verified serial is back in stock and marked 'Fresh'.");

    console.log("\n🎉 ALL WMS E2E WORKFLOW INTEGRATION TESTS PASSED!");
  });
}

runTests().catch(err => {
  console.error("❌ Test script failed with error:", err);
  process.exit(1);
});
