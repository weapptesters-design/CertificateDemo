/**
 * create-cert.js
 * We App Testers — Automation Pipeline
 * Step 2: Read report.json → Generate HTML certs → Send via Telegram
 */

const fs   = require('fs');
const path = require('path');
const https = require('https');

// ─── CONFIG ───────────────────────────────────────────────────────────────────
const OUTPUT_DIR  = path.join(__dirname, 'output');
const REPORT_FILE = path.join(OUTPUT_DIR, 'report.json');
const BOT_TOKEN   = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID     = process.env.TELEGRAM_CHAT_ID;

// ─── UTILS ───────────────────────────────────────────────────────────────────
function formatDate(dateStr) {
  if (!dateStr) return '—';
  // Try to parse ISO or DD/MM/YYYY or MM/DD/YYYY
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

// ─── TELEGRAM ─────────────────────────────────────────────────────────────────
function telegramRequest(method, params, isFormData = false) {
  return new Promise((resolve, reject) => {
    const url = `https://api.telegram.org/bot${BOT_TOKEN}/${method}`;

    let body, contentType;
    if (isFormData && params.document) {
      // Multipart form data for file upload
      const boundary = '----WATBoundary' + Date.now();
      const parts = [];

      // Text fields
      for (const [key, value] of Object.entries(params)) {
        if (key === 'document') continue;
        parts.push(
          `--${boundary}\r\nContent-Disposition: form-data; name="${key}"\r\n\r\n${value}`
        );
      }

      // File field
      const file = params.document;
      parts.push(
        `--${boundary}\r\nContent-Disposition: form-data; name="document"; filename="${file.name}"\r\nContent-Type: text/html\r\n\r\n${file.content}`
      );

      body = Buffer.from(parts.join('\r\n') + `\r\n--${boundary}--\r\n`);
      contentType = `multipart/form-data; boundary=${boundary}`;
    } else {
      body = JSON.stringify(params);
      contentType = 'application/json';
    }

    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      path:     urlObj.pathname + urlObj.search,
      method:   'POST',
      headers:  {
        'Content-Type':   contentType,
        'Content-Length': Buffer.byteLength(body),
      },
    };

    const req = https.request(options, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (!parsed.ok) {
            console.error(`[TELEGRAM] API error:`, parsed);
            reject(new Error(parsed.description || 'Telegram API error'));
          } else {
            resolve(parsed);
          }
        } catch (e) {
          reject(new Error('Failed to parse Telegram response: ' + data));
        }
      });
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// Retry wrapper (3 attempts)
async function telegramSend(method, params, isFormData = false, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const result = await telegramRequest(method, params, isFormData);
      console.log(`[TELEGRAM] ${method} OK (attempt ${attempt})`);
      return result;
    } catch (e) {
      console.error(`[TELEGRAM] ${method} failed attempt ${attempt}: ${e.message}`);
      if (attempt === retries) throw e;
      await new Promise(r => setTimeout(r, 2000 * attempt)); // Backoff
    }
  }
}

// ─── CERTIFICATE HTML TEMPLATE ────────────────────────────────────────────────
function generateCertHTML(app, idx) {
  const refNumber  = makeRefNumber(app, idx);
  const startDate  = app.startDate || new Date().toISOString().split('T')[0];
  const endDate    = addDays(startDate, 14);
  const periodStr  = `${formatDate(startDate)} – ${formatDate(endDate)}`;
  const issuedDate = todayStr();
  const appName    = app.appName    || 'Unknown App';
  const pkgName    = app.packageName || '—';
  const version    = app.version    || '1.0.0';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Certificate – ${appName}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Caveat:wght@600;700&family=Montserrat:wght@400;500;600;700;800&family=DM+Sans:wght@300;400;500&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'DM Sans', sans-serif;
      background: #1B5E20;
      display: flex; align-items: center; justify-content: center;
      min-height: 100vh; padding: 20px;
    }
    .cert-page {
      width: 1123px; height: 794px;
      background: #fff;
      border: 12px solid #1B5E20;
      border-radius: 6px;
      padding: 32px 36px 24px;
      display: flex; flex-direction: column;
      position: relative;
      box-shadow: 0 20px 60px rgba(0,0,0,0.4);
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
        <!-- Left: Issued By -->
        <div style="text-align:left;display:flex;flex-direction:column;gap:3px;">
          <div style="font-weight:800;font-size:14.5px;color:#333;margin-bottom:2px;text-transform:uppercase;letter-spacing:0.5px;">
            Issued By:
          </div>
          <div style="font-family:'Montserrat',sans-serif;font-weight:900;font-size:22px;color:#1a1464;letter-spacing:1px;line-height:1.1;text-transform:uppercase;">
            WE <span style="color:#4CAF50;">APP</span> TESTERS
          </div>
          <div style="font-size:13px;color:#666;font-weight:600;display:flex;align-items:center;gap:5px;">
            <div style="width:6px;height:6px;border-radius:50%;background:#4caf50;"></div>
            Android App Testing Service
          </div>
          <div style="font-size:14.5px;color:#444;font-weight:600;margin-top:6px;display:flex;align-items:center;gap:8px;">
            📞 +91 91220 61839
          </div>
          <div style="font-size:14.5px;color:#1565c0;font-weight:700;margin-top:3px;display:flex;align-items:center;gap:8px;">
            🌐 WeAppTesters.com
          </div>
        </div>
        <!-- Signature -->
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
    <div style="margin-top:16px;font-size:13.5px;color:#444;text-align:left;line-height:1.6;border-top:1px solid #e0e0e0;padding-top:14px;flex-shrink:0;display:flex;align-items:flex-start;gap:8px;background:rgba(0,0,0,0.02);padding:14px 16px;border-radius:6px;">
      <div style="font-weight:800;font-size:14px;color:#1a1464;letter-spacing:0.5px;">DISCLAIMER:</div>
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

// ─── MAIN ────────────────────────────────────────────────────────────────────
async function main() {
  console.log('=== We App Testers — create-cert.js ===');
  console.log(`[TIME] ${new Date().toISOString()}`);

  if (!BOT_TOKEN || !CHAT_ID) {
    console.error('[ERROR] TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID not set!');
    process.exit(1);
  }

  // 1. Read report
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

    const msg = `🚀 *Certificate Report*\n📅 Date: ${reportDate}\n\n❌ *No new apps today*\nAll systems are up to date.`;
    await telegramSend('sendMessage', {
      chat_id:    CHAT_ID,
      text:       msg,
      parse_mode: 'Markdown',
    });

    console.log('[DONE] Status message sent. No files generated.');
    return;
  }

  // ── CASE A: New apps found ────────────────────────────────────────────────
  console.log(`[CASE A] ${newApps.length} new app(s) detected → generating certificates`);

  // Send summary message first
  const appList = newApps.map((a, i) => `  ${i + 1}. *${a.appName}* (${a.packageName})`).join('\n');
  const summaryMsg = `🚀 *Certificate Report*\n📅 Date: ${reportDate}\n\n✅ *${newApps.length} new app(s) found!*\n\n${appList}\n\n📄 Sending certificates now...`;

  await telegramSend('sendMessage', {
    chat_id:    CHAT_ID,
    text:       summaryMsg,
    parse_mode: 'Markdown',
  });

  // Generate and send each certificate
  let successCount = 0;
  let failCount    = 0;

  for (let i = 0; i < newApps.length; i++) {
    const app = newApps[i];
    const refNumber = makeRefNumber(app, i);
    const safeName  = (app.appName || 'app').replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename  = `${refNumber}_Certificate_${safeName}.html`;
    const filepath  = path.join(OUTPUT_DIR, filename);

    console.log(`[CERT ${i + 1}/${newApps.length}] Generating: ${filename}`);

    // Generate HTML
    const html = generateCertHTML(app, i);
    fs.writeFileSync(filepath, html);
    console.log(`[FILE] Created: ${filepath} (${html.length} bytes)`);

    // Send to Telegram
    try {
      const caption = `📄 *${app.appName}*\n🔖 Ref: \`${refNumber}\`\n📦 Package: \`${app.packageName}\``;

      await telegramSend('sendDocument', {
        chat_id:    CHAT_ID,
        caption,
        parse_mode: 'Markdown',
        document: {
          name:    filename,
          content: html,
        },
      }, true);

      console.log(`[TELEGRAM] Sent: ${filename}`);
      successCount++;

      // Small delay between files to avoid rate limiting
      if (i < newApps.length - 1) {
        await new Promise(r => setTimeout(r, 500));
      }
    } catch (e) {
      console.error(`[ERROR] Failed to send ${filename}: ${e.message}`);
      failCount++;
    }
  }

  // Final summary
  const finalMsg = `✅ *Done!*\n\n📊 Certificates sent: ${successCount}/${newApps.length}${failCount > 0 ? `\n⚠️ Failed: ${failCount}` : ''}`;
  await telegramSend('sendMessage', {
    chat_id:    CHAT_ID,
    text:       finalMsg,
    parse_mode: 'Markdown',
  });

  console.log(`=== create-cert.js DONE | Sent: ${successCount} | Failed: ${failCount} ===`);
}

main().catch(e => {
  console.error('[FATAL]', e);
  // Try to send error to Telegram
  if (BOT_TOKEN && CHAT_ID) {
    telegramRequest('sendMessage', {
      chat_id:    CHAT_ID,
      text:       `❌ *WAT Automation Error*\n\`\`\`\n${e.message}\n\`\`\``,
      parse_mode: 'Markdown',
    }).catch(() => {});
  }
  process.exit(1);
});
