const sheetUrl = "https://docs.google.com/spreadsheets/d/1kQkVIhbOgg3n4FHSia2Ow7Scm0AZLWHuMAwA-1cOsZY/export?format=csv&gid=193399218";

function matchesSchema(warehouseCell: string, schema: string): boolean {
  const cell = (warehouseCell || "").toLowerCase();
  if (schema === "jalna") return cell.includes("jalna") || cell.includes("mh");
  if (schema === "rajasthan") return cell.includes("rajasthan") || cell.includes("rj");
  if (schema === "haryana") return cell.includes("haryana") || cell.includes("hr") || cell.includes("fatehbad");
  if (schema === "mp") return cell.includes("mp") || cell.includes("vidisha");
  return false;
}

// Simple CSV parser supporting quotes and inner newlines
function parseCSV(text: string): string[][] {
  const lines = [];
  let row: string[] = [];
  let inQuotes = false;
  let currentField = "";

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentField += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      row.push(currentField.trim());
      currentField = "";
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') i++;
      row.push(currentField.trim());
      lines.push(row);
      row = [];
      currentField = "";
    } else {
      currentField += char;
    }
  }
  if (currentField || row.length > 0) {
    row.push(currentField.trim());
    lines.push(row);
  }
  return lines;
}

async function run() {
  try {
    const res = await fetch(sheetUrl);
    const text = await res.text();
    const rows = parseCSV(text);
    
    console.log("📊 total rows in CSV (with header):", rows.length);
    const dataRows = rows.slice(1);
    console.log("📊 total data rows:", dataRows.length);

    let jalna = 0;
    let haryana = 0;
    let mp = 0;
    let rajasthan = 0;
    let unrecognized = 0;
    let skippedMissingFields = 0;

    const unrecognizedList = new Set<string>();

    for (const row of dataRows) {
      if (row.length < 5) continue;
      
      const warehouse = row[1];
      const appId = row[2];
      const material = row[4];

      if (!appId || !material) {
        skippedMissingFields++;
        continue;
      }

      if (matchesSchema(warehouse, "jalna")) {
        jalna++;
      } else if (matchesSchema(warehouse, "haryana")) {
        haryana++;
      } else if (matchesSchema(warehouse, "mp")) {
        mp++;
      } else if (matchesSchema(warehouse, "rajasthan")) {
        rajasthan++;
      } else {
        unrecognized++;
        unrecognizedList.add(warehouse);
      }
    }

    console.log("\n--- Analysis Result ---");
    console.log("Jalna (MH):", jalna);
    console.log("Haryana (HR):", haryana);
    console.log("MP:", mp);
    console.log("Rajasthan:", rajasthan);
    console.log("Unrecognized Warehouses:", unrecognized, Array.from(unrecognizedList));
    console.log("Skipped due to blank fields:", skippedMissingFields);
    console.log("Sum of mapped:", (jalna + haryana + mp + rajasthan));

  } catch (err: any) {
    console.error("Error:", err.message);
  }
}

run();
