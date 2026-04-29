import { t, getLanguage } from '../js/i18n.js';
import { listAssets } from '../js/assets.js';
import { totalMonthlyContribution, projectAsset, getAssetCurrentValue, computeTargetForecast, getPortfolioEffectiveReturn } from '../js/calculations.js';
import { formatCurrency, escapeHtml } from '../js/utils.js';

const TYPE_COLORS = {
  pension:     '#8b5cf6',
  hashtalamut: '#a78bfa',
  portfolio:   '#0077b6',
  gemel:       '#06b6d4',
  kesafi:      '#10b981',
  deposit:     '#f59e0b',
  checking:    '#94a3b8',
  custom:      '#ec4899',
};

export function buildAllocationSlices(assets) {
  const map = {};
  assets.forEach(a => {
    const v = getAssetCurrentValue(a);
    if (v > 0) map[a.type] = (map[a.type] || 0) + v;
  });
  return Object.entries(map).map(([type, value]) => ({
    label: t('type.' + type),
    value,
    color: TYPE_COLORS[type] || '#94a3b8',
  }));
}

function assetAnnualReturn(asset) {
  if (asset.type === 'portfolio') return getPortfolioEffectiveReturn(asset);
  return asset.fields?.expectedReturn || asset.fields?.interestRate || 0;
}

function avgAnnualReturn(assets) {
  if (!assets.length) return 0;
  const totalValue = assets.reduce((s, a) => s + getAssetCurrentValue(a), 0);
  if (!totalValue) return 0;
  return assets.reduce((s, a) => {
    const v = getAssetCurrentValue(a);
    return s + (v / totalValue) * assetAnnualReturn(a);
  }, 0);
}

function renderAssetCard(asset) {
  const value = getAssetCurrentValue(asset);
  const ret   = assetAnnualReturn(asset);
  return `
    <div class="asset-card" style="--asset-color: ${asset.color}"
         onclick="window.__navigate('#product/${asset.id}')">
      <div class="asset-card-left">
        <div class="asset-icon">${escapeHtml(asset.icon)}</div>
        <div>
          <div class="asset-name">${escapeHtml(asset.name)}</div>
          <div class="asset-type">${t('type.' + asset.type)}</div>
        </div>
      </div>
      <div class="asset-card-right">
        <div class="asset-amount" style="color: ${asset.color}">${formatCurrency(value)}</div>
        <div class="asset-return">${ret > 0 ? '+' : ''}${ret.toFixed(1)}% / שנה</div>
      </div>
    </div>`;
}

// ─── History chart card ───────────────────────────────────────

function renderHistoryCard(history) {
  if (!history || history.length < 2) return '';
  return `
    <div class="card">
      <span class="section-label" style="display:block;margin-bottom:12px">היסטוריית שווי נטו</span>
      <div class="chart-wrap"><canvas id="chart-history"></canvas></div>
    </div>`;
}

// ─── Deposit maturity alerts ──────────────────────────────────

function renderMaturityAlerts(assets) {
  const now = new Date();
  const rows = assets.filter(a => {
    if (a.type !== 'deposit' || !a.fields?.maturityDate) return false;
    const days = Math.round((new Date(a.fields.maturityDate) - now) / 86400000);
    return days >= 0 && days <= 60;
  }).map(a => {
    const days = Math.round((new Date(a.fields.maturityDate) - now) / 86400000);
    return `<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid var(--border)">
      <span style="font-weight:600">${escapeHtml(a.name)}</span>
      <span style="font-size:12px;color:${days <= 14 ? '#dc2626' : '#d97706'}">
        ${days === 0 ? 'פג היום!' : `פג בעוד ${days} ימים`}
      </span>
    </div>`;
  });
  if (!rows.length) return '';
  return `
    <div class="card" style="border:1.5px solid #d97706;background:#fffbeb">
      <div style="font-weight:700;color:#92400e;margin-bottom:8px">תוכניות חיסכון שפגות בקרוב</div>
      ${rows.join('')}
    </div>`;
}

// ─── Target forecast card ─────────────────────────────────────

export function renderTargetResult(forecast) {
  const isHe     = getLanguage() === 'he';
  const yearLabel = isHe ? `בשנת ${forecast.yearAt}` : `Year ${forecast.yearAt}`;
  const ageLabel  = forecast.ageAt ? (isHe ? ` · גיל ${forecast.ageAt}` : ` · Age ${forecast.ageAt}`) : '';
  const awayLabel = isHe ? `עוד ${forecast.yearsAway} שנים` : `${forecast.yearsAway} years away`;
  const realBlock = forecast.realValue != null
    ? `<div style="font-size:13px;color:var(--text-secondary);font-weight:600;margin-top:5px">
         ${formatCurrency(Math.round(forecast.realValue))}
         <span style="font-size:11px;color:var(--text-muted);font-weight:400">
           ${isHe ? 'ריאלי (ערך קנייה היום)' : "real (today's purchasing power)"}
         </span>
       </div>`
    : '';
  return `
    <div class="target-year-text">${yearLabel}${ageLabel}</div>
    <div style="display:flex;justify-content:space-between;align-items:flex-end;margin-top:8px">
      <div>
        <div class="target-amount-big">${formatCurrency(forecast.total)}</div>
        ${realBlock}
      </div>
      <div class="target-away-badge">${awayLabel}</div>
    </div>`;
}

function renderTargetCard(assets, settings) {
  const { targetMode = 'years', targetValue = 20, currentAge = 0, inflationRate = 3 } = settings;
  const forecast = computeTargetForecast(assets, { targetMode, targetValue, currentAge, inflationRate });

  return `
    <div class="card">
      <div class="flex-between" style="margin-bottom:14px;flex-wrap:wrap;gap:10px">
        <span class="section-label">${t('target.title')}</span>
        <div class="target-card-inputs">
          <div class="target-input-group">
            <span class="target-input-label">${t('target.currentAge')}</span>
            <input type="number" class="target-num-input" id="target-current-age"
                   value="${currentAge || ''}" placeholder="—" min="1" max="99" step="1"
                   oninput="window.__saveTarget()">
          </div>
          <div class="target-input-group">
            <select class="target-select" id="target-mode" onchange="window.__saveTarget()">
              <option value="years" ${targetMode === 'years' ? 'selected' : ''}>${t('target.modeYears')}</option>
              <option value="age"   ${targetMode === 'age'   ? 'selected' : ''}>${t('target.modeAge')}</option>
              <option value="year"  ${targetMode === 'year'  ? 'selected' : ''}>${t('target.modeYear')}</option>
            </select>
            <input type="number" class="target-num-input" id="target-value"
                   value="${targetValue}" min="1" step="1" oninput="window.__saveTarget()">
            <span id="target-suffix" style="font-size:12px;color:var(--text-muted);font-weight:600${targetMode !== 'years' ? ';display:none' : ''}">${t('target.years')}</span>
          </div>
          <div class="target-input-group">
            <span class="target-input-label">אינפלציה</span>
            <input type="number" class="target-num-input" id="target-inflation"
                   value="${inflationRate}" min="0" max="20" step="0.5" style="width:62px"
                   oninput="window.__saveTarget()">
            <span style="font-size:12px;color:var(--text-muted);font-weight:600">%</span>
          </div>
        </div>
      </div>
      <div class="target-result" id="target-result">
        ${renderTargetResult(forecast)}
      </div>
    </div>`;
}

// ─── Main export ──────────────────────────────────────────────

export function renderDashboard(settings = {}, history = []) {
  const assets        = listAssets();
  const totalValue    = assets.reduce((s, a) => s + getAssetCurrentValue(a), 0);
  const monthlyPmt    = totalMonthlyContribution(assets);
  const avgReturn     = avgAnnualReturn(assets);
  const totalForecast = assets.length
    ? assets.reduce((s, a) => s + (projectAsset(a, 240).at(-1)?.value ?? 0), 0)
    : 0;

  const assetCards = assets.length
    ? assets.map(renderAssetCard).join('')
    : `<p class="text-muted" style="text-align:center;padding:32px 0">אין נכסים עדיין — הוסף את הראשון!</p>`;

  return `
    <div class="page">
      <!-- Maturity alerts (if any) -->
      ${renderMaturityAlerts(assets)}

      <!-- Hero -->
      <div class="card card-hero">
        <div class="hero-grid">
          <div>
            <div class="hero-label">${t('dashboard.total')}</div>
            <div class="hero-amount">${formatCurrency(totalValue)}</div>
            <div class="hero-sub">${t('dashboard.forecast', { years: 20 })}: ${formatCurrency(totalForecast)}</div>
          </div>
          <div style="text-align:end">
            <div class="hero-stat-label">${t('dashboard.avgReturn')}</div>
            <div class="hero-stat-val">+${avgReturn.toFixed(1)}%</div>
            <div class="hero-stat-label" style="margin-top:8px">${t('dashboard.monthlyPmt')}</div>
            <div class="hero-stat-val">${formatCurrency(monthlyPmt)}</div>
          </div>
        </div>
      </div>

      <!-- Global projection chart -->
      <div class="card">
        <div class="flex-between" style="margin-bottom:12px">
          <span class="section-label">תחזית צמיחה כוללת</span>
          <div class="chart-controls">
            <button class="chart-ctrl active" onclick="window.__setHorizon(60,this)">5Y</button>
            <button class="chart-ctrl" onclick="window.__setHorizon(240,this)">20Y</button>
            <button class="chart-ctrl" onclick="window.__setHorizon(360,this)">30Y</button>
          </div>
        </div>
        <div class="chart-wrap"><canvas id="chart-global"></canvas></div>
      </div>

      <!-- Asset allocation donut -->
      ${assets.length ? `
      <div class="card">
        <span class="section-label" style="display:block;margin-bottom:12px">פילוח נכסים</span>
        <div class="chart-wrap" style="height:200px"><canvas id="chart-allocation"></canvas></div>
      </div>` : ''}

      <!-- Net worth history chart -->
      ${renderHistoryCard(history)}

      <!-- Target forecast card -->
      ${renderTargetCard(assets, settings)}

      <!-- Asset list -->
      <div class="section-label">${t('dashboard.title')}</div>
      <div class="asset-list">${assetCards}</div>

      <!-- Simulator banner -->
      <div class="sim-banner">
        <div>
          <div style="font-size:14px;font-weight:700;color:var(--text-primary)">${t('dashboard.openSim')}</div>
          <div style="font-size:11px;color:var(--text-muted);margin-top:3px">${t('dashboard.simSub')}</div>
        </div>
        <button class="btn btn-primary btn-sm" onclick="window.__navigate('#simulator')">${t('dashboard.openSim')}</button>
      </div>

      <!-- Backup / Restore -->
      <div style="display:flex;gap:10px;justify-content:center;padding:8px 0 4px">
        <button class="btn btn-ghost btn-sm" onclick="window.__exportData()">⬇ גיבוי נתונים</button>
        <label class="btn btn-ghost btn-sm" style="cursor:pointer">
          ⬆ שחזור נתונים
          <input type="file" accept=".json" style="display:none" onchange="window.__importData(this)">
        </label>
      </div>
    </div>`;
}
