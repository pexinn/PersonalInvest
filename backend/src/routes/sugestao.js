'use strict';

const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { getCotacoes } = require('../services/cotacoes');

/**
 * GET /api/sugestao?valor=1000
 * Algoritmo de sugestão de aporte
 */
router.get('/', async (req, res) => {
  try {
    const valorAporte = parseFloat(req.query.valor) || 0;

    // 1. Obter alocação atual (consolidada no dashboard ou aproximada)
    // Para precisão, vamos recalcular o valor atual de cada ativo
    const ativos = db.prepare(`
      SELECT 
        a.ticker, a.categoria, a.moeda, a.nota, a.percentual_ideal as peso_no_ativo,
        COALESCE(SUM(ap.quantidade), 0) as qtde
      FROM ativos a
      LEFT JOIN aportes ap ON a.ticker = ap.ticker
      WHERE a.ativo = 1
      GROUP BY a.ticker
    `).all();

    const configAlvo = db.prepare('SELECT * FROM config_alocacao').all();
    const alvosCat = {};
    configAlvo.forEach(c => alvosCat[c.categoria] = c.percentual_alvo);

    // 2. Buscar cotações
    const tickers = ativos.filter(a => a.qtde > 0 || a.peso_no_ativo > 0).map(a => a.ticker);
    
    // Garantir que temos a cotação do Dólar
    if (!tickers.includes('USDC')) tickers.push('USDC');
    
    const cotacoes = await getCotacoes(tickers);
    const usdToBrl = cotacoes['USDC']?.preco || 5.0;

    // 3. Calcular valor atual total e por categoria
    let patrimonioTotal = 0;
    const categoriasInfo = {};

    ativos.forEach(a => {
      const preco = cotacoes[a.ticker]?.preco || 0;
      let valor = a.qtde * preco;
      if (a.moeda === 'USD') valor *= usdToBrl;
      
      patrimonioTotal += valor;
      
      if (!categoriasInfo[a.categoria]) {
        categoriasInfo[a.categoria] = {
          atual: 0,
          alvo_pct: alvosCat[a.categoria] || 0,
          ativos: []
        };
      }
      
      categoriasInfo[a.categoria].atual += valor;
      categoriasInfo[a.categoria].ativos.push({
        ...a,
        valor_atual: valor,
        preco_atual: preco
      });
    });

    const totalComAporte = patrimonioTotal + valorAporte;

    // 4. Decidir em qual categoria aportar
    // Calculamos o 'gap' de cada categoria em relação ao total com aporte
    const sugestoes = [];
    let valorRestante = valorAporte;

    // Ordenar categorias que estão mais "para trás" (distância do alvo)
    const sortedCats = Object.keys(categoriasInfo).map(cat => {
      const info = categoriasInfo[cat];
      const alvoAbsoluto = totalComAporte * (info.alvo_pct / 100);
      return {
        categoria: cat,
        gap: alvoAbsoluto - info.atual,
        ...info
      };
    }).sort((a, b) => b.gap - a.gap);

    // 5. Distribuir o aporte dentro das categorias com gap positivo
    for (const catInfo of sortedCats) {
      if (valorRestante <= 0) break;
      
      const valorParaEstaCat = Math.min(valorRestante, Math.max(0, catInfo.gap));
      if (valorParaEstaCat <= 0) continue;

      // Dentro da categoria, distribuir pelos ativos
      // Usamos a nota do ativo (1-10) para definir a meta interna relativa à soma das notas
      const totalNotasAtivos = catInfo.ativos.reduce((s, a) => s + (a.nota || 0), 0);
      
      if (totalNotasAtivos > 0) {
        // Alvo total para a categoria após o aporte específico
        const novoTotalCat = catInfo.atual + valorParaEstaCat;
        
        const ativosComGap = catInfo.ativos.map(a => {
          const alvoAtivo = novoTotalCat * ((a.nota || 0) / totalNotasAtivos);
          return {
            ...a,
            gap_ativo: alvoAtivo - a.valor_atual
          };
        }).sort((a, b) => b.gap_ativo - a.gap_ativo);

        let restanteNaCat = valorParaEstaCat;
        for (const a of ativosComGap) {
          if (restanteNaCat <= 0) break;
          const aporteNoAtivo = Math.min(restanteNaCat, Math.max(0, a.gap_ativo));
          if (aporteNoAtivo > 0.01) {
            sugestoes.push({
              ticker: a.ticker,
              categoria: a.categoria,
              valor: aporteNoAtivo,
              quantidade: a.preco_atual > 0 ? (a.preco_atual > 0 && a.moeda === 'USD' ? (aporteNoAtivo / usdToBrl) / a.preco_atual : aporteNoAtivo / a.preco_atual) : 0,
              cor: 'primary'
            });
            restanteNaCat -= aporteNoAtivo;
            valorRestante -= aporteNoAtivo;
          }
        }
      }
    }

    res.json({
      patrimonio_total: patrimonioTotal,
      valor_aporte: valorAporte,
      proximo_passo: sortedCats[0]?.categoria || 'N/A',
      sugestoes,
      detalhes_categorias: sortedCats.map(c => ({
        categoria: c.categoria,
        atual_pct: patrimonioTotal > 0 ? (c.atual / patrimonioTotal) * 100 : 0,
        alvo_pct: c.alvo_pct,
        gap_valor: c.gap
      }))
    });

  } catch (err) {
    console.error('[Sugestão]', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
