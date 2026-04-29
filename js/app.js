import { setLanguage, getLanguage, t } from './i18n.js';
import { loadData, saveData, snapshotNetWorth } from './storage.js';
import { listAssets, getAsset, createAsset, updateAsset, deleteAsset } from './assets.js';
import { fetchPortfolioPrices } from './market.js';
import { projectAsset, computeTargetForecast, getAssetCurrentValue, computeRequiredMonthly } from './calculations.js';
import { renderProjectionChart, renderAllocationChart, renderHistoryChart } from './charts.js';
import { formatCurrency } from './utils.js';
import { renderDashboard, renderTargetResult, buildAllocationSlices } from '../templates/dashboard.js';
import { renderProduct } from '../templates/product.js';
import { renderTypePicker } from '../templates/type-picker.js';
import { renderSimulator, renderAccordionBody } from '../templates/simulator.js';
import {
  initSimulator, getSimHorizon, setSimHorizon,
  setOverride, resetOverride,
  isAccordionOpen, toggleAccordion,
  projectWithOverrides, buildSimDatasets,
  baselineTotal, scenarioTotal,
  baselineMonthly, scenarioMonthly,
  baselineAvgReturn, scenarioAvgReturn,
} from './simulator.js';

const app = document.getElementById('app');

function navigate(hash) { window.location.hash = hash; }

// ─── Simulator helpers ────────────────────────────────────────────
let _simActive = false;

function getCurrentSimFocusedId() {
  const parts = (window.location.hash || '').replace('#', '').split('/');
  return parts[0] === 'simulator' && parts[1] ? parts[1] : null;
}

function getSimDisplayAssets() {
  const focusedId = getCurrentSimFocusedId();
  const assets    = listAssets();
  return focusedId ? assets.filter(a => a.id === focusedId) : assets;
}

function updateSimImpactBar() {
  const assets = getSimDisplayAssets();
  const months = getSimHorizon();

  const sT = scenarioTotal(assets, months);
  const dT = sT - baselineTotal(assets, months);
  const sM = scenarioMonthly(assets);
  const dM = sM - baselineMonthly(assets);
  const sR = scenarioAvgReturn(assets);
  const dR = sR - baselineAvgReturn(assets);

  const el   = id => document.getElementById(id);
  const cls  = d  => 'badge sim-metric-delta ' + (d >= 0 ? 'badge-positive' : 'badge-negative');
  const dtxt = (d, isCur) => (d >= 0 ? '+' : '−') + (isCur ? formatCurrency(Math.abs(d)) : Math.abs(d).toFixed(1) + '%');

  if (el('sim-total-val')) {
    el('sim-total-val').textContent    = formatCurrency(sT);
    el('sim-total-delta').textContent  = dtxt(dT, true);
    el('sim-total-delta').className    = cls(dT);
  }
  if (el('sim-monthly-val')) {
    el('sim-monthly-val').textContent  = formatCurrency(sM);
    el('sim-monthly-delta').textContent = dtxt(dM, true);
    el('sim-monthly-delta').className  = cls(dM);
  }
  if (el('sim-return-val')) {
    el('sim-return-val').textContent   = sR.toFixed(1) + '%';
    el('sim-return-delta').textContent = dtxt(dR, false);
    el('sim-return-delta').className   = cls(dR);
  }
}

function updateSimChart() {
  const assets  = getSimDisplayAssets();
  const months  = getSimHorizon();
  const { baseline, scenario } = buildSimDatasets(assets, months);
  renderProjectionChart('chart-sim', [
    { label: t('sim.currentTrajectory'), data: baseline, color: '#94a3b8', dashed: true, width: 1.5 },
    { label: t('sim.scenario'),          data: scenario, color: '#0077b6', fill: true,   width: 3,   fillOpacity: 0.18 },
  ], { months });
}

function updateSimMiniChart(assetId) {
  const asset = listAssets().find(a => a.id === assetId);
  if (!asset) return;
  const months   = getSimHorizon();
  const baseline = projectAsset(asset, months).map(p => ({ x: p.month, y: p.value }));
  const scenario = projectWithOverrides(asset, months).map(p => ({ x: p.month, y: p.value }));
  renderProjectionChart(`chart-sim-${assetId}`, [
    { label: t('sim.currentTrajectory'), data: baseline, color: '#94a3b8', dashed: true, width: 1.5 },
    { label: t('sim.scenario'),          data: scenario, color: asset.color, fill: true, width: 2.5, fillOpacity: 0.15 },
  ], { months });

  const delta = (scenario.at(-1)?.y ?? 0) - (baseline.at(-1)?.y ?? 0);
  const badge = document.getElementById(`sim-delta-badge-${assetId}`);
  if (badge) {
    badge.textContent = (delta >= 0 ? '+' : '−') + formatCurrency(Math.abs(delta));
    badge.className   = 'badge ' + (delta >= 0 ? 'badge-positive' : 'badge-negative');
    badge.style.display = '';
  }
}

function renderNav() {
  const isDark = loadData().settings.darkMode || false;
  return `
    <nav class="nav">
      <div class="nav-logo">My<span>Wealth</span></div>
      <div class="nav-actions">
        <button class="lang-toggle" onclick="window.__toggleDark()" title="מצב לילה" style="font-size:16px;padding:6px 10px">${isDark ? '☀️' : '🌙'}</button>
        <button class="lang-toggle" onclick="window.__toggleLang()">${t('nav.lang')}</button>
        <button class="btn btn-primary btn-sm" onclick="window.__navigate('#product/new')">${t('nav.addAsset')}</button>
      </div>
    </nav>`;
}

function mount(html) { app.innerHTML = renderNav() + html; }

/**
 * Build global projection dataset efficiently:
 * Call projectAsset once per asset (returns full series), then sum by month.
 */
function buildGlobalDataset(months) {
  const assets = listAssets();
  if (!assets.length) return [];
  const monthMap = {};
  assets.forEach(asset => {
    projectAsset(asset, months).forEach(p => {
      monthMap[p.month] = (monthMap[p.month] || 0) + p.value;
    });
  });
  return Object.entries(monthMap)
    .map(([m, v]) => ({ x: Number(m), y: v }))
    .sort((a, b) => a.x - b.x);
}

function route() {
  const hash = window.location.hash || '#dashboard';
  const hashPath = hash.replace('#', '').split('?')[0];
  const [base, param] = hashPath.split('/');
  const queryStr = hash.includes('?') ? hash.split('?')[1] : '';
  const type = new URLSearchParams(queryStr).get('type');

  if (base === 'dashboard' || base === '') {
    _simActive = false;
    const currentTotal = listAssets().reduce((s, a) => s + getAssetCurrentValue(a), 0);
    snapshotNetWorth(currentTotal);
    const freshData = loadData(); // re-read after potential snapshot write
    mount(renderDashboard(freshData.settings, freshData.history || []));
    renderProjectionChart('chart-global',
      [{ data: buildGlobalDataset(240), color: '#0077b6', fill: true }],
      { months: 240 });
    const slices = buildAllocationSlices(listAssets());
    if (slices.length) renderAllocationChart('chart-allocation', slices);
    const histData = freshData.history || [];
    if (histData.length >= 2) renderHistoryChart('chart-history', histData);

  } else if (base === 'product') {
    _simActive = false;
    if (param === 'new' && !type) {
      mount(renderTypePicker());
    } else {
      const assetId = param === 'new' ? null : param;
      mount(renderProduct(assetId, type));
      if (assetId) {
        const asset = getAsset(assetId);
        if (asset) {
          const pts = projectAsset(asset, 240);
          renderProjectionChart('chart-product',
            [{ data: pts.map(p => ({ x: p.month, y: p.value })), color: asset.color, fill: true }],
            { months: 240 });
        }
      }
    }

  } else if (base === 'simulator') {
    const focusedId = param || null;
    if (!_simActive) {
      initSimulator(loadData().settings.defaultHorizon || 20);
      _simActive = true;
    }
    mount(renderSimulator(focusedId));
    updateSimChart();
    listAssets().forEach(a => { if (isAccordionOpen(a.id)) updateSimMiniChart(a.id); });

  } else {
    _simActive = false;
    mount('<div class="page"><p>Not found</p></div>');
  }
}

// ─── Global handlers (called from inline onclick in templates) ───
window.__navigate = navigate;

window.__toggleLang = () => {
  const next = getLanguage() === 'he' ? 'en' : 'he';
  const data = loadData();
  data.settings.language = next;
  saveData(data);
  setLanguage(next);
  route();
};

window.__exportData = () => {
  const json = JSON.stringify(loadData(), null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `mywealth-backup-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

window.__importData = (input) => {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const parsed = JSON.parse(e.target.result);
      if (!parsed.assets || !parsed.settings) {
        alert('קובץ לא תקין — חסרים שדות assets או settings');
        return;
      }
      saveData(parsed);
      route();
    } catch {
      alert('שגיאה בקריאת הקובץ');
    }
  };
  reader.readAsText(file);
  input.value = '';
};

window.__saveRebalance = (type, value) => {
  const data = loadData();
  if (!data.settings.targetAllocation) data.settings.targetAllocation = {};
  const numValue = Number(value) || 0;
  data.settings.targetAllocation[type] = numValue;
  saveData(data);

  // Update drift badge for this row
  const driftEl = document.getElementById(`rebalance-drift-${type}`);
  if (driftEl) {
    const assets   = listAssets();
    const total    = assets.reduce((s, a) => s + getAssetCurrentValue(a), 0);
    const typeVal  = assets.filter(a => a.type === type).reduce((s, a) => s + getAssetCurrentValue(a), 0);
    const current  = total ? (typeVal / total * 100) : 0;
    const drift    = current - numValue;
    const color    = Math.abs(drift) < 2 ? 'var(--green-positive)' : drift > 0 ? 'var(--yellow-mid)' : 'var(--red-negative)';
    driftEl.textContent   = numValue ? `${drift >= 0 ? '+' : ''}${drift.toFixed(1)}%` : '';
    driftEl.style.color   = color;
    driftEl.style.display = numValue ? '' : 'none';
  }

  // Update total warning
  const warningEl = document.getElementById('rebalance-warning');
  if (warningEl) {
    const sum = Object.values(data.settings.targetAllocation).reduce((s, v) => s + (Number(v) || 0), 0);
    const show = sum > 0 && Math.abs(sum - 100) > 1;
    warningEl.textContent   = show ? `סה"כ יעד: ${sum}% (צריך להיות 100%)` : '';
    warningEl.style.display = show ? '' : 'none';
  }
};

window.__fetchPrices = async () => {
  const statusEl = document.getElementById('prices-status');
  const id = window.location.hash.split('/')[1]?.split('?')[0];
  const asset = id ? getAsset(id) : null;
  if (!asset || asset.type !== 'portfolio') return;

  if (statusEl) statusEl.textContent = 'מעדכן...';
  const priceMap = await fetchPortfolioPrices(asset);

  let updated = 0;
  const rows = document.querySelectorAll('#holdings-body tr');
  rows.forEach((tr, i) => {
    const tickerInput = tr.querySelector(`input[name="ticker_${i}"]`);
    const valueInput  = tr.querySelector(`input[name="totalValue_${i}"]`);
    const qtyInput    = tr.querySelector(`input[name="quantity_${i}"]`);
    if (!tickerInput || !valueInput) return;
    const ticker = tickerInput.value.trim();
    const price  = priceMap.get(ticker);
    const qty    = parseFloat(qtyInput?.value) || 0;
    if (price !== null && price !== undefined) {
      if (qty > 0) valueInput.value = Math.round(price * qty);
      updated++;
    }
  });

  if (statusEl) {
    statusEl.textContent = updated
      ? `עודכנו ${updated} אחזקות · ${new Date().toLocaleTimeString('he-IL')}`
      : 'לא נמצאו מחירים';
  }
};

window.__setHorizon = (months, btn) => {
  document.querySelectorAll('.chart-ctrl').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderProjectionChart('chart-global',
    [{ data: buildGlobalDataset(months), color: '#0077b6', fill: true }],
    { months });
};

window.__setProductHorizon = (months, btn) => {
  document.querySelectorAll('.chart-ctrl').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  const id = window.location.hash.split('/')[1]?.split('?')[0];
  const asset = getAsset(id);
  if (!asset) return;
  const pts = projectAsset(asset, months);
  renderProjectionChart('chart-product',
    [{ data: pts.map(p => ({ x: p.month, y: p.value })), color: asset.color, fill: true }],
    { months });
};

window.__saveAsset = (e, idOrNew, type) => {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(e.target));
  const name = data.name; const icon = data.icon;
  delete data.name; delete data.icon;
  const fields = {};
  const holdingKeys = ['ticker_', 'holding_name_', 'quantity_', 'totalValue_', 'projMode_', 'manualReturn_'];
  Object.entries(data).forEach(([k, v]) => {
    if (!holdingKeys.some(p => k.startsWith(p))) {
      fields[k] = isNaN(v) || v === '' ? v : Number(v);
    }
  });
  if (type === 'portfolio') {
    const rows = document.querySelectorAll('#holdings-body tr');
    fields.holdings = [];
    rows.forEach((_, i) => {
      const ticker = data[`ticker_${i}`];
      if (ticker) fields.holdings.push({
        ticker, name: data[`holding_name_${i}`] || '',
        quantity: Number(data[`quantity_${i}`]) || null,
        totalValue: Number(data[`totalValue_${i}`]) || null,
        projectionMode: data[`projMode_${i}`] || 'manual',
        manualReturn: Number(data[`manualReturn_${i}`]) || 0
      });
    });
  }
  if (idOrNew === 'new') { createAsset(type, name, { ...fields, icon }); }
  else { updateAsset(idOrNew, { name, icon, fields }); }
  navigate('#dashboard');
};

window.__deleteAsset = (id) => {
  if (confirm('למחוק את הנכס?')) { deleteAsset(id); navigate('#dashboard'); }
};

window.__addHoldingRow = () => {
  const tbody = document.getElementById('holdings-body');
  const i = tbody.rows.length;
  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td><input class="form-input" style="width:110px" name="ticker_${i}" placeholder="AAPL / 5100386"></td>
    <td><input class="form-input" style="width:80px" name="holding_name_${i}" placeholder="אוטו-מילוי"></td>
    <td><input class="form-input" style="width:80px" type="number" name="quantity_${i}"></td>
    <td><input class="form-input" style="width:100px" type="number" name="totalValue_${i}"></td>
    <td><select class="form-input" style="width:148px" name="projMode_${i}"
              onchange="const td=this.closest('tr').querySelector('.manual-ret-td');td.style.display=(this.value==='manual'||this.value==='historical')?'':'none'">
      <option value="manual" selected>ידני (%)</option>
      <option value="market">S&P 500 (~10%)</option>
      <option value="ta125">ת"א 125 (~8%)</option>
      <option value="msci">MSCI World (~9%)</option>
      <option value="historical">CAGR היסטורי</option>
      <option value="unknown">לא ידוע (0%)</option>
    </select></td>
    <td class="manual-ret-td"><input class="form-input" style="width:60px" type="number" step="any" name="manualReturn_${i}" placeholder="%"></td>
    <td><button type="button" class="btn btn-danger btn-sm" onclick="this.closest('tr').remove()">✕</button></td>`;
  tbody.appendChild(tr);
};

// ─── Target forecast handler ───
window.__saveTarget = () => {
  const currentAge    = Number(document.getElementById('target-current-age')?.value) || 0;
  const mode          = document.getElementById('target-mode')?.value || 'years';
  const targetValue   = Number(document.getElementById('target-value')?.value) || 20;
  const inflationRate = Number(document.getElementById('target-inflation')?.value) ?? 3;

  // Update suffix visibility and input placeholder
  const suffix = document.getElementById('target-suffix');
  if (suffix) suffix.style.display = mode === 'years' ? '' : 'none';
  const valInput = document.getElementById('target-value');
  if (valInput) {
    const cy = new Date().getFullYear();
    if (mode === 'age')       valInput.placeholder = '67';
    else if (mode === 'year') valInput.placeholder = String(cy + 20);
    else                      valInput.placeholder = '20';
  }

  const targetAmount  = Number(document.getElementById('target-amount')?.value) || 0;

  const data = loadData();
  data.settings.currentAge    = currentAge;
  data.settings.targetMode    = mode;
  data.settings.targetValue   = targetValue;
  data.settings.inflationRate = inflationRate;
  data.settings.targetAmount  = targetAmount;
  saveData(data);

  const assets = listAssets();
  const forecast = computeTargetForecast(assets, { currentAge, targetMode: mode, targetValue, inflationRate });
  const requiredMonthly = targetAmount
    ? computeRequiredMonthly(assets, { targetMode: mode, targetValue, currentAge, targetAmount })
    : 0;
  const resultEl = document.getElementById('target-result');
  if (resultEl) resultEl.innerHTML = renderTargetResult(forecast, requiredMonthly, targetAmount);
};

// ─── Simulator handlers ───
window.__simSlider = (assetId, field, rawValue) => {
  setOverride(assetId, field, rawValue);
  const span = document.getElementById(`sim-val-${assetId}-${field}`);
  if (span) {
    const v = Number(rawValue);
    const isCurrency = field === 'monthlyContribution' || field === 'salary';
    const decimals   = (field === 'managementFee' || field === 'accumulationFee') ? 2 : 1;
    span.textContent = isCurrency ? formatCurrency(v) : v.toFixed(decimals) + '%';
  }
  updateSimImpactBar();
  updateSimChart();
  if (document.getElementById(`chart-sim-${assetId}`)) updateSimMiniChart(assetId);
};

window.__simHorizon = (months) => {
  setSimHorizon(months);
  const label = document.getElementById('sim-horizon-label');
  if (label) {
    const y = Math.round(months / 12);
    label.textContent = getLanguage() === 'he' ? `${y} שנים` : `${y} Years`;
  }
  updateSimImpactBar();
  updateSimChart();
  listAssets().forEach(a => { if (document.getElementById(`chart-sim-${a.id}`)) updateSimMiniChart(a.id); });
};

window.__simToggle = (assetId) => {
  toggleAccordion(assetId);
  const body   = document.getElementById(`sim-acc-body-${assetId}`);
  const arrow  = document.querySelector(`#sim-acc-${assetId} .sim-acc-header span:last-child`);
  const isOpen = isAccordionOpen(assetId);
  if (body)  body.style.display  = isOpen ? '' : 'none';
  if (arrow) arrow.textContent   = isOpen ? '▲' : '▼';
  if (isOpen) updateSimMiniChart(assetId);
};

window.__simReset = (assetId) => {
  resetOverride(assetId);
  const focusedId = getCurrentSimFocusedId();
  if (focusedId) {
    // Focused mode: re-render the whole view to reset slider inputs
    route();
    return;
  }
  // Global mode: surgically replace accordion body content
  const asset = listAssets().find(a => a.id === assetId);
  if (asset) {
    const body = document.getElementById(`sim-acc-body-${assetId}`);
    if (body) {
      body.innerHTML = renderAccordionBody(asset);
      if (isAccordionOpen(assetId)) updateSimMiniChart(assetId);
    }
    const badge = document.getElementById(`sim-delta-badge-${assetId}`);
    if (badge) badge.style.display = 'none';
  }
  updateSimImpactBar();
  updateSimChart();
};

// ─── Init ───
function applyTheme(dark) {
  document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
}

window.__toggleDark = () => {
  const data = loadData();
  data.settings.darkMode = !data.settings.darkMode;
  saveData(data);
  applyTheme(data.settings.darkMode);
  route();
};

window.addEventListener('hashchange', route);
const _initData = loadData();
setLanguage(_initData.settings.language);
applyTheme(_initData.settings.darkMode || false);
route();
