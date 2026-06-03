const fs = require("fs");

const report = require("./report.json");

// NEW APPS array yahan hai
const data = report.newApps;

if (!Array.isArray(data)) {
  console.log("❌ No new apps found");
  process.exit(0);
}

data.forEach(app => {

  const html = `
    <html>
      <body>
        <h1>Certificate</h1>
        <p>App Name: ${app.appName}</p>
        <p>Package: ${app.packageName}</p>
        <p>Version: ${app.version}</p>
        <p>Start Date: ${app.startDate}</p>
        <p>ID: ${app.id}</p>
      </body>
    </html>
  `;

  fs.writeFileSync(`cert_${app.id}.html`, html);
});

console.log("✅ Certificate HTML created");
