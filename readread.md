1. Google Apps Script

Put this in the Apps Script attached to your Material Request spreadsheet:

const MATERIAL_REQUEST_SPREADSHEET_ID =
  "1kQkVIhbOgg3n4FHSia2Ow7Scm0AZLWHuMAwA-1cOsZY";

const MATERIAL_REQUEST_SHEET_GID = 193399218;

// Change this to your new backend URL
const MATERIAL_REQUEST_API_URL =
  "https://YOUR-NEW-BACKEND.onrender.com/api/v1/material-requests/sync-row";


/**
 * RUN THIS FUNCTION ONCE MANUALLY.
 *
 * It creates the installable edit trigger.
 */
function createMaterialRequestEditTrigger() {
  const spreadsheet =
    SpreadsheetApp.openById(
      MATERIAL_REQUEST_SPREADSHEET_ID
    );

  // Delete old copies of this trigger first.
  ScriptApp.getProjectTriggers().forEach(
    function(trigger) {
      if (
        trigger.getHandlerFunction() ===
        "syncMaterialRequestOnEdit"
      ) {
        ScriptApp.deleteTrigger(trigger);
      }
    }
  );

  ScriptApp
    .newTrigger("syncMaterialRequestOnEdit")
    .forSpreadsheet(spreadsheet)
    .onEdit()
    .create();

  Logger.log(
    "✅ Material Request live-sync trigger created."
  );
}


/**
 * Runs automatically when someone edits the spreadsheet.
 */
function syncMaterialRequestOnEdit(e) {
  if (!e || !e.range) {
    Logger.log(
      "No edit event supplied."
    );
    return;
  }

  const sheet =
    e.range.getSheet();

  // Only sync the Material Request sheet.
  if (
    sheet.getSheetId() !==
    MATERIAL_REQUEST_SHEET_GID
  ) {
    return;
  }

  const firstEditedRow =
    e.range.getRow();

  const numberOfRows =
    e.range.getNumRows();

  // Ignore header edits.
  if (firstEditedRow === 1) {
    return;
  }

  const lock =
    LockService.getScriptLock();

  try {
    lock.waitLock(30000);

    for (
      let rowNumber = firstEditedRow;
      rowNumber <
      firstEditedRow + numberOfRows;
      rowNumber++
    ) {
      syncMaterialRequestRow(
        sheet,
        rowNumber
      );
    }

  } catch (error) {
    Logger.log(
      "❌ Material Request edit sync failed: " +
      error.message
    );

    throw error;

  } finally {
    if (lock.hasLock()) {
      lock.releaseLock();
    }
  }
}


/**
 * Reads one row, converts the headers/values
 * into JSON, and sends it to the backend.
 */
function syncMaterialRequestRow(
  sheet,
  rowNumber
) {

  const lastColumn =
    sheet.getLastColumn();

  if (lastColumn < 1) {
    return;
  }

  const headers =
    sheet
      .getRange(
        1,
        1,
        1,
        lastColumn
      )
      .getDisplayValues()[0];

  const values =
    sheet
      .getRange(
        rowNumber,
        1,
        1,
        lastColumn
      )
      .getDisplayValues()[0];

  /*
   * Ignore completely blank rows.
   */
  const hasData =
    values.some(function(value) {
      return (
        value !== null &&
        value !== undefined &&
        String(value).trim() !== ""
      );
    });

  if (!hasData) {
    Logger.log(
      "Skipping blank row: " +
      rowNumber
    );
    return;
  }

  const rowData = {};

  headers.forEach(
    function(header, index) {

      const key =
        String(header || "")
          .trim();

      if (!key) {
        return;
      }

      rowData[key] =
        values[index];
    }
  );

  const payload = {
    spreadsheetId:
      MATERIAL_REQUEST_SPREADSHEET_ID,

    sheetId:
      MATERIAL_REQUEST_SHEET_GID,

    sheetName:
      sheet.getName(),

    sourceRow:
      rowNumber,

    data:
      rowData
  };

  const secret =
    PropertiesService
      .getScriptProperties()
      .getProperty(
        "MATERIAL_REQUEST_SYNC_SECRET"
      );

  if (!secret) {
    throw new Error(
      "MATERIAL_REQUEST_SYNC_SECRET is not configured."
    );
  }

  const options = {
    method:
      "post",

    contentType:
      "application/json",

    payload:
      JSON.stringify(payload),

    headers: {
      "X-Claro-Secret":
        secret
    },

    muteHttpExceptions:
      true
  };

  const response =
    UrlFetchApp.fetch(
      MATERIAL_REQUEST_API_URL,
      options
    );

  const statusCode =
    response.getResponseCode();

  const responseBody =
    response.getContentText();

  if (
    statusCode < 200 ||
    statusCode >= 300
  ) {
    throw new Error(
      "Backend returned HTTP " +
      statusCode +
      ": " +
      responseBody
    );
  }

  Logger.log(
    "✅ Material Request row " +
    rowNumber +
    " synced."
  );
}
2. Add the Apps Script secret

In Apps Script go to:

Project Settings → Script Properties

Add:

MATERIAL_REQUEST_SYNC_SECRET

with a strong secret such as:

some-long-random-private-token

Use the same value on your backend.

Do not put your Supabase/Postgres password into Apps Script.

3. Database table

Because I don't yet have your exact Material Request column names, I'd initially keep both the important identifiers and the complete sheet row as JSON.

Run this in your new Supabase SQL editor:

CREATE TABLE material_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    source_spreadsheet_id TEXT NOT NULL,
    source_sheet_id BIGINT NOT NULL,
    source_sheet_name TEXT,

    source_row INTEGER NOT NULL,

    ticket_id TEXT,
    application_id TEXT,

    sheet_data JSONB NOT NULL DEFAULT '{}'::jsonb,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (
        source_spreadsheet_id,
        source_sheet_id,
        source_row
    )
);

CREATE INDEX idx_material_requests_ticket_id
ON material_requests(ticket_id);

CREATE INDEX idx_material_requests_application_id
ON material_requests(application_id);

The important part here is:

sheet_data JSONB

That means every Material Request column from the Google Sheet can be stored, even before we finalize all the field mappings.

4. Prisma model

If your new backend is still Prisma-based, add:

model MaterialRequest {
  id                    String   @id @default(uuid())

  sourceSpreadsheetId   String
  sourceSheetId         BigInt
  sourceSheetName       String?
  sourceRow             Int

  ticketId              String?
  applicationId         String?

  sheetData             Json

  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt

  @@unique([
    sourceSpreadsheetId,
    sourceSheetId,
    sourceRow
  ])

  @@index([ticketId])
  @@index([applicationId])

  @@map("material_requests")
}

Then migrate:

npx prisma migrate dev --name add_material_requests

For production you would normally deploy the migration with your existing deployment process.

Your Supabase transaction pooler on port 6543 is appropriate for application traffic; Supabase notes transaction mode is designed for transient/concurrent application connections.

5. Backend route

Example Express route:

import { Router } from "express";
import { prisma } from "../lib/prisma";

const router = Router();

router.post(
  "/sync-row",
  async (req, res) => {

    try {

      /*
       * Authenticate Apps Script
       */
      const suppliedSecret =
        req.header(
          "X-Claro-Secret"
        );

      if (
        !process.env
          .MATERIAL_REQUEST_SYNC_SECRET ||
        suppliedSecret !==
          process.env
            .MATERIAL_REQUEST_SYNC_SECRET
      ) {
        return res
          .status(401)
          .json({
            success: false,
            message:
              "Unauthorized"
          });
      }

      const {
        spreadsheetId,
        sheetId,
        sheetName,
        sourceRow,
        data
      } = req.body;

      if (
        !spreadsheetId ||
        !sheetId ||
        !sourceRow ||
        !data
      ) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              "Missing required fields."
          });
      }


      /*
       * IMPORTANT:
       *
       * Change these header names once
       * we know exactly what your
       * Material Request sheet calls them.
       */
      const ticketId =
        data["Ticket ID"] ||
        data["Ticket Id"] ||
        data["ticket_id"] ||
        null;

      const applicationId =
        data["Application ID"] ||
        data["Application Id"] ||
        data["App ID"] ||
        null;


      const materialRequest =
        await prisma
          .materialRequest
          .upsert({

            where: {
              sourceSpreadsheetId_sourceSheetId_sourceRow: {
                sourceSpreadsheetId:
                  String(
                    spreadsheetId
                  ),

                sourceSheetId:
                  BigInt(
                    sheetId
                  ),

                sourceRow:
                  Number(
                    sourceRow
                  )
              }
            },

            create: {
              sourceSpreadsheetId:
                String(
                  spreadsheetId
                ),

              sourceSheetId:
                BigInt(
                  sheetId
                ),

              sourceSheetName:
                sheetName || null,

              sourceRow:
                Number(
                  sourceRow
                ),

              ticketId:
                ticketId
                  ? String(ticketId)
                  : null,

              applicationId:
                applicationId
                  ? String(
                      applicationId
                    )
                  : null,

              sheetData:
                data
            },

            update: {
              sourceSheetName:
                sheetName || null,

              ticketId:
                ticketId
                  ? String(ticketId)
                  : null,

              applicationId:
                applicationId
                  ? String(
                      applicationId
                    )
                  : null,

              sheetData:
                data
            }
          });


      return res.json({
        success: true,

        id:
          materialRequest.id,

        sourceRow:
          materialRequest.sourceRow
      });

    } catch (error) {

      console.error(
        "Material Request sync failed:",
        error
      );

      return res
        .status(500)
        .json({
          success: false,
          message:
            "Material Request sync failed."
        });
    }
  }
);

export default router;

Mount it:

app.use(
  "/api/v1/material-requests",
  materialRequestsRouter
);
6. Backend environment variables

On your new Render backend:

DATABASE_URL=postgresql://postgres.pxozgaccicuobirvbdnf:YOUR_PASSWORD@aws-1-ap-northeast-2.pooler.supabase.com:6543/postgres?pgbouncer=true

DIRECT_URL=postgresql://postgres.pxozgaccicuobirvbdnf:YOUR_PASSWORD@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres

MATERIAL_REQUEST_SYNC_SECRET=THE_SAME_SECRET_AS_APPS_SCRIPT

Keep these only in Render environment variables.

7. What happens after this

Someone changes:

Material Requested
Motor 5HP

or quantity/status/engineer/etc. in the Material Request sheet.

Then:

Google Sheet edit
      ↓
syncMaterialRequestOnEdit()
      ↓
POST /material-requests/sync-row
      ↓
UPSERT source row
      ↓
Supabase
      ↓
New Material Request page

If they edit that same row again, it updates the existing DB record instead of creating another one.

That's exactly what we want.

One remaining thing is important: right now I'm deliberately storing the entire sheet row in sheetData, because I don't know the exact headers in your Material Request tab. Once you paste the header row from that sheet, I can give you the final version where fields like Ticket ID, Engineer, Material, Quantity, Request Date, Dispatch Status, etc. get their own proper database columns instead of relying primarily on JSON.