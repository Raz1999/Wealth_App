const STORAGE_KEY = 'mywealth_data';

const DEFAULT_DATA = {
  assets: [],
  settings: { language: 'he', defaultHorizon: 20, currentAge: 0, targetMode: 'years', targetValue: 20, inflationRate: 3 },
  marketCache: {}
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

if (typeof module !== 'undefined') module.exports = { loadData, saveData, generateId };
export { loadData, saveData, generateId };
