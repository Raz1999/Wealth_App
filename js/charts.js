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
        backgroundColor: ds.fill ? hexToRgba(ds.color ?? '#0077b6', ds.fillOpacity ?? 0.1) : 'transparent',
        fill:            ds.fill ?? false,
        borderDash:      ds.dashed ? [5, 6] : [],
        borderWidth:     ds.width ?? 2.5,
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

export function renderAllocationChart(canvasId, slices) {
  // slices: [{ label, value, color }]
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  if (CHART_REGISTRY[canvasId]) CHART_REGISTRY[canvasId].destroy();

  CHART_REGISTRY[canvasId] = new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels: slices.map(s => s.label),
      datasets: [{
        data:            slices.map(s => s.value),
        backgroundColor: slices.map(s => s.color),
        borderWidth:     2,
        borderColor:     '#fff8f0',
        hoverOffset:     6,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '62%',
      plugins: {
        legend: {
          display: true,
          position: 'right',
          labels: { color: '#5c4a32', font: { size: 11 }, boxWidth: 12, padding: 10 }
        },
        tooltip: {
          callbacks: {
            label: ctx => {
              const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
              const pct   = total ? ((ctx.parsed / total) * 100).toFixed(1) : 0;
              return ` ${ctx.label}: ₪${(ctx.parsed / 1000).toFixed(0)}K  (${pct}%)`;
            }
          }
        }
      }
    }
  });
}

export function renderHistoryChart(canvasId, history) {
  // history: [{ month: 'YYYY-MM', value: number }]
  const canvas = document.getElementById(canvasId);
  if (!canvas || history.length < 2) return;
  if (CHART_REGISTRY[canvasId]) CHART_REGISTRY[canvasId].destroy();

  CHART_REGISTRY[canvasId] = new Chart(canvas, {
    type: 'line',
    data: {
      labels: history.map(h => h.month),
      datasets: [{
        data:            history.map(h => h.value),
        borderColor:     '#10b981',
        backgroundColor: hexToRgba('#10b981', 0.12),
        fill:            true,
        borderWidth:     2.5,
        pointRadius:     3,
        tension:         0.35,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { color: '#f0e6d3' }, ticks: { color: '#94a3b8', font: { size: 10 } } },
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
