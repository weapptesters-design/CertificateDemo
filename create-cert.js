/**
 * create-cert.js — We App Testers
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
  if (!dateStr) return '--';
  const d = new Date(dateStr);
  if (!isNaN(d)) return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
  return String(dateStr);
}

function addDays(dateStr, days) {
  const d = new Date(dateStr);
  if (isNaN(d)) return '';
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

function makeRefNumber(app, idx) {
  const prefix = String(app.prefix || 'WAT');
  const id     = String(app.id || String(idx + 1).padStart(3, '0'));
  const year   = new Date().getFullYear();
  return prefix + '-' + id + '-' + year;
}

function todayFormatted() {
  return new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
}

// ─── TELEGRAM ─────────────────────────────────────────────────────────────────
function tgPost(method, jsonBody) {
  return new Promise((resolve, reject) => {
    const bodyBuf = Buffer.from(JSON.stringify(jsonBody), 'utf8');
    const req = https.request({
      hostname: 'api.telegram.org',
      path:     '/bot' + BOT_TOKEN + '/' + method,
      method:   'POST',
      headers: {
        'Content-Type':   'application/json; charset=utf-8',
        'Content-Length': bodyBuf.length,
      },
    }, res => {
      let raw = '';
      res.on('data', c => raw += c);
      res.on('end', () => {
        console.log('[TG]', method, res.statusCode, raw.slice(0, 200));
        try {
          const p = JSON.parse(raw);
          p.ok ? resolve(p) : reject(new Error(p.description || 'TG error'));
        } catch(e) { reject(new Error('Parse error: ' + raw.slice(0,100))); }
      });
    });
    req.on('error', reject);
    req.write(bodyBuf);
    req.end();
  });
}

function tgSendFile(chatId, caption, fileBuffer, fileName) {
  return new Promise((resolve, reject) => {
    const boundary = 'WAT' + Date.now();
    const parts = [];

    // chat_id
    parts.push(Buffer.from(
      '--' + boundary + '\r\n' +
      'Content-Disposition: form-data; name="chat_id"\r\n\r\n' +
      String(chatId) + '\r\n'
    ));
    // caption
    parts.push(Buffer.from(
      '--' + boundary + '\r\n' +
      'Content-Disposition: form-data; name="caption"\r\n\r\n' +
      String(caption) + '\r\n'
    ));
    // file
    parts.push(Buffer.from(
      '--' + boundary + '\r\n' +
      'Content-Disposition: form-data; name="document"; filename="' + fileName + '"\r\n' +
      'Content-Type: application/pdf\r\n\r\n'
    ));
    parts.push(fileBuffer);
    parts.push(Buffer.from('\r\n--' + boundary + '--\r\n'));

    const body = Buffer.concat(parts);
    const req = https.request({
      hostname: 'api.telegram.org',
      path:     '/bot' + BOT_TOKEN + '/sendDocument',
      method:   'POST',
      headers: {
        'Content-Type':   'multipart/form-data; boundary=' + boundary,
        'Content-Length': body.length,
      },
    }, res => {
      let raw = '';
      res.on('data', c => raw += c);
      res.on('end', () => {
        console.log('[TG] sendDocument', res.statusCode, raw.slice(0, 200));
        try {
          const p = JSON.parse(raw);
          p.ok ? resolve(p) : reject(new Error(p.description || 'TG error'));
        } catch(e) { reject(new Error('Parse error: ' + raw.slice(0,100))); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function tgSend(chatId, text) {
  return tgPost('sendMessage', { chat_id: chatId, text: text });
}

// ─── CERTIFICATE HTML ─────────────────────────────────────────────────────────
function makeCertHTML(app, idx) {
  const ref        = makeRefNumber(app, idx);
  const start      = app.startDate || new Date().toISOString().split('T')[0];
  const end        = addDays(start, 14);
  const period     = formatDate(start) + ' - ' + formatDate(end);
  const issued     = todayFormatted();
  const appName    = String(app.appName    || 'Unknown App');
  const pkg        = String(app.packageName|| '--');
  const ver        = String(app.version    || '1.0.0');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Certificate</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=Caveat:wght@700&family=Montserrat:wght@400;600;700;800&family=DM+Sans:wght@400;500&display=swap');
*{box-sizing:border-box;margin:0;padding:0}
html,body{width:1123px;height:794px;overflow:hidden;background:#1B5E20;font-family:'DM Sans',sans-serif}
.page{width:1123px;height:794px;background:#fff;border:12px solid #1B5E20;border-radius:6px;padding:30px 36px 22px;display:flex;flex-direction:column}
.row{display:flex;border-bottom:1px solid #dcdcdc;padding:7px 15px}
.row:last-child{border-bottom:none}
.lbl{width:35%;font-weight:700;color:#1a1a1a;font-size:13px}
.val{width:65%;color:#444;font-size:13px;word-break:break-word}
</style>
</head>
<body>
<div class="page">
  <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:14px;flex-shrink:0">
    <div>
      <div style="font-family:Montserrat,sans-serif;font-size:26px;font-weight:800;color:#1a1464">WE <span style="color:#4CAF50">APP</span> TESTERS</div>
      <div style="font-size:13px;color:#707070;font-weight:600">Android Testing Experts</div>
    </div>
    <div style="text-align:right;color:#333;font-size:13px;margin-top:4px">
      <div style="font-weight:600;margin-bottom:3px">Testing Reference: <strong>${ref}</strong></div>
      <div style="font-weight:600">Issue Date: ${issued}</div>
    </div>
  </div>

  <div style="height:1.5px;background:#dcdcdc;margin-bottom:11px;flex-shrink:0"></div>

  <div style="text-align:center;margin-bottom:11px;flex-shrink:0">
    <div style="font-family:Montserrat,sans-serif;font-size:26px;font-weight:800;color:#1a1a1a">APP TESTING COMPLETION CERTIFICATE</div>
    <div style="font-size:13px;color:#666;font-weight:600;letter-spacing:1px;margin-top:4px">CERTIFICATE OF TESTING</div>
    <div style="width:100px;height:3px;background:#C9A84C;margin:8px auto 0"></div>
  </div>

  <p style="font-size:12.5px;color:#444;line-height:1.5;margin-bottom:11px;text-align:justify;flex-shrink:0">
    This is to certify that the Android application listed below has successfully completed a structured testing process conducted by We App Testers.
  </p>

  <div style="width:100%;border:1px solid #dcdcdc;border-radius:8px;overflow:hidden;margin-bottom:13px;flex-shrink:0">
    <div class="row" style="background:#E8F0E6"><div class="lbl">App Name:</div><div class="val" style="font-weight:700;color:#1a1a1a">${appName}</div></div>
    <div class="row" style="background:#F5F8F4"><div class="lbl">Package Name:</div><div class="val">${pkg}</div></div>
    <div class="row" style="background:#E8F0E6"><div class="lbl">Version Tested:</div><div class="val">${ver}</div></div>
    <div class="row" style="background:#F5F8F4"><div class="lbl">Testing Type:</div><div class="val" style="font-style:italic;font-weight:600">Closed Testing</div></div>
    <div class="row" style="background:#E8F0E6"><div class="lbl">Number of Testers:</div><div class="val">12+ Testers</div></div>
    <div class="row" style="background:#F5F8F4"><div class="lbl">Testing Period:</div><div class="val">${period}</div></div>
  </div>

  <p style="font-size:13px;color:#555;line-height:1.5;text-align:justify;flex-shrink:0">
    During the testing period, the application was installed and used by multiple testers across different Android devices. Testers evaluated installation flow, basic functionality, usability, and overall app performance while providing feedback.
  </p>

  <div style="flex-grow:1;min-height:10px"></div>

  <div style="flex-shrink:0;padding-bottom:4px">
    <div style="display:flex;justify-content:space-between;align-items:flex-end;padding-right:20px">
      <div style="display:flex;flex-direction:column;gap:2px">
        <div style="font-weight:800;font-size:13px;color:#333;text-transform:uppercase">Issued By:</div>
        <div style="font-family:Montserrat,sans-serif;font-weight:900;font-size:20px;color:#1a1464;text-transform:uppercase">WE <span style="color:#4CAF50">APP</span> TESTERS</div>
        <div style="font-size:12px;color:#666;font-weight:600">Android App Testing Service</div>
        <div style="font-size:13px;color:#444;font-weight:600;margin-top:4px">+91 91220 61839</div>
        <div style="font-size:13px;color:#1565c0;font-weight:700;margin-top:2px">WeAppTesters.com</div>
      </div>
      <div style="text-align:center">
        <div style="font-family:'Caveat',cursive;font-weight:700;font-size:36px;color:#1a1464;line-height:1;padding-bottom:4px">Kumkum Rani</div>
        <div style="width:180px;height:1.5px;background:#666;margin:0 auto 5px"></div>
        <div style="font-size:12px;color:#1a1a1a;font-weight:600;text-transform:uppercase;letter-spacing:1px">Testing Manager</div>
      </div>
    </div>
  </div>

  <div style="margin-top:10px;font-size:12px;color:#444;line-height:1.5;border-top:1px solid #e0e0e0;flex-shrink:0;display:flex;gap:8px;background:rgba(0,0,0,0.02);padding:10px 14px;border-radius:6px">
    <div style="font-weight:800;font-size:12px;color:#1a1464;white-space:nowrap">DISCLAIMER:</div>
    <div>This certificate confirms ONLY that the specified application version was tested during the stated period by <strong>We App Testers</strong>. Any subsequent updates or newly released versions fall outside the scope of this evaluation.</div>
  </div>
</div>
</body>
</html>`;
}

// ─── PDF via Chrome ───────────────────────────────────────────────────────────
async function makePDF(html, pdfPath, htmlPath) {
  fs.writeFileSync(htmlPath, html, 'utf8');

  const candidates = [
    '/usr/bin/google-chrome-stable',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium',
  ];

  let chrome = null;
  for (const c of candidates) {
    if (fs.existsSync(c)) { chrome = c; break; }
  }
  if (!chrome) {
    try { chrome = execSync('which google-chrome-stable || which google-chrome || which chromium', { encoding: 'utf8' }).trim().split('\n')[0]; } catch(_){}
  }
  if (!chrome) throw new Error('Chrome not found');
  console.log('[PDF] Chrome:', chrome);

  execSync(
    chrome +
    ' --headless=new --no-sandbox --disable-setuid-sandbox' +
    ' --disable-dev-shm-usage --disable-gpu' +
    ' --virtual-time-budget=5000' +
    ' --print-to-pdf=' + pdfPath +
    ' --print-to-pdf-no-header' +
    ' file://' + htmlPath,
    { timeout: 30000, stdio: 'pipe' }
  );

  if (!fs.existsSync(pdfPath)) throw new Error('PDF file not created');
  console.log('[PDF] Done:', pdfPath, fs.statSync(pdfPath).size, 'bytes');
  try { fs.unlinkSync(htmlPath); } catch(_){}
  return fs.readFileSync(pdfPath);
}

// ─── MAIN ────────────────────────────────────────────────────────────────────
async function main() {
  console.log('=== WAT create-cert.js ===');
  console.log('[TIME]', new Date().toISOString());
  console.log('[ENV] BOT_TOKEN set:', !!BOT_TOKEN, '| CHAT_ID:', CHAT_ID);

  if (!BOT_TOKEN || !CHAT_ID) { console.error('Missing Telegram secrets'); process.exit(1); }
  if (!fs.existsSync(REPORT_FILE)) { console.error('report.json missing'); process.exit(1); }

  const report      = JSON.parse(fs.readFileSync(REPORT_FILE, 'utf8'));
  const newApps     = Array.isArray(report.newApps) ? report.newApps : [];
  const changedApps = Array.isArray(report.changedApps) ? report.changedApps : [];
  const today       = todayFormatted();

  console.log('[REPORT] New:', newApps.length, '| Changed:', changedApps.length);

  if (newApps.length === 0) {
    const msg = 'Certificate Report\nDate: ' + today + '\n\nNo new apps today. All systems up to date.';
    console.log('[MSG]', JSON.stringify(msg));
    await tgSend(CHAT_ID, msg);
    console.log('[DONE] No new apps.');
    return;
  }

  const appList = newApps.map((a, i) => (i+1) + '. ' + a.appName + ' (' + a.packageName + ')').join('\n');
  const msg = 'Certificate Report\nDate: ' + today + '\n\n' + newApps.length + ' new app(s) found!\n\n' + appList + '\n\nGenerating PDFs...';
  console.log('[MSG]', JSON.stringify(msg));
  await tgSend(CHAT_ID, msg);

  let ok = 0, fail = 0;
  for (let i = 0; i < newApps.length; i++) {
    const app  = newApps[i];
    const ref  = makeRefNumber(app, i);
    const safe = (app.appName || 'app').replace(/[^a-zA-Z0-9_-]/g, '_');
    const pdfName  = ref + '_Certificate_' + safe + '.pdf';
    const pdfPath  = path.join(OUTPUT_DIR, pdfName);
    const htmlPath = path.join(OUTPUT_DIR, '_tmp_' + safe + '.html');

    console.log('\n[' + (i+1) + '/' + newApps.length + ']', app.appName);

    try {
      const html   = makeCertHTML(app, i);
      const pdfBuf = await makePDF(html, pdfPath, htmlPath);
      const caption = app.appName + '\nRef: ' + ref + '\nPkg: ' + app.packageName;
      await tgSendFile(CHAT_ID, caption, pdfBuf, pdfName);
      ok++;
      if (i < newApps.length - 1) await new Promise(r => setTimeout(r, 800));
    } catch(e) {
      console.error('[ERROR]', e.message);
      fail++;
    }
  }

  const doneMsg = 'Done!\nPDFs sent: ' + ok + '/' + newApps.length + (fail > 0 ? '\nFailed: ' + fail : '');
  await tgSend(CHAT_ID, doneMsg);
  console.log('=== DONE | OK:', ok, '| Failed:', fail, '===');
}

main().catch(e => {
  console.error('[FATAL]', e.message);
  if (BOT_TOKEN && CHAT_ID) {
    tgSend(CHAT_ID, 'WAT Error: ' + e.message).catch(()=>{});
  }
  process.exit(1);
});
