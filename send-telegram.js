const fs = require("fs");
const fetch = require("node-fetch");
const FormData = require("form-data");

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

async function send(filePath, appName) {

  console.log("📤 Sending file:", filePath);

  if (!fs.existsSync(filePath)) {
    console.log("❌ FILE NOT FOUND:", filePath);
    return;
  }

  const form = new FormData();
  form.append("chat_id", CHAT_ID);
  form.append("caption", `📄 ${appName}`);
  form.append("document", fs.createReadStream(filePath));

  const res = await fetch(
    `https://api.telegram.org/bot${TOKEN}/sendDocument`,
    {
      method: "POST",
      body: form
    }
  );

  const data = await res.json();

  console.log("📡 Telegram response:", JSON.stringify(data, null, 2));
}

module.exports = send;
