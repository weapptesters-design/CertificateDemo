const fs = require("fs");
const fetch = require("node-fetch");
const FormData = require("form-data");

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

async function sendTelegram(filePath, appName) {

  const form = new FormData();
  form.append("chat_id", CHAT_ID);
  form.append("document", fs.createReadStream(filePath));
  form.append("caption", `📄 Certificate Generated\n🧾 App: ${appName}`);

  await fetch(`https://api.telegram.org/bot${TOKEN}/sendDocument`, {
    method: "POST",
    body: form
  });
}

module.exports = sendTelegram;
