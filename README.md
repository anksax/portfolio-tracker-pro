# 📊 Portfolio Tracker Pro

A **local-first**, privacy-focused investment dashboard for Indian investors — no server, no cloud, no subscriptions.  
All data stays **100% on your device** in the browser's `localStorage`.

![License](https://img.shields.io/badge/license-MIT-green) ![Platform](https://img.shields.io/badge/platform-browser-blue) ![Data](https://img.shields.io/badge/data-local%20only-purple)

---

## ✨ Features

| Category | Details |
|---|---|
| **Mutual Funds** | Track SIPs & lump-sums, AMC + scheme lookup (live AMFI data), NAV sparklines, backdated entry |
| **MF Backtester** | Compare up to 6 funds side-by-side with normalised performance chart (Base = ₹100) + CAGR metrics |
| **Equities** | Holdings with avg buy price, CMP, P&L; live price sync via IndianAPI (optional) |
| **ETFs** | Same as equities with expense-ratio tracking |
| **Fixed Income** | Bank FDs with auto-maturity value calculation (Cumulative / Monthly / Quarterly) |
| **Provident Funds** | PPF / EPF balance tracker |
| **NPS** | National Pension System — Tier 1 / 2, scheme classes (E / C / G / A), units × NAV auto-calc |
| **FIRE Calculator** | Retirement corpus planning with safe withdrawal rate |
| **Calendar** | Tax deadlines & market events |
| **Auth & Security** | SHA-256 salted password hashing (SubtleCrypto), 5-attempt lockout with exponential backoff, session timeout |

---

## 💡 Why Portfolio Tracker Pro?

Most retail portfolio trackers:
- require cloud sync
- collect sensitive financial data
- hide advanced analytics behind subscriptions

Portfolio Tracker Pro was built as a fully local-first alternative where:
- data never leaves the browser
- no account is required
- users retain complete ownership of their financial information


---

## 🚀 Quick Start

> **No install required.** This is a pure HTML/CSS/JS app — just open `index.html` in your browser.

```bash
git clone https://github.com/YOUR_USERNAME/portfolio-tracker-pro.git
cd portfolio-tracker-pro

# Copy and configure (optional — only needed for live stock price sync)
cp config.example.js config.js
# Edit config.js and add your IndianAPI key
```

Then open `index.html` in Chrome, Edge, or any modern browser.

---

## 🔑 Optional: Live Stock Price Sync

The **Sync Stock Prices** button can auto-fill current market prices for your equity holdings.  
This uses the [IndianAPI](https://indianapi.in/) service (free tier available).

1. Register at [indianapi.in](https://indianapi.in/) and copy your API key
2. Open `config.js` and paste your key:
   ```js
   window.CONFIG = {
       stockApiKey: "YOUR_KEY_HERE"
   };
   ```
3. `config.js` is in `.gitignore` — your key will **never** be committed

Without a key, all other features (MF, FD, PF, NPS, Backtester, FIRE) work perfectly.

---

## 🔐 Security Model

| Feature | Implementation |
|---|---|
| Password hashing | SHA-256 + random 32-byte salt via **SubtleCrypto API** — never stored in plain text |
| Brute-force protection | Lockout after 5 failed attempts, exponential backoff (30s → 60s → 120s…) |
| Session management | Stored in `sessionStorage` (cleared on browser close), configurable inactivity timeout |
| Data encryption | Portfoliod data stays in `localStorage` — not encrypted at rest, but never sent anywhere |
| API key safety | Hardcoded keys removed; user supplies their own via git-ignored `config.js` |

> ⚠️ This is a **client-side** application. Do not run it on a shared / public computer without logging out first.

---

## 📁 File Structure

```
portfolio-tracker-pro/
├── index.html          # Main app shell + all views
├── app.js              # Core logic: state, calculations, API calls
├── auth.js             # Auth module: hashing, sessions, lockout
├── style.css           # All styles (dark theme, glassmorphism)
├── config.example.js   # Template for your API key config
├── config.js           # ← Your personal config (git-ignored)
├── .gitignore
├── LICENSE             # MIT
└── README.md
```

---

## 🤝 Contributing

PRs welcome! Please:
- Keep the local-first philosophy — no mandatory server calls
- Do not hardcode any API keys
- Follow the existing dark-mode design system (CSS variables in `style.css`)

---

## 🌐 Live Demo

https://anksax.github.io/portfolio-tracker-pro/

---

## 🛠 Tech Stack

- Vanilla JavaScript
- HTML5 + CSS3
- Chart.js
- Browser localStorage/sessionStorage
- SubtleCrypto API
- AMFI Data APIs
- IndianAPI (optional live stock prices)

---

## 📜 License

MIT — free to use, fork, and modify. See [LICENSE](LICENSE).
