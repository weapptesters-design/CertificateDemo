/**
 * create-cert.js — We App Testers
 * HTML cert → PDF via system Chromium (playwright) → Telegram
 */

const fs    = require('fs');
const path  = require('path');
const https = require('https');
const { execSync } = require('child_process');

const OUTPUT_DIR  = path.join(__dirname, 'output');
const REPORT_FILE = path.join(OUTPUT_DIR, 'report.json');
const BOT_TOKEN   = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID     = process.env.TELEGRAM_CHAT_ID;

// ─── UTILS ───────────────────────────────────────────────────────────────────
function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (!isNaN(d)) return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
  return dateStr;
}

function addDays(dateStr, days) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d)) return '';
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

function makeRefNumber(app, idx) {
  const prefix = app.prefix || 'WAT';
  const id     = app.id     || String(idx + 1).padStart(3, '0');
  const year   = new Date().getFullYear();
  return `${prefix}-${id}-${year}`;
}

function todayStr() {
  return new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
}

// ─── CERTIFICATE HTML ─────────────────────────────────────────────────────────
function generateCertHTML(app, idx) {
  const refNumber  = makeRefNumber(app, idx);
  const startDate  = app.startDate || new Date().toISOString().split('T')[0];
  const endDate    = addDays(startDate, 14);
  const periodStr  = `${formatDate(startDate)} – ${formatDate(endDate)}`;
  const issuedDate = todayStr();
  const appName    = app.appName     || 'Unknown App';
  const pkgName    = app.packageName || '—';
  const version    = app.version     || '1.0.0';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Certificate</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Caveat:wght@600;700&family=Montserrat:wght@400;500;600;700;800&family=DM+Sans:wght@300;400;500&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body { width: 1123px; height: 794px; overflow: hidden; background: #1B5E20; font-family: 'DM Sans', sans-serif; }
    .cert-page {
      width: 1123px; height: 794px; background: #fff;
      border: 12px solid #1B5E20; border-radius: 6px;
      padding: 32px 36px 24px;
      display: flex; flex-direction: column;
    }
    .cert-row { display: flex; border-bottom: 1px solid #dcdcdc; padding: 7px 15px; }
    .cert-row:last-child { border-bottom: none; }
    .cert-label { width: 35%; font-weight: bold; color: #1a1a1a; font-size: 13.5px; }
    .cert-value { width: 65%; color: #444; font-size: 13.5px; word-break: break-word; }
  </style>
</head>
<body>
<div class="cert-page">

  <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:15px;flex-shrink:0;">
    <div>
      <div style="font-family:'Montserrat',sans-serif;font-size:28px;font-weight:800;color:#1a1464;letter-spacing:1px;">
        WE <span style="color:#4CAF50;">APP</span> TESTERS
      </div>
      <div style="font-size:14px;color:#707070;font-weight:600;">Android Testing Experts</div>
    </div>
    <div style="text-align:right;color:#333;font-size:14px;margin-top:5px;">
      <div style="font-weight:600;margin-bottom:3px;">Testing Reference: <strong>${refNumber}</strong></div>
      <div style="font-weight:600;">Issue Date: ${issuedDate}</div>
    </div>
  </div>

  <div style="height:1.5px;background:#dcdcdc;margin-bottom:12px;flex-shrink:0;"></div>

  <div style="text-align:center;margin-bottom:12px;flex-shrink:0;">
    <div style="font-family:'Montserrat',sans-serif;font-size:28px;font-weight:800;color:#1a1a1a;">APP TESTING COMPLETION CERTIFICATE</div>
    <div style="font-size:14px;color:#666;font-weight:600;letter-spacing:1px;margin-top:4px;">CERTIFICATE OF TESTING</div>
    <div style="width:100px;height:3px;background:#C9A84C;margin:10px auto 0;"></div>
  </div>

  <p style="font-size:13px;color:#444;line-height:1.5;margin-bottom:12px;text-align:justify;flex-shrink:0;">
    This is to certify that the Android application listed below has successfully completed a structured testing process conducted by We App Testers.
  </p>

  <div style="width:100%;border:1px solid #dcdcdc;border-radius:8px;overflow:hidden;margin-bottom:15px;flex-shrink:0;">
    <div class="cert-row" style="background:#E8F0E6;"><div class="cert-label">App Name:</div><div class="cert-value" style="font-weight:bold;color:#1a1a1a;">${appName}</div></div>
    <div class="cert-row" style="background:#F5F8F4;"><div class="cert-label">Package Name:</div><div class="cert-value">${pkgName}</div></div>
    <div class="cert-row" style="background:#E8F0E6;"><div class="cert-label">Version Tested:</div><div class="cert-value">${version}</div></div>
    <div class="cert-row" style="background:#F5F8F4;"><div class="cert-label">Testing Type:</div><div class="cert-value" style="font-style:italic;font-weight:600;">Closed Testing</div></div>
    <div class="cert-row" style="background:#E8F0E6;"><div class="cert-label">Number of Testers:</div><div class="cert-value">12+ Testers</div></div>
    <div class="cert-row" style="background:#F5F8F4;"><div class="cert-label">Testing Period:</div><div class="cert-value">${periodStr}</div></div>
  </div>

  <p style="font-size:13.5px;color:#555;line-height:1.5;text-align:justify;flex-shrink:0;">
    During the testing period, the application was installed and used by multiple testers across different Android devices. Testers evaluated installation flow, basic functionality, usability, and overall app performance while providing feedback during the testing period.
  </p>

  <div style="flex-grow:1;min-height:15px;"></div>

  <div style="position:relative;width:100%;flex-shrink:0;padding-bottom:5px;">
    <div style="display:flex;justify-content:space-between;align-items:flex-end;padding-right:20px;">
      <div style="display:flex;flex-direction:column;gap:3px;">
        <div style="font-weight:800;font-size:14.5px;color:#333;text-transform:uppercase;letter-spacing:0.5px;">Issued By:</div>
        <div style="font-family:'Montserrat',sans-serif;font-weight:900;font-size:22px;color:#1a1464;letter-spacing:1px;text-transform:uppercase;">
          WE <span style="color:#4CAF50;">APP</span> TESTERS
        </div>
        <div style="font-size:13px;color:#666;font-weight:600;">Android App Testing Service</div>
        <div style="font-size:14.5px;color:#444;font-weight:600;margin-top:6px;">📞 +91 91220 61839</div>
        <div style="font-size:14.5px;color:#1565c0;font-weight:700;margin-top:3px;">🌐 WeAppTesters.com</div>
      </div>
      <div style="text-align:center;">
        <div style="font-family:'Caveat',cursive;font-weight:700;font-size:38px;color:#1a1464;line-height:1;padding-bottom:5px;">Kumkum Rani</div>
        <div style="width:180px;height:1.5px;background:#666;margin:0 auto 6px;"></div>
        <div style="font-size:13px;color:#1a1a1a;font-weight:600;text-transform:uppercase;letter-spacing:1px;">Testing Manager</div>
      </div>
    </div>
  </div>

  <div style="margin-top:12px;font-size:13px;color:#444;line-height:1.6;border-top:1px solid #e0e0e0;flex-shrink:0;display:flex;align-items:flex-start;gap:8px;background:rgba(0,0,0,0.02);padding:12px 16px;border-radius:6px;">
    <div style="font-weight:800;font-size:13px;color:#1a1464;white-space:nowrap;">DISCLAIMER:</div>
    <div>This certificate confirms ONLY that the specified application version was tested during the stated period by <strong>We App Testers</strong>. Any subsequent updates, modifications, or newly released versions fall outside the scope of this evaluation.</div>
  </div>

</div>
</body>
</html>`;
}

// ─── PDF via system Chrome ────────────────────────────────────────────────────
async function generatePDF(html, pdfPath, htmlPath) {
  // Write HTML to temp file
  fs.writeFileSync(htmlPath, html, 'utf8');
  console.log(`[HTML] Saved: ${htmlPath}`);

  // Find Chrome/Chromium binary
  const chromePaths = [
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium',
    '/snap/bin/chromium',
  ];

  let chrome = null;
  for (const p of chromePaths) {
    try {
      execSync(`test -f ${p}`, { stdio: 'ignore' });
      chrome = p;
      break;
    } catch (_) {}
  }

  if (!chrome) {
    // Try which
    try { chrome = execSync('which google-chrome || which chromium-browser || which chromium', { encoding: 'utf8' }).trim(); } catch (_) {}
  }

  if (!chrome) throw new Error('Chrome/Chromium not found on system');
  console.log(`[PDF] Using Chrome: ${chrome}`);

  const cmd = [
    chrome,
    '--headless=new',
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-gpu',
    '--run-all-compositor-stages-before-draw',
    '--virtual-time-budget=5000',
    `--print-to-pdf="${pdfPath}"`,
    '--print-to-pdf-no-header',
    '--no-pdf-header-footer',
    `"file://${htmlPath}"`,
  ].join(' ');

  console.log(`[PDF] Running Chrome headless...`);
  execSync(cmd, { timeout: 30000, stdio: 'pipe' });

  if (!fs.existsSync(pdfPath)) throw new Error('PDF not created by Chrome');
  const size = fs.statSync(pdfPath).size;
  console.log(`[PDF] Created: ${pdfPath} (${size} bytes)`);
  return fs.readFileSync(pdfPath);
}

// ─── TELEGRAM ─────────────────────────────────────────────────────────────────
function telegramRequest(method, params, fileBuffer = null, fileName = null) {
  return new Promise((resolve, reject) => {
    const url     = `https://api.telegram.org/bot${BOT_TOKEN}/${method}`;
    let body, contentType;

    if (fileBuffer) {
      const boundary = '----WAT' + Date.now();
      const parts = [];
      for (const [key, value] of Object.entries(params)) {
        parts.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${key}"\r\n\r\n${value}\r\n`));
      }
      parts.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="document"; filename="${fileName}"\r\nContent-Type: application/pdf\r\n\r\n`));
      parts.push(fileBuffer);
      parts.push(Buffer.from(`\r\n--${boundary}--\r\n`));
      body = Buffer.concat(parts);
      contentType = `multipart/form-data; boundary=${boundary}`;
    } else {
      body = JSON.stringify(params);
      contentType = 'application/json';
    }

    const urlObj = new URL(url);
    const req = https.request({
      hostname: urlObj.hostname,
      path:     urlObj.pathname,
      method:   'POST',
      headers:  { 'Content-Type': contentType, 'Content-Length': body.length },
    }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          parsed.ok ? resolve(parsed) : reject(new Error(parsed.description));
        } catch (e) { reject(new Error('Bad response: ' + data.slice(0, 200))); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function telegramSend(method, params, fileBuffer = null, fileName = null, retries = 3) {
  for (let i = 1; i <= retries; i++) {
    try {
      const r = await telegramRequest(method, params, fileBuffer, fileName);
      console.log(`[TG] ${method} OK`);
      return r;
    } catch (e) {
      console.error(`[TG] attempt ${i} failed: ${e.message}`);
      if (i === retries) throw e;
      await new Promise(r => setTimeout(r, 2000 * i));
    }
  }
}

// ─── MAIN ────────────────────────────────────────────────────────────────────
async function main() {
  console.log('=== WAT create-cert.js ===');
  console.log(`[TIME] ${new Date().toISOString()}`);

  if (!BOT_TOKEN || !CHAT_ID) { console.error('[ERROR] Telegram secrets missing'); process.exit(1); }
  if (!fs.existsSync(REPORT_FILE)) { console.error('[ERROR] report.json not found'); process.exit(1); }

  const report     = JSON.parse(fs.readFileSync(REPORT_FILE, 'utf8'));
  const newApps = report.newApps || [];
  const changedApps = report.changedApps || [];
  const reportDate = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });

  console.log(`[REPORT] New: ${newApps.length} | Changed: ${changedApps.length}`);

  // CASE B: No new apps
  if (!newApps || newApps.length === 0) {
    await telegramSend('sendMessage', {
      chat_id: CHAT_ID,
      text: `🚀 Certificate Report\n📅 Date: ${reportDate}\n\n❌ No new apps today\nAll systems are up to date.`,
    });
    console.log('[DONE] No new apps.');
    return;
  }

  // CASE A: New apps
  const appList = newApps.map((a, i) => `  ${i + 1}. ${a.appName} (${a.packageName})`).join('\n');
  await telegramSend('sendMessage', {
    chat_id: CHAT_ID,
    text: `🚀 Certificate Report\n📅 Date: ${reportDate}\n\n✅ ${newApps.length} new app(s) found!\n\n${appList}\n\n📄 Generating PDFs...`,
  });

  let ok = 0, fail = 0;

  for (let i = 0; i < newApps.length; i++) {
    const app       = newApps[i];
    const refNumber = makeRefNumber(app, i);
    const safeName  = (app.appName || 'app').replace(/[^a-zA-Z0-9_-]/g, '_');
    const pdfName   = `${refNumber}_Certificate_${safeName}.pdf`;
    const pdfPath   = path.join(OUTPUT_DIR, pdfName);
    const htmlPath  = path.join(OUTPUT_DIR, `_temp_${safeName}.html`);

    console.log(`\n[${i+1}/${newApps.length}] ${app.appName}`);

    try {
      const html      = generateCertHTML(app, i);
      const pdfBuffer = await generatePDF(html, pdfPath, htmlPath);

      // Cleanup temp html
      try { fs.unlinkSync(htmlPath); } catch (_) {}

      const caption = `📄 ${app.appName}\n🔖 Ref: ${refNumber}\n📦 ${app.packageName}`;
      await telegramSend('sendDocument', { chat_id: CHAT_ID, caption }, pdfBuffer, pdfName);

      ok++;
      if (i < newApps.length - 1) await new Promise(r => setTimeout(r, 800));
    } catch (e) {
      console.error(`[ERROR] ${e.message}`);
      fail++;
    }
  }

  await telegramSend('sendMessage', {
    chat_id: CHAT_ID,
    text: `✅ Done!\n\n📊 PDFs sent: ${ok}/${newApps.length}${fail > 0 ? `\n⚠️ Failed: ${fail}` : ''}`,
  });

  console.log(`=== DONE | OK: ${ok} | Failed: ${fail} ===`);
}

main().catch(e => {
  console.error('[FATAL]', e.message);
  if (BOT_TOKEN && CHAT_ID) {
    telegramRequest('sendMessage', {
      chat_id: CHAT_ID,
      text: `❌ WAT Error\n${e.message}`,
    }).catch(() => {});
  }
  process.exit(1);
});
