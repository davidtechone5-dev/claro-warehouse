import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { warehouseContext } from "./db";
import { wmsController } from "./controllers/wms.controller";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Static mapping of warehouses to their respective PostgreSQL schemas
export const WAREHOUSES = [
  { id: "all", name: "All Warehouses", code: "ALL", stateCode: "ALL", schema: "all" },
  { id: "wh-jalna-1111", name: "Jalna MH", code: "JAL", stateCode: "MH", schema: "jalna" },
  { id: "wh-rajasthan-2222", name: "Rajasthan", code: "RAJ", stateCode: "RJ", schema: "rajasthan" },
  { id: "wh-haryana-3333", name: "Haryana", code: "HAR", stateCode: "HR", schema: "haryana" },
  { id: "wh-mp-4444", name: "MP", code: "MP", stateCode: "MP", schema: "mp" }
];

// 1. Session and Database Schema context middleware
app.use((req: any, res, next) => {
  // Determine active warehouse schema from headers, query, or body
  const warehouseId = 
    req.headers["x-warehouse-id"] || 
    req.query.warehouseId || 
    req.body.warehouseId;

  const foundWh = WAREHOUSES.find(w => w.id === warehouseId);
  const activeSchema = foundWh ? foundWh.schema : "jalna"; // Default to Jalna

  // Determine default user details based on schema context
  let fullName = "Maharashtra Warehouse";
  let email = "maharashtra@claro.com";
  if (activeSchema === "rajasthan") {
    fullName = "Rajasthan Warehouse";
    email = "rajasthan@claro.com";
  } else if (activeSchema === "haryana") {
    fullName = "Haryana Warehouse";
    email = "haryana@claro.com";
  } else if (activeSchema === "mp") {
    fullName = "MP Warehouse";
    email = "mp@claro.com";
  }

  // Inject mock user session to satisfy wmsController auth check
  req.user = {
    id: "user-default-admin",
    email: email,
    fullName: fullName,
    role: "Warehouse"
  };

  // Run subsequent middlewares/controllers in the active schema context
  warehouseContext.run(activeSchema, () => {
    next();
  });
});

// 2. Mount WMS API routes
const router = express.Router();

router.get("/parts", wmsController.getParts);
router.get("/parts/:code/serials", wmsController.getPartSerials);
router.get("/warehouses", wmsController.getWarehouses);
router.get("/manufacturers", wmsController.getManufacturers);
router.get("/farmers", wmsController.getFarmers);
router.get("/engineers", wmsController.getEngineers);
router.get("/pending-rmas", wmsController.getPendingRMAs);
router.get("/challans", wmsController.getChallans);
router.get("/stock", wmsController.getStock);
router.get("/movements", wmsController.getMovements);
router.post("/movements", wmsController.logMovement);
router.delete("/movements/:id", wmsController.deleteMovement);
router.post("/clear-all", wmsController.clearAll);
router.get("/material-requests", wmsController.getMaterialRequests);
router.patch("/material-requests/:id", wmsController.updateMaterialStatus);
router.post("/material-requests/sync-row", wmsController.syncSingleRequest);
router.post("/sync-requests", wmsController.syncRequests);
router.post("/stock/adjust", wmsController.adjustStock);
router.get("/stock/adjustments", wmsController.getAdjustments);

app.use("/api/v1/wms", router);
app.use("/api/v1", router);

// Start server
app.listen(PORT, () => {
  console.log(`🚀 WMS Backend listening on http://localhost:${PORT}`);
});
