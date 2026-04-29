import { t, getLanguage } from '../js/i18n.js';
import { listAssets } from '../js/assets.js';
import { formatCurrency, escapeHtml } from '../js/utils.js';
import {
  getSimHorizon, getOverrides, isAccordionOpen,
  baselineTotal, scenarioTotal,
  baselineMonthly, scenarioMonthly,
  baselineAvgReturn, scenarioAvgReturn,
} from '../js/simulator.js';

// ─── Formatting helpers ───────────────────────────────────────

function fmtYears(months) {
  const y = Math.round(months / 12);
  return getLanguage() === 'he' ? `${y} שנים` : `${y} Years`;
}

function deltaClass(d) { return d >= 0 ? 'badge-positive' : 'badge-negative'; }

function deltaText(d, isCurrency) {
  const sign = d >= 0 ? '+' : '−';
  const abs  = Math.abs(d);
  return sign + (isCurrency ? formatCurrency(abs) : abs.toFixed(1) + '%');
}

// ─── Impact bar ───────────────────────────────────────────────

function renderImpactBar(assets, months) {
  const bT = baselineTotal(assets, months);
  const sT = scenarioTotal(assets, months);
  const dT = sT - bT;

  const bM = baselineMonthly(assets);
  const sM = scenarioMonthly(assets);
  const dM = sM - bM;

  const bR = baselineAvgReturn(assets);
  const sR = scenarioAvgReturn(assets);
  const dR = sR - bR;

  const metric = (label, val, delta, isCur, idBase) => `
    <div class="sim-metric">
      <div class="sim-metric-label">${label}</div>
      <div class="sim-metric-val" id="${idBase}-val">${val}</div>
      <div class="badge ${deltaClass(delta)} sim-metric-delta" id="${idBase}-delta">${deltaText(delta, isCur)}</div>
    </div>`;

  return `
    <div class="sim-impact-bar">
      ${metric(`${t('sim.projTotal')} (${fmtYears(months)})`, formatCurrency(sT), dT, true,  'sim-total')}
      ${metric(t('sim.monthlyTotal'),                          formatCurrency(sM), dM, true,  'sim-monthly')}
      ${metric(t('sim.avgReturn'),                             sR.toFixed(1) + '%', dR, false, 'sim-return')}
    </div>`;
}

// ─── Slider building blocks ───────────────────────────────────

function sliderRow(assetId, field, label, value, min, max, step, isCurrency, decimals) {
  const displayVal = isCurrency ? formatCurrency(value) : value.toFixed(decimals) + '%';
  return `
    <div class="sim-slider-row">
      <div class="sim-slider-top">
        <span class="sim-slider-label">${label}</span>
        <span class="sim-slider-val" id="sim-val-${assetId}-${field}">${displayVal}</span>
      </div>
      <input type="range" class="sim-range"
             min="${min}" max="${max}" step="${step}" value="${value}"
             oninput="window.__simSlider('${assetId}','${field}',this.value)">
    </div>`;
}

function slidersGlobal(asset) {
  const f   = { ...asset.fields, ...getOverrides(asset.id) };
  const id  = asset.id;
  const isPension = ['pension', 'hashtalamut'].includes(asset.type);

  if (isPension) {
    const effective = ((f.salary || 0) * ((f.employeeContrib || 0) + (f.employerContrib || 0)) / 100)
                    * (1 - (f.depFee || 0) / 100);
    return `
      <div class="sim-slider-row">
        <div class="sim-slider-top">
          <span class="sim-slider-label">${t('sim.effectiveContrib')}</span>
          <span class="sim-slider-val text-muted">${formatCurrency(effective)}</span>
        </div>
      </div>
      ${sliderRow(id, 'expectedReturn', t('sim.sliderReturn'), f.expectedReturn || 7,   0, 25,    0.1,  false, 1)}
      ${sliderRow(id, 'managementFee',  t('sim.sliderFee'),    f.managementFee  || 0.1, 0,  3,    0.05, false, 2)}`;
  }

  const hasMonthly  = !['checking', 'deposit'].includes(asset.type);
  const returnField = asset.type === 'checking' ? 'interestRate' : 'expectedReturn';
  const returnVal   = f[returnField] || 0;
  const hasFee      = !['checking', 'deposit'].includes(asset.type);

  return `
    ${hasMonthly ? sliderRow(id, 'monthlyContribution', t('sim.sliderMonthly'), f.monthlyContribution || 0, 0, 20000, 100,  true,  0) : ''}
    ${sliderRow(id, returnField, t('sim.sliderReturn'), returnVal, 0, 25, 0.1, false, 1)}
    ${hasFee     ? sliderRow(id, 'managementFee', t('sim.sliderFee'), f.managementFee || 0, 0, 3, 0.05, false, 2) : ''}`;
}

function slidersFocused(asset) {
  const f   = { ...asset.fields, ...getOverrides(asset.id) };
  const id  = asset.id;
  const isPension = ['pension', 'hashtalamut'].includes(asset.type);

  if (isPension) {
    return `
      ${sliderRow(id, 'salary',           t('sim.sliderSalary'),      f.salary           || 0,   0, 50000, 500,  true,  0)}
      ${sliderRow(id, 'employeeContrib',  t('sim.sliderEmpContrib'),  f.employeeContrib  || 6,   0, 15,    0.5,  false, 1)}
      ${sliderRow(id, 'employerContrib',  t('sim.sliderEmplrContrib'),f.employerContrib  || 6.5, 0, 15,    0.5,  false, 1)}
      ${sliderRow(id, 'expectedReturn',   t('sim.sliderReturn'),       f.expectedReturn   || 7,   0, 25,    0.1,  false, 1)}
      ${sliderRow(id, 'managementFee',    t('sim.sliderFee'),          f.managementFee    || 0.1, 0,  3,    0.05, false, 2)}`;
  }
  return slidersGlobal(asset);
}

// ─── Accordion body (exported for in-place reset) ─────────────

export function renderAccordionBody(asset) {
  return `
    <div class="sim-sliders">${slidersGlobal(asset)}</div>
    <div class="sim-chart-mini"><canvas id="chart-sim-${asset.id}"></canvas></div>
    <div style="margin-top:10px">
      <button class="btn btn-ghost btn-sm" onclick="window.__simReset('${asset.id}')">${t('sim.reset')}</button>
    </div>`;
}

// ─── Accordion rows ───────────────────────────────────────────

function renderAccordionRow(asset) {
  const id   = asset.id;
  const open = isAccordionOpen(id);
  const f    = asset.fields;
  const val  = f.currentValue || f.balance || f.principal || 0;

  return `
    <div class="sim-acc-row card" id="sim-acc-${id}">
      <div class="sim-acc-header" onclick="window.__simToggle('${id}')">
        <div style="display:flex;align-items:center;gap:10px">
          <div class="asset-icon" style="background:${asset.color}22">${escapeHtml(asset.icon)}</div>
          <div>
            <div style="font-size:14px;font-weight:700">${escapeHtml(asset.name)}</div>
            <div class="text-muted" style="font-size:11px">${formatCurrency(val)}</div>
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:8px">
          <span class="badge" id="sim-delta-badge-${id}" style="display:none"></span>
          <span style="font-size:16px;color:var(--text-muted)">${open ? '▲' : '▼'}</span>
        </div>
      </div>
      <div class="sim-acc-body" id="sim-acc-body-${id}" style="display:${open ? '' : 'none'}">
        ${renderAccordionBody(asset)}
      </div>
    </div>`;
}

// ─── Tab bar ─────────────────────────────────────────────────

function renderTabs(assets, focusedId) {
  const tabs = [
    `<button class="sim-tab${!focusedId ? ' active' : ''}" onclick="window.__navigate('#simulator')">${t('sim.tabAll')}</button>`,
    ...assets.map(a =>
      `<button class="sim-tab${focusedId === a.id ? ' active' : ''}" onclick="window.__navigate('#simulator/${a.id}')">${escapeHtml(a.icon)} ${escapeHtml(a.name)}</button>`
    ),
  ];
  return `<div class="sim-tabs">${tabs.join('')}</div>`;
}

// ─── Focused mode card ────────────────────────────────────────

function renderFocused(asset) {
  return `
    <div class="card" style="display:flex;flex-direction:column;gap:14px">
      <div class="flex-between">
        <span style="font-size:14px;font-weight:700">${escapeHtml(asset.icon)} ${escapeHtml(asset.name)}</span>
        <button class="btn btn-ghost btn-sm" onclick="window.__simReset('${asset.id}')">${t('sim.reset')}</button>
      </div>
      <div class="sim-sliders">${slidersFocused(asset)}</div>
    </div>`;
}

// ─── Main export ──────────────────────────────────────────────

export function renderSimulator(focusedId) {
  const assets = listAssets();

  if (!assets.length) {
    return `<div class="page"><div class="card">
      <p style="text-align:center;padding:32px;color:var(--text-muted)">${t('sim.noAssets')}</p>
    </div></div>`;
  }

  const displayAssets = focusedId ? assets.filter(a => a.id === focusedId) : assets;
  if (focusedId && !displayAssets.length) {
    return `<div class="page"><p>נכס לא נמצא</p></div>`;
  }

  const horizonMonths = getSimHorizon();
  const focusedAsset  = focusedId ? displayAssets[0] : null;

  return `
    <div class="page">
      <div class="flex-between">
        <button class="btn btn-ghost btn-sm" onclick="window.__navigate('#dashboard')">${t('sim.back')}</button>
        <span class="section-label">${t('sim.title')}</span>
      </div>

      ${renderTabs(assets, focusedId)}
      ${renderImpactBar(displayAssets, horizonMonths)}

      <div class="card">
        <div class="flex-between" style="margin-bottom:12px">
          <span class="section-label">
            ${t('sim.horizon')}: <span id="sim-horizon-label">${fmtYears(horizonMonths)}</span>
          </span>
          <input type="range" class="sim-range" id="sim-horizon-slider"
                 min="12" max="360" step="12" value="${horizonMonths}" style="width:180px"
                 oninput="window.__simHorizon(this.value)">
        </div>
        <div class="chart-wrap"><canvas id="chart-sim"></canvas></div>
      </div>

      ${focusedAsset
        ? renderFocused(focusedAsset)
        : `<div class="section-label">${t('dashboard.title')}</div>
           <div class="sim-accordion">
             ${assets.map(renderAccordionRow).join('')}
           </div>`
      }
    </div>`;
}
