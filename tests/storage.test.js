// tests/storage.test.js
const { loadData, saveData, generateId } = require('../js/storage.js');

beforeEach(() => {
  localStorage.clear();
});

test('loadData returns default structure when storage is empty', () => {
  const data = loadData();
  expect(data.assets).toEqual([]);
  expect(data.settings.language).toBe('he');
  expect(data.settings.defaultHorizon).toBe(20);
  expect(data.marketCache).toEqual({});
});

test('saveData then loadData round-trips correctly', () => {
  const data = loadData();
  data.assets.push({ id: '1', name: 'Test', type: 'custom' });
  saveData(data);
  const loaded = loadData();
  expect(loaded.assets).toHaveLength(1);
  expect(loaded.assets[0].name).toBe('Test');
});

test('generateId returns unique strings', () => {
  const ids = new Set(Array.from({ length: 100 }, generateId));
  expect(ids.size).toBe(100);
});

test('loadData returns default structure when storage contains corrupt JSON', () => {
  localStorage.setItem('mywealth_data', 'THIS IS NOT JSON {{{');
  const data = loadData();
  expect(data.assets).toEqual([]);
  expect(data.settings.language).toBe('he');
});
