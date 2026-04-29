import { setLanguage, getLanguage, t } from './i18n.js';
import { loadData, saveData } from './storage.js';
import { listAssets, getAsset, createAsset, updateAsset, deleteAsset } from './assets.js';
import { projectAsset, computeTargetForecast } from './calculations.js';
import { renderProjectionChart } from './charts.js';
import { formatCurrency } from './utils.js';
import { renderDashboard, renderTargetResult } from '../templates/dashboard.js';
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
  return `
    <nav class="nav">
      <div class="nav-logo">My<span>Wealth</span></div>
      <div class="nav-actions">
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
    const dashData = loadData();
    mount(renderDashboard(dashData.settings));
    renderProjectionChart('chart-global',
      [{ data: buildGlobalDataset(240), color: '#0077b6', fill: true }],
      { months: 240 });

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
              onchange="const td=this.closest('tr').querySelector('.manual-ret-td');td.style.display=this.value==='manual'?'':'none'">
      <option value="manual" selected>ידני (%)</option>
      <option value="market">S&P 500 (~10%)</option>
      <option value="ta125">ת"א 125 (~8%)</option>
      <option value="historical">CAGR היסטורי</option>
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

  const data = loadData();
  data.settings.currentAge    = currentAge;
  data.settings.targetMode    = mode;
  data.settings.targetValue   = targetValue;
  data.settings.inflationRate = inflationRate;
  saveData(data);

  const forecast = computeTargetForecast(listAssets(), { currentAge, targetMode: mode, targetValue, inflationRate });
  const resultEl = document.getElementById('target-result');
  if (resultEl) resultEl.innerHTML = renderTargetResult(forecast);
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
window.addEventListener('hashchange', route);
const savedLang = loadData().settings.language;
setLanguage(savedLang);
route();
