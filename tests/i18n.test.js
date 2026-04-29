// tests/i18n.test.js
const { t, setLanguage, getLanguage } = require('../js/i18n.js');

test('defaults to Hebrew', () => {
  expect(getLanguage()).toBe('he');
});

test('t() returns Hebrew string by default', () => {
  expect(t('nav.addAsset')).toBe('+ הוסף נכס');
});

test('setLanguage switches to English', () => {
  setLanguage('en');
  expect(t('nav.addAsset')).toBe('+ Add Asset');
  setLanguage('he'); // reset
});

test('t() falls back to key if missing', () => {
  expect(t('nonexistent.key')).toBe('nonexistent.key');
});
