'use strict';

/**
 * Cotações service - busca preços de ativos usando yahoo-finance2
 * com cache em memória de 15 minutos e salva no BD para failover
 */
const db = require('../database/db');

let yf;
try {
  const YahooFinance = require('yahoo-finance2').default;
  yf = new YahooFinance({ suppressNotices: ['yahooSurvey'] });
} catch (e) {
  console.warn('[Cotações] yahoo-finance2 não instalado, preços não disponíveis');
}

const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutos
const cache = new Map();

/**
 * Busca o preço atual de um ticker.
 * Para BR: adiciona .SA automaticamente se necessário.
 */
async function getCotacao(ticker) {
  const cacheKey = ticker.toUpperCase();
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
    return cached.data;
  }

  if (!yf) return null;

  try {
    // Ativos BR: adiciona sufixo .SA se não terminar em .SA ou não for FII (contém número+letras)
    let symbol = ticker.toUpperCase();

    // Map specific tickers to Yahoo Finance formats
    const aliases = {
      'USDC': 'USDCBRL=X', // ou USDC-BRL (cripto)
      'BTC': 'BTC-BRL',
      'ETH': 'ETH-BRL'
    };
    if (aliases[symbol]) {
      symbol = aliases[symbol];
    }

    const isBR = /^[A-Z]{4}\d{1,2}$/.test(symbol) || /^[A-Z]{4}3$|[A-Z]{4}11$/.test(symbol);
    if (isBR && !symbol.endsWith('.SA')) {
      symbol = symbol + '.SA';
    }

    const result = await yf.quote(symbol);
    const data = {
      ticker,
      preco: result.regularMarketPrice || 0,
      moeda: result.currency || 'BRL',
      variacao: result.regularMarketChangePercent || 0,
      nome: result.longName || result.shortName || ticker,
      ultimaAtualizacao: new Date().toISOString(),
    };

    cache.set(cacheKey, { data, ts: Date.now() });

    // Salva no banco de dados para atuar como failover offline no futuro
    if (data.preco > 0) {
      try {
        db.prepare('UPDATE ativos SET preco_atual = ? WHERE ticker = ? AND atualizacao_manual = 0').run(data.preco, ticker.toUpperCase());
      } catch (errDb) {
        console.warn(`[Cotações] Erro ao salvar failover no BD para ${ticker}:`, errDb.message);
      }
    }

    return data;
  } catch (err) {
    console.warn(`[Cotações] Falha ao buscar ${ticker}:`, err.message);
    return { ticker, preco: 0, moeda: 'BRL', variacao: 0, erro: err.message };
  }
}

/**
 * Busca cotações de múltiplos tickers em paralelo
 */
async function getCotacoes(tickers) {
  const results = await Promise.allSettled(tickers.map(t => getCotacao(t)));
  const map = {};
  results.forEach((r, i) => {
    if (r.status === 'fulfilled' && r.value) {
      map[tickers[i].toUpperCase()] = r.value;
    }
  });
  return map;
}

module.exports = { getCotacao, getCotacoes };
