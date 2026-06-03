const puppeteer = require("puppeteer");
const fs = require("fs");

async function generatePDF(html, fileName) {

  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  });

  const page = await browser.newPage();

  await page.setContent(html, { waitUntil: "networkidle0" });

  await page.pdf({
    path: fileName,
    format: "A4",
    printBackground: true
  });

  await browser.close();
}

module.exports = generatePDF;
