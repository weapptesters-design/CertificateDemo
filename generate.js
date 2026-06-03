const fs = require("fs");
const axios = require("axios");

async function run() {
  const csvUrl = "YOUR_GOOGLE_SHEET_CSV_LINK";

  const res = await axios.get(csvUrl);
  const rows = res.data.split("\n").slice(1);

  let orders = [];

  rows.forEach(r => {
    const cols = r.split(",");

    orders.push({
      appName: cols[0],
      packageName: cols[1],
      version: cols[2],
      id: cols[3],
      startDate: cols[4]
    });
  });

  fs.writeFileSync("data.json", JSON.stringify(orders, null, 2));
  console.log("Done");
}

run();
