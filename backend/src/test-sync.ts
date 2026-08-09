import { wmsService } from "./services/wms.service";
import { warehouseContext } from "./db";

async function testSync() {
  console.log("Starting debug sync test...");
  try {
    // Run under the 'jalna' schema context
    const result = await warehouseContext.run("jalna", async () => {
      return wmsService.syncRequests();
    });
    console.log("Result:", result);
  } catch (err: any) {
    console.error("Test sync failed with error:", err);
  }
}

testSync();
