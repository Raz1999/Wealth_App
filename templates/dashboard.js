import { t } from '../js/i18n.js';
import { listAssets } from '../js/assets.js';
import { totalMonthlyContribution, projectAsset } from '../js/calculations.js';
import { formatCurrency, formatPercent } from '../js/utils.js';

function avgAnnualReturn(assets) {
  if (!assets.length) return 0;
  const totalValue = assets.reduce((s, a) => s + (a.fields?.currentValue || a.fields?.balance || a.fields?.principal || 0), 0);
  if (!totalValue) return 0;
  const weighted = assets.reduce((s, a) => {
    const v = a.fields?.currentValue || a.fields?.balance || a.fields?.principal || 0;
    const r = a.fields?.expectedReturn || a.fields?.interestRate || 0;
    return s + (v / totalValue) * r;
  }, 0);
  return weighted;
}

function renderAssetCard(asset) {
  const value = asset.fields?.currentValue ?? asset.fields?.balance ?? asset.fields?.principal ?? 0;
  const ret = asset.fields?.expectedReturn ?? asset.fields?.interestRate ?? 0;
  return `
    <div class="asset-card" style="--asset-color: ${asset.color}"
         onclick="window.__navigate('#product/${asset.id}')">
      <div class="asset-card-left">
        <div class="asset-icon">${asset.icon}</div>
        <div>
          <div class="asset-name">${asset.name}</div>
          <div class="asset-type">${t('type.' + asset.type)}</div>
        </div>
      </div>
      <div class="asset-card-right">
        <div class="asset-amount" style="color: ${asset.color}">${formatCurrency(value)}</div>
        <div class="asset-return">+${ret}% / שנה</div>
      </div>
    </div>
  `;
}

export function renderDashboard() {
  const assets = listAssets();
  const totalValue = assets.reduce((s, a) => s + (a.fields?.currentValue ?? a.fields?.balance ?? a.fields?.principal ?? 0), 0);
  const monthlyPmt = totalMonthlyContribution(assets);
  const avgReturn  = avgAnnualReturn(assets);

  const horizon = 240;
  const totalForecast = assets.length
    ? assets.reduce((s, a) => {
        const pts = projectAsset(a, horizon);
        return s + (pts[pts.length - 1]?.value ?? 0);
      }, 0)
    : 0;

  const assetCards = assets.length
    ? assets.map(renderAssetCard).join('')
    : `<p class="text-muted" style="text-align:center;padding:32px 0">אין נכסים עדיין — הוסף את הראשון!</p>`;

  return `
    <div class="page">
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

      <!-- Global chart (rendered by charts.js after mount) -->
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
    </div>
  `;
}
