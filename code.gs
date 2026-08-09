const MATERIAL_REQUEST_SPREADSHEET_ID =
  "1kQkVIhbOgg3n4FHSia2Ow7Scm0AZLWHuMAwA-1cOsZY";

const MATERIAL_REQUEST_SHEET_GID =
  193399218;

// IMPORTANT: Put your Render / live backend URL here
const MATERIAL_REQUEST_API_URL =
  "https://claro-warehouse.onrender.com/api/v1/material-requests/sync-row";


/**
 * TIME-BASED INCREMENTAL SYNC (Runs automatically)
 *
 * Checks each row in the sheet:
 * - If it has NOT been synced (Sync Status is empty), sends it to Supabase.
 * - Once successful, marks it as "SYNCED" in the Google Sheet.
 * - If it has already been synced, it skips it instantly.
 *
 * Map this function to an hourly or On Edit trigger!
 */
function syncNewMaterialRequests() {
  Logger.log("===== STARTING INCREMENTAL SYNC =====");

  const spreadsheet = SpreadsheetApp.openById(MATERIAL_REQUEST_SPREADSHEET_ID);
  
  // Find sheet using GID
  const sheets = spreadsheet.getSheets();
  let sheet = null;
  for (let i = 0; i < sheets.length; i++) {
    if (sheets[i].getSheetId() === MATERIAL_REQUEST_SHEET_GID) {
      sheet = sheets[i];
      break;
    }
  }

  if (!sheet) {
    throw new Error("Material Request sheet not found. GID: " + MATERIAL_REQUEST_SHEET_GID);
  }

  const lastRow = sheet.getLastRow();
  const lastColumn = sheet.getLastColumn();

  if (lastRow <= 1) {
    Logger.log("No data found to sync.");
    return;
  }

  // 1. Fetch headers to locate/create "Sync Status" column
  const headers = sheet.getRange(1, 1, 1, lastColumn).getDisplayValues()[0];
  let syncStatusColIndex = headers.indexOf("Sync Status") + 1;
  
  // Create "Sync Status" column at the end if it doesn't exist
  if (syncStatusColIndex === 0) {
    syncStatusColIndex = lastColumn + 1;
    sheet.getRange(1, syncStatusColIndex).setValue("Sync Status");
    Logger.log("Created 'Sync Status' column header at index " + syncStatusColIndex);
  }

  // 2. Fetch all values including the sync status column
  const range = sheet.getRange(2, 1, lastRow - 1, syncStatusColIndex);
  const data = range.getDisplayValues();

  let successCount = 0;
  let failedCount = 0;

  for (let i = 0; i < data.length; i++) {
    const rowNumber = i + 2;
    const rowValues = data[i];
    const syncStatus = rowValues[syncStatusColIndex - 1];

    // Skip already synced rows
    if (syncStatus === "SYNCED") {
      continue;
    }

    // Skip empty rows
    const hasData = rowValues.slice(0, lastColumn).some(val => val && String(val).trim() !== "");
    if (!hasData) {
      continue;
    }

    // Map headers to row cells
    const rowData = {};
    headers.forEach((header, index) => {
      const key = String(header || "").trim();
      if (key) {
        rowData[key] = rowValues[index];
      }
    });

    const payload = {
      spreadsheetId: MATERIAL_REQUEST_SPREADSHEET_ID,
      sheetId: MATERIAL_REQUEST_SHEET_GID,
      sheetName: sheet.getName(),
      sourceRow: rowNumber,
      data: rowData
    };

    try {
      const response = UrlFetchApp.fetch(MATERIAL_REQUEST_API_URL, {
        method: "post",
        contentType: "application/json",
        payload: JSON.stringify(payload),
        headers: {
          "X-Claro-Secret": getMaterialRequestSecret()
        },
        muteHttpExceptions: true
      });

      const statusCode = response.getResponseCode();
      const responseBody = response.getContentText();

      if (statusCode >= 200 && statusCode < 300) {
        // Mark as SYNCED in sheet!
        sheet.getRange(rowNumber, syncStatusColIndex).setValue("SYNCED");
        successCount++;
        Logger.log("✅ Row " + rowNumber + " synced successfully.");
      } else {
        failedCount++;
        Logger.log("❌ Row " + rowNumber + " failed. HTTP " + statusCode + " | " + responseBody);
      }

    } catch (error) {
      failedCount++;
      Logger.log("❌ Row " + rowNumber + " error: " + error.message);
    }
  }

  Logger.log("===== INCREMENTAL SYNC COMPLETE =====");
  Logger.log("Synced: " + successCount + " | Failed: " + failedCount);
}


/**
 * MANUAL FULL SHEET SYNC (Fallback)
 * Sends every row to the backend regardless of sync status.
 */
function syncAllMaterialRequests() {
  Logger.log("===== MATERIAL REQUEST MANUAL SYNC STARTED =====");
  const spreadsheet = SpreadsheetApp.openById(MATERIAL_REQUEST_SPREADSHEET_ID);
  const sheets = spreadsheet.getSheets();
  let sheet = null;
  for (let i = 0; i < sheets.length; i++) {
    if (sheets[i].getSheetId() === MATERIAL_REQUEST_SHEET_GID) {
      sheet = sheets[i];
      break;
    }
  }

  if (!sheet) {
    throw new Error("Material Request sheet not found. GID: " + MATERIAL_REQUEST_SHEET_GID);
  }

  const lastRow = sheet.getLastRow();
  const lastColumn = sheet.getLastColumn();

  if (lastRow <= 1) return;

  const headers = sheet.getRange(1, 1, 1, lastColumn).getDisplayValues()[0];
  const rows = sheet.getRange(2, 1, lastRow - 1, lastColumn).getDisplayValues();

  let successCount = 0;
  let failedCount = 0;

  for (let i = 0; i < rows.length; i++) {
    const rowNumber = i + 2;
    const values = rows[i];

    const hasData = values.some(val => val && String(val).trim() !== "");
    if (!hasData) continue;

    const rowData = {};
    headers.forEach((header, index) => {
      const key = String(header || "").trim();
      if (key) {
        rowData[key] = values[index];
      }
    });

    const payload = {
      spreadsheetId: MATERIAL_REQUEST_SPREADSHEET_ID,
      sheetId: MATERIAL_REQUEST_SHEET_GID,
      sheetName: sheet.getName(),
      sourceRow: rowNumber,
      data: rowData
    };

    try {
      const response = UrlFetchApp.fetch(MATERIAL_REQUEST_API_URL, {
        method: "post",
        contentType: "application/json",
        payload: JSON.stringify(payload),
        headers: {
          "X-Claro-Secret": getMaterialRequestSecret()
        },
        muteHttpExceptions: true
      });

      const statusCode = response.getResponseCode();
      if (statusCode >= 200 && statusCode < 300) {
        successCount++;
      } else {
        failedCount++;
      }
    } catch (error) {
      failedCount++;
    }
  }

  Logger.log("Manual Sync Completed. Success: " + successCount + " | Failed: " + failedCount);
}


/**
 * Reads secret from Apps Script
 * Project Settings → Script Properties.
 */
function getMaterialRequestSecret() {
  const secret = PropertiesService.getScriptProperties().getProperty("MATERIAL_REQUEST_SYNC_SECRET");
  if (!secret) {
    throw new Error("MATERIAL_REQUEST_SYNC_SECRET is missing from Script Properties.");
  }
  return secret;
}


/**
 * HELPER: Clear Sync Statuses
 * Run this function once from Apps Script editor to clear all "SYNCED" cells,
 * allowing you to perform a clean re-sync of all rows.
 */
function clearSyncStatus() {
  Logger.log("===== CLEARING SYNC STATUS COLUMN =====");
  const spreadsheet = SpreadsheetApp.openById(MATERIAL_REQUEST_SPREADSHEET_ID);
  const sheets = spreadsheet.getSheets();
  let sheet = null;
  for (let i = 0; i < sheets.length; i++) {
    if (sheets[i].getSheetId() === MATERIAL_REQUEST_SHEET_GID) {
      sheet = sheets[i];
      break;
    }
  }

  if (!sheet) {
    throw new Error("Sheet not found.");
  }

  const lastRow = sheet.getLastRow();
  const lastColumn = sheet.getLastColumn();
  if (lastRow <= 1) return;

  const headers = sheet.getRange(1, 1, 1, lastColumn).getDisplayValues()[0];
  const syncStatusColIndex = headers.indexOf("Sync Status") + 1;

  if (syncStatusColIndex > 0) {
    // Clear rows 2 to lastRow in the Sync Status column
    sheet.getRange(2, syncStatusColIndex, lastRow - 1, 1).clearContent();
    Logger.log("✅ Successfully cleared all sync status markers!");
  } else {
    Logger.log("⚠️ No 'Sync Status' column found to clear.");
  }
}