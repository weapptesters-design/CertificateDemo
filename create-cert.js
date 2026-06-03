const fs = require("fs");

// Load report
const report = require("./report.json");

// NEW apps only
const data = report.newApps || [];

// If no new apps → stop safely
if (!Array.isArray(data) || data.length === 0) {
  console.log("⚠️ No new apps found. Nothing to generate.");
  process.exit(0);
}

// Output folder
const folder = "output";

if (!fs.existsSync(folder)) {
  fs.mkdirSync(folder);
}

console.log("🚀 Creating certificates...");

data.forEach((app, index) => {

  // Safe values
  const appName = app.appName || "N/A";
  const packageName = app.packageName || "N/A";
  const version = app.version || "N/A";
  const startDate = app.startDate || "N/A";
  const id = app.id || `app_${index}`;

  // HTML template
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Certificate - ${appName}</title>
</head>
<body style="font-family: Arial; padding: 40px; text-align: center;">

  <h1 style="color: green;">We App Testers</h1>
  <h2>App Testing Certificate</h2>

  <hr>

  <p><b>App Name:</b> ${appName}</p>
  <p><b>Package Name:</b> ${packageName}</p>
  <p><b>Version:</b> ${version}</p>
  <p><b>Start Date:</b> ${startDate}</p>
  <p><b>App ID:</b> ${id}</p>

  <hr>

  <p style="margin-top:50px;">This certificate confirms successful testing.</p>

</body>
</html>
  `;

  // Save inside output folder
  const filePath = `${folder}/cert_${id}.html`;

  fs.writeFileSync(filePath, html);

  console.log(`✅ Created: ${filePath}`);
});

console.log("🎉 All certificates generated successfully!");
