const yahooFinance = require('yahoo-finance2').default;
const yf = new yahooFinance();
async function test() {
  try {
    const res = await yf.quote('BOVA11.SA');
    console.log('BOVA11.SA:', res.regularMarketPrice);
  } catch (e) {
    console.error('BOVA11.SA Error:', e);
  }
}
test();
