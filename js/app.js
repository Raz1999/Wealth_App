import { setLanguage, getLanguage, t } from './i18n.js';
import { loadData, saveData } from './storage.js';
import { listAssets, getAsset, createAsset, updateAsset, deleteAsset } from './assets.js';
import { projectAsset } from './calculations.js';
import { renderProjectionChart } from './charts.js';
import { renderDashboard } from '../templates/dashboard.js';
import { renderProduct } from '../templates/product.js';
import { renderTypePicker } from '../templates/type-picker.js';

const app = document.getElementById('app');

function navigate(hash) { window.location.hash = hash; }

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
    mount(renderDashboard());
    renderProjectionChart('chart-global',
      [{ data: buildGlobalDataset(240), color: '#0077b6', fill: true }],
      { months: 240 });

  } else if (base === 'product') {
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
    mount(`<div class="page"><div class="card">
      <p style="text-align:center;padding:32px;color:var(--text-muted)">
        הסימולטור יהיה זמין בקרוב
      </p></div></div>`);

  } else {
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
    <td><input class="form-input" style="width:90px" name="ticker_${i}"></td>
    <td><input class="form-input" style="width:80px" name="holding_name_${i}" placeholder="אוטו-מילוי"></td>
    <td><input class="form-input" style="width:80px" type="number" name="quantity_${i}"></td>
    <td><input class="form-input" style="width:100px" type="number" name="totalValue_${i}"></td>
    <td><select class="form-input" style="width:120px" name="projMode_${i}">
      <option value="historical">CAGR היסטורי</option>
      <option value="market">ממוצע שוק</option>
      <option value="manual" selected>ידני</option>
    </select></td>
    <td><input class="form-input" style="width:60px" type="number" name="manualReturn_${i}" placeholder="%"></td>
    <td><button type="button" class="btn btn-danger btn-sm" onclick="this.closest('tr').remove()">✕</button></td>`;
  tbody.appendChild(tr);
};

// ─── Init ───
window.addEventListener('hashchange', route);
const savedLang = loadData().settings.language;
setLanguage(savedLang);
route();
