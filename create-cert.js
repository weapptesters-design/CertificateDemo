const fs    = require('fs');
const path  = require('path');
const https = require('https');
const { execSync } = require('child_process');

const OUTPUT_DIR  = path.join(__dirname, 'output');
const REPORT_FILE = path.join(OUTPUT_DIR, 'report.json');
const BOT_TOKEN   = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID     = process.env.TELEGRAM_CHAT_ID;

const LOGO_URL = 'https://i.ibb.co/bM7b6WSn/Icon-comp.png';
const SEAL_URL = 'https://i.ibb.co/SXRYz54d/Badge-comp.png';

// ─── DATE UTILS ──────────────────────────────────────────────────────────────
const MONTHS = {
  'january':1,'february':2,'march':3,'april':4,'may':5,'june':6,
  'july':7,'august':8,'september':9,'october':10,'november':11,'december':12,
  'jan':1,'feb':2,'mar':3,'apr':4,'jun':6,'jul':7,'aug':8,
  'sep':9,'oct':10,'nov':11,'dec':12
};

function parseDate(s) {
  if (!s) return null;
  s = String(s).trim();
  const p = s.split(/\s+/);
  if (p.length === 3) {
    const d=parseInt(p[0]), m=MONTHS[p[1].toLowerCase()], y=parseInt(p[2]);
    if (d && m && y) return new Date(y, m-1, d);
  }
  const iso = new Date(s + 'T00:00:00');
  if (!isNaN(iso)) return iso;
  return null;
}

function formatDate(s) {
  const d = parseDate(s);
  return d ? d.toLocaleDateString('en-GB', { day:'2-digit', month:'long', year:'numeric' }) : '--';
}

function addDays(s, days) {
  const d = parseDate(s);
  if (!d) return '--';
  d.setDate(d.getDate() + days);
  return d.toLocaleDateString('en-GB', { day:'2-digit', month:'long', year:'numeric' });
}

function makeRef(app) {
  return String(app.id || ('WAT-' + new Date().getFullYear())).trim();
}

function todayStr() {
  return new Date().toLocaleDateString('en-GB', { day:'2-digit', month:'long', year:'numeric' });
}

// ─── HTML ─────────────────────────────────────────────────────────────────────
function makeCertHTML(app) {
  const ref     = makeRef(app);
  const start   = app.startDate || '';
  const period  = formatDate(start) + ' \u2013 ' + addDays(start, 14);
  const issued  = todayStr();
  const appName = String(app.appName     || '');
  const pkg     = String(app.packageName || '');
  const ver     = String(app.version     || '--');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Certificate</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=Caveat:wght@700&family=Montserrat:wght@400;600;700;800;900&family=DM+Sans:wght@400;500;600&display=swap');

@page { size: 297mm 210mm; margin: 0; }

* { box-sizing: border-box; margin: 0; padding: 0; }

html, body {
  width: 297mm;
  height: 210mm;
  overflow: hidden;
  font-family: 'DM Sans', sans-serif;
  background: #1B5E20;
}

.outer {
  width: 297mm;
  height: 210mm;
  background: #1B5E20;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Gold double border */
.border1 {
  position: absolute;
  inset: 10px;
  border: 4px solid #C9A84C;
  border-radius: 10px;
  pointer-events: none;
  z-index: 1;
}
.border2 {
  position: absolute;
  inset: 17px;
  border: 1.5px solid #C9A84C;
  border-radius: 7px;
  pointer-events: none;
  z-index: 1;
}

/* White inner content area */
.inner {
  position: absolute;
  inset: 22px;
  background: #FAFAF2;
  border-radius: 5px;
  padding: 26px 38px 16px 38px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  z-index: 2;
}

/* Header */
.hdr { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:10px; flex-shrink:0; }
.brand { display:flex; align-items:center; gap:12px; }
.brand img { width:62px; height:62px; object-fit:contain; }
.brand-name { font-family:'Montserrat',sans-serif; font-size:26px; font-weight:800; color:#1a1464; letter-spacing:1px; line-height:1.15; }
.brand-name span { color:#4CAF50; }
.brand-sub { font-size:12.5px; color:#707070; font-weight:600; margin-top:1px; }
.ref-info { text-align:right; font-size:12.5px; color:#333; font-weight:600; line-height:1.8; }

.divider { height:1.5px; background:#dcdcdc; margin-bottom:9px; flex-shrink:0; }

/* Title */
.title-wrap { text-align:center; margin-bottom:9px; flex-shrink:0; }
.title-main { font-family:'Montserrat',sans-serif; font-size:25px; font-weight:800; color:#1a1a1a; }
.title-sub { font-size:12px; color:#666; font-weight:600; letter-spacing:1.5px; margin-top:3px; text-transform:uppercase; }
.gold-line { width:80px; height:3px; background:#C9A84C; margin:6px auto 0; border-radius:2px; }

.intro { font-size:12px; color:#444; line-height:1.5; margin-bottom:8px; text-align:justify; flex-shrink:0; }

/* Table */
.table { width:100%; border:1px solid #dcdcdc; border-radius:7px; overflow:hidden; margin-bottom:8px; flex-shrink:0; }
.row { display:flex; border-bottom:1px solid #dcdcdc; }
.row:last-child { border-bottom:none; }
.lbl { width:34%; font-weight:700; color:#1a1a1a; font-size:12.5px; padding:6px 14px; }
.val { width:66%; color:#444; font-size:12.5px; padding:6px 14px; word-break:break-word; }

.body-p { font-size:12px; color:#555; line-height:1.5; text-align:justify; flex-shrink:0; }

.spacer { flex-grow:1; min-height:4px; }

/* Footer */
.footer { position:relative; flex-shrink:0; }
.footer-cols { display:flex; justify-content:space-between; align-items:flex-end; padding-right:155px; }

.issued { display:flex; flex-direction:column; gap:2px; }
.issued-by-label { font-weight:800; font-size:12px; color:#333; text-transform:uppercase; letter-spacing:0.5px; }
.issued-co { font-family:'Montserrat',sans-serif; font-weight:900; font-size:19px; color:#1a1464; letter-spacing:1px; text-transform:uppercase; line-height:1.15; }
.issued-co span { color:#4CAF50; }
.issued-svc { font-size:11.5px; color:#666; font-weight:600; display:flex; align-items:center; gap:5px; margin-top:1px; }
.dot { width:5px; height:5px; border-radius:50%; background:#4CAF50; flex-shrink:0; }
.issued-phone { font-size:12.5px; color:#444; font-weight:600; margin-top:3px; }
.issued-web { font-size:12.5px; color:#1565c0; font-weight:700; margin-top:1px; }

.sig { text-align:center; }
.sig-name { font-family:'Caveat',cursive; font-weight:700; font-size:34px; color:#1a1464; line-height:1; padding-bottom:3px; }
.sig-line { width:170px; height:1.5px; background:#555; margin:0 auto 4px; }
.sig-title { font-size:11.5px; color:#1a1a1a; font-weight:700; text-transform:uppercase; letter-spacing:1px; }

.seal { position:absolute; bottom:0; right:0; width:120px; height:120px; object-fit:contain; }

/* Disclaimer */
.disc { margin-top:9px; font-size:11.5px; color:#444; line-height:1.5; border-top:1px solid #e0e0e0; display:flex; align-items:flex-start; gap:7px; background:rgba(0,0,0,0.02); padding:9px 13px; border-radius:5px; flex-shrink:0; }
.disc-label { font-weight:800; font-size:11.5px; color:#1a1464; white-space:nowrap; letter-spacing:0.5px; }
</style>
</head>
<body>
<div class="outer">
  <div class="border1"></div>
  <div class="border2"></div>

  <div class="inner">

    <!-- Header -->
    <div class="hdr">
      <div class="brand">
        <img src="${LOGO_URL}" crossorigin="anonymous">
        <div>
          <div class="brand-name">WE <span>APP</span> TESTERS</div>
          <div class="brand-sub">Android Testing Experts</div>
        </div>
      </div>
      <div class="ref-info">
        <div>Testing Reference: <strong>${ref}</strong></div>
        <div>Issue Date: <strong>${issued}</strong></div>
      </div>
    </div>

    <div class="divider"></div>

    <!-- Title -->
    <div class="title-wrap">
      <div class="title-main">APP TESTING COMPLETION CERTIFICATE</div>
      <div class="title-sub">Certificate of Testing</div>
      <div class="gold-line"></div>
    </div>

    <!-- Intro -->
    <p class="intro">This is to certify that the Android application listed below has successfully completed a structured testing process conducted by We App Testers.</p>

    <!-- Table -->
    <div class="table">
      <div class="row" style="background:#E8F0E6"><div class="lbl">App Name:</div><div class="val" style="font-weight:700;color:#1a1a1a">${appName}</div></div>
      <div class="row" style="background:#F5F8F4"><div class="lbl">Package Name:</div><div class="val">${pkg}</div></div>
      <div class="row" style="background:#E8F0E6"><div class="lbl">Version Tested:</div><div class="val">${ver}</div></div>
      <div class="row" style="background:#F5F8F4"><div class="lbl">Testing Type:</div><div class="val" style="font-style:italic;font-weight:600">Closed Testing</div></div>
      <div class="row" style="background:#E8F0E6"><div class="lbl">Number of Testers:</div><div class="val">12+ Testers</div></div>
      <div class="row" style="background:#F5F8F4"><div class="lbl">Testing Period:</div><div class="val">${period}</div></div>
    </div>

    <!-- Body -->
    <p class="body-p">During the testing period, the application was installed and used by multiple testers across different Android devices. Testers evaluated installation flow, basic functionality, usability, and overall app performance while providing feedback during the testing period.</p>

    <div class="spacer"></div>

    <!-- Footer -->
    <div class="footer">
      <div class="footer-cols">
        <div class="issued">
          <div class="issued-by-label">Issued By:</div>
          <div class="issued-co">WE <span>APP</span> TESTERS</div>
          <div class="issued-svc"><span class="dot"></span> Android App Testing Service</div>
          <div class="issued-phone">📞 +91 91220 61839</div>
          <div class="issued-web">🌐 WeAppTesters.com</div>
        </div>
        <div class="sig">
          <div class="sig-name">Kumkum Rani</div>
          <div class="sig-line"></div>
          <div class="sig-title">Testing Manager</div>
        </div>
      </div>
      <img src="${SEAL_URL}" class="seal" crossorigin="anonymous">
    </div>

    <!-- Disclaimer -->
    <div class="disc">
      <span class="disc-label">DISCLAIMER:</span>
      <span>This certificate confirms ONLY that the specified application version was tested during the stated period by <strong>We App Testers</strong>. Any subsequent updates, modifications, or newly released versions fall outside the scope of this evaluation.</span>
    </div>

  </div>
</div>
</body>
</html>`;
}

// ─── PDF ──────────────────────────────────────────────────────────────────────
async function makePDF(html, pdfPath, htmlPath) {
  fs.writeFileSync(htmlPath, html, 'utf8');

  const candidates = ['/usr/bin/google-chrome-stable','/usr/bin/google-chrome','/usr/bin/chromium-browser','/usr/bin/chromium'];
  let chrome = null;
  for (const c of candidates) { if (fs.existsSync(c)) { chrome = c; break; } }
  if (!chrome) {
    try { chrome = execSync('which google-chrome-stable || which google-chrome', {encoding:'utf8'}).trim().split('\n')[0]; } catch(_){}
  }
  if (!chrome) throw new Error('Chrome not found');

  execSync([
    chrome,
    '--headless=new',
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-gpu',
    '--virtual-time-budget=12000',
    '--run-all-compositor-stages-before-draw',
    '--print-to-pdf=' + pdfPath,
    '--print-to-pdf-no-header',
    '--no-pdf-header-footer',
    'file://' + htmlPath,
  ].join(' '), { timeout: 45000, stdio: 'pipe' });

  if (!fs.existsSync(pdfPath)) throw new Error('PDF not created');
  console.log('[PDF] OK:', fs.statSync(pdfPath).size, 'bytes');
  try { fs.unlinkSync(htmlPath); } catch(_) {}
  return fs.readFileSync(pdfPath);
}

// ─── TELEGRAM ─────────────────────────────────────────────────────────────────
function tgPost(method, body) {
  return new Promise((resolve, reject) => {
    const buf = Buffer.from(JSON.stringify(body), 'utf8');
    const req = https.request({
      hostname:'api.telegram.org', path:'/bot'+BOT_TOKEN+'/'+method, method:'POST',
      headers:{'Content-Type':'application/json; charset=utf-8','Content-Length':buf.length},
    }, res => {
      let raw=''; res.on('data',c=>raw+=c);
      res.on('end',()=>{
        console.log('[TG]',method,res.statusCode,raw.slice(0,200));
        try{const p=JSON.parse(raw);p.ok?resolve(p):reject(new Error(p.description));}
        catch(e){reject(new Error('TG:'+raw.slice(0,80)));}
      });
    });
    req.on('error',reject); req.write(buf); req.end();
  });
}

function tgSendFile(chatId, caption, buf, name) {
  return new Promise((resolve, reject) => {
    const b='WAT'+Date.now();
    const body=Buffer.concat([
      Buffer.from('--'+b+'\r\nContent-Disposition: form-data; name="chat_id"\r\n\r\n'+chatId+'\r\n'),
      Buffer.from('--'+b+'\r\nContent-Disposition: form-data; name="caption"\r\n\r\n'+caption+'\r\n'),
      Buffer.from('--'+b+'\r\nContent-Disposition: form-data; name="document"; filename="'+name+'"\r\nContent-Type: application/pdf\r\n\r\n'),
      buf,
      Buffer.from('\r\n--'+b+'--\r\n'),
    ]);
    const req=https.request({
      hostname:'api.telegram.org',path:'/bot'+BOT_TOKEN+'/sendDocument',method:'POST',
      headers:{'Content-Type':'multipart/form-data; boundary='+b,'Content-Length':body.length},
    },res=>{
      let raw='';res.on('data',c=>raw+=c);
      res.on('end',()=>{
        console.log('[TG] sendDoc',res.statusCode,raw.slice(0,200));
        try{const p=JSON.parse(raw);p.ok?resolve(p):reject(new Error(p.description));}
        catch(e){reject(new Error('TG:'+raw.slice(0,80)));}
      });
    });
    req.on('error',reject);req.write(body);req.end();
  });
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('=== WAT create-cert.js ===');
  console.log('[TIME]', new Date().toISOString());

  if (!BOT_TOKEN||!CHAT_ID){console.error('Missing TG secrets');process.exit(1);}
  if (!fs.existsSync(REPORT_FILE)){console.error('report.json missing');process.exit(1);}

  const report  = JSON.parse(fs.readFileSync(REPORT_FILE,'utf8'));
  const newApps = Array.isArray(report.newApps) ? report.newApps : [];
  const today   = todayStr();

  console.log('[REPORT] New:', newApps.length);

  if (newApps.length === 0) {
    await tgPost('sendMessage',{chat_id:CHAT_ID,text:'Certificate Report\nDate: '+today+'\n\nNo new apps today. All systems up to date.'});
    return;
  }

  const list = newApps.map((a,i)=>(i+1)+'. '+a.appName+' ('+a.packageName+')').join('\n');
  await tgPost('sendMessage',{chat_id:CHAT_ID,text:'Certificate Report\nDate: '+today+'\n\n'+newApps.length+' new app(s) found!\n\n'+list+'\n\nGenerating PDFs...'});

  let ok=0, fail=0;

  for (let i=0; i<newApps.length; i++) {
    const app  = newApps[i];
    const ref  = makeRef(app);
    const safe = (app.appName||'app').replace(/[^a-zA-Z0-9_-]/g,'_');
    const pdfName  = ref+'_Certificate_'+safe+'.pdf';
    const pdfPath  = path.join(OUTPUT_DIR, pdfName);
    const htmlPath = path.join(OUTPUT_DIR, '_tmp_'+safe+'.html');

    console.log('\n['+(i+1)+'/'+newApps.length+']', app.appName, '| Ref:', ref);

    if (!app.appName||!app.packageName||!app.id) {
      console.log('[SKIP] Missing fields');
      fail++; continue;
    }

    try {
      const pdf = await makePDF(makeCertHTML(app), pdfPath, htmlPath);
      await tgSendFile(CHAT_ID, app.appName+'\nRef: '+ref+'\nPkg: '+app.packageName, pdf, pdfName);
      console.log('[OK]', pdfName);
      ok++;
    } catch(e) {
      console.error('[ERROR]', e.message);
      fail++;
    }

    if (i < newApps.length-1) {
      console.log('[WAIT] 5s...');
      await new Promise(r=>setTimeout(r,5000));
    }
  }

  await tgPost('sendMessage',{chat_id:CHAT_ID,text:'Done!\nPDFs sent: '+ok+'/'+newApps.length+(fail>0?'\nFailed: '+fail:'')});
  console.log('=== DONE | OK:',ok,'| Failed:',fail,'===');
}

main().catch(e=>{
  console.error('[FATAL]',e.message);
  if(BOT_TOKEN&&CHAT_ID) tgPost('sendMessage',{chat_id:CHAT_ID,text:'WAT Error: '+e.message}).catch(()=>{});
  process.exit(1);
});
