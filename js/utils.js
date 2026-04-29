export function formatCurrency(n) {
  if (n === null || n === undefined || isNaN(n)) return '—';
  return '₪' + Math.round(n).toLocaleString('he-IL');
}

export function formatPercent(n) {
  if (n === null || n === undefined || isNaN(n)) return '—';
  return n.toFixed(1) + '%';
}

export function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

if (typeof module !== 'undefined') module.exports = { formatCurrency, formatPercent, escapeHtml };
