import { loadData, saveData, generateId } from './storage.js';

const ASSET_COLORS = ['#0077b6','#10b981','#f59e0b','#8b5cf6','#ef4444','#06b6d4','#84cc16','#f97316'];

const DEFAULT_ICONS = {
  portfolio:    '📈',
  pension:      '🏛️',
  gemel:        '💰',
  kesafi:       '🏦',
  checking:     '💳',
  deposit:      '🏧',
  hashtalamut:  '🎓',
  custom:       '⭐'
};

function listAssets() {
  return loadData().assets;
}

function getAsset(id) {
  return loadData().assets.find(a => a.id === id) ?? null;
}

function createAsset(type, name, extraFields = {}) {
  const data = loadData();
  const colorIndex = data.assets.length % ASSET_COLORS.length;
  const asset = {
    id:        generateId(),
    type,
    name,
    icon:      DEFAULT_ICONS[type] ?? '⭐',
    color:     ASSET_COLORS[colorIndex],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    fields:    extraFields
  };
  data.assets.push(asset);
  saveData(data);
  return asset;
}

function updateAsset(id, updates) {
  const data = loadData();
  const idx = data.assets.findIndex(a => a.id === id);
  if (idx === -1) throw new Error(`Asset ${id} not found`);
  data.assets[idx] = {
    ...data.assets[idx],
    ...updates,
    fields: { ...data.assets[idx].fields, ...(updates.fields ?? {}) },
    updatedAt: new Date().toISOString()
  };
  saveData(data);
  return data.assets[idx];
}

function deleteAsset(id) {
  const data = loadData();
  data.assets = data.assets.filter(a => a.id !== id);
  saveData(data);
}

export { listAssets, getAsset, createAsset, updateAsset, deleteAsset, DEFAULT_ICONS };
