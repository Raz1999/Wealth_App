# MyWealth — Personal Financial Dashboard
**Spec Date:** 2026-04-28
**Status:** Approved

---

## Overview

A personal financial dashboard for tracking all financial assets in one place. Built as a modular local HTML application (no server required), with localStorage for persistence, bilingual support (Hebrew RTL / English LTR), and a compound interest simulator.

**Core goals:**
- Full visibility over all financial assets
- Projection of future net worth (compound interest)
- "What if" simulator to model changes per asset or overall
- Israeli financial products supported out of the box
- No data sent to any server — everything stays in the browser

---

## Tech Stack

| Decision | Choice | Reason |
|----------|--------|--------|
| Architecture | Modular HTML + vanilla JS (multiple files) | No server needed, opens via `file://`, maintainable |
| Persistence | `localStorage` | Browser-local only, no external server |
| Charts | Chart.js (CDN) | Lightweight, no build step |
| Data fetching | Yahoo Finance (via CORS proxy) + TASE public API | Live prices for stocks/ETFs |
| Languages | Hebrew (RTL default) + English (LTR) | Toggle flips `dir` on entire page |
| Styling | Plain CSS with CSS variables | No framework, easy to theme |

---

## File Structure

```
Personal_BI_Dash/
├── index.html              # Main entry point
├── css/
│   └── styles.css          # All styles, CSS variables for theme
├── js/
│   ├── app.js              # Router, app initialization
│   ├── storage.js          # localStorage read/write helpers
│   ├── assets.js           # Asset CRUD operations
│   ├── calculations.js     # Compound interest, projections
│   ├── charts.js           # Chart.js wrappers
│   ├── market-data.js      # Yahoo Finance / TASE API fetching
│   ├── simulator.js        # What-if simulator logic
│   └── i18n.js             # Hebrew/English translations
├── pages/
│   ├── dashboard.html      # Main dashboard view (fragment)
│   ├── product.html        # Product detail/edit view (fragment)
│   └── simulator.html      # Simulator view (fragment)
└── .gitignore
```

---

## Design System

**Color palette — Mocha + Ocean Blue:**
```css
--bg-base:        #fdf6ec;   /* warm cream — main background */
--bg-card:        #ffffff;   /* white — cards */
--bg-accent:      #f0e6d3;   /* mocha — secondary areas */
--border:         #ede0ce;   /* warm border */

--blue-primary:   #0077b6;   /* ocean blue — primary action */
--blue-light:     #00b4d8;   /* sky blue — secondary, gradients */
--blue-pale:      #caf0f8;   /* pale blue — highlights */

--green-positive: #10b981;   /* gains, positive delta */
--yellow-mid:     #f59e0b;   /* mid-tier assets */

--text-primary:   #1a1a2e;   /* near-black */
--text-secondary: #64748b;   /* muted labels */
--text-muted:     #94a3b8;   /* very muted */
```

**RTL / LTR rules:**
- Default: `dir="rtl"`, Hebrew
- Language toggle switches `<html dir="">` and updates all translated strings
- Sliders fill right-to-left in RTL, left-to-right in LTR
- Chart time axis: right = past, left = future (RTL); reversed in LTR
- Monetary values and numbers always render LTR (Unicode bidirectional)

**Typography:** system-ui / -apple-system stack. No web fonts (file:// compatibility).

---

## Navigation Flow

```
Dashboard (index.html)
├── Click asset card  →  Product Page (product.html?id=X)
│                          ├── Edit fields, save
│                          ├── View asset-specific projection chart
│                          └── "Simulate this asset" → Simulator (focused mode)
├── "+ Add Asset" btn →  Product Page (new)
└── "Open Simulator"  →  Simulator (global mode)
                           ├── Toggle: Global / [Asset Name]
                           └── Each asset row expands with sliders
```

All navigation is client-side, no page reloads. Views are injected into a `#app` container.

---

## Dashboard View

**Top-to-bottom layout:**

1. **Nav bar** — Logo + Language toggle (עב | EN) + "+ Add Asset" button
2. **Hero summary card** (blue gradient) — Total net worth · 20Y projection · Avg annual return · Total monthly contribution
3. **Global projection chart** — Solid line (current) + dashed line (projected future), time range selector (5Y / 20Y / 30Y), RTL axis
4. **"My Assets" section** — List of asset cards (see below)
5. **Simulator entry banner** — "What if I deposit more?" CTA

**Asset card (in list):**
- Custom icon (emoji picker) + Asset name + Asset type label
- Current value (right-aligned)
- Annual return rate
- Click → Product Page

---

## Product Types & Fields

### 1. תיק השקעות אישי (Investment Portfolio)
- Broker name
- **Holdings table:** Ticker (e.g. SPY, AAPL, 1159268) · Quantity OR total value · Live price (fetched) · Current value · % of portfolio
- Fetch: current price, 1D/1W/1M/1Y change, historical CAGR (5Y, 10Y)
- Projection basis: per-holding CAGR or manual override
- Management fee (% annual)
- Monthly contribution

### 2. קרן פנסיה (Pension Fund)
- Company name · Track name
- Current accumulated value
- Gross monthly salary
- Employee contribution (%)
- Employer contribution (%)
- Management fee from accumulation (%)
- Management fee from deposits (%)
- Expected annual return (%)

### 3. קופת גמל להשקעה (Investment Provident Fund)
- Company name · Track
- Current value
- Monthly contribution
- Expected annual return (%)
- Management fee (%)

### 4. קרן כספית (Money Market Fund)
- Fund name
- Current value
- Expected return (default: Prime − 0.1%, editable)
- Management fee (%)
- Monthly contribution

### 5. עובר ושב (Checking Account)
- Bank name
- Current balance
- Interest rate on balance (usually 0%)
- Tracking only — no monthly contribution field

### 6. פיקדון / חיסכון בנקאי (Bank Deposit / Savings)
- Bank name
- Principal amount
- Annual interest rate (%)
- Maturity date
- Auto-renew (yes/no)

### 7. קרן השתלמות (Study Fund)
- Company name · Track
- Current value
- Gross monthly salary
- Employee contribution (%)
- Employer contribution (%)
- Liquidity date (6-year rule)
- Management fee (%)
- Expected annual return (%)

### 8. נכס חופשי / Custom
- Name (free text)
- Custom emoji icon
- Current value
- Expected annual return (%)
- Monthly contribution
- Free description

---

## Market Data (תיק השקעות)

**Data sources:**
- US stocks & ETFs: Yahoo Finance API via `https://query1.finance.yahoo.com` (CORS-permissive endpoint)
- Israeli stocks & funds: TASE public API (`https://api.tase.co.il`)

**Per holding, fetched data:**
- Current price
- 1D, 1W, 1M, 1Y performance
- Historical data for CAGR calculation (5Y, 10Y where available)

**Projection options (user selects per holding):**
1. Historical CAGR (calculated from fetched data)
2. Market average (SPY ~10% / TA-125 ~8%)
3. Manual override (user inputs %)

**Refresh:** Manual only — "Update Prices" button. Data cached in localStorage with timestamp.

---

## Projection Calculation

All projections use standard compound interest with monthly contributions:

```
FV = PV × (1 + r)^n + PMT × [((1 + r)^n − 1) / r]

where:
  PV  = current value
  r   = monthly rate (annual rate / 12)
  n   = months
  PMT = monthly contribution (after deducting management fee impact)
```

Management fees applied as annual drag: effective rate = stated rate − fee rate.

Pension & study fund: contributions calculated from salary × contribution percentages.

Investment portfolio: projection is weighted average of per-holding projections.

---

## Simulator — "What If"

**Two entry modes:**

| Mode | Entry Point | Scope |
|------|-------------|-------|
| Global | Dashboard → "Open Simulator" | All assets |
| Focused | Product Page → "Simulate this asset" | Single asset |

**Both modes share the same view**, with a toggle at the top:
`[ כולל ] [ תיק השקעות ] [ פנסיה ] [ ... ]`

**Global mode layout:**
1. Impact summary bar: Projected total (scenario) · New monthly total · Avg return (scenario)  — all showing delta vs. current
2. Comparison chart: gray dashed (current) vs. blue solid (scenario)
3. Time horizon slider: 1Y–30Y
4. Per-asset collapsible rows, each with:
   - Asset name + current value
   - Delta badge: "+₪X in scenario"
   - Expandable: 3 sliders (monthly contribution · expected return · management fee) + original values shown + mini comparison chart + Reset button

**Focused mode:** Same layout but only the selected asset is shown in full, with more detailed sliders (e.g., pension shows employer contribution % separately).

**Sliders:** All RTL-aware. Range and step per parameter:
- Monthly contribution: ₪0–₪20,000, step ₪100
- Return rate: 0–25%, step 0.1%
- Management fee: 0–3%, step 0.05%

Simulator state is **not saved** to localStorage — it's a temporary exploration tool.

---

## i18n (Internationalization)

All visible strings stored in `js/i18n.js` as two objects: `he` and `en`.

Language toggle:
1. Sets `<html dir="rtl|ltr" lang="he|en">`
2. Swaps all `data-i18n` element text
3. Reverses chart axes
4. Reverses slider fill direction via CSS class

Numeric formatting:
- Hebrew: `₪1,240,000` (RTL context, but number stays LTR)
- English: `₪1,240,000` (same, currency symbol stays)

---

## Data Schema (localStorage)

```json
{
  "assets": [
    {
      "id": "uuid",
      "type": "pension | portfolio | gemel | kesafi | checking | deposit | hashtalamut | custom",
      "name": "string",
      "icon": "emoji string",
      "color": "hex string",
      "createdAt": "ISO date",
      "updatedAt": "ISO date",
      "fields": { /* type-specific fields */ }
    }
  ],
  "settings": {
    "language": "he | en",
    "defaultHorizon": 20
  },
  "marketCache": {
    "AAPL": { "price": 195.5, "fetchedAt": "ISO date", "history": [...] }
  }
}
```

---

## Out of Scope (v1)

- Authentication / encryption of stored data
- Automatic account sync / bank API connections
- PDF export
- Mobile app (PWA later)
- Multi-user / cloud sync
- Real-time price streaming
