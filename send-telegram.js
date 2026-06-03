const fs = require("fs");
const fetch = require("node-fetch");

const report = require("./report.json");

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

async function sendMessage(text) {
  await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: CHAT_ID,
      text
    })
  });
}

async function sendFile() {
  const FormData = require("form-data");

  const form = new FormData();
  form.append("chat_id", CHAT_ID);
  form.append("document", fs.createReadStream("./certificate.pdf"));

  await fetch(`https://api.telegram.org/bot${TOKEN}/sendDocument`, {
    method: "POST",
    body: form
  });
}

async function run() {

  const date = new Date().toLocaleDateString();

  // CASE 1: NO NEW APPS
  if (report.newCount === 0) {
    await sendMessage(`📅 ${date}\n\n⚠️ Aaj koi new app add nahi hua.`);
    return;
  }

  // CASE 2: NEW APPS EXIST
  await sendMessage(`🚀 ${date}\n\n🆕 New Apps Found: ${report.newCount}`);

  await sendFile();

  await sendMessage(`✅ Certificate generated for new apps only.`);
}

run();
