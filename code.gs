const MATERIAL_REQUEST_SPREADSHEET_ID =
  "1kQkVIhbOgg3n4FHSia2Ow7Scm0AZLWHuMAwA-1cOsZY";

const MATERIAL_REQUEST_SHEET_GID =
  193399218;

// IMPORTANT: Put your Render / live backend URL here
const MATERIAL_REQUEST_API_URL =
  "https://claro-warehouse.onrender.com/api/v1/material-requests/sync-row";


/**
 * TRIGGER ENTRYPOINT: Runs automatically on cell edit in Google Sheets.
 * Capture the edited row and sync only that row instantly.
 */
function onEditTrigger(e) {
  if (!e || !e.range) return;

  const lock = LockService.getScriptLock();
  try {
    // Wait up to 5 seconds to acquire lock (prevents duplicate overlaps)
    lock.waitLock(5000);
  } catch (err) {
    Logger.log("Could not acquire lock: " + err.message);
    return;
  }

  try {
    const range = e.range;
    const sheet = range.getSheet();
    
    // Check if the edited sheet matches our GID
    if (sheet.getSheetId() !== MATERIAL_REQUEST_SHEET_GID) {
      return;
    }

    const startRow = range.getRow();
    const numRows = range.getNumRows();

    // Loop through all edited rows (handles multi-row paste edits)
    for (let r = 0; r < numRows; r++) {
      const rowNumber = startRow + r;
      if (rowNumber === 1) continue; // Skip header row
      
      syncSingleRow(sheet, rowNumber);
    }
  } catch (error) {
    Logger.log("Error in onEditTrigger: " + error.message);
  } finally {
    lock.releaseLock();
  }
}


/**
 * TIME-BASED INCREMENTAL SYNC (Self-healing backup trigger)
 *
 * Checks all rows:
 * - If not marked "SYNCED" (e.g. empty, FAILED, ERROR), sends it to backend.
 */
function syncNewMaterialRequests() {
  Logger.log("===== STARTING INCREMENTAL SYNC =====");

  const spreadsheet = SpreadsheetApp.openById(MATERIAL_REQUEST_SPREADSHEET_ID);
  let sheet = null;
  const sheets = spreadsheet.getSheets();
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

  const headers = sheet.getRange(1, 1, 1, lastColumn).getDisplayValues()[0];
  const syncStatusColIndex = headers.indexOf("Sync Status") + 1;

  for (let rowNumber = 2; rowNumber <= lastRow; rowNumber++) {
    let syncStatus = "";
    if (syncStatusColIndex > 0) {
      syncStatus = sheet.getRange(rowNumber, syncStatusColIndex).getValue();
    }

    // Skip already synced rows
    if (syncStatus === "SYNCED") {
      continue;
    }

    // Skip empty rows
    const rowValues = sheet.getRange(rowNumber, 1, 1, lastColumn).getValues()[0];
    const hasData = rowValues.some(val => val && String(val).trim() !== "");
    if (!hasData) {
      continue;
    }

    syncSingleRow(sheet, rowNumber);
  }

  Logger.log("===== INCREMENTAL SYNC COMPLETE =====");
}


/**
 * SYNCS A SINGLE ROW (Allocates stable Sync ID, maps payload, and sends POST)
 */
function syncSingleRow(sheet, rowNumber) {
  const lastColumn = sheet.getLastColumn();
  const headers = sheet.getRange(1, 1, 1, lastColumn).getDisplayValues()[0];
  
  let syncStatusColIndex = headers.indexOf("Sync Status") + 1;
  if (syncStatusColIndex === 0) {
    syncStatusColIndex = lastColumn + 1;
    sheet.getRange(1, syncStatusColIndex).setValue("Sync Status");
    headers.push("Sync Status");
  }

  let syncIdColIndex = headers.indexOf("Sync ID") + 1;
  if (syncIdColIndex === 0) {
    syncIdColIndex = sheet.getLastColumn() + 1;
    sheet.getRange(1, syncIdColIndex).setValue("Sync ID");
    headers.push("Sync ID");
  }

  // Fetch complete row values including the newly created/appended columns
  const rowValues = sheet.getRange(rowNumber, 1, 1, sheet.getLastColumn()).getDisplayValues()[0];
  
  // Double check that we have data
  const hasData = rowValues.some(val => val && String(val).trim() !== "");
  if (!hasData) return;

  // 1. Allocate stable unique Sync ID if not present
  let syncId = rowValues[syncIdColIndex - 1];
  if (!syncId || String(syncId).trim() === "") {
    const dateStr = Utilities.formatDate(new Date(), "GMT", "yyyyMMdd");
    const rand = Math.floor(100000 + Math.random() * 900000);
    syncId = `MR-${dateStr}-${rand}`;
    sheet.getRange(rowNumber, syncIdColIndex).setValue(syncId);
    rowValues[syncIdColIndex - 1] = syncId; // update in-memory value for payload mapping
  }

  // 2. Map header strings to cell values
  const rowData = {};
  headers.forEach((header, index) => {
    const key = String(header || "").trim();
    if (key) {
      rowData[key] = rowValues[index];
    }
  });

  const payload = {
    spreadsheetId: sheet.getParent().getId(),
    sheetId: sheet.getSheetId(),
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
      sheet.getRange(rowNumber, syncStatusColIndex).setValue("SYNCED");
      Logger.log("✅ Row " + rowNumber + " synced successfully with ID: " + syncId);
    } else {
      sheet.getRange(rowNumber, syncStatusColIndex).setValue("FAILED");
      Logger.log("❌ Row " + rowNumber + " failed. HTTP " + statusCode + " | " + response.getContentText());
    }
  } catch (error) {
    sheet.getRange(rowNumber, syncStatusColIndex).setValue("ERROR");
    Logger.log("❌ Row " + rowNumber + " error: " + error.message);
  }
}


/**
 * MANUAL FULL SHEET RECONCILIATION / RE-SYNC
 * Sends every row with its stable Sync ID to the database.
 */
function syncAllMaterialRequests() {
  Logger.log("===== MATERIAL REQUEST MANUAL SYNC STARTED =====");
  const spreadsheet = SpreadsheetApp.openById(MATERIAL_REQUEST_SPREADSHEET_ID);
  let sheet = null;
  const sheets = spreadsheet.getSheets();
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
  if (lastRow <= 1) return;

  for (let rowNumber = 2; rowNumber <= lastRow; rowNumber++) {
    syncSingleRow(sheet, rowNumber);
  }

  Logger.log("Manual Sync / Reconciliation completed successfully.");
}


/**
 * Reads secret from Apps Script
 */
function getMaterialRequestSecret() {
  const secret = PropertiesService.getScriptProperties().getProperty("MATERIAL_REQUEST_SYNC_SECRET");
  if (!secret) {
    throw new Error("MATERIAL_REQUEST_SYNC_SECRET is missing from Script Properties.");
  }
  return secret;
}


/**
 * HELPER: Clear Sync Statuses to allow full re-sync
 */
function clearSyncStatus() {
  Logger.log("===== CLEARING SYNC STATUS COLUMN =====");
  const spreadsheet = SpreadsheetApp.openById(MATERIAL_REQUEST_SPREADSHEET_ID);
  let sheet = null;
  const sheets = spreadsheet.getSheets();
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
    sheet.getRange(2, syncStatusColIndex, lastRow - 1, 1).clearContent();
    Logger.log("✅ Successfully cleared all sync status markers!");
  } else {
    Logger.log("⚠️ No 'Sync Status' column found to clear.");
  }
}