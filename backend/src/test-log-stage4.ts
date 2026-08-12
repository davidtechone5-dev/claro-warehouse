import { wmsService } from "./services/wms.service";
import { warehouseContext, prisma } from "./db";

async function testLogStage4() {
  console.log("Starting debug Stage 4 log test...");
  try {
    // 1. Run under 'jalna' schema context
    await warehouseContext.run("jalna", async () => {
      // Find a warehouse
      const wh = await prisma.warehouse.findFirst();
      if (!wh) {
        throw new Error("No warehouse found in Jalna schema! Please seed first.");
      }
      
      // Find a part
      const part = await prisma.part.findFirst({
        where: { serialTracked: true }
      });
      if (!part) {
        throw new Error("No serialized part found in Jalna schema! Please seed first.");
      }

      // Create a faulty serial number to satisfy Stage 4 requirement (which requires it to be Faulty-Received first)
      const testSerial = `TEST-SN-${Math.floor(1000 + Math.random() * 9000)}`;
      await prisma.unitLedger.create({
        data: {
          serialNo: testSerial,
          partCode: part.code,
          status: "Faulty-Received",
          condition: "New",
          currentLocation: wh.id
        }
      });

      console.log(`Created faulty serial ${testSerial} for part ${part.code} at warehouse ${wh.name} (${wh.id})`);

      // Try logging a Stage 4 movement
      const result = await wmsService.logMovement({
        warehouseId: wh.id,
        stage: 4,
        partyName: "Crompton",
        referenceNumber: "GRC-TEST-001",
        userId: "user-default-admin",
        lines: [
          {
            partCode: part.code,
            quantity: 1,
            serials: [testSerial]
          }
        ]
      });

      console.log("Movement log Stage 4 result:", result);
    });
  } catch (err: any) {
    console.error("Test log Stage 4 failed with error:", err);
  }
}

testLogStage4();
