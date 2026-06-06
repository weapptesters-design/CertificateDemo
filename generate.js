/**
 * generate.js — We App Testers
 * CSV download → Parse → Compare → Detect new apps → Save state
 *
 * Rules:
 * - Only rows where Generate column = "yes" (case-insensitive) are processed
 * - Ignored rows are completely skipped — not in report.json, not in previous_orders.json
 */

const fs   = require('fs');
const path = require('path');
const https= require('https');
const http = require('http');

const OUTPUT_DIR  = path.join(__dirname, 'output');
const PREV_FILE   = path.join(OUTPUT_DIR, 'previous_orders.json');
const REPORT_FILE = path.join(OUTPUT_DIR, 'report.json');
const CSV_URL     = process.env.SHEETS_CSV_URL;

const COL = {
  appName:     ['App Name', 'app_name', 'AppName', 'App', 'Name'],
  packageName: ['Package Name', 'package_name', 'PackageName', 'Package'],
  version:     ['Version', 'version', 'Ver'],
  startDate:   ['Start Date', 'start_date', 'StartDate', 'Start'],
  id:          ['ID', 'id', 'Id', 'Order ID', 'OrderID', 'App ID', 'AppID'],
  generate:    ['Generate', 'generate', 'GENERATE', 'Gen', 'gen'],
};

function ensureOutputDir() {
  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

function getCol(row, aliases) {
  for (const alias of aliases) {
    if (row[alias] !== undefined && String(row[alias]).trim() !== '') return String(row[alias]).trim();
  }
  return '';
}

// Returns true only if Generate = "yes" (case-insensitive, trimmed)
function shouldGenerate(row) {
  const val = getCol(row, COL.generate).toLowerCase().trim();
  return val === 'yes';
}

function makeKey(row) {
  const pkg  = getCol(row, COL.packageName);
  const id   = getCol(row, COL.id);
  const name = getCol(row, COL.appName);
  return pkg || id || name || null;
}

// ─── CSV PARSER ───────────────────────────────────────────────────────────────
function parseCSV(raw) {
  const lines = raw.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  if (lines.length < 2) return [];

  function parseLine(line) {
    const fields = []; let field = ''; let inQ = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') { if (inQ && line[i+1]==='"'){field+='"';i++;}else inQ=!inQ; }
      else if (ch === ',' && !inQ) { fields.push(field.trim()); field=''; }
      else field += ch;
    }
    fields.push(field.trim());
    return fields;
  }

  const headers = parseLine(lines[0]);
  console.log('[CSV] Headers:', headers.join(' | '));

  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const vals = parseLine(line);
    const row  = {};
    headers.forEach((h, idx) => { row[h] = vals[idx] !== undefined ? vals[idx] : ''; });
    if (Object.values(row).every(v => v === '')) continue;
    rows.push(row);
  }
  console.log('[CSV] Total rows parsed:', rows.length);
  return rows;
}

// ─── DOWNLOADER ───────────────────────────────────────────────────────────────
function downloadCSV(url) {
  return new Promise((resolve, reject) => {
    let redirects = 0;
    function get(targetUrl) {
      const proto = targetUrl.startsWith('https') ? https : http;
      console.log('[HTTP] GET', targetUrl.substring(0, 80) + '...');
      proto.get(targetUrl, res => {
        if ([301,302,303,307,308].includes(res.statusCode)) {
          if (redirects++ >= 10) return reject(new Error('Too many redirects'));
          res.resume();
          const loc = res.headers.location;
          if (!loc) return reject(new Error('Redirect with no Location'));
          const next = loc.startsWith('http') ? loc : new URL(loc, targetUrl).href;
          console.log('[HTTP] Redirect', res.statusCode, '→', next.substring(0,80));
          return get(next);
        }
        if (res.statusCode !== 200) return reject(new Error('HTTP ' + res.statusCode));
        let data = ''; res.setEncoding('utf8');
        res.on('data', c => data += c);
        res.on('end', () => resolve(data));
        res.on('error', reject);
      }).on('error', reject);
    }
    get(url);
  });
}

// ─── COMPARE ─────────────────────────────────────────────────────────────────
function compareWithPrevious(rows, previousData) {
  const newApps = [], changedApps = [];
  let skippedGenerate = 0, skippedIncomplete = 0;

  for (const row of rows) {

    // ── FILTER 1: Generate column must be "yes" ──────────────────────────────
    if (!shouldGenerate(row)) {
      const genVal = getCol(row, COL.generate) || '(blank)';
      console.log('[SKIP] Generate="' + genVal + '" →', getCol(row, COL.appName) || '(no name)');
      skippedGenerate++;
      continue;  // completely ignored — not added to state either
    }

    // ── FILTER 2: Key must exist ──────────────────────────────────────────────
    const key = makeKey(row);
    if (!key) {
      console.log('[SKIP] No key for row:', JSON.stringify(row));
      skippedIncomplete++;
      continue;
    }

    // ── FILTER 3: Required fields ─────────────────────────────────────────────
    const missing = [];
    if (!getCol(row, COL.appName))     missing.push('App Name');
    if (!getCol(row, COL.packageName)) missing.push('Package Name');
    if (!getCol(row, COL.id))          missing.push('ID');
    if (missing.length > 0) {
      console.log('[SKIP] Missing fields:', missing.join(', '));
      skippedIncomplete++;
      continue;
    }

    // ── Eligible row — compare with previous ──────────────────────────────────
    const current = {
      key,
      appName:     getCol(row, COL.appName),
      packageName: getCol(row, COL.packageName),
      version:     getCol(row, COL.version),
      startDate:   getCol(row, COL.startDate),
      id:          getCol(row, COL.id),
    };

    if (!previousData[key]) {
      newApps.push(current);
      console.log('[NEW]', current.appName, '|', current.packageName, '| ID:', current.id);
    } else {
      const prev = previousData[key];
      if (prev.version !== current.version || prev.startDate !== current.startDate) {
        changedApps.push({ previous: prev, current });
        console.log('[CHANGED]', current.appName);
      } else {
        console.log('[SAME]', current.appName);
      }
    }
  }

  console.log('[FILTER] Skipped (Generate != yes):', skippedGenerate);
  console.log('[FILTER] Skipped (Incomplete):', skippedIncomplete);
  return { newApps, changedApps };
}

// ─── MAIN ────────────────────────────────────────────────────────────────────
async function main() {
  console.log('=== WAT generate.js ===');
  console.log('[TIME]', new Date().toISOString());
  ensureOutputDir();

  let previousData = {};
  if (fs.existsSync(PREV_FILE)) {
    try {
      previousData = JSON.parse(fs.readFileSync(PREV_FILE, 'utf8'));
      console.log('[STATE] Loaded', Object.keys(previousData).length, 'entries');
      console.log('[STATE] Keys:', Object.keys(previousData).slice(0,5).join(', '));
    } catch(e) {
      console.warn('[WARN] Bad previous_orders.json, starting fresh:', e.message);
    }
  } else {
    console.log('[STATE] No previous_orders.json — first run');
  }

  if (!CSV_URL) { console.error('[ERROR] SHEETS_CSV_URL not set'); process.exit(1); }

  let rawCSV;
  try {
    rawCSV = await downloadCSV(CSV_URL);
    console.log('[HTTP] Downloaded', rawCSV.length, 'bytes');
  } catch(e) {
    console.error('[ERROR] Download failed:', e.message);
    process.exit(1);
  }

  if (!rawCSV.trim()) {
    console.warn('[WARN] CSV empty');
    fs.writeFileSync(REPORT_FILE, JSON.stringify({ newApps:[], changedApps:[], date: new Date().toISOString() }, null, 2));
    process.exit(0);
  }

  const rows = parseCSV(rawCSV);
  if (rows.length === 0) {
    fs.writeFileSync(REPORT_FILE, JSON.stringify({ newApps:[], changedApps:[], date: new Date().toISOString() }, null, 2));
    process.exit(0);
  }

  const { newApps, changedApps } = compareWithPrevious(rows, previousData);
  console.log('[RESULT] New:', newApps.length, '| Changed:', changedApps.length);

  // Save report — only eligible (Generate=yes) apps appear here
  fs.writeFileSync(REPORT_FILE, JSON.stringify({
    date: new Date().toISOString(),
    newApps,
    changedApps,
    totalRows: rows.length,
  }, null, 2));
  console.log('[FILE] report.json saved');

  // Save state — only eligible apps saved (ignored rows never enter state)
  const newPrev = {};
  for (const row of rows) {
    if (!shouldGenerate(row)) continue;  // ignored rows never saved to state
    const key = makeKey(row);
    if (!key) continue;
    if (!getCol(row, COL.appName) || !getCol(row, COL.packageName) || !getCol(row, COL.id)) continue;
    newPrev[key] = {
      key,
      appName:     getCol(row, COL.appName),
      packageName: getCol(row, COL.packageName),
      version:     getCol(row, COL.version),
      startDate:   getCol(row, COL.startDate),
      id:          getCol(row, COL.id),
    };
  }
  fs.writeFileSync(PREV_FILE, JSON.stringify(newPrev, null, 2));
  console.log('[FILE] previous_orders.json updated —', Object.keys(newPrev).length, 'eligible entries saved');
  console.log('=== generate.js DONE ===');
}

main().catch(e => { console.error('[FATAL]', e); process.exit(1); });
