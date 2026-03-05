'use strict';

const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { getCotacoes } = require('../services/cotacoes');

/**
 * Calcula carteira consolidada: para cada ativo, soma aportes e calcula
 * quantidade atual, preço médio, valor investido, e busca preço atual.
 */
async function calcularCarteira(categoria = null) {
  let query = `
    SELECT
      a.ticker,
      a.nome,
      a.categoria,
      a.moeda,
      a.nota,
      a.percentual_ideal,
      COALESCE(SUM(ap.quantidade), 0) AS quantidade_total,
      CASE
        WHEN SUM(ap.quantidade) > 0
        THEN SUM(ap.valor_total) / SUM(ap.quantidade)
        ELSE 0
      END AS preco_medio,
      COALESCE(SUM(ap.valor_total), 0) AS valor_investido_total,
      a.preco_atual,
      a.atualizacao_manual
    FROM ativos a
    LEFT JOIN aportes ap ON a.ticker = ap.ticker
    WHERE a.ativo = 1
  `;
  const params = [];
  if (categoria) {
    query += ' AND a.categoria = ?';
    params.push(categoria.toUpperCase());
  }
  query += ' GROUP BY a.id ORDER BY a.categoria, a.ticker';

  const ativos = db.prepare(query).all(...params);

  // Filtra só os que têm posição aberta (quantidade > 1e-6 para ignorar erros de ponto flutuante)
  const comPosicao = ativos.filter(a => a.quantidade_total > 1e-6);

  // Busca cotações em paralelo apenas para ativos automáticos
  const tickers = comPosicao.filter(a => !a.atualizacao_manual).map(a => a.ticker);
  const cotacoes = tickers.length > 0 ? await getCotacoes(tickers) : {};

  // Calcula valor atual e retorno
  let valorAtualTotal = 0;
  const resultado = comPosicao.map(a => {
    let precoAtual = 0;
    let variacao = 0;

    if (a.atualizacao_manual) {
      precoAtual = a.preco_atual;
    } else {
      const cotacao = cotacoes[a.ticker.toUpperCase()];
      precoAtual = cotacao && cotacao.preco > 0 ? cotacao.preco : a.preco_atual;
      variacao = cotacao?.variacao || 0;
    }

    const valorAtual = a.quantidade_total * precoAtual;
    const retornoValor = valorAtual - (a.quantidade_total * a.preco_medio);
    const retornoPct = a.preco_medio > 0 ? ((precoAtual / a.preco_medio) - 1) * 100 : 0;

    if (a.quantidade_total > 0) valorAtualTotal += valorAtual;

    return {
      ...a,
      preco_atual: precoAtual,
      variacao_dia_pct: variacao,
      valor_atual: valorAtual,
      retorno_valor: retornoValor,
      retorno_pct: retornoPct,
    };
  });

  // Calcula % da carteira e diferença vs ideal
  const total = resultado.reduce((s, a) => s + Math.max(a.valor_atual, 0), 0);
  return resultado.map(a => ({
    ...a,
    percentual_carteira: total > 0 && a.valor_atual > 0 ? (a.valor_atual / total) * 100 : 0,
    diferenca_ideal: 0, // calculado no frontend ou abaixo
  }));
}

// GET /api/carteira - carteira completa
router.get('/', async (req, res) => {
  try {
    const dados = await calcularCarteira();
    res.json(dados);
  } catch (err) {
    console.error('[Carteira]', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/carteira/:categoria
router.get('/:categoria', async (req, res) => {
  try {
    const { categoria } = req.params;
    const validas = ['ACOES', 'FIIS', 'EUA', 'FIXA', 'CRIPTO', 'FUNDOS'];
    if (!validas.includes(categoria.toUpperCase())) {
      return res.status(400).json({ error: `Categoria inválida. Use: ${validas.join(', ')}` });
    }
    const dados = await calcularCarteira(categoria);
    res.json(dados);
  } catch (err) {
    console.error('[Carteira/:categoria]', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
