# MyWealth — Personal Financial Dashboard
**Spec Date:** 2026-04-28
**Status:** Approved

---

## Overview

A personal financial dashboard for tracking all financial assets in one place. Built as a modular local HTML application, with localStorage for persistence, bilingual support (Hebrew RTL / English LTR), and a compound interest simulator.

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
| Architecture | Single `index.html` SPA + modular JS | Hash-based routing, no page reloads, works over local HTTP |
| Serving | `python -m http.server 8080` (or any static server) | Required for fetch() and market data; documented in README |
| Persistence | `localStorage` | Browser-local only, no external server |
| Charts | Chart.js v4.x (CDN, pinned version) | RTL axis support via `reverse: true`, no build step |
| Market data | Yahoo Finance + TASE via `allorigins.win` CORS proxy | Handles CORS for local file serving; fallback = manual entry |
| Languages | Hebrew (RTL default) + English (LTR) | Toggle flips `dir` on entire page |
| Styling | Plain CSS with CSS variables | No framework, easy to theme |

**Market data degradation:**
- If the CORS proxy (`allorigins.win`) is unreachable → show last cached value + "⚠ offline" badge
- If no cache exists → show "—" and fall back to user-entered manual return rate
- Cache staleness threshold: 24 hours — warn user after that

---

## File Structure

```
Personal_BI_Dash/
├── index.html              # Single entry point — SPA shell
├── css/
│   └── styles.css          # All styles, CSS variables for theme
├── js/
│   ├── app.js              # Hash-based router, view mounting
│   ├── storage.js          # localStorage read/write helpers
│   ├── assets.js           # Asset CRUD operations
│   ├── calculations.js     # Compound interest, projections
│   ├── charts.js           # Chart.js wrappers (RTL-aware)
│   ├── market-data.js      # Yahoo Finance / TASE via CORS proxy
│   ├── simulator.js        # What-if simulator logic
│   └── i18n.js             # Hebrew/English translations
├── templates/
│   ├── dashboard.js        # Dashboard view (returns HTML string)
│   ├── product.js          # Product detail/edit view (returns HTML string)
│   └── simulator.js        # Simulator view (returns HTML string)
├── README.md               # How to run (python -m http.server 8080)
└── .gitignore
```

**Navigation model:** True SPA. `index.html` contains a single `<div id="app">`. All views are JS template functions that return HTML strings, injected into `#app` by the router. No separate HTML files are fetched. Asset IDs are passed via hash: `#product/uuid`, `#simulator`, `#simulator/uuid`.

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

**Asset colors** — auto-assigned from an ordered palette on creation; user cannot change color (only icon). Used as: left border accent on asset card, chart line color, icon background tint.

Palette order: `#0077b6`, `#10b981`, `#f59e0b`, `#8b5cf6`, `#ef4444`, `#06b6d4`, `#84cc16`, `#f97316`

**RTL / LTR rules:**
- Default: `dir="rtl"`, Hebrew
- Language toggle switches `<html dir="">` and updates all `data-i18n` strings
- Sliders: RTL uses CSS `direction: rtl` on the `<input type="range">` element — fills right-to-left natively
- Chart time axis: `reverse: true` on Chart.js x-axis in RTL mode; `reverse: false` in LTR
- Chart.js version: pinned to `4.4.x` via CDN for stable `reverse` support
- Monetary values and numbers always render LTR (Unicode bidi handles this automatically)

**Typography:** system-ui / -apple-system stack. No web fonts.

---

## Navigation Flow

```
#dashboard (index.html)
├── Click asset card  →  #product/{id}
│                          ├── Edit fields, save to localStorage
│                          ├── View asset-specific projection chart
│                          └── "Simulate this asset" → #simulator/{id}
├── "+ Add Asset" btn →  #product/new?type={type}
└── "Open Simulator"  →  #simulator
                           ├── Toggle: Global / per-asset tabs
                           └── Each asset row expands with sliders
```

---

## Dashboard View

**Top-to-bottom layout:**

1. **Nav bar** — Logo + Language toggle (עב | EN) + "+ Add Asset" button
2. **Hero summary card** (blue gradient) — Total net worth · 20Y projection · Avg annual return · Total monthly contribution (sum of all asset PMTs)
3. **Global projection chart** — Solid line (current trajectory) + dashed line (projected future), time range selector (5Y / 20Y / 30Y), RTL axis
4. **"My Assets" section heading**
5. **Asset card list** (see schema below for data)
6. **Simulator entry banner** — CTA into global simulator

**Asset card:**
- Custom emoji icon + Asset name + Asset type label
- Colored left border (from asset `color`)
- Current value (right-aligned)
- Annual return rate
- Chevron → navigates to `#product/{id}`

---

## Product Types & Fields

### 1. תיק השקעות אישי (Investment Portfolio)
- Broker name (text)
- **Holdings table:** each row = { ticker, name (auto-filled), quantity OR total value, live price (fetched), current value (calculated), weight % }
- Projection per holding: user selects Historical CAGR / Market average / Manual %
- Portfolio management fee (% annual, applied as drag)
- Monthly cash contribution (₪)

### 2. קרן פנסיה (Pension Fund)
- Company name · Track name (text)
- Current accumulated value (₪)
- Gross monthly salary (₪)
- Employee contribution (% of salary)
- Employer contribution (% of salary)
- Management fee from accumulation (% annual, applied to balance)
- Management fee from deposits (% of each deposit, deducted before compounding)
- Expected annual return (%)

### 3. קופת גמל להשקעה (Investment Provident Fund)
- Company name · Track (text)
- Current value (₪)
- Monthly contribution (₪)
- Expected annual return (%)
- Management fee (% annual)

### 4. קרן כספית (Money Market Fund)
- Fund name (text)
- Current value (₪)
- Expected return (default: Prime − 0.1%, user-editable %)
- Management fee (%)
- Monthly contribution (₪)

### 5. עובר ושב (Checking Account)
- Bank name (text)
- Current balance (₪)
- Interest rate on balance (% annual, default 0)
- **Projection behavior:** included in net worth snapshot. If interest > 0, projected normally. Monthly contribution = 0 (balance is treated as static unless interest applies). Explicitly excluded from "total monthly contribution" aggregation.

### 6. פיקדון / חיסכון בנקאי (Bank Deposit / Savings)
- Bank name (text)
- Principal (₪)
- Annual interest rate (%)
- Interest type: Simple (default for Israeli deposits) or Compound
- Maturity date
- Auto-renew (yes/no)
- **Projection behavior:** if auto-renew = true, projection continues beyond maturity at same rate. If auto-renew = false, balance flatlines at maturity value. Monthly contribution = 0.

### 7. קרן השתלמות (Study Fund)
- Company name · Track (text)
- Current value (₪)
- Gross monthly salary (₪)
- Employee contribution (% of salary)
- Employer contribution (% of salary)
- Liquidity date (date picker)
- Management fee (% annual)
- Expected annual return (%)

### 8. נכס חופשי / Custom
- Name (text)
- Custom emoji icon
- Current value (₪)
- Expected annual return (%)
- Monthly contribution (₪)
- Description (free text)

---

## Market Data (תיק השקעות)

**Data sources:**
- US stocks & ETFs: `https://query1.finance.yahoo.com` via `https://api.allorigins.win/get?url=...`
- Israeli stocks & funds: TASE public API via same proxy

**Per holding, fetched data:**
- Current price
- 1D, 1W, 1M, 1Y performance
- Historical OHLC for CAGR: `[{ "date": "YYYY-MM-DD", "close": number }]`

**Cache schema:**
```json
"marketCache": {
  "AAPL:yahoo": { "price": 195.5, "fetchedAt": "2026-04-28T10:00:00Z", "history": [...] },
  "1159268:tase": { "price": 142.3, "fetchedAt": "2026-04-28T10:00:00Z", "history": [...] }
}
```
Keys are `ticker:source` to avoid collisions.

**Projection options (user selects per holding):**
1. Historical CAGR (calculated from history array)
2. Market average (SPY ≈ 10% / TA-125 ≈ 8%)
3. Manual override (user inputs %)

**Refresh:** Manual only — "Update Prices" button.

**Error states:**
- Fetch fails → show last cached value + "⚠ לא מעודכן" badge
- No cache → show "—" price, projection uses manual/market-average fallback
- Cache > 24h → show "⚠ מחיר ישן" warning on the holding row

---

## Projection Calculation

### Standard products (Provident, Money Market, Custom, Checking)

```
FV = PV × (1 + r_m)^n  +  PMT × [((1 + r_m)^n − 1) / r_m]

where:
  PV    = current value
  r_m   = effective monthly rate = ((1 + r_annual − fee_annual) ^ (1/12)) − 1
  n     = projection months
  PMT   = monthly contribution
```

### Pension & Study Fund

Monthly contribution is salary-derived:
```
PMT_net = salary × (employee% + employer%) × (1 − fee_deposit%)
```

Effective monthly rate accounts for accumulation fee:
```
r_m = ((1 + r_annual − fee_accumulation%) ^ (1/12)) − 1
```

Then apply standard FV formula with `PMT_net` and `r_m`.

**Note:** All inputs are gross (pre-tax). Tax implications are out of scope for v1.

### Bank Deposit

- **Simple interest:** `FV = PV × (1 + r_annual × (n / 12))` where `n` = projection months (fractional years supported) — flatlines at maturity if no auto-renew
- **Compound interest:** standard FV formula with PMT = 0

### Investment Portfolio

Portfolio FV = sum of per-holding FVs, each calculated with its own CAGR/return rate and weighted contribution. Monthly PMT is distributed proportionally to **initial weights** (fixed at projection start — no dynamic rebalancing). This keeps calculations simple and deterministic.

---

## Data Schema (localStorage key: `mywealth_data`)

```json
{
  "assets": [
    {
      "id": "uuid-v4",
      "type": "pension | portfolio | gemel | kesafi | checking | deposit | hashtalamut | custom",
      "name": "string",
      "icon": "emoji",
      "color": "#hex — auto-assigned from palette, index = asset creation order % 8",
      "createdAt": "ISO-8601",
      "updatedAt": "ISO-8601",
      "fields": { }
    }
  ],
  "settings": {
    "language": "he | en",
    "defaultHorizon": 20
  },
  "marketCache": { }
}
```

**`fields` shape per type:**

```js
// pension
{ salary, employeeContrib, employerContrib, accumulationFee, depositFee, expectedReturn, currentValue, company, track }

// portfolio
{ broker, managementFee, monthlyContribution,
  holdings: [{ ticker, source, name, quantity, totalValue, projectionMode, manualReturn }] }
// note: currentValue and weight% are derived at runtime (price × quantity) and not persisted

// gemel (קופת גמל)
{ company, track, currentValue, monthlyContribution, expectedReturn, managementFee }

// kesafi (קרן כספית)
{ fundName, currentValue, expectedReturn, managementFee, monthlyContribution }

// checking
{ bank, balance, interestRate }

// deposit
{ bank, principal, interestRate, interestType, maturityDate, autoRenew }

// hashtalamut (קרן השתלמות)
{ company, track, currentValue, salary, employeeContrib, employerContrib, liquidityDate, managementFee, expectedReturn }

// custom
{ currentValue, expectedReturn, monthlyContribution, description }
```

**`settings.defaultHorizon`:** integer, constrained 1–30 by the settings UI.

---

## Simulator — "What If"

**Two entry modes:**

| Mode | Route | Scope |
|------|-------|-------|
| Global | `#simulator` | All assets |
| Focused | `#simulator/{asset-id}` | Single asset |

Both modes use the same simulator view. A tab bar at the top shows:
`[ כולל ] [ Asset 1 ] [ Asset 2 ] ...` — selecting a tab switches to focused mode for that asset.

**Global mode layout:**
1. **Impact summary bar:** Projected total (scenario) · New monthly total · Avg return — all with ±delta vs. current trajectory
2. **Comparison chart:** gray dashed (current) vs. blue solid (scenario), `reverse: true` in RTL
3. **Time horizon slider:** 1–30Y (respects `defaultHorizon` as initial value)
4. **Per-asset rows** (collapsible accordion), each showing:
   - Asset name + icon + current value
   - Delta badge: "±₪X vs. מסלול נוכחי"
   - Expanded: sliders + original values + mini comparison chart + Reset button

**Slider definitions per product (Global Mode):**

| Slider | Standard products | Pension / Study Fund |
|--------|------------------|----------------------|
| Monthly contribution | ₪0–₪20,000, step ₪100 (direct ₪ amount) | "תרומה חודשית אפקטיבית" — read-only derived field; not a slider in global mode |
| Expected return | 0–25%, step 0.1% | 0–25%, step 0.1% |
| Management fee | 0–3%, step 0.05% | Accumulation fee only, 0–3%, step 0.05% |

**Focused mode** (single asset): full parameter set visible. Pension/Study Fund shows salary + employee% + employer% sliders instead of the derived contribution label.

**Simulator state:** stored in memory only — never written to localStorage. Navigating away resets the simulator.

---

## i18n (Internationalization)

All strings in `js/i18n.js` as `{ he: {}, en: {} }`. Elements use `data-i18n="key"`.

Language toggle:
1. Sets `<html dir="rtl|ltr" lang="he|en">`
2. Re-renders all `data-i18n` elements
3. Flips chart axes (`reverse: true/false`)
4. CSS `direction: rtl/ltr` on range inputs

---

## Out of Scope (v1)

- Authentication / encryption of localStorage data
- Automatic account sync / bank API connections
- PDF / CSV export
- PWA / mobile app
- Multi-user / cloud sync
- Tax calculations
- Salary-linked pension projections post-tax
