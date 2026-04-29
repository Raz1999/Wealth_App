const STORAGE_KEY = 'mywealth_data';

const DEFAULT_DATA = {
  assets: [],
  settings: { language: 'he', defaultHorizon: 20, currentAge: 0, targetMode: 'years', targetValue: 20, inflationRate: 3 },
  marketCache: {},
  history: [],
};

function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return JSON.parse(JSON.stringify(DEFAULT_DATA));
    return JSON.parse(raw);
  } catch {
    return JSON.parse(JSON.stringify(DEFAULT_DATA));
  }
}

function saveData(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('[storage] saveData failed:', e);
    throw e;
  }
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
}

/**
 * Record today's net worth if not already snapshotted this month.
 * Keeps last 60 months (5 years). Returns true if a new entry was added.
 */
function snapshotNetWorth(totalValue) {
  const month = new Date().toISOString().slice(0, 7); // 'YYYY-MM'
  const data  = loadData();
  if (!data.history) data.history = [];
  if (data.history.find(h => h.month === month)) return false;
  data.history.push({ month, value: Math.round(totalValue) });
  if (data.history.length > 60) data.history = data.history.slice(-60);
  saveData(data);
  return true;
}

if (typeof module !== 'undefined') module.exports = { loadData, saveData, generateId, snapshotNetWorth };
export { loadData, saveData, generateId, snapshotNetWorth };
