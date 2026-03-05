'use strict';

const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { getCotacoes } = require('../services/cotacoes');

// GET /api/dashboard - Dados para o Panorama
router.get('/', async (req, res) => {
  try {
    // 1. Carteira por categoria
    const porCategoria = db.prepare(`
      SELECT
        a.categoria,
        a.moeda,
        COALESCE(SUM(ap.quantidade), 0) AS quantidade,
        COALESCE(SUM(ap.valor_total), 0) AS valor_investido
      FROM ativos a
      LEFT JOIN aportes ap ON a.ticker = ap.ticker
      WHERE a.ativo = 1
      GROUP BY a.categoria, a.moeda
    `).all();

    // 2. Todos os tickers com posição (para buscar cotação)
    const tickersComPosicao = db.prepare(`
      SELECT a.ticker, a.moeda, a.preco_atual, a.atualizacao_manual, COALESCE(SUM(ap.quantidade), 0) as qtde
      FROM ativos a
      LEFT JOIN aportes ap ON a.ticker = ap.ticker
      WHERE a.ativo = 1
      GROUP BY a.ticker
      HAVING qtde > 1e-6
    `).all();

    const tickers = tickersComPosicao.filter(t => !t.atualizacao_manual).map(t => t.ticker);
    const hasUSD = tickersComPosicao.some(t => t.moeda === 'USD');
    const tickersToFetch = [...tickers];
    if (hasUSD && !tickersToFetch.includes('USDC')) {
      tickersToFetch.push('USDC');
    }
    const cotacoes = tickersToFetch.length > 0 ? await getCotacoes(tickersToFetch) : {};

    const usdQuote = cotacoes['USDC'];
    const usdToBrl = usdQuote && usdQuote.preco > 0 ? usdQuote.preco : 5.0; // Fallback

    // 3. Valor atual por categoria
    const valorAtualPorCategoria = {};
    for (const t of tickersComPosicao) {
      let precoAtual = 0;
      if (t.atualizacao_manual) {
        precoAtual = t.preco_atual;
      } else {
        const cotacao = cotacoes[t.ticker.toUpperCase()];
        precoAtual = cotacao && cotacao.preco > 0 ? cotacao.preco : t.preco_atual;
      }
      
      const ativo = db.prepare('SELECT categoria FROM ativos WHERE ticker = ?').get(t.ticker);
      const cat = ativo?.categoria || 'OUTROS';
      
      let valorAtivo = t.qtde * precoAtual;
      if (t.moeda === 'USD') {
        valorAtivo = valorAtivo * usdToBrl;
      }
      
      valorAtualPorCategoria[cat] = (valorAtualPorCategoria[cat] || 0) + valorAtivo;
    }

    // 4. Proventos do mês atual e do ano
    const agora = new Date();
    const mesAno = `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, '0')}`;
    const ano = String(agora.getFullYear());

    const proventosMes = db.prepare(`
      SELECT COALESCE(SUM(valor), 0) as total
      FROM proventos
      WHERE strftime('%Y-%m', data_pagamento) = ?
    `).get(mesAno).total;

    const proventosAno = db.prepare(`
      SELECT COALESCE(SUM(valor), 0) as total
      FROM proventos
      WHERE strftime('%Y', data_pagamento) = ?
    `).get(ano).total;

    // 5. Evolução mensal de aportes
    const evolucaoAportes = db.prepare(`
      SELECT
        strftime('%Y-%m', data) as mes,
        SUM(CASE WHEN valor_total > 0 THEN valor_total ELSE 0 END) as aportado,
        SUM(CASE WHEN valor_total < 0 THEN ABS(valor_total) ELSE 0 END) as retirado
      FROM aportes
      GROUP BY mes
      ORDER BY mes DESC
      LIMIT 24
    `).all();

    // 6. Proventos mensais para gráfico
    const proventosMensais = db.prepare(`
      SELECT
        strftime('%Y-%m', data_pagamento) as mes,
        SUM(valor) as total
      FROM proventos
      GROUP BY mes
      ORDER BY mes DESC
      LIMIT 24
    `).all();

    // 7. Totais gerais
    const totalInvestido = porCategoria.reduce((s, c) => s + c.valor_investido, 0);
    const totalAtual = Object.values(valorAtualPorCategoria).reduce((s, v) => s + v, 0);
    const retornoTotal = totalAtual - totalInvestido;
    const retornoPct = totalInvestido > 0 ? (retornoTotal / totalInvestido) * 100 : 0;

    res.json({
      resumo: {
        total_investido: totalInvestido,
        total_atual: totalAtual,
        retorno_valor: retornoTotal,
        retorno_pct: retornoPct,
        proventos_mes: proventosMes,
        proventos_ano: proventosAno,
      },
      por_categoria: porCategoria.map(c => ({
        ...c,
        valor_atual: valorAtualPorCategoria[c.categoria] || 0,
        retorno_pct: c.valor_investido > 0
          ? (((valorAtualPorCategoria[c.categoria] || 0) - c.valor_investido) / c.valor_investido) * 100
          : 0,
      })),
      evolucao_aportes: evolucaoAportes.reverse(),
      proventos_mensais: proventosMensais.reverse(),
    });
  } catch (err) {
    console.error('[Dashboard]', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
