const fs = require("fs");

const data = require("./data.json");

data.forEach(app => {

  let html = fs.readFileSync("index.html", "utf8");

  html = html
    .replace("{{APP_NAME}}", app.appName)
    .replace("{{PACKAGE_NAME}}", app.packageName)
    .replace("{{VERSION}}", app.version)
    .replace("{{ID}}", app.id)
    .replace("{{START_DATE}}", app.startDate);

  fs.writeFileSync("temp.html", html);

  console.log("Certificate ready for:", app.appName);
});
