import { getLanguage } from './i18n.js';

const CHART_REGISTRY = {};

export function renderProjectionChart(canvasId, datasets, { months = 240 } = {}) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  if (CHART_REGISTRY[canvasId]) {
    CHART_REGISTRY[canvasId].destroy();
  }

  const isRTL = getLanguage() === 'he';
  const labels = datasets[0]?.data.map(p => {
    const yr = Math.round(p.x / 12);
    return yr === 0 ? (isRTL ? 'היום' : 'Today') : `${yr}Y`;
  }) ?? [];

  CHART_REGISTRY[canvasId] = new Chart(canvas, {
    type: 'line',
    data: {
      labels,
      datasets: datasets.map(ds => ({
        label:           ds.label,
        data:            ds.data.map(p => p.y),
        borderColor:     ds.color ?? '#0077b6',
        backgroundColor: ds.fill ? hexToRgba(ds.color ?? '#0077b6', 0.1) : 'transparent',
        fill:            ds.fill ?? false,
        borderDash:      ds.dashed ? [6, 4] : [],
        borderWidth:     2.5,
        pointRadius:     0,
        tension:         0.4,
      }))
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: datasets.length > 1 } },
      scales: {
        x: {
          reverse: isRTL,
          grid: { color: '#f0e6d3' },
          ticks: { color: '#94a3b8', font: { size: 10 } }
        },
        y: {
          grid: { color: '#f0e6d3' },
          ticks: {
            color: '#94a3b8', font: { size: 10 },
            callback: v => '₪' + (v >= 1000000 ? (v / 1000000).toFixed(1) + 'M' : (v / 1000).toFixed(0) + 'K')
          }
        }
      }
    }
  });
}

function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

export function destroyChart(canvasId) {
  CHART_REGISTRY[canvasId]?.destroy();
  delete CHART_REGISTRY[canvasId];
}
