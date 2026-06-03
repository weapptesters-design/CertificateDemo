const fs = require("fs");
const generatePDF = require("./pdf");
const sendTelegram = require("./send-telegram");

const report = require("./report.json");

async function run() {

  const newApps = report.newApps;

  if (newApps.length === 0) {
    console.log("⚠️ No new apps today");
    return;
  }

  for (let app of newApps) {

    console.log("Processing:", app.appName);

    // 1. load HTML template
    let html = fs.readFileSync("index.html", "utf8");

    // 2. replace values
    html = html
      .replace(/id="r-app">.*?</, `id="r-app">${app.appName}<`)
      .replace(/id="r-pkg">.*?</, `id="r-pkg">${app.packageName}<`)
      .replace(/id="r-ver">.*?</, `id="r-ver">${app.version || "—"}<`)
      .replace(/id="r-ref">.*?</, `id="r-ref">${app.id}<`)
      .replace(/id="r-per">.*?</, `id="r-per">${app.startDate}<`);

    const fileName = `cert_${app.id}.pdf`;

    // 3. create PDF
    await generatePDF(html, fileName);

    // 4. send to telegram
    await sendTelegram(fileName, app.appName);

    console.log("Done:", app.appName);
  }
}

run();
