

const sheetUrl = "https://docs.google.com/spreadsheets/d/1kQkVIhbOgg3n4FHSia2Ow7Scm0AZLWHuMAwA-1cOsZY/export?format=csv&gid=193399218";

async function run() {
  try {
    const res = await fetch(sheetUrl);
    const text = await res.text();
    const rows = text.split("\n");
    console.log("Total rows fetched:", rows.length);
    console.log("Headers:", rows[0]);
    console.log("Row 1:", rows[1]);
    console.log("Row 2:", rows[2]);
    console.log("Row 3:", rows[3]);
    console.log("Row 4:", rows[4]);
  } catch (err: any) {
    console.error("Error:", err.message);
  }
}

run();
