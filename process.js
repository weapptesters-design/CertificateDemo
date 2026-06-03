const fetch = require("node-fetch"); // important in Node 20 workflows
const report = require("./report.json");

const newApps = report.newApps || [];

async function sendNoAppMessage() {

  const message = `
🚀 Certificate Report
📅 Date: ${new Date().toLocaleDateString()}

❌ No new apps today
All systems are up to date.
  `;

  try {
    const res = await fetch(
      `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: process.env.TELEGRAM_CHAT_ID,
          text: message
        })
      }
    );

    const data = await res.json();
    console.log("📢 Telegram response:", data);

  } catch (err) {
    console.log("❌ Telegram error:", err.message);
  }
}

(async () => {

  if (newApps.length === 0) {
    await sendNoAppMessage();
    console.log("📢 No new app notification sent");
    return; // better than process.exit
  }

})();
