export function formatCurrency(n) {
  if (n === null || n === undefined || isNaN(n)) return '—';
  return '₪' + Math.round(n).toLocaleString('he-IL');
}

export function formatPercent(n) {
  if (n === null || n === undefined || isNaN(n)) return '—';
  return n.toFixed(1) + '%';
}

if (typeof module !== 'undefined') module.exports = { formatCurrency, formatPercent };
