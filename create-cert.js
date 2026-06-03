const fs = require("fs");

const data = require("./data.json");

// tumhara original HTML
const htmlTemplate = fs.readFileSync("index.html", "utf8");

data.forEach(app => {

  let html = htmlTemplate;

  // inject data into existing IDs (SAFE METHOD)
  html = html.replace(/id="r-app">.*?</, `id="r-app">${app.appName}<`);
  html = html.replace(/id="r-pkg">.*?</, `id="r-pkg">${app.packageName}<`);
  html = html.replace(/id="r-ver">.*?</, `id="r-ver">${app.version || "—"}<`);
  html = html.replace(/id="r-ref">.*?</, `id="r-ref">${app.id}<`);
  html = html.replace(/id="r-per">.*?</, `id="r-per">${app.startDate}<`);

  fs.writeFileSync("temp.html", html);

  console.log("Certificate ready:", app.appName);
});
