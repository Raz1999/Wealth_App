// tests/storage.test.js
const { loadData, saveData, generateId, snapshotNetWorth } = require('../js/storage.js');

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

describe('snapshotNetWorth', () => {
  test('adds a snapshot for current month', () => {
    snapshotNetWorth(500000);
    const { history } = loadData();
    expect(history).toHaveLength(1);
    expect(history[0].value).toBe(500000);
  });

  test('snapshot month is current YYYY-MM', () => {
    snapshotNetWorth(500000);
    const { history } = loadData();
    const expected = new Date().toISOString().slice(0, 7);
    expect(history[0].month).toBe(expected);
  });

  test('does not add duplicate snapshot for same month', () => {
    snapshotNetWorth(500000);
    snapshotNetWorth(520000);
    const { history } = loadData();
    expect(history).toHaveLength(1);
    expect(history[0].value).toBe(500000);
  });

  test('returns true when new snapshot added', () => {
    expect(snapshotNetWorth(500000)).toBe(true);
  });

  test('returns false when snapshot already exists this month', () => {
    snapshotNetWorth(500000);
    expect(snapshotNetWorth(520000)).toBe(false);
  });

  test('rounds value to integer', () => {
    snapshotNetWorth(500000.75);
    const { history } = loadData();
    expect(history[0].value).toBe(500001);
  });

  test('trims to last 60 months when over limit', () => {
    const data = loadData();
    data.history = Array.from({ length: 60 }, (_, i) => ({
      month: `20${String(20 + Math.floor(i / 12)).padStart(2,'0')}-${String((i % 12) + 1).padStart(2,'0')}`,
      value: i * 1000,
    }));
    saveData(data);
    snapshotNetWorth(999999);
    const { history } = loadData();
    expect(history).toHaveLength(60);
    expect(history[history.length - 1].value).toBe(999999);
  });
});
