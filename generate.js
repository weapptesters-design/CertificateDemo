/**
 * generate.js
 * We App Testers — Automation Pipeline
 * Step 1: Download CSV → Parse → Compare → Detect new/changed apps → Save state
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

// ─── CONFIG ───────────────────────────────────────────────────────────────────
const OUTPUT_DIR = path.join(__dirname, 'output');
const PREV_FILE  = path.join(OUTPUT_DIR, 'previous_orders.json');
const REPORT_FILE = path.join(OUTPUT_DIR, 'report.json');
const CSV_URL    = process.env.SHEETS_CSV_URL; // Set this as GitHub secret

// Column name aliases (handles variations in CSV headers)
const COL = {
  appName:     ['App Name', 'app_name', 'AppName', 'App'],
  packageName: ['Package Name', 'package_name', 'PackageName', 'Package'],
  version:     ['Version', 'version', 'Ver'],
  startDate:   ['Start Date', 'start_date', 'StartDate', 'Start'],
  id:          ['ID', 'id', 'Id', 'Order ID', 'OrderID'],
  prefix:      ['Prefix', 'prefix'],
  suffix:      ['Suffix', 'suffix'],
};

// ─── UTILS ───────────────────────────────────────────────────────────────────
function ensureOutputDir() {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    console.log(`[DIR] Created output dir: ${OUTPUT_DIR}`);
  }
}

function getCol(row, aliases) {
  for (const alias of aliases) {
    if (row[alias] !== undefined && row[alias] !== '') return row[alias].trim();
  }
  return '';
}

function makeKey(row) {
  // Unique key = packageName + id (fallback to appName)
  const pkg = getCol(row, COL.packageName);
  const id  = getCol(row, COL.id);
  return pkg || id || getCol(row, COL.appName) || null;
}

// ─── CSV PARSER ───────────────────────────────────────────────────────────────
// Robust: handles quoted commas, missing columns, extra columns, empty rows
function parseCSV(raw) {
  const lines = raw.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  if (lines.length < 2) return [];

  // Parse a single CSV line (handles quoted fields)
  function parseLine(line) {
    const fields = [];
    let field = '';
    let inQuote = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuote && line[i + 1] === '"') { field += '"'; i++; }
        else inQuote = !inQuote;
      } else if (ch === ',' && !inQuote) {
        fields.push(field.trim());
        field = '';
      } else {
        field += ch;
      }
    }
    fields.push(field.trim());
    return fields;
  }

  const headers = parseLine(lines[0]);
  console.log(`[CSV] Headers found: ${headers.join(', ')}`);

  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const values = parseLine(line);
    const row = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx] !== undefined ? values[idx] : '';
    });
    // Skip fully empty rows
    if (Object.values(row).every(v => v === '')) continue;
    rows.push(row);
  }

  console.log(`[CSV] Parsed ${rows.length} data rows`);
  return rows;
}

// ─── DOWNLOADER ───────────────────────────────────────────────────────────────
function downloadCSV(url) {
  return new Promise((resolve, reject) => {
    let redirects = 0;

    function get(targetUrl) {
      // Pick correct protocol for EACH request (redirects can switch http↔https)
      const proto = targetUrl.startsWith('https') ? https : http;
      console.log(`[HTTP] GET ${targetUrl.substring(0, 80)}...`);

      proto.get(targetUrl, (res) => {
        // Follow all redirect codes: 301, 302, 303, 307, 308
        if ([301, 302, 303, 307, 308].includes(res.statusCode)) {
          if (redirects >= 10) return reject(new Error('Too many redirects'));
          redirects++;
          // Drain response body to free socket
          res.resume();
          const location = res.headers.location;
          if (!location) return reject(new Error('Redirect with no Location header'));
          // Handle relative redirects
          const nextUrl = location.startsWith('http') ? location : new URL(location, targetUrl).href;
          console.log(`[HTTP] Redirect ${res.statusCode} → ${nextUrl.substring(0, 80)}...`);
          get(nextUrl);
          return;
        }
        if (res.statusCode !== 200) {
          return reject(new Error(`HTTP ${res.statusCode} for URL: ${targetUrl}`));
        }
        let data = '';
        res.setEncoding('utf8');
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve(data));
        res.on('error', reject);
      }).on('error', reject);
    }

    get(url);
  });
}

// ─── COMPARISON ───────────────────────────────────────────────────────────────
function compareWithPrevious(currentRows, previousData) {
  const newApps     = [];
  const changedApps = [];

  for (const row of currentRows) {
    const key = makeKey(row);
    if (!key) {
      console.log(`[SKIP] Row with no usable key: ${JSON.stringify(row)}`);
      continue;
    }

    const current = {
      key,
      appName:     getCol(row, COL.appName),
      packageName: getCol(row, COL.packageName),
      version:     getCol(row, COL.version),
      startDate:   getCol(row, COL.startDate),
      id:          getCol(row, COL.id),
      prefix:      getCol(row, COL.prefix),
      suffix:      getCol(row, COL.suffix),
    };

    if (!previousData[key]) {
      newApps.push(current);
      console.log(`[NEW] ${current.appName} (${current.packageName})`);
    } else {
      const prev = previousData[key];
      const changed = (
        prev.version   !== current.version   ||
        prev.startDate !== current.startDate
      );
      if (changed) {
        changedApps.push({ previous: prev, current });
        console.log(`[CHANGED] ${current.appName}`);
      }
    }
  }

  return { newApps, changedApps };
}

// ─── MAIN ────────────────────────────────────────────────────────────────────
async function main() {
  console.log('=== We App Testers — Generate.js ===');
  console.log(`[TIME] ${new Date().toISOString()}`);

  ensureOutputDir();

  // 1. Load previous state
  let previousData = {};
  if (fs.existsSync(PREV_FILE)) {
    try {
      previousData = JSON.parse(fs.readFileSync(PREV_FILE, 'utf8'));
      console.log(`[STATE] Loaded ${Object.keys(previousData).length} previous entries`);
    } catch (e) {
      console.warn(`[WARN] Could not parse previous_orders.json, starting fresh: ${e.message}`);
    }
  } else {
    console.log('[STATE] No previous_orders.json found, treating all as new');
  }

  // 2. Download CSV
  if (!CSV_URL) {
    console.error('[ERROR] SHEETS_CSV_URL env var not set!');
    process.exit(1);
  }
  console.log(`[HTTP] Downloading CSV...`);
  let rawCSV;
  try {
    rawCSV = await downloadCSV(CSV_URL);
    console.log(`[HTTP] Downloaded ${rawCSV.length} bytes`);
  } catch (e) {
    console.error(`[ERROR] CSV download failed: ${e.message}`);
    process.exit(1);
  }

  if (!rawCSV.trim()) {
    console.warn('[WARN] CSV is empty, nothing to process');
    const emptyReport = { newApps: [], changedApps: [], date: new Date().toISOString() };
    fs.writeFileSync(REPORT_FILE, JSON.stringify(emptyReport, null, 2));
    process.exit(0);
  }

  // 3. Parse CSV
  const rows = parseCSV(rawCSV);
  if (rows.length === 0) {
    console.warn('[WARN] No rows parsed from CSV');
    const emptyReport = { newApps: [], changedApps: [], date: new Date().toISOString() };
    fs.writeFileSync(REPORT_FILE, JSON.stringify(emptyReport, null, 2));
    process.exit(0);
  }

  // 4. Compare
  const { newApps, changedApps } = compareWithPrevious(rows, previousData);
  console.log(`[RESULT] New: ${newApps.length} | Changed: ${changedApps.length}`);

  // 5. Save report
  const report = {
    date: new Date().toISOString(),
    newApps,
    changedApps,
    totalRows: rows.length,
  };
  fs.writeFileSync(REPORT_FILE, JSON.stringify(report, null, 2));
  console.log(`[FILE] report.json saved`);

  // 6. Update previous_orders.json with current full state
  const newPrevious = {};
  for (const row of rows) {
    const key = makeKey(row);
    if (!key) continue;
    newPrevious[key] = {
      key,
      appName:     getCol(row, COL.appName),
      packageName: getCol(row, COL.packageName),
      version:     getCol(row, COL.version),
      startDate:   getCol(row, COL.startDate),
      id:          getCol(row, COL.id),
      prefix:      getCol(row, COL.prefix),
      suffix:      getCol(row, COL.suffix),
    };
  }
  fs.writeFileSync(PREV_FILE, JSON.stringify(newPrevious, null, 2));
  console.log(`[FILE] previous_orders.json updated with ${Object.keys(newPrevious).length} entries`);

  console.log('=== generate.js DONE ===');
}

main().catch(e => {
  console.error('[FATAL]', e);
  process.exit(1);
});
