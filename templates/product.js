import { t } from '../js/i18n.js';
import { getAsset } from '../js/assets.js';
import { formatCurrency } from '../js/utils.js';

// ─── Form field helpers ───
function field(id, labelKey, value = '', type = 'number', extra = '') {
  return `
    <div class="form-group">
      <label class="form-label" for="${id}">${t(labelKey)}</label>
      <input class="form-input" id="${id}" name="${id}" type="${type}" value="${value}" ${extra}>
    </div>`;
}

function select(id, labelKey, options, value = '') {
  const opts = options.map(([v, l]) => `<option value="${v}" ${v === value ? 'selected' : ''}>${l}</option>`).join('');
  return `
    <div class="form-group">
      <label class="form-label" for="${id}">${t(labelKey)}</label>
      <select class="form-input" id="${id}" name="${id}">${opts}</select>
    </div>`;
}

// ─── Per-type form renderers ───
function formPortfolio(f) {
  const holdingRows = (f.holdings || []).map((h, i) => `
    <tr>
      <td><input class="form-input" style="width:90px" name="ticker_${i}" value="${h.ticker || ''}"></td>
      <td><input class="form-input" style="width:80px" name="holding_name_${i}" value="${h.name || ''}" placeholder="אוטו-מילוי"></td>
      <td><input class="form-input" style="width:80px" type="number" name="quantity_${i}" value="${h.quantity || ''}"></td>
      <td><input class="form-input" style="width:100px" type="number" name="totalValue_${i}" value="${h.totalValue || ''}"></td>
      <td>
        <select class="form-input" style="width:120px" name="projMode_${i}">
          <option value="historical" ${h.projectionMode==='historical'?'selected':''}>CAGR היסטורי</option>
          <option value="market"     ${h.projectionMode==='market'?'selected':''}>ממוצע שוק</option>
          <option value="manual"     ${h.projectionMode==='manual'?'selected':''}>ידני</option>
        </select>
      </td>
      <td><input class="form-input" style="width:60px" type="number" name="manualReturn_${i}" value="${h.manualReturn || ''}" placeholder="%"></td>
      <td><button type="button" class="btn btn-danger btn-sm" onclick="this.closest('tr').remove()">✕</button></td>
    </tr>
  `).join('');

  return `
    <div class="form-grid-2">
      ${field('broker', 'field.broker', f.broker || '', 'text')}
      ${field('managementFee', 'field.managementFee', f.managementFee || 0)}
    </div>
    ${field('monthlyContribution', 'field.monthlyContrib', f.monthlyContribution || 0)}
    <div class="section-label" style="margin-top:8px">אחזקות</div>
    <div style="overflow-x:auto">
      <table class="holdings-table" id="holdings-table">
        <thead><tr>
          <th>טיקר</th><th>שם</th><th>כמות</th><th>שווי (₪)</th><th>תחזית</th><th>%</th><th></th>
        </tr></thead>
        <tbody id="holdings-body">${holdingRows}</tbody>
      </table>
    </div>
    <button type="button" class="btn btn-ghost btn-sm" onclick="window.__addHoldingRow()">${t('asset.addHolding')}</button>
  `;
}

function formPension(f) {
  return `
    <div class="form-grid-2">
      ${field('company', 'field.company', f.company || '', 'text')}
      ${field('track', 'field.track', f.track || '', 'text')}
    </div>
    ${field('currentValue', 'field.currentValue', f.currentValue || 0)}
    ${field('salary', 'field.salary', f.salary || 0)}
    <div class="form-grid-2">
      ${field('employeeContrib', 'field.employeeContrib', f.employeeContrib || 6)}
      ${field('employerContrib', 'field.employerContrib', f.employerContrib || 6.5)}
    </div>
    <div class="form-grid-2">
      ${field('managementFee', 'field.accFee', f.managementFee || 0.1)}
      ${field('depFee', 'field.depFee', f.depFee || 0.1)}
    </div>
    ${field('expectedReturn', 'field.expectedReturn', f.expectedReturn || 7)}
  `;
}

function formGemel(f) {
  return `
    <div class="form-grid-2">
      ${field('company', 'field.company', f.company || '', 'text')}
      ${field('track', 'field.track', f.track || '', 'text')}
    </div>
    ${field('currentValue', 'field.currentValue', f.currentValue || 0)}
    ${field('monthlyContribution', 'field.monthlyContrib', f.monthlyContribution || 0)}
    <div class="form-grid-2">
      ${field('expectedReturn', 'field.expectedReturn', f.expectedReturn || 8)}
      ${field('managementFee', 'field.managementFee', f.managementFee || 0.5)}
    </div>
  `;
}

function formKesafi(f) {
  return `
    ${field('fundName', 'field.company', f.fundName || '', 'text')}
    ${field('currentValue', 'field.currentValue', f.currentValue || 0)}
    ${field('monthlyContribution', 'field.monthlyContrib', f.monthlyContribution || 0)}
    <div class="form-grid-2">
      ${field('expectedReturn', 'field.expectedReturn', f.expectedReturn || 4.5)}
      ${field('managementFee', 'field.managementFee', f.managementFee || 0.1)}
    </div>
  `;
}

function formChecking(f) {
  return `
    ${field('bank', 'field.bank', f.bank || '', 'text')}
    ${field('balance', 'field.balance', f.balance || 0)}
    ${field('interestRate', 'field.interestRate', f.interestRate || 0)}
  `;
}

function formDeposit(f) {
  return `
    ${field('bank', 'field.bank', f.bank || '', 'text')}
    ${field('principal', 'field.principal', f.principal || 0)}
    ${field('interestRate', 'field.interestRate', f.interestRate || 0)}
    ${select('interestType', 'field.interestType', [['simple', t('field.interestSimple')], ['compound', t('field.interestCompound')]], f.interestType || 'simple')}
    ${field('maturityDate', 'field.maturityDate', f.maturityDate || '', 'date')}
    ${select('autoRenew', 'field.autoRenew', [['true','כן'],['false','לא']], String(f.autoRenew ?? 'false'))}
  `;
}

function formHashtalamut(f) {
  return `
    <div class="form-grid-2">
      ${field('company', 'field.company', f.company || '', 'text')}
      ${field('track', 'field.track', f.track || '', 'text')}
    </div>
    ${field('currentValue', 'field.currentValue', f.currentValue || 0)}
    ${field('salary', 'field.salary', f.salary || 0)}
    <div class="form-grid-2">
      ${field('employeeContrib', 'field.employeeContrib', f.employeeContrib || 2.5)}
      ${field('employerContrib', 'field.employerContrib', f.employerContrib || 7.5)}
    </div>
    ${field('liquidityDate', 'field.liquidityDate', f.liquidityDate || '', 'date')}
    <div class="form-grid-2">
      ${field('managementFee', 'field.managementFee', f.managementFee || 0.5)}
      ${field('expectedReturn', 'field.expectedReturn', f.expectedReturn || 8)}
    </div>
  `;
}

function formCustom(f) {
  return `
    ${field('currentValue', 'field.currentValue', f.currentValue || 0)}
    ${field('expectedReturn', 'field.expectedReturn', f.expectedReturn || 7)}
    ${field('monthlyContribution', 'field.monthlyContrib', f.monthlyContribution || 0)}
    <div class="form-group">
      <label class="form-label">${t('field.description')}</label>
      <textarea class="form-input" name="description" rows="3">${f.description || ''}</textarea>
    </div>
  `;
}

const FORM_RENDERERS = { portfolio: formPortfolio, pension: formPension, gemel: formGemel, kesafi: formKesafi, checking: formChecking, deposit: formDeposit, hashtalamut: formHashtalamut, custom: formCustom };

// ─── Main export ───
export function renderProduct(id, type) {
  const isNew = !id;
  const asset = isNew ? { type, name: '', icon: '', color: '', fields: {} } : getAsset(id);
  if (!asset) return '<div class="page"><p>נכס לא נמצא</p></div>';

  const formBody = (FORM_RENDERERS[asset.type] || formCustom)(asset.fields || {});

  return `
    <div class="page">
      <div class="flex-between">
        <div style="display:flex;align-items:center;gap:10px">
          <button class="btn btn-ghost btn-sm" onclick="window.__navigate('#dashboard')">‹ חזרה</button>
          <span style="font-size:11px;color:var(--text-muted)">${t('type.' + asset.type)}</span>
        </div>
        ${!isNew ? `<button class="btn btn-danger btn-sm" onclick="window.__deleteAsset('${asset.id}')">${t('asset.delete')}</button>` : ''}
      </div>

      <form id="asset-form" onsubmit="window.__saveAsset(event, '${isNew ? 'new' : asset.id}', '${asset.type}')">
        <div class="card" style="display:flex;flex-direction:column;gap:14px">
          <div class="form-grid-2">
            ${field('name', 'field.name', asset.name || '', 'text', 'required')}
            ${field('icon', 'field.icon', asset.icon || '', 'text', 'maxlength="2"')}
          </div>
          ${formBody}
          <div style="display:flex;gap:10px;margin-top:8px">
            <button type="submit" class="btn btn-primary">${t('asset.save')}</button>
            <button type="button" class="btn btn-ghost" onclick="window.__navigate('#dashboard')">${t('asset.cancel')}</button>
            ${!isNew ? `<button type="button" class="btn btn-ghost" onclick="window.__navigate('#simulator/${asset.id}')">${t('asset.simulate')}</button>` : ''}
          </div>
        </div>
      </form>

      ${!isNew ? `
      <div class="card">
        <div class="flex-between" style="margin-bottom:12px">
          <span class="section-label">תחזית — ${asset.name}</span>
          <div class="chart-controls">
            <button class="chart-ctrl active" onclick="window.__setProductHorizon(60,this)">5Y</button>
            <button class="chart-ctrl" onclick="window.__setProductHorizon(240,this)">20Y</button>
            <button class="chart-ctrl" onclick="window.__setProductHorizon(360,this)">30Y</button>
          </div>
        </div>
        <div class="chart-wrap"><canvas id="chart-product"></canvas></div>
      </div>` : ''}
    </div>
  `;
}
