# WAT Certificate Automation
**We App Testers — Google Sheets → GitHub Actions → PDF Certificates → Telegram**

---

## 📁 File Structure

```
your-repo/
├── generate.js              ← CSV download, parse, compare, state save
├── create-cert.js           ← Certificate generation + Telegram delivery
├── .github/
│   └── workflows/
│       └── workflow.yml     ← GitHub Actions (cron + manual)
└── output/                  ← Auto-created, never commit certificates here
    ├── report.json          ← Latest run result
    └── previous_orders.json ← State for change detection
```

---

## 🔧 Setup (One-Time)

### Step 1: GitHub Repo
1. Create a new **private** GitHub repo
2. Upload all files maintaining the structure above
3. Move `workflow.yml` → `.github/workflows/workflow.yml`

### Step 2: GitHub Secrets
Go to repo → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**

| Secret Name | Value |
|-------------|-------|
| `SHEETS_CSV_URL` | Your Google Sheets CSV export URL |
| `TELEGRAM_BOT_TOKEN` | Your bot token from @BotFather |
| `TELEGRAM_CHAT_ID` | Your chat/group ID |

### Step 3: Google Sheets CSV URL
1. Open your Google Sheet
2. **File → Share → Publish to web**
3. Select sheet → **CSV** format → Publish
4. Copy the URL → paste as `SHEETS_CSV_URL` secret

URL format:
```
https://docs.google.com/spreadsheets/d/SHEET_ID/export?format=csv&gid=0
```

### Step 4: Telegram Bot
1. Message [@BotFather](https://t.me/BotFather) → `/newbot`
2. Copy the token → `TELEGRAM_BOT_TOKEN`
3. Add bot to your group/channel
4. Get chat ID: message [@userinfobot](https://t.me/userinfobot) or use API
5. Save as `TELEGRAM_CHAT_ID` (groups are negative: `-1001234567890`)

---

## 📊 CSV Format

Your Google Sheet should have these columns (names are flexible):

| App Name | Package Name | Version | Start Date | ID | Prefix | Suffix |
|----------|-------------|---------|------------|-----|--------|--------|
| MyApp | com.myapp | 1.0.0 | 2024-01-15 | 001 | WAT | |

- **Extra columns** are safely ignored
- **Missing columns** use fallback values
- **Commas inside cells** are handled correctly (use quotes in Sheets)

---

## ⚙️ How It Works

```
Every 24hrs (6 AM UTC)
         ↓
   Download CSV
         ↓
  Compare with previous_orders.json
         ↓
   ┌─────────────────┐
   │  New apps found? │
   └─────────────────┘
      ↓            ↓
     YES           NO
      ↓            ↓
  Generate      Send "No new
  HTML certs    apps" message
      ↓
  Send each cert
  as Telegram file
      ↓
  Update state
```

---

## 🔁 Manual Trigger

Go to **Actions** tab → **WAT Certificate Automation** → **Run workflow**

---

## ❗ Important Notes

- Certificates are generated ONLY for **new apps** (not changed apps)
- All files are saved in `/output` folder only
- State is saved both in cache AND committed to repo (double safety)
- Telegram has 3 retries with backoff on failure
- All errors are logged AND sent to Telegram

---

## 🛠 Troubleshooting

| Problem | Fix |
|---------|-----|
| "SHEETS_CSV_URL not set" | Add secret in GitHub Settings |
| CSV download fails | Check if sheet is published to web |
| Telegram not sending | Verify bot is added to group, check CHAT_ID |
| All apps showing as "new" | Delete `previous_orders.json` cache or commit it |
| Wrong columns detected | Check your sheet header names match the aliases in `generate.js` |
