const fs    = require('fs');
const path  = require('path');
const https = require('https');
const { execSync } = require('child_process');

const OUTPUT_DIR  = path.join(__dirname, 'output');
const REPORT_FILE = path.join(OUTPUT_DIR, 'report.json');
const BOT_TOKEN   = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID     = process.env.TELEGRAM_CHAT_ID;

// Image URLs from assets.js
const LOGO_URL = 'https://i.ibb.co/bM7b6WSn/Icon-comp.png';
const SEAL_URL = 'https://i.ibb.co/SXRYz54d/Badge-comp.png';

// ─── UTILS ───────────────────────────────────────────────────────────────────
const MONTHS = {
  'january':1,'february':2,'march':3,'april':4,'may':5,'june':6,
  'july':7,'august':8,'september':9,'october':10,'november':11,'december':12,
  'jan':1,'feb':2,'mar':3,'apr':4,'jun':6,'jul':7,'aug':8,
  'sep':9,'oct':10,'nov':11,'dec':12
};

// Parse '01 June 2026' or '2026-06-01' or any common format
function parseDate(dateStr) {
  if (!dateStr) return null;
  dateStr = String(dateStr).trim();
  
  // Try '01 June 2026' or '1 June 2026' format
  const parts = dateStr.split(/\s+/);
  if (parts.length === 3) {
    const day  = parseInt(parts[0]);
    const mon  = MONTHS[parts[1].toLowerCase()];
    const year = parseInt(parts[2]);
    if (day && mon && year) return new Date(year, mon-1, day);
  }
  
  // Try YYYY-MM-DD
  const iso = new Date(dateStr + 'T00:00:00');
  if (!isNaN(iso)) return iso;
  
  // Try any format
  const generic = new Date(dateStr);
  if (!isNaN(generic)) return generic;
  
  return null;
}

function formatDate(dateStr) {
  if (!dateStr) return '--';
  const d = parseDate(dateStr);
  if (d) return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
  return String(dateStr); // return as-is if can't parse
}

function addDays(dateStr, days) {
  const d = parseDate(dateStr);
  if (!d) return '';
  d.setDate(d.getDate() + days);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
}

function makeRefNumber(app) {
  // ID column already has full ref like WAT-01FA-2026
  return String(app.id || 'WAT-' + new Date().getFullYear()).trim();
}

function todayFormatted() {
  return new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
}

// ─── CERTIFICATE HTML (exact match to your manual tool) ──────────────────────
function makeCertHTML(app) {
  const ref    = makeRefNumber(app);
  const start  = app.startDate || new Date().toISOString().split('T')[0];
  const endFormatted = addDays(start, 14);
  const period = formatDate(start) + ' \u2013 ' + (endFormatted || '--');
  const issued = todayFormatted();
  const appName = String(app.appName     || 'Unknown App');
  const pkg     = String(app.packageName || '--');
  const ver     = String(app.version     || '--');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Certificate</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=Caveat:wght@600;700&family=Montserrat:wght@400;500;600;700;800&family=DM+Sans:wght@300;400;500&display=swap');
*{box-sizing:border-box;margin:0;padding:0}

@page {
  size: A4 landscape;
  margin: 0;
}

html,body{
  width:297mm;
  height:210mm;
  margin:0;
  padding:0;
  overflow:hidden;
  background:#1B5E20;
  font-family:'DM Sans',sans-serif;
}

#pdf-container{
  width:100%;
  height:100%;
  background:#FAFAF2;
  border:12px solid #1B5E20;
  border-radius:6px;
  padding:32px 36px 32px;
  display:flex;
  flex-direction:column;
  position:relative;
}
.cert-row{display:flex;border-bottom:1px solid #dcdcdc;padding:7px 15px}
.cert-row:last-child{border-bottom:none}
.cert-label{width:35%;font-weight:bold;color:#1a1a1a;font-size:13.5px;text-align:left}
.cert-value{width:65%;color:#444;font-size:13.5px;word-break:break-word;text-align:left}
</style>
</head>
<body>
<div id="pdf-container">

  <div style="position:absolute;inset:0;background:#1B5E20;">

    <div style="
      position:absolute;
      inset:14px;
      border:5px solid #C9A84C;
      border-radius:12px;
      pointer-events:none;">
    </div>

    <div style="
      position:absolute;
      inset:23px;
      border:2px solid #C9A84C;
      border-radius:8px;
      pointer-events:none;">
    </div>

    <div style="
      position:absolute;
     inset:36px;
    background:#FAFAF2;
      border-radius:6px;
      padding:34px 44px;
      display:flex;
      flex-direction:column;
      box-sizing:border-box;">

      <!-- Header -->
    
  <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:15px;flex-shrink:0;">
    <div style="display:flex;align-items:center;gap:15px;">
      <img src="${LOGO_URL}" style="width:70px;height:70px;object-fit:contain;">
      <div>
        <div style="font-family:'Montserrat',sans-serif;font-size:28px;font-weight:800;color:#1a1464;letter-spacing:1px;">WE <span style="color:#4CAF50;">APP</span> TESTERS</div>
        <div style="font-size:14px;color:#707070;text-align:left;font-weight:600;">Android Testing Experts</div>
      </div>
    </div>
    <div style="text-align:right;color:#333;font-size:14px;margin-top:5px;">
      <div style="font-weight:600;margin-bottom:3px;">Testing Reference: <strong>${ref}</strong></div>
      <div style="font-weight:600;">Issue Date: ${issued}</div>
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
    <div class="cert-row" style="background:#F5F8F4;"><div class="cert-label">Package Name:</div><div class="cert-value">${pkg}</div></div>
    <div class="cert-row" style="background:#E8F0E6;"><div class="cert-label">Version Tested:</div><div class="cert-value">${ver}</div></div>
    <div class="cert-row" style="background:#F5F8F4;"><div class="cert-label">Testing Type:</div><div class="cert-value" style="font-style:italic;font-weight:600;">Closed Testing</div></div>
    <div class="cert-row" style="background:#E8F0E6;"><div class="cert-label">Number of Testers:</div><div class="cert-value">12+ Testers</div></div>
    <div class="cert-row" style="background:#F5F8F4;"><div class="cert-label">Testing Period:</div><div class="cert-value">${period}</div></div>
  </div>

  <p style="font-size:13.5px;color:#555;line-height:1.5;text-align:justify;margin-bottom:0;flex-shrink:0;">
    During the testing period, the application was installed and used by multiple testers across different Android devices. Testers evaluated installation flow, basic functionality, usability, and overall app performance while providing feedback during the testing period.
  </p>

  <div style="flex-grow:1;min-height:15px;"></div>

  <div style="position:relative;width:100%;display:flex;flex-direction:column;justify-content:flex-end;padding-bottom:5px;flex-shrink:0;">
    <div style="display:flex;justify-content:space-between;align-items:flex-end;padding-right:170px;">
      <div style="text-align:left;display:flex;flex-direction:column;gap:3px;">
        <div style="font-weight:800;font-size:14.5px;color:#333;margin-bottom:2px;text-transform:uppercase;letter-spacing:0.5px;">Issued By:</div>
        <div style="font-family:'Montserrat',sans-serif;font-weight:900;font-size:22px;color:#1a1464;letter-spacing:1px;line-height:1.1;text-transform:uppercase;">WE <span style="color:#4CAF50;">APP</span> TESTERS</div>
        <div style="font-size:13px;color:#666;font-weight:600;display:flex;align-items:center;gap:5px;">
          <div style="width:6px;height:6px;border-radius:50%;background:#4caf50;display:inline-block;"></div>
          Android App Testing Service
        </div>
        <div style="font-size:14.5px;color:#444;font-weight:600;margin-top:6px;">📞 +91 91220 61839</div>
        <div style="font-size:14.5px;color:#1565c0;font-weight:700;margin-top:3px;">🌐 WeAppTesters.com</div>
      </div>
      <div style="text-align:center;">
        <div style="font-family:'Caveat',cursive;font-weight:700;font-size:38px;color:#1a1464;margin-bottom:-10px;line-height:1;padding-bottom:5px;">Kumkum Rani</div>
        <div style="width:180px;height:1.5px;background:#666;margin-bottom:6px;margin-left:auto;margin-right:auto;"></div>
        <div style="font-size:13px;color:#1a1a1a;font-weight:600;text-transform:uppercase;letter-spacing:1px;">Testing Manager</div>
      </div>
    </div>
    <img src="${SEAL_URL}" alt="Verified Badge" style="position:absolute;bottom:8px;right:0px;width:150px;height:150px;object-fit:contain;z-index:10;">
  </div>

  <div style="margin-top:10px;font-size:13.5px;color:#444;text-align:left;line-height:1.5;border-top:1px solid #e0e0e0;flex-shrink:0;display:flex;align-items:flex-start;gap:8px;background:rgba(0,0,0,0.02);padding:10px 14px;border-radius:6px;">
    <div style="font-weight:800;font-size:14px;color:#1a1464;letter-spacing:0.5px;">DISCLAIMER:</div>
    <div style="flex:1;">This certificate confirms ONLY that the specified application version was tested during the stated period by <strong>We App Testers</strong>. Any subsequent updates, modifications, or newly released versions fall outside the scope of this evaluation.</div>
  </div>
  
</div>
  </div>
</div>


</div>
</body>
</html>`;
}

// ─── PDF via Chrome ───────────────────────────────────────────────────────────
async function makePDF(html, pdfPath, htmlPath) {
  fs.writeFileSync(htmlPath, html, 'utf8');

  const candidates = ['/usr/bin/google-chrome-stable', '/usr/bin/google-chrome', '/usr/bin/chromium-browser', '/usr/bin/chromium'];
  let chrome = null;
  for (const c of candidates) { if (fs.existsSync(c)) { chrome = c; break; } }
  if (!chrome) {
    try { chrome = execSync('which google-chrome-stable || which google-chrome', { encoding: 'utf8' }).trim().split('\n')[0]; } catch(_){}
  }
  if (!chrome) throw new Error('Chrome not found');
  console.log('[PDF] Chrome:', chrome);

  // Use Chrome to screenshot at 2x scale then save as PDF
  // Viewport = 1123x794, scale=2 → 2246x1548 image → fit into A4 landscape PDF
  execSync(
  chrome +
  ' --headless=new --no-sandbox --disable-setuid-sandbox' +
  ' --disable-dev-shm-usage --disable-gpu' +
  ' --virtual-time-budget=12000' +
  ' --run-all-compositor-stages-before-draw' +
  ' --print-to-pdf=' + pdfPath +
  ' --print-to-pdf-no-header' +
  ' --no-pdf-header-footer' +
  ' --landscape' +
  ' file://' + htmlPath,
  { timeout: 40000, stdio: 'pipe' }
);
    if (!fs.existsSync(pdfPath)) throw new Error('PDF not created');
  const size = fs.statSync(pdfPath).size;
  console.log('[PDF] Created:', pdfPath, '(' + size + ' bytes)');
  try { fs.unlinkSync(htmlPath); } catch(_){}
  return fs.readFileSync(pdfPath);
}

// ─── TELEGRAM ─────────────────────────────────────────────────────────────────
function tgPost(method, jsonBody) {
  return new Promise((resolve, reject) => {
    const bodyBuf = Buffer.from(JSON.stringify(jsonBody), 'utf8');
    const req = https.request({
      hostname: 'api.telegram.org',
      path:     '/bot' + BOT_TOKEN + '/' + method,
      method:   'POST',
      headers:  { 'Content-Type': 'application/json; charset=utf-8', 'Content-Length': bodyBuf.length },
    }, res => {
      let raw = '';
      res.on('data', c => raw += c);
      res.on('end', () => {
        console.log('[TG]', method, res.statusCode, raw.slice(0, 300));
        try {
          const p = JSON.parse(raw);
          p.ok ? resolve(p) : reject(new Error(p.description || 'TG error'));
        } catch(e) { reject(new Error('Parse: ' + raw.slice(0,100))); }
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
    const body = Buffer.concat([
      Buffer.from('--' + boundary + '\r\nContent-Disposition: form-data; name="chat_id"\r\n\r\n' + String(chatId) + '\r\n'),
      Buffer.from('--' + boundary + '\r\nContent-Disposition: form-data; name="caption"\r\n\r\n' + String(caption) + '\r\n'),
      Buffer.from('--' + boundary + '\r\nContent-Disposition: form-data; name="document"; filename="' + fileName + '"\r\nContent-Type: application/pdf\r\n\r\n'),
      fileBuffer,
      Buffer.from('\r\n--' + boundary + '--\r\n'),
    ]);
    const req = https.request({
      hostname: 'api.telegram.org',
      path:     '/bot' + BOT_TOKEN + '/sendDocument',
      method:   'POST',
      headers:  { 'Content-Type': 'multipart/form-data; boundary=' + boundary, 'Content-Length': body.length },
    }, res => {
      let raw = '';
      res.on('data', c => raw += c);
      res.on('end', () => {
        console.log('[TG] sendDocument', res.statusCode, raw.slice(0, 300));
        try {
          const p = JSON.parse(raw);
          p.ok ? resolve(p) : reject(new Error(p.description || 'TG error'));
        } catch(e) { reject(new Error('Parse: ' + raw.slice(0,100))); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// ─── JPG from PDF (HD) ───────────────────────────────────────────────────────
function makeJPG(pdfPath, jpgPath) {
  execSync(
    'gs -sDEVICE=jpeg -dJPEGQ=80 -r200' +
    ' -dNOPAUSE -dQUIET -dBATCH' +
    ' -dFirstPage=1 -dLastPage=1' +
    ' -sOutputFile=' + jpgPath + ' ' + pdfPath,
    { timeout: 20000, stdio: 'pipe' }
  );
  if (!fs.existsSync(jpgPath)) throw new Error('JPG not created');
  console.log('[JPG] Created:', jpgPath, '(' + fs.statSync(jpgPath).size + ' bytes)');
  return fs.readFileSync(jpgPath);
}

function tgSendPhoto(chatId, caption, fileBuffer, fileName) {
  return new Promise((resolve, reject) => {
    const boundary = 'WAT' + Date.now();
    const body = Buffer.concat([
      Buffer.from('--' + boundary + '\r\nContent-Disposition: form-data; name="chat_id"\r\n\r\n' + String(chatId) + '\r\n'),
      Buffer.from('--' + boundary + '\r\nContent-Disposition: form-data; name="caption"\r\n\r\n' + String(caption) + '\r\n'),
      Buffer.from('--' + boundary + '\r\nContent-Disposition: form-data; name="photo"; filename="' + fileName + '"\r\nContent-Type: image/jpeg\r\n\r\n'),
      fileBuffer,
      Buffer.from('\r\n--' + boundary + '--\r\n'),
    ]);
    const req = https.request({
      hostname: 'api.telegram.org',
      path:     '/bot' + BOT_TOKEN + '/sendPhoto',
      method:   'POST',
      headers:  { 'Content-Type': 'multipart/form-data; boundary=' + boundary, 'Content-Length': body.length },
    }, res => {
      let raw = '';
      res.on('data', c => raw += c);
      res.on('end', () => {
        console.log('[TG] sendPhoto', res.statusCode, raw.slice(0, 200));
        try { const p = JSON.parse(raw); p.ok ? resolve(p) : reject(new Error(p.description)); }
        catch(e) { reject(new Error('Parse: ' + raw.slice(0,100))); }
      });
    });
    req.on('error', reject);
    req.write(body); req.end();
  });
}

// ─── MAIN ────────────────────────────────────────────────────────────────────
async function main() {
  console.log('=== WAT create-cert.js ===');
  console.log('[TIME]', new Date().toISOString());

  if (!BOT_TOKEN || !CHAT_ID) { console.error('Missing Telegram secrets'); process.exit(1); }
  if (!fs.existsSync(REPORT_FILE)) { console.error('report.json missing'); process.exit(1); }

  const report  = JSON.parse(fs.readFileSync(REPORT_FILE, 'utf8'));
  const newApps = Array.isArray(report.newApps) ? report.newApps : [];
  const today   = todayFormatted();

  console.log('[REPORT] New:', newApps.length);

  if (newApps.length === 0) {
    await tgPost('sendMessage', { chat_id: CHAT_ID, text: 'Certificate Report\nDate: ' + today + '\n\nNo new apps today. All systems up to date.' });
    return;
  }

  const appList = newApps.map((a, i) => (i+1) + '. ' + a.appName + ' (' + a.packageName + ')').join('\n');
  await tgPost('sendMessage', { chat_id: CHAT_ID, text: 'Certificate Report\nDate: ' + today + '\n\n' + newApps.length + ' new app(s) found!\n\n' + appList + '\n\nGenerating PDFs...' });

  let ok = 0, fail = 0;

  for (let i = 0; i < newApps.length; i++) {
    const app     = newApps[i];
    const ref     = makeRefNumber(app);
    const safe    = (app.appName || 'app').replace(/[^a-zA-Z0-9_-]/g, '_');
    const pdfName = ref + '_Certificate_' + safe + '.pdf';
    const pdfPath = path.join(OUTPUT_DIR, pdfName);
    const htmlPath= path.join(OUTPUT_DIR, '_tmp_' + safe + '.html');

    console.log('\n[' + (i+1) + '/' + newApps.length + ']', app.appName, '| Ref:', ref);

    // Skip if required fields missing
    if (!app.appName || !app.packageName || !app.id) {
      console.log('[SKIP] Incomplete app data — skipping PDF. Missing:', 
        [!app.appName&&'appName', !app.packageName&&'packageName', !app.id&&'id'].filter(Boolean).join(', '));
      fail++;
      continue;
    }

    try {
      const html   = makeCertHTML(app);
      const pdfBuf = await makePDF(html, pdfPath, htmlPath);
      await tgSendFile(CHAT_ID, app.appName + '\nRef: ' + ref + '\nPkg: ' + app.packageName, pdfBuf, pdfName);
      console.log('[OK]', pdfName);

      // Send JPG (HD 200dpi)
      const jpgName = ref + '_Certificate_' + safe + '.jpg';
      const jpgPath = path.join(OUTPUT_DIR, jpgName);
      try {
        const jpgBuf = makeJPG(pdfPath, jpgPath);
      await tgSendPhoto(CHAT_ID, app.appName + '\nRef: ' + ref + '\nPkg: ' + app.packageName + '\nCertificate Image', jpgBuf, jpgName);
        console.log('[OK]', jpgName);
        try { fs.unlinkSync(jpgPath); } catch(_) {}
      } catch(je) {
        console.error('[JPG ERROR]', je.message);
      }

      ok++;
    } catch(e) {
      console.error('[ERROR]', e.message);
      fail++;
    }

    if (i < newApps.length - 1) {
      console.log('[WAIT] 5s before next...');
      await new Promise(r => setTimeout(r, 5000));
    }
  }

  await tgPost('sendMessage', { chat_id: CHAT_ID, text: 'Done!\nPDFs sent: ' + ok + '/' + newApps.length + (fail > 0 ? '\nFailed: ' + fail : '') });
  console.log('=== DONE | OK:', ok, '| Failed:', fail, '===');
}

main().catch(e => {
  console.error('[FATAL]', e.message);
  if (BOT_TOKEN && CHAT_ID) tgPost('sendMessage', { chat_id: CHAT_ID, text: 'WAT Error: ' + e.message }).catch(()=>{});
  process.exit(1);
});
