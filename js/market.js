const PROXY      = 'https://allorigins.win/get?disableCache=true&url=';
const YAHOO_BASE = 'https://query1.finance.yahoo.com/v8/finance/chart/';

/** Convert a raw ticker/fund code to Yahoo Finance format. */
function tickerForYahoo(ticker) {
  if (!ticker) return ticker;
  if (ticker.includes('.')) return ticker;           // already has suffix (e.g. 5100386.TA)
  if (/^\d{6,}$/.test(ticker)) return ticker + '.TA'; // Israeli fund/stock numeric code
  return ticker;
}

/** Extract price from a parsed Yahoo Finance chart API response object. */
function parseYahooResponse(json) {
  const result = json?.chart?.result;
  if (!result || !result.length) return null;
  return result[0]?.meta?.regularMarketPrice ?? null;
}

/** Fetch current market price for a single ticker. Returns price (number) or null on failure. */
async function fetchPrice(rawTicker) {
  const ticker   = tickerForYahoo(rawTicker);
  const yahooUrl = `${YAHOO_BASE}${encodeURIComponent(ticker)}?interval=1d&range=1d`;
  const proxyUrl = `${PROXY}${encodeURIComponent(yahooUrl)}`;
  try {
    const res  = await fetch(proxyUrl);
    const wrap = await res.json();
    const data = JSON.parse(wrap.contents);
    return parseYahooResponse(data);
  } catch {
    return null;
  }
}

/**
 * Fetch prices for all holdings in a portfolio asset.
 * Returns Map<ticker, price|null>.
 */
async function fetchPortfolioPrices(asset) {
  const holdings = asset.fields?.holdings || [];
  const results  = await Promise.all(
    holdings.map(async h => [h.ticker, await fetchPrice(h.ticker)])
  );
  return new Map(results);
}

if (typeof module !== 'undefined') module.exports = { tickerForYahoo, parseYahooResponse, fetchPrice, fetchPortfolioPrices };
export { tickerForYahoo, parseYahooResponse, fetchPrice, fetchPortfolioPrices };
