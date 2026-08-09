# Standalone Warehouse Management System (WMS)

This folder contains the extracted WMS service, controller, database schema, and frontend dashboard from the main ticketing repository. You can run this as a standalone application.

## Project Structure

- `backend/prisma/schema.prisma`: Standalone database schema containing only WMS models (`Manufacturer`, `Part`, `Warehouse`, `UnitLedger`, `InventoryMovement`, `InventoryMovementLine`, `MovementSerialNumber`, `Challan`) and minimal user/engineer tables.
- `backend/src/controllers/wms.controller.ts`: API route controllers for the WMS.
- `backend/src/services/wms.service.ts`: Business logic and database operations for logging movements, updating the ledger, generating challans, and calculating live stock counts.
- `frontend/src/pages/Warehouse.tsx`: Complete frontend UI containing the active WMS ledgers, stock charts, RMA tracker, transaction logs, and movement logging wizard.

## How to Get Started

1. **Initialize the Node/TypeScript Project**:
   Create a standard `package.json` in the backend and frontend folders (or use a monorepo setup) mirroring the original Claro codebase configuration.

2. **Configure Database & Prisma**:
   Set your `DATABASE_URL` in backend `.env` file, and run:
   ```bash
   npx prisma db push
   # or
   npx prisma migrate dev --name init_wms
   ```

3. **Backend Integration**:
   Mount the `wmsController` endpoints onto your Express/Fastify server. Example backend routes:
   - `GET /api/v1/wms/parts` -> `wmsController.getParts`
   - `GET /api/v1/wms/warehouses` -> `wmsController.getWarehouses`
   - `GET /api/v1/wms/manufacturers` -> `wmsController.getManufacturers`
   - `GET /api/v1/wms/farmers` -> `wmsController.getFarmers`
   - `GET /api/v1/wms/engineers` -> `wmsController.getEngineers`
   - `GET /api/v1/wms/pending-rmas` -> `wmsController.getPendingRMAs`
   - `GET /api/v1/wms/challans` -> `wmsController.getChallans`
   - `GET /api/v1/wms/stock` -> `wmsController.getStock`
   - `GET /api/v1/wms/movements` -> `wmsController.getMovements`
   - `POST /api/v1/wms/movements` -> `wmsController.logMovement`
   - `DELETE /api/v1/wms/movements/:id` -> `wmsController.deleteMovement`
   - `POST /api/v1/wms/clear-all` -> `wmsController.clearAll`

4. **Frontend Integration**:
   Mount `Warehouse.tsx` onto a route in your React app (e.g. `/warehouse`) and ensure the client calls match the new URL.
