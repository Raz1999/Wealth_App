import { t } from '../js/i18n.js';

const TYPES = [
  { key: 'portfolio',   icon: '📈' },
  { key: 'pension',     icon: '🏛️' },
  { key: 'gemel',       icon: '💰' },
  { key: 'kesafi',      icon: '🏦' },
  { key: 'checking',    icon: '💳' },
  { key: 'deposit',     icon: '🏧' },
  { key: 'hashtalamut', icon: '🎓' },
  { key: 'custom',      icon: '⭐' },
];

export function renderTypePicker() {
  const cards = TYPES.map(({ key, icon }) => `
    <div class="type-card" onclick="window.__navigate('#product/new?type=${key}')">
      <div class="type-card-icon">${icon}</div>
      <div class="type-card-name">${t('type.' + key)}</div>
    </div>
  `).join('');

  return `
    <div class="page">
      <h2 style="font-size:20px;font-weight:800;color:var(--text-primary)">${t('new.pickType')}</h2>
      <p class="text-muted">${t('new.pickTypeSubtitle')}</p>
      <div class="type-grid">${cards}</div>
    </div>
  `;
}
