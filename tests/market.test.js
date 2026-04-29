const { tickerForYahoo, parseYahooResponse } = require('../js/market.js');

describe('tickerForYahoo', () => {
  test('US ticker passes through unchanged', () => {
    expect(tickerForYahoo('AAPL')).toBe('AAPL');
  });

  test('Israeli fund code (7 digits) gets .TA suffix', () => {
    expect(tickerForYahoo('5100386')).toBe('5100386.TA');
  });

  test('6-digit code also gets .TA suffix', () => {
    expect(tickerForYahoo('123456')).toBe('123456.TA');
  });

  test('ticker that already has .TA is not doubled', () => {
    expect(tickerForYahoo('5100386.TA')).toBe('5100386.TA');
  });

  test('null/empty returns as-is', () => {
    expect(tickerForYahoo('')).toBe('');
    expect(tickerForYahoo(null)).toBe(null);
  });
});

describe('parseYahooResponse', () => {
  test('extracts regularMarketPrice from chart response', () => {
    const mock = { chart: { result: [{ meta: { regularMarketPrice: 182.5 } }], error: null } };
    expect(parseYahooResponse(mock)).toBe(182.5);
  });

  test('returns null on error response with null result', () => {
    const mock = { chart: { result: null, error: { code: 'Not Found' } } };
    expect(parseYahooResponse(mock)).toBeNull();
  });

  test('returns null on empty result array', () => {
    const mock = { chart: { result: [], error: null } };
    expect(parseYahooResponse(mock)).toBeNull();
  });

  test('returns null on null input', () => {
    expect(parseYahooResponse(null)).toBeNull();
  });
});
