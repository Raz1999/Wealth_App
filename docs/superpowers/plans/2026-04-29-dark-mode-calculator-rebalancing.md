# Dark Mode, Reverse Calculator, Rebalancing Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add dark mode toggle, a "how much more do I need per month?" reverse calculator in the target card, and a rebalancing view showing current vs target allocation.

**Architecture:** Dark mode uses CSS custom properties under `[data-theme="dark"]` on `<html>`, saved to settings. Reverse calculator adds `computeRequiredMonthly()` to calculations.js and renders inline in the existing target card. Rebalancing is a new dashboard card with editable target % inputs saved to settings.

**Tech Stack:** CSS custom properties, vanilla JS, existing Chart.js and localStorage patterns.

---

## File Map

| File | Change |
|------|--------|
| `css/styles.css` | Add `[data-theme="dark"]` variable overrides |
| `js/app.js` | Dark mode toggle handler; apply theme on load; rebalancing save handler |
| `js/calculations.js` | Add `computeRequiredMonthly(assets, settings)` |
| `js/storage.js` | Add `darkMode: false` and `targetAllocation: {}` to DEFAULT_DATA |
| `templates/dashboard.js` | Add rebalancing card; update target card to show required monthly |
| `tests/calculations.test.js` | Add tests for `computeRequiredMonthly` |

---

## Task 1: Dark Mode

**Files:**
- Modify: `css/styles.css`
- Modify: `js/app.js`
- Modify: `js/storage.js`

### Step 1: Add dark theme CSS variables

Open `css/styles.css`. Find the `:root` block. After it, add:

```css
[data-theme="dark"] {
  --bg:           #1a1210;
  --surface:      #231a14;
  --card-bg:      #2a2018;
  --card-shadow:  0 2px 12px rgba(0,0,0,0.4);
  --border:       #3d2e22;
  --text-primary: #f0e6da;
  --text-secondary:#c8b49a;
  --text-muted:   #8a7060;
  --accent:       #38bdf8;
  --accent-hover: #0ea5e9;
  --hero-bg:      linear-gradient(135deg, #1e3a5f 0%, #0f2744 100%);
  --sim-banner-bg:#1e3a5f;
}
```

Also ensure Chart.js grid lines pick up the variable — they already reference `#f0e6d3` as a hardcoded string in `js/charts.js`. Update `js/charts.js` to use a helper that reads the CSS variable:

In `js/charts.js`, add at the top:
```js
function gridColor() {
  return getComputedStyle(document.documentElement).getPropertyValue('--border').trim() || '#f0e6d3';
}
```

Replace all occurrences of `'#f0e6d3'` in the chart options with `gridColor()`.

### Step 2: Add dark mode to storage defaults

Open `js/storage.js`. In `DEFAULT_DATA.settings`, add `darkMode: false`.

### Step 3: Apply theme on load + add toggle handler

Open `js/app.js`. In the init section at the bottom (after `setLanguage`), add:

```js
function applyTheme(dark) {
  document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
}
applyTheme(loadData().settings.darkMode || false);
```

Add toggle handler:
```js
window.__toggleDark = () => {
  const data = loadData();
  data.settings.darkMode = !data.settings.darkMode;
  saveData(data);
  applyTheme(data.settings.darkMode);
};
```

### Step 4: Add toggle button to nav

In `js/app.js`, in the `renderNav()` function, add the dark mode button before the lang toggle:

```js
<button class="lang-toggle" onclick="window.__toggleDark()" title="מצב לילה">
  ${loadData().settings.darkMode ? '☀️' : '🌙'}
</button>
```

### Step 5: Verify

- Click moon → page goes dark, button becomes sun
- Refresh → dark mode persists (saved to localStorage)
- All cards, nav, charts readable in dark mode

- [ ] Add `[data-theme="dark"]` CSS variables to `css/styles.css`
- [ ] Add `gridColor()` helper to `js/charts.js`, replace hardcoded `#f0e6d3`
- [ ] Add `darkMode: false` to `DEFAULT_DATA.settings` in `js/storage.js`
- [ ] Add `applyTheme()` + `window.__toggleDark` to `js/app.js`
- [ ] Add moon/sun button to `renderNav()` in `js/app.js`
- [ ] Test: toggle works, persists on refresh, charts still readable
- [ ] Commit:
  ```bash
  git add css/styles.css js/charts.js js/storage.js js/app.js
  git commit -m "feat: add dark mode toggle with persistent preference"
  ```

---

## Task 2: Reverse Calculator — "כמה חסר?"

**Files:**
- Modify: `js/calculations.js`
- Modify: `templates/dashboard.js`
- Modify: `tests/calculations.test.js`

### Step 1: Write failing tests

Open `tests/calculations.test.js`. Add:

```js
const { computeRequiredMonthly } = require('../js/calculations.js');

describe('computeRequiredMonthly', () => {
  test('returns 0 when already on track (projected > target)', () => {
    // Asset already projects past the target
    const assets = [{ type: 'custom', fields: { currentValue: 10000000, expectedReturn: 7, monthlyContribution: 0 } }];
    const result = computeRequiredMonthly(assets, { targetMode: 'years', targetValue: 20, currentAge: 0, inflationRate: 0, targetAmount: 5000000 });
    expect(result).toBe(0);
  });

  test('returns positive PMT when gap exists', () => {
    const assets = [{ type: 'custom', fields: { currentValue: 0, expectedReturn: 0, monthlyContribution: 0 } }];
    // Need 1,200,000 in 100 months at 0% = 12,000/month
    const result = computeRequiredMonthly(assets, { targetMode: 'years', targetValue: 100/12, currentAge: 0, inflationRate: 0, targetAmount: 1200000 });
    expect(result).toBeCloseTo(12000, -1);
  });

  test('returns 0 when targetAmount is 0', () => {
    const assets = [];
    const result = computeRequiredMonthly(assets, { targetMode: 'years', targetValue: 20, currentAge: 0, inflationRate: 0, targetAmount: 0 });
    expect(result).toBe(0);
  });
});
```

Run: `npx jest tests/calculations.test.js --no-coverage`
Expected: FAIL (computeRequiredMonthly not exported)

### Step 2: Implement computeRequiredMonthly in calculations.js

Add after `computeTargetForecast`:

```js
/**
 * Compute additional monthly contribution needed to reach a target amount.
 * Uses weighted average portfolio return as the growth rate for the PMT formula.
 * Returns 0 if already on track.
 */
function computeRequiredMonthly(assets, settings) {
  const { targetMode = 'years', targetValue = 20, currentAge = 0, inflationRate = 0, targetAmount = 0 } = settings;
  if (!targetAmount) return 0;

  const currentYear = new Date().getFullYear();
  let months;
  if (targetMode === 'age' && currentAge > 0) months = Math.max(0, (targetValue - currentAge)) * 12;
  else if (targetMode === 'year') months = Math.max(0, (targetValue - currentYear)) * 12;
  else months = Math.max(0, targetValue) * 12;

  if (months <= 0) return 0;

  // Baseline: what assets project to without any extra contribution
  const baseline = assets.reduce((s, a) => s + (projectAsset(a, months).at(-1)?.value ?? 0), 0);
  const gap = targetAmount - baseline;
  if (gap <= 0) return 0;

  // Weighted average annual return across all assets
  const totalVal = assets.reduce((s, a) => s + getAssetCurrentValue(a), 0);
  let weightedRate = 0;
  if (totalVal > 0) {
    weightedRate = assets.reduce((s, a) => {
      const w = getAssetCurrentValue(a) / totalVal;
      const r = (a.fields?.expectedReturn || a.fields?.interestRate || 0) / 100;
      return s + w * r;
    }, 0);
  }

  const rm = weightedRate / 12;
  if (Math.abs(rm) < 1e-10) return Math.ceil(gap / months);
  return Math.ceil(gap * rm / (Math.pow(1 + rm, months) - 1));
}
```

Add to both `module.exports` and `export` lines.

### Step 3: Run tests

Run: `npx jest tests/calculations.test.js --no-coverage`
Expected: all pass

### Step 4: Render required monthly in target card

Open `templates/dashboard.js`. Import `computeRequiredMonthly` from calculations.js.

In `renderTargetCard`, after computing `forecast`, also compute:
```js
const targetAmount = settings.targetAmount || 0;
const requiredMonthly = targetAmount
  ? computeRequiredMonthly(assets, { targetMode, targetValue, currentAge, inflationRate, targetAmount })
  : 0;
```

Add a target amount input to the target card inputs:
```js
<div class="target-input-group">
  <span class="target-input-label">יעד סכום (₪)</span>
  <input type="number" class="target-num-input" id="target-amount"
         value="${targetAmount || ''}" placeholder="—" min="0" step="1000"
         style="width:100px" oninput="window.__saveTarget()">
</div>
```

In `renderTargetResult`, add a required monthly block:
```js
export function renderTargetResult(forecast, requiredMonthly = 0) {
  ...
  const reqBlock = requiredMonthly > 0
    ? `<div style="margin-top:10px;padding:8px 12px;background:var(--surface);border-radius:8px;border:1px solid var(--border)">
         <span style="font-size:12px;color:var(--text-muted)">תוספת חודשית נדרשת להגיע ליעד</span>
         <div style="font-size:18px;font-weight:800;color:var(--accent);margin-top:2px">+${formatCurrency(requiredMonthly)} / חודש</div>
       </div>`
    : (forecast.total > 0 && targetAmount > 0 && requiredMonthly === 0)
      ? `<div style="margin-top:10px;font-size:12px;color:#10b981;font-weight:600">✓ בדרך הנכונה — אתה במסלול להגיע ליעד</div>`
      : '';
  ...
}
```

In `window.__saveTarget` in `app.js`, also read `target-amount`:
```js
const targetAmount = Number(document.getElementById('target-amount')?.value) || 0;
data.settings.targetAmount = targetAmount;
```

### Step 5: Verify

- Enter a target amount (e.g. 3,000,000) → shows required monthly contribution
- If current trajectory already exceeds target → shows green "on track" message
- Leave target amount blank → no required monthly shown (clean)

- [ ] Write failing tests for `computeRequiredMonthly`
- [ ] Run tests → FAIL
- [ ] Implement `computeRequiredMonthly` in `js/calculations.js`, add to exports
- [ ] Run tests → PASS
- [ ] Add target amount input + required monthly display to target card in `templates/dashboard.js`
- [ ] Update `renderTargetResult` signature to accept `requiredMonthly`
- [ ] Update `window.__saveTarget` in `js/app.js` to read target-amount and save it
- [ ] Test: enter ₪3M target → shows monthly needed
- [ ] Commit:
  ```bash
  git add js/calculations.js templates/dashboard.js js/app.js tests/calculations.test.js
  git commit -m "feat: reverse calculator shows required monthly contribution to reach target"
  ```

---

## Task 3: Rebalancing View

**Files:**
- Modify: `templates/dashboard.js`
- Modify: `js/app.js`
- Modify: `js/storage.js`

### Step 1: Add targetAllocation to storage defaults

Open `js/storage.js`. In `DEFAULT_DATA.settings`, add:
```js
targetAllocation: {}  // e.g. { pension: 40, portfolio: 35, deposit: 15, checking: 10 }
```

### Step 2: Add rebalancing card to dashboard template

Open `templates/dashboard.js`. Add a new function:

```js
function renderRebalancingCard(assets, targetAllocation) {
  const total = assets.reduce((s, a) => s + getAssetCurrentValue(a), 0);
  if (!total) return '';

  const typeMap = {};
  assets.forEach(a => {
    const v = getAssetCurrentValue(a);
    if (v > 0) typeMap[a.type] = (typeMap[a.type] || 0) + v;
  });

  const rows = Object.entries(typeMap).map(([type, value]) => {
    const currentPct = (value / total * 100);
    const targetPct  = targetAllocation[type] || 0;
    const drift      = currentPct - targetPct;
    const driftClass = Math.abs(drift) < 2 ? 'color:#10b981' : drift > 0 ? 'color:#f59e0b' : 'color:#ef4444';
    const driftSign  = drift >= 0 ? '+' : '';
    const barWidth   = Math.min(100, currentPct);
    const color      = TYPE_COLORS[type] || '#94a3b8';

    return `
      <div style="margin-bottom:14px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
          <span style="font-weight:600;font-size:13px">${t('type.' + type)}</span>
          <div style="display:flex;align-items:center;gap:10px">
            <span style="font-size:12px;color:var(--text-muted)">${currentPct.toFixed(1)}% בפועל</span>
            <input type="number" class="target-num-input" style="width:54px"
                   value="${targetPct || ''}" placeholder="יעד%"
                   min="0" max="100" step="1"
                   oninput="window.__saveRebalance('${type}', this.value)">
            ${targetPct ? `<span style="font-size:11px;font-weight:700;${driftClass}">${driftSign}${drift.toFixed(1)}%</span>` : ''}
          </div>
        </div>
        <div style="background:var(--border);border-radius:4px;height:8px;overflow:hidden">
          <div style="width:${barWidth}%;height:100%;background:${color};border-radius:4px;transition:width 0.3s"></div>
        </div>
      </div>`;
  });

  const totalTarget = Object.values(targetAllocation).reduce((s, v) => s + (Number(v) || 0), 0);
  const warning = totalTarget > 0 && Math.abs(totalTarget - 100) > 1
    ? `<div style="font-size:11px;color:#f59e0b;margin-top:4px">סה"כ יעד: ${totalTarget}% (צריך להיות 100%)</div>`
    : '';

  return `
    <div class="card">
      <span class="section-label" style="display:block;margin-bottom:14px">איזון תיק</span>
      ${rows.join('')}
      ${warning}
    </div>`;
}
```

Call it in `renderDashboard` after the allocation donut card:
```js
${renderRebalancingCard(assets, settings.targetAllocation || {})}
```

### Step 3: Add __saveRebalance handler to app.js

```js
window.__saveRebalance = (type, value) => {
  const data = loadData();
  if (!data.settings.targetAllocation) data.settings.targetAllocation = {};
  data.settings.targetAllocation[type] = Number(value) || 0;
  saveData(data);
  // Update warning label without full re-render
  const total = Object.values(data.settings.targetAllocation).reduce((s, v) => s + v, 0);
  // (warning updates naturally on next render; skip surgical update for simplicity)
};
```

### Step 4: Verify

- Dashboard shows rebalancing card with all asset types as rows
- Current % fills automatically from real values
- Type a target % next to each type → drift badge appears (green if <2%, yellow/red otherwise)
- If targets sum to ≠100% → warning shown
- Values persist on refresh

- [ ] Add `targetAllocation: {}` to `DEFAULT_DATA.settings` in `js/storage.js`
- [ ] Add `renderRebalancingCard()` to `templates/dashboard.js`
- [ ] Call `renderRebalancingCard` inside `renderDashboard`
- [ ] Add `window.__saveRebalance` to `js/app.js`
- [ ] Test: enter target %s, check drift badges, check persistence
- [ ] Commit:
  ```bash
  git add templates/dashboard.js js/app.js js/storage.js
  git commit -m "feat: add rebalancing view with editable target allocation percentages"
  ```
