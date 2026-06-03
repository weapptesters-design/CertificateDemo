/**
 * create-cert.js
 * We App Testers — Automation Pipeline
 * Step 2: Read report.json → Generate PDF certs via Puppeteer → Send via Telegram
 */

const fs    = require('fs');
const path  = require('path');
const https = require('https');

// ─── CONFIG ───────────────────────────────────────────────────────────────────
const OUTPUT_DIR  = path.join(__dirname, 'output');
const REPORT_FILE = path.join(OUTPUT_DIR, 'report.json');
const BOT_TOKEN   = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID     = process.env.TELEGRAM_CHAT_ID;

// ─── UTILS ───────────────────────────────────────────────────────────────────
function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (!isNaN(d)) {
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
  }
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

// ─── CERTIFICATE HTML (exactly matching your manual tool output) ──────────────
function generateCertHTML(app, idx) {
  const refNumber  = makeRefNumber(app, idx);
  const startDate  = app.startDate || new Date().toISOString().split('T')[0];
  const endDate    = addDays(startDate, 14);
  const periodStr  = `${formatDate(startDate)} – ${formatDate(endDate)}`;
  const issuedDate = todayStr();
  const appName    = app.appName     || 'Unknown App';
  const pkgName    = app.packageName || '—';
  const version    = app.version     || '1.0.0';

  // 1123×794px = A4 landscape at 96dpi — exactly matching your html2canvas setup
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Certificate – ${appName}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Caveat:wght@600;700&family=Montserrat:wght@400;500;600;700;800&family=DM+Sans:wght@300;400;500&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body {
      width: 1123px;
      height: 794px;
      overflow: hidden;
      background: #1B5E20;
      font-family: 'DM Sans', sans-serif;
    }
    .cert-page {
      width: 1123px;
      height: 794px;
      background: #fff;
      border: 12px solid #1B5E20;
      border-radius: 6px;
      padding: 32px 36px 24px;
      display: flex;
      flex-direction: column;
      position: relative;
    }
    .cert-row {
      display: flex;
      border-bottom: 1px solid #dcdcdc;
      padding: 7px 15px;
    }
    .cert-row:last-child { border-bottom: none; }
    .cert-label {
      width: 35%; font-weight: bold; color: #1a1a1a;
      font-size: 13.5px; text-align: left;
    }
    .cert-value {
      width: 65%; color: #444; font-size: 13.5px;
      word-break: break-word; text-align: left;
    }
  </style>
</head>
<body>
<div class="cert-page">

  <!-- Header -->
  <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:15px;flex-shrink:0;">
    <div style="display:flex;align-items:center;gap:15px;">
      <div>
        <div style="font-family:'Montserrat',sans-serif;font-size:28px;font-weight:800;color:#1a1464;letter-spacing:1px;">
          WE <span style="color:#4CAF50;">APP</span> TESTERS
        </div>
        <div style="font-size:14px;color:#707070;font-weight:600;">Android Testing Experts</div>
      </div>
    </div>
    <div style="text-align:right;color:#333;font-size:14px;margin-top:5px;">
      <div style="font-weight:600;margin-bottom:3px;">Testing Reference: <strong>${refNumber}</strong></div>
      <div style="font-weight:600;">Issue Date: ${issuedDate}</div>
    </div>
  </div>

  <div style="height:1.5px;background:#dcdcdc;margin-bottom:12px;flex-shrink:0;"></div>

  <!-- Title -->
  <div style="text-align:center;margin-bottom:12px;flex-shrink:0;">
    <div style="font-family:'Montserrat',sans-serif;font-size:28px;font-weight:800;color:#1a1a1a;">
      APP TESTING COMPLETION CERTIFICATE
    </div>
    <div style="font-size:14px;color:#666;font-weight:600;letter-spacing:1px;margin-top:4px;">
      CERTIFICATE OF TESTING
    </div>
    <div style="width:100px;height:3px;background:#C9A84C;margin:10px auto 0;"></div>
  </div>

  <p style="font-size:13px;color:#444;line-height:1.5;margin-bottom:12px;text-align:justify;flex-shrink:0;">
    This is to certify that the Android application listed below has successfully completed a structured
    testing process conducted by We App Testers.
  </p>

  <!-- Data Table -->
  <div style="width:100%;border:1px solid #dcdcdc;border-radius:8px;overflow:hidden;margin-bottom:15px;flex-shrink:0;">
    <div class="cert-row" style="background:#E8F0E6;">
      <div class="cert-label">App Name:</div>
      <div class="cert-value" style="font-weight:bold;color:#1a1a1a;">${appName}</div>
    </div>
    <div class="cert-row" style="background:#F5F8F4;">
      <div class="cert-label">Package Name:</div>
      <div class="cert-value">${pkgName}</div>
    </div>
    <div class="cert-row" style="background:#E8F0E6;">
      <div class="cert-label">Version Tested:</div>
      <div class="cert-value">${version}</div>
    </div>
    <div class="cert-row" style="background:#F5F8F4;">
      <div class="cert-label">Testing Type:</div>
      <div class="cert-value" style="font-style:italic;font-weight:600;">Closed Testing</div>
    </div>
    <div class="cert-row" style="background:#E8F0E6;">
      <div class="cert-label">Number of Testers:</div>
      <div class="cert-value">12+ Testers</div>
    </div>
    <div class="cert-row" style="background:#F5F8F4;">
      <div class="cert-label">Testing Period:</div>
      <div class="cert-value">${periodStr}</div>
    </div>
  </div>

  <p style="font-size:13.5px;color:#555;line-height:1.5;text-align:justify;margin-bottom:0;flex-shrink:0;">
    During the testing period, the application was installed and used by multiple testers across different
    Android devices. Testers evaluated installation flow, basic functionality, usability, and overall app
    performance while providing feedback during the testing period.
  </p>

  <div style="flex-grow:1;min-height:15px;"></div>

  <!-- Footer -->
  <div style="position:relative;width:100%;display:flex;flex-direction:column;justify-content:flex-end;padding-bottom:5px;flex-shrink:0;">
    <div style="display:flex;justify-content:space-between;align-items:flex-end;padding-right:170px;">
      <div style="text-align:left;display:flex;flex-direction:column;gap:3px;">
        <div style="font-weight:800;font-size:14.5px;color:#333;margin-bottom:2px;text-transform:uppercase;letter-spacing:0.5px;">Issued By:</div>
        <div style="font-family:'Montserrat',sans-serif;font-weight:900;font-size:22px;color:#1a1464;letter-spacing:1px;line-height:1.1;text-transform:uppercase;">
          WE <span style="color:#4CAF50;">APP</span> TESTERS
        </div>
        <div style="font-size:13px;color:#666;font-weight:600;display:flex;align-items:center;gap:5px;">
          <div style="width:6px;height:6px;border-radius:50%;background:#4caf50;display:inline-block;"></div>
          Android App Testing Service
        </div>
        <div style="font-size:14.5px;color:#444;font-weight:600;margin-top:6px;">
          📞 +91 91220 61839
        </div>
        <div style="font-size:14.5px;color:#1565c0;font-weight:700;margin-top:3px;">
          🌐 WeAppTesters.com
        </div>
      </div>
      <div style="text-align:center;">
        <div style="font-family:'Caveat',cursive;font-weight:700;font-size:38px;color:#1a1464;margin-bottom:-10px;line-height:1;padding-bottom:5px;">
          Kumkum Rani
        </div>
        <div style="width:180px;height:1.5px;background:#666;margin-bottom:6px;margin-left:auto;margin-right:auto;"></div>
        <div style="font-size:13px;color:#1a1a1a;font-weight:600;text-transform:uppercase;letter-spacing:1px;">
          Testing Manager
        </div>
      </div>
    </div>
  </div>

  <!-- Disclaimer -->
  <div style="margin-top:16px;font-size:13.5px;color:#444;line-height:1.6;border-top:1px solid #e0e0e0;flex-shrink:0;display:flex;align-items:flex-start;gap:8px;background:rgba(0,0,0,0.02);padding:14px 16px;border-radius:6px;">
    <div style="font-weight:800;font-size:14px;color:#1a1464;letter-spacing:0.5px;white-space:nowrap;">DISCLAIMER:</div>
    <div style="flex:1;">
      This certificate confirms ONLY that the specified application version was tested during the stated
      period by <strong>We App Testers</strong>. Any subsequent updates, modifications, or newly released
      versions fall outside the scope of this evaluation.
    </div>
  </div>

</div>
</body>
</html>`;
}

// ─── PDF GENERATOR via Puppeteer ─────────────────────────────────────────────
async function generatePDF(html, outputPath) {
  const puppeteer = require('puppeteer');

  console.log('[PDF] Launching Puppeteer...');
  const browser = await puppeteer.launch({
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
    ],
  });

  try {
    const page = await browser.newPage();

    // Set viewport exactly matching certificate dimensions
    await page.setViewport({ width: 1123, height: 794, deviceScaleFactor: 2 });

    // Load HTML (wait for Google Fonts to load)
    await page.setContent(html, { waitUntil: 'networkidle0', timeout: 30000 });

    // Extra wait for fonts to render
    await page.waitForTimeout(1000);

    // Generate A4 landscape PDF — exact same as jsPDF output
    const pdfBuffer = await page.pdf({
      width:           '297mm',
      height:          '210mm',
      printBackground: true,
      margin:          { top: 0, right: 0, bottom: 0, left: 0 },
    });

    fs.writeFileSync(outputPath, pdfBuffer);
    console.log(`[PDF] Generated: ${outputPath} (${pdfBuffer.length} bytes)`);
    return pdfBuffer;
  } finally {
    await browser.close();
  }
}

// ─── TELEGRAM ─────────────────────────────────────────────────────────────────
function telegramRequest(method, params, fileBuffer = null, fileName = null) {
  return new Promise((resolve, reject) => {
    const url = `https://api.telegram.org/bot${BOT_TOKEN}/${method}`;

    let body, contentType;

    if (fileBuffer) {
      // Multipart for binary PDF
      const boundary = '----WATBoundary' + Date.now();
      const parts = [];

      for (const [key, value] of Object.entries(params)) {
        parts.push(Buffer.from(
          `--${boundary}\r\nContent-Disposition: form-data; name="${key}"\r\n\r\n${value}\r\n`
        ));
      }

      parts.push(Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="document"; filename="${fileName}"\r\nContent-Type: application/pdf\r\n\r\n`
      ));
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
      headers:  {
        'Content-Type':   contentType,
        'Content-Length': body.length,
      },
    }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (!parsed.ok) {
            console.error('[TELEGRAM] Error:', parsed.description);
            reject(new Error(parsed.description));
          } else {
            resolve(parsed);
          }
        } catch (e) {
          reject(new Error('Bad Telegram response: ' + data.slice(0, 200)));
        }
      });
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function telegramSend(method, params, fileBuffer = null, fileName = null, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const result = await telegramRequest(method, params, fileBuffer, fileName);
      console.log(`[TELEGRAM] ${method} OK (attempt ${attempt})`);
      return result;
    } catch (e) {
      console.error(`[TELEGRAM] attempt ${attempt} failed: ${e.message}`);
      if (attempt === retries) throw e;
      await new Promise(r => setTimeout(r, 2000 * attempt));
    }
  }
}

// ─── MAIN ────────────────────────────────────────────────────────────────────
async function main() {
  console.log('=== We App Testers — create-cert.js ===');
  console.log(`[TIME] ${new Date().toISOString()}`);

  if (!BOT_TOKEN || !CHAT_ID) {
    console.error('[ERROR] TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID not set!');
    process.exit(1);
  }

  if (!fs.existsSync(REPORT_FILE)) {
    console.error('[ERROR] report.json not found. Run generate.js first.');
    process.exit(1);
  }

  const report = JSON.parse(fs.readFileSync(REPORT_FILE, 'utf8'));
  const { newApps, changedApps, date } = report;
  const reportDate = new Date(date).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'long', year: 'numeric'
  });

  console.log(`[REPORT] New: ${newApps.length} | Changed: ${changedApps.length}`);

  // ── CASE B: No new apps ───────────────────────────────────────────────────
  if (!newApps || newApps.length === 0) {
    console.log('[CASE B] No new apps → sending status message only');
    await telegramSend('sendMessage', {
      chat_id:    CHAT_ID,
      text:       `🚀 *Certificate Report*\n📅 Date: ${reportDate}\n\n❌ *No new apps today*\nAll systems are up to date.`,
      parse_mode: 'Markdown',
    });
    console.log('[DONE] Status message sent. No files generated.');
    return;
  }

  // ── CASE A: New apps found ────────────────────────────────────────────────
  console.log(`[CASE A] ${newApps.length} new app(s) → generating PDF certificates`);

  const appList = newApps.map((a, i) => `  ${i + 1}. *${a.appName}* (${a.packageName})`).join('\n');
  await telegramSend('sendMessage', {
    chat_id:    CHAT_ID,
    text:       `🚀 *Certificate Report*\n📅 Date: ${reportDate}\n\n✅ *${newApps.length} new app(s) found!*\n\n${appList}\n\n📄 Generating PDFs...`,
    parse_mode: 'Markdown',
  });

  let successCount = 0;
  let failCount    = 0;

  for (let i = 0; i < newApps.length; i++) {
    const app       = newApps[i];
    const refNumber = makeRefNumber(app, i);
    const safeName  = (app.appName || 'app').replace(/[^a-zA-Z0-9_-]/g, '_');
    const pdfName   = `${refNumber}_Certificate_${safeName}.pdf`;
    const pdfPath   = path.join(OUTPUT_DIR, pdfName);

    console.log(`[CERT ${i + 1}/${newApps.length}] ${pdfName}`);

    try {
      // 1. Generate HTML
      const html = generateCertHTML(app, i);

      // 2. Convert to PDF via Puppeteer
      const pdfBuffer = await generatePDF(html, pdfPath);

      // 3. Send PDF to Telegram
      const caption = `📄 *${app.appName}*\n🔖 Ref: \`${refNumber}\`\n📦 Package: \`${app.packageName}\``;
      await telegramSend('sendDocument', {
        chat_id:    CHAT_ID,
        caption,
        parse_mode: 'Markdown',
      }, pdfBuffer, pdfName);

      console.log(`[OK] Sent: ${pdfName}`);
      successCount++;

      if (i < newApps.length - 1) await new Promise(r => setTimeout(r, 800));

    } catch (e) {
      console.error(`[ERROR] ${pdfName}: ${e.message}`);
      failCount++;
    }
  }

  await telegramSend('sendMessage', {
    chat_id:    CHAT_ID,
    text:       `✅ *Done!*\n\n📊 PDFs sent: ${successCount}/${newApps.length}${failCount > 0 ? `\n⚠️ Failed: ${failCount}` : ''}`,
    parse_mode: 'Markdown',
  });

  console.log(`=== DONE | Sent: ${successCount} | Failed: ${failCount} ===`);
}

main().catch(e => {
  console.error('[FATAL]', e);
  if (BOT_TOKEN && CHAT_ID) {
    telegramRequest('sendMessage', {
      chat_id:    CHAT_ID,
      text:       `❌ *WAT Error*\n\`\`\`\n${e.message}\n\`\`\``,
      parse_mode: 'Markdown',
    }).catch(() => {});
  }
  process.exit(1);
});
