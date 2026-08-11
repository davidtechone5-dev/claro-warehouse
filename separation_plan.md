Absolutely. Here is the **updated implementation plan with the missing pieces added and the risky parts corrected**.

> # Implementation Plan: Event-Driven Material Request Sync, Duplicate Protection & Warehouse Isolation
>
> We will convert the Warehouse Management System from repeated full-sheet synchronization to **event-driven single-row synchronization**, remove full sync from normal frontend flows, preserve the full sync only as an admin/recovery tool, fix the foreign-key ordering issue, and ensure edits update the correct Material Request without creating duplicates.
>
> ---
>
> ## User Review Required
>
> **IMPORTANT**
>
> * **No full sync on login/page load:** Logging in, changing tabs, pagination, filters, routes, or warehouse selection must NOT trigger `/api/v1/wms/sync-requests`.
> * **Automatic event-driven sync:** New or edited Google Sheet Material Request rows must sync automatically via Apps Script, one row at a time.
> * **Frontend becomes read-only with respect to sync:** Warehouse users only read current data from Supabase.
> * **Manual full sync becomes admin/recovery only:** Keep the full `syncRequests()` backend functionality, but normal warehouse operators should not depend on it.
> * **Stable Material Request identity is required:** Do NOT deduplicate requests only by `ticketId`, because one ticket/application may have multiple Material Requests.
> * **Foreign-key ordering fix:** Ensure `MasterInstallation` exists before creating/updating related Complaint/Ticket records when the schema requires that relationship.
> * **Warehouse isolation must be preserved:** Haryana rows must only enter `haryana`, Jalna/Maharashtra only `jalna`, Rajasthan only `rajasthan`, and MP only `mp`.
>
> ---
>
> # 1. Backend WMS Service
>
> ## [MODIFY] `wms.service.ts`
>
> ### A. Keep full sync for admin/recovery only
>
> Keep:
>
> ```ts
> syncRequests()
> ```
>
> Do not remove the optimized batching logic.
>
> This function is no longer part of normal warehouse-user page load behavior.
>
> It should only be used for:
>
> ```text
> Admin recovery
> Full reconciliation
> Manual emergency resync
> ```
>
> ---
>
> ### B. Fix `syncSingleRequest()` creation order
>
> Current issue:
>
> `Complaint`/`Ticket` may be created before `MasterInstallation`, which can violate:
>
> ```text
> complaints_application_id_fkey
> ```
>
> Change the order inside `syncSingleRequest()` to:
>
> ```text
> 1. Detect target warehouse/schema
> 2. Validate payload
> 3. Resolve/Create Engineer
> 4. Resolve/Create MasterInstallation
> 5. Resolve/Create Ticket + Complaint
> 6. Resolve/Create/Update MaterialRequest
> ```
>
> Do NOT disable or remove the foreign-key constraint.
>
> The goal is to satisfy the existing database relationship correctly.
>
> ---
>
> ### C. Do NOT deduplicate by `ticketId` alone
>
> Do not use logic such as:
>
> ```ts
> findFirst({
>   where: { ticketId }
> })
> ```
>
> as the sole identity for a Material Request.
>
> One ticket may legitimately have multiple material requests:
>
> ```text
> Application HR123
> ├── Request 1: Controller
> └── Request 2: Motor
> ```
>
> Using `ticketId` alone could overwrite the wrong request.
>
> ---
>
> ### D. Add a stable source identifier
>
> Add a stable identifier coming from Google Sheets, for example:
>
> ```text
> sourceRowId
> ```
>
> Example:
>
> ```text
> MR-20260811-000123
> ```
>
> This ID must remain unchanged even if the row is edited later.
>
> The database should use this value as the stable identity of the Material Request.
>
> Desired behavior:
>
> ```text
> First row submission
> sourceRowId = MR-20260811-000123
> → CREATE
>
> Quantity edited
> sourceRowId = MR-20260811-000123
> → UPDATE SAME REQUEST
>
> Dispatch Status edited
> sourceRowId = MR-20260811-000123
> → UPDATE SAME REQUEST
>
> Material edited
> sourceRowId = MR-20260811-000123
> → UPDATE SAME REQUEST
> ```
>
> This prevents duplicate records when editable fields change.
>
> If the Prisma schema does not currently contain a stable source-row field on `MaterialRequest`, add one with an appropriate unique constraint.
>
> Example concept:
>
> ```prisma
> sourceRowId String? @unique
> ```
>
> The exact field name can differ, but it must be stable and unique.
>
> ---
>
> ### E. Keep existing legacy ID compatibility where necessary
>
> Existing Material Requests already created using:
>
> ```text
> Application ID + Material + Timestamp
> ```
>
> must not be accidentally duplicated during migration.
>
> Before switching completely to `sourceRowId`, inspect existing records and decide how to:
>
> * Backfill a stable ID if possible, or
> * Fall back to the old request ID for legacy records.
>
> Do not silently create duplicates during migration.
>
> ---
>
> # 2. Backend Single-Row Sync Endpoint
>
> ## [VERIFY / MODIFY] WMS controller/routes
>
> Ensure there is a dedicated endpoint for one-row synchronization, for example:
>
> ```text
> POST /api/v1/material-requests/sync-row
> ```
>
> or the project's existing equivalent.
>
> The endpoint must:
>
> ```text
> Receive ONE Google Sheet row payload
>         ↓
> Validate required fields
>         ↓
> Call syncSingleRequest(data)
>         ↓
> Detect target warehouse
>         ↓
> Run inside correct schema
>         ↓
> Upsert ONE Material Request
> ```
>
> It must NOT call:
>
> ```ts
> syncRequests()
> ```
>
> for a single-row event.
>
> Return a clear response, for example:
>
> ```json
> {
>   "success": true,
>   "id": "...",
>   "targetSchema": "haryana"
> }
> ```
>
> ---
>
> # 3. Google Apps Script — REQUIRED
>
> ## [MODIFY] Material Request Sheet Apps Script
>
> This is a required part of the implementation.
>
> Removing frontend full-sync calls alone is not enough.
>
> Apps Script must automatically send the newly added or edited row to the backend.
>
> ---
>
> ### A. New row handling
>
> When a new Material Request row is created:
>
> ```text
> New Google Sheet row
>       ↓
> Apps Script detects it
>       ↓
> Builds row payload
>       ↓
> POST ONE ROW to backend
>       ↓
> Backend syncSingleRequest()
>       ↓
> Correct schema
> ```
>
> Do NOT download or resend the entire Material Request sheet.
>
> ---
>
> ### B. Edited row handling
>
> When any relevant field changes, send only that row again.
>
> Relevant editable fields include at least:
>
> ```text
> Timestamp
> Requesting to - Warehouse
> Application ID / Saral ID
> Pump Capacity
> Material Required
> Other
> Service Engineer
> Quantity
> Dispatch Status
> ```
>
> If other fields are used by the current sync logic, preserve those as well.
>
> ---
>
> ### C. Add/stabilize `sourceRowId`
>
> Each Material Request row must have a stable identifier.
>
> Preferred approach:
>
> Add a dedicated hidden/protected Google Sheet column:
>
> ```text
> Sync ID
> ```
>
> Example:
>
> ```text
> MR-20260811-000123
> ```
>
> When Apps Script encounters a row with no Sync ID:
>
> ```text
> Generate ID once
> Save it into the row
> Send it to backend
> ```
>
> On later edits:
>
> ```text
> Reuse the SAME Sync ID
> ```
>
> Never regenerate the ID just because Material, Quantity, Engineer, or Dispatch Status changed.
>
> ---
>
> ### D. Prevent duplicate trigger execution
>
> Google Apps Script can sometimes receive repeated trigger events or overlapping executions.
>
> Add protection where appropriate using:
>
> ```text
> LockService
> ```
>
> and/or a short-lived processing marker / last-synced signature.
>
> The goal is:
>
> ```text
> One row edit
> → one effective backend update
> ```
>
> Even if the same event is accidentally sent twice, the stable `sourceRowId` plus backend upsert must keep the operation idempotent.
>
> ---
>
> ### E. Do not use full-sheet polling
>
> Normal operation must NOT:
>
> ```text
> download entire CSV every few seconds/minutes
> ```
>
> or repeatedly call:
>
> ```text
> /sync-requests
> ```
>
> Full-sheet sync becomes recovery/reconciliation only.
>
> ---
>
> # 4. Frontend WMS Dashboard
>
> ## [MODIFY] `Warehouse.tsx`
>
> ### A. Remove automatic full sync
>
> Remove all frontend calls that automatically invoke:
>
> ```ts
> api.syncWmsRequests()
> ```
>
> during:
>
> ```text
> Login
> Initial page load
> useEffect rerenders
> Tab changes
> Pagination
> Status filter changes
> Warehouse selection
> Route changes
> ```
>
> Normal frontend behavior becomes:
>
> ```text
> Login
> ↓
> Read Supabase-backed APIs
> ↓
> Render existing data
> ```
>
> ---
>
> ### B. Do not tie sync to `loadWarehouseData()`
>
> `loadWarehouseData()` must only load data.
>
> It should not perform upstream synchronization.
>
> Example desired responsibilities:
>
> ```text
> get stock
> get material requests
> get movements
> get challans
> ```
>
> not:
>
> ```text
> sync Google Sheet
> then load data
> ```
>
> ---
>
> ### C. Admin-only recovery control
>
> If the **Sync Live Sheets** button remains:
>
> Show it only to the Master Administrator:
>
> ```text
> warehouse@claro.com
> ```
>
> Normal warehouse operators such as:
>
> ```text
> haryana@claro.com
> ```
>
> must not see or need it.
>
> Better label:
>
> ```text
> Admin Reconcile Sheets
> ```
>
> instead of implying users need to press it for normal updates.
>
> ---
>
> # 5. Warehouse Isolation
>
> Preserve routing exactly:
>
> ```text
> Maharashtra / Jalna / MH
> → jalna schema
>
> Haryana / HR / Fatehbad
> → haryana schema
>
> Rajasthan / RJ
> → rajasthan schema
>
> Madhya Pradesh / MP / Vidisha
> → mp schema
> ```
>
> A row must never be written to another warehouse schema.
>
> For a warehouse-specific login:
>
> ```text
> Haryana user
> → reads haryana only
> ```
>
> For Master Admin / All Warehouses:
>
> ```text
> Read all schemas
> ```
>
> but:
>
> ```text
> DO NOT trigger all four sheet imports on login
> ```
>
> ---
>
> # 6. Material Request Frontend Refresh Behavior
>
> The frontend must read Material Requests from Supabase/backend APIs only.
>
> When a user opens the Material Requests page:
>
> ```text
> GET Material Requests
> ```
>
> is fine.
>
> It must NOT trigger:
>
> ```text
> Google Sheet sync
> ```
>
> If the UI needs fresh data after a newly submitted request, use a normal API refresh of Supabase-backed data.
>
> Do not continuously poll Google Sheets.
>
> ---
>
> # 7. Fix Existing Foreign-Key Error
>
> Investigate this existing Supabase error:
>
> ```text
> insert or update on table "complaints"
> violates foreign key constraint
> "complaints_application_id_fkey"
> ```
>
> Verify the actual FK definition in Prisma/Postgres.
>
> If it points to:
>
> ```text
> MasterInstallation.applicationId
> ```
>
> ensure that the MasterInstallation row exists first.
>
> Do not guess based only on the constraint name; inspect the schema/migration/database definition.
>
> Do not remove the foreign key to make the error disappear.
>
> ---
>
> # 8. Keep Full Sync as Recovery Only
>
> Keep:
>
> ```ts
> syncRequests()
> ```
>
> because it is useful for:
>
> ```text
> Historical reconciliation
> Missed webhook recovery
> Migration
> Admin debugging
> Rebuilding material-request data
> ```
>
> But normal operation must never depend on it.
>
> Desired architecture:
>
> ```text
>                    NORMAL OPERATION
>
> Google Sheet
>      │
>      │ New / edited row
>      ▼
> Apps Script
>      │
>      │ ONE ROW
>      ▼
> Single-row API
>      │
>      ▼
> syncSingleRequest()
>      │
>      ├── Jalna ─────→ jalna schema
>      ├── Haryana ───→ haryana schema
>      ├── Rajasthan ─→ rajasthan schema
>      └── MP ────────→ mp schema
> ```
>
> ```text
>                     USER LOGIN
>
> User logs in
>      │
>      ▼
> Read Supabase
>      │
>      ▼
> Display Material Requests
>
> NO GOOGLE SHEET FULL SYNC
> ```
>
> ```text
>                    RECOVERY ONLY
>
> Master Admin
>      │
>      ▼
> Admin Reconcile Sheets
>      │
>      ▼
> syncRequests()
>      │
>      ▼
> Full reconciliation
> ```
>
> ---
>
> # 9. Important: Do Not Modify Unrelated WMS Logic
>
> Do not change:
>
> ```text
> Inventory movement lifecycle
> UnitLedger state machine
> Stock adjustment rules
> Adjustment History
> Challan generation
> Engineer assignment logic
> Warehouse schema structure
> Serial-number lifecycle
> Existing stock calculations
> ```
>
> unless a modification is specifically required to fix a demonstrated bug.
>
> ---
>
> # 10. Separate Existing Live Stock Error
>
> There is also an existing error:
>
> ```text
> GET /api/v1/wms/stock?warehouseId=wh-haryana-3333
> 500 Internal Server Error
> ```
>
> This is separate from event-driven Material Request synchronization.
>
> Do not claim the overall WMS task is complete until the cause of this error has been identified.
>
> Investigate:
>
> ```text
> Warehouse.tsx
> api.ts
> WMS stock controller
> warehouseContext middleware
> getStock()
> Haryana warehouse DB row
> haryana schema
> ```
>
> Fix this separately without changing the event-driven sync architecture.
>
> ---
>
> # Verification Plan
>
> ## Automated Verification
>
> Run:
>
> ```text
> backend:
> npx tsc
>
> frontend:
> npx tsc
> ```
>
> and the project's normal build commands.
>
> No TypeScript/build errors should remain.
>
> ---
>
> ## Manual Verification — Haryana
>
> Log in as:
>
> ```text
> haryana@claro.com
> ```
>
> Verify:
>
> ```text
> Login does NOT trigger full sheet sync.
> Tab changes do NOT trigger full sheet sync.
> Pagination does NOT trigger full sheet sync.
> Filters do NOT trigger full sheet sync.
> Sync button is hidden.
> Existing Material Requests are read from Haryana Supabase schema.
> ```
>
> ---
>
> ## Manual Verification — New Row
>
> Add ONE new Haryana Material Request row in Google Sheets.
>
> Expected backend logs:
>
> ```text
> Received single-row sync
> Target schema: haryana
> Created/updated one request
> ```
>
> There should NOT be:
>
> ```text
> Parsed 251 rows
> Found 49 Haryana rows
> Starting 4 batches
> ```
>
> for normal row entry.
>
> Refresh/read Material Requests in Haryana UI and confirm the new request appears.
>
> ---
>
> ## Manual Verification — Edited Row
>
> Edit Quantity:
>
> ```text
> 1 → 2
> ```
>
> Expected:
>
> ```text
> Same sourceRowId
> Same MaterialRequest record
> Quantity updated
> No duplicate
> ```
>
> Then edit Dispatch Status.
>
> Expected:
>
> ```text
> Same request updated again
> ```
>
> ---
>
> ## Manual Verification — Warehouse Isolation
>
> Add:
>
> ```text
> Haryana row
> ```
>
> Verify:
>
> ```text
> Present in haryana
> Not present in jalna
> Not present in rajasthan
> Not present in mp
> ```
>
> Repeat with at least one MP or Jalna test row.
>
> ---
>
> ## Manual Verification — Duplicate Trigger
>
> Send the exact same payload twice using the same:
>
> ```text
> sourceRowId
> ```
>
> Expected:
>
> ```text
> One database MaterialRequest
> Latest values preserved
> No duplicate
> ```
>
> ---
>
> ## Manual Verification — Admin Recovery
>
> Log in as:
>
> ```text
> warehouse@claro.com
> ```
>
> Verify the admin reconciliation button is available.
>
> Running it should still perform the full reconciliation when explicitly requested.
>
> ---
>
> # Final Implementation Report Required
>
> After implementation, report:
>
> 1. Every file changed.
> 2. What caused the repeated full sync.
> 3. Where the frontend automatic sync was removed.
> 4. How Apps Script detects a new row.
> 5. How Apps Script detects an edited row.
> 6. The exact single-row endpoint used.
> 7. How `sourceRowId` is generated and stored.
> 8. How duplicate requests are prevented.
> 9. How edited Material Requests update the existing record.
> 10. How warehouse/schema isolation is enforced.
> 11. How `complaints_application_id_fkey` was fixed.
> 12. Confirmation that normal login performs **zero full-sheet synchronization**.
> 13. Confirmation that a new Google Sheet row results in **one-row synchronization only**.
> 14. Confirmation that full reconciliation remains available only for admin/recovery.
> 15. Result of TypeScript/build checks.
> 16. Status/root cause of the separate Haryana stock `500` issue.
>
> **Do not consider the task complete merely because the code compiles. Verify the complete flow: Google Sheet → Apps Script → one-row endpoint → `syncSingleRequest()` → correct PostgreSQL schema → Material Requests UI.**

This version covers the missing Apps Script portion, proper edit handling, stable IDs, duplicate protection, the foreign-key issue, the repeated-sync problem, and keeps the Haryana stock `500` clearly separated from the Material Request work.
