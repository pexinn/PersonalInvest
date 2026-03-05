const yahooFinance = require('yahoo-finance2').default;

async function test() {
  for (const t of ['USDC-BRL', 'USDCBRL=X', 'USDC']) {
    try {
      const res = await yahooFinance.quote(t);
      console.log(t, '=>', res.regularMarketPrice);
    } catch (err) {
      console.error(t, '=> ERROR:', err.message);
    }
  }
}
test();
