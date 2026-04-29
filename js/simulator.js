import { projectAsset, getAssetCurrentValue } from './calculations.js';

// ─── In-memory state (never persisted to localStorage) ───
let _horizonMonths = 240;
let _overrides     = {};       // { assetId: { fieldName: value } }
let _openAccordions = new Set();

export function initSimulator(defaultHorizonYears) {
  _horizonMonths  = (defaultHorizonYears || 20) * 12;
  _overrides      = {};
  _openAccordions = new Set();
}

// ─── Horizon ───
export function getSimHorizon()      { return _horizonMonths; }
export function setSimHorizon(months) { _horizonMonths = Number(months); }

// ─── Overrides ───
export function getOverrides(assetId)              { return _overrides[assetId] ?? {}; }
export function setOverride(assetId, field, value) {
  if (!_overrides[assetId]) _overrides[assetId] = {};
  _overrides[assetId][field] = Number(value);
}
export function resetOverride(assetId) { delete _overrides[assetId]; }

// ─── Accordion open state ───
export function isAccordionOpen(assetId) { return _openAccordions.has(assetId); }
export function toggleAccordion(assetId) {
  if (_openAccordions.has(assetId)) _openAccordions.delete(assetId);
  else _openAccordions.add(assetId);
}

// ─── Projection helpers ───
export function applyOverrides(asset) {
  const overrides = _overrides[asset.id];
  if (!overrides || !Object.keys(overrides).length) return asset;
  return { ...asset, fields: { ...asset.fields, ...overrides } };
}

export function projectWithOverrides(asset, months) {
  return projectAsset(applyOverrides(asset), months != null ? months : _horizonMonths);
}

/** Returns { baseline, scenario } — both are [{x, y}] sorted by x */
export function buildSimDatasets(assets, months) {
  const m = months != null ? months : _horizonMonths;
  return {
    baseline: _sumSeries(assets.map(a => projectAsset(a, m))),
    scenario: _sumSeries(assets.map(a => projectWithOverrides(a, m))),
  };
}

function _sumSeries(seriesArr) {
  const map = {};
  seriesArr.forEach(pts => pts.forEach(p => { map[p.month] = (map[p.month] || 0) + p.value; }));
  return Object.entries(map).map(([m, v]) => ({ x: Number(m), y: v })).sort((a, b) => a.x - b.x);
}

// ─── Aggregated stats for impact bar ───
export function baselineTotal(assets, months) {
  const m = months != null ? months : _horizonMonths;
  return assets.reduce((s, a) => s + (projectAsset(a, m).at(-1)?.value ?? 0), 0);
}

export function scenarioTotal(assets, months) {
  const m = months != null ? months : _horizonMonths;
  return assets.reduce((s, a) => s + (projectWithOverrides(a, m).at(-1)?.value ?? 0), 0);
}

export function baselineMonthly(assets) { return _monthlyTotal(assets, false); }
export function scenarioMonthly(assets) { return _monthlyTotal(assets, true); }

function _monthlyTotal(assets, withOverrides) {
  return assets.reduce((sum, a) => {
    const asset = withOverrides ? applyOverrides(a) : a;
    const f = asset.fields;
    if (['checking', 'deposit'].includes(asset.type)) return sum;
    if (['pension', 'hashtalamut'].includes(asset.type)) {
      const gross = (f.salary || 0) * ((f.employeeContrib || 0) + (f.employerContrib || 0)) / 100;
      return sum + gross * (1 - (f.depFee || 0) / 100);
    }
    return sum + (f.monthlyContribution || 0);
  }, 0);
}

export function baselineAvgReturn(assets) { return _avgReturn(assets, false); }
export function scenarioAvgReturn(assets) { return _avgReturn(assets, true); }

function _avgReturn(assets, withOverrides) {
  if (!assets.length) return 0;
  const total = assets.reduce((s, a) => s + getAssetCurrentValue(withOverrides ? applyOverrides(a) : a), 0);
  if (!total) return 0;
  return assets.reduce((s, a) => {
    const asset = withOverrides ? applyOverrides(a) : a;
    const v = getAssetCurrentValue(asset);
    const r = asset.fields?.expectedReturn || asset.fields?.interestRate || 0;
    return s + (v / total) * r;
  }, 0);
}
