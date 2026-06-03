const fs = require("fs");

const csv = fs.readFileSync("orders.csv", "utf8")
  .replace(/\r/g, "")
  .replace(/\uFEFF/g, "");

const rows = csv.split("\n").filter(r => r.trim());

const headers = rows[0]
  .split(",")
  .map(h => h.trim().toLowerCase());

function get(row, name) {
  const index = headers.indexOf(name.toLowerCase());
  return index !== -1 ? (row[index] || "").trim() : "";
}

let previousData = {};
if (fs.existsSync("previous_orders.json")) {
  previousData = JSON.parse(fs.readFileSync("previous_orders.json", "utf8"));
}

let currentData = {};
let newApps = [];
let changedApps = [];

for (let i = 1; i < rows.length; i++) {

  const row = rows[i].split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/);

  const appName = get(row, "app name");
  const packageName = get(row, "package name");
  const version = get(row, "version");
  const id = get(row, "id");
  const startDate = get(row, "start date");

  // optional extra fields (safe)
  const suffix = get(row, "suffix");
  const appCode = get(row, "app code");
  const prefix = get(row, "prefix");

  if (!appName && !packageName) continue;

  const key = id || `${prefix}-${appCode}-${suffix}`;

  const newRecord = {
    appName,
    packageName,
    version,
    startDate
  };

  currentData[key] = newRecord;

  const oldRecord = previousData[key];

  if (!oldRecord) {
    newApps.push({ id: key, ...newRecord });
  } else {
    if (JSON.stringify(oldRecord) !== JSON.stringify(newRecord)) {
      changedApps.push({ id: key, oldRecord, newRecord });
    }
  }
}

fs.writeFileSync("previous_orders.json", JSON.stringify(currentData, null, 2));

fs.writeFileSync("report.json", JSON.stringify({
  newCount: newApps.length,
  changedCount: changedApps.length,
  newApps,
  changedApps
}, null, 2));

console.log("✅ Safe CSV parsing completed");
console.log("🆕 New:", newApps.length);
console.log("✏️ Changed:", changedApps.length);
