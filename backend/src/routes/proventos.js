'use strict';

const express = require('express');
const router = express.Router();
const db = require('../database/db');

// GET /api/proventos
router.get('/', (req, res) => {
  const { ticker, tipo, inicio, fim, page = 1, limit = 50 } = req.query;
  const offset = (page - 1) * limit;

  let query = `
    SELECT p.*, a.categoria, a.nome
    FROM proventos p
    LEFT JOIN ativos a ON p.ticker = a.ticker
    WHERE 1=1
  `;
  const params = [];

  if (ticker) { query += ' AND p.ticker = ?'; params.push(ticker.toUpperCase()); }
  if (tipo) { query += ' AND p.tipo = ?'; params.push(tipo); }
  if (inicio) { query += ' AND p.data_pagamento >= ?'; params.push(inicio); }
  if (fim) { query += ' AND p.data_pagamento <= ?'; params.push(fim); }
  if (req.query.mes) { query += " AND strftime('%Y-%m', p.data_pagamento) = ?"; params.push(req.query.mes); }

  query += ' ORDER BY p.data_pagamento DESC, p.id DESC';

  const countQuery = query.replace('SELECT p.*, a.categoria, a.nome', 'SELECT COUNT(*) as total');
  const total = db.prepare(countQuery).get(...params).total;

  query += ' LIMIT ? OFFSET ?';
  params.push(Number(limit), Number(offset));

  const rows = db.prepare(query).all(...params);

  // Totais
  const totaisQuery = `
    SELECT COALESCE(SUM(p.valor), 0) as total_geral,
           strftime('%Y', p.data_pagamento) as ano
    FROM proventos p
    WHERE 1=1
    ${ticker ? ' AND p.ticker = ?' : ''}
    GROUP BY strftime('%Y', p.data_pagamento)
    ORDER BY ano DESC
  `;
  const totaisPorAno = db.prepare(totaisQuery).all(...(ticker ? [ticker.toUpperCase()] : []));

  res.json({ data: rows, total, page: Number(page), limit: Number(limit), totais_por_ano: totaisPorAno });
});

// GET /api/proventos/resumo - agrupado por mês / ativo
router.get('/resumo', (req, res) => {
  const rows = db.prepare(`
    SELECT
      strftime('%Y-%m', data_pagamento) as mes_ano,
      ticker,
      tipo,
      SUM(valor) as total
    FROM proventos
    GROUP BY mes_ano, ticker, tipo
    ORDER BY mes_ano DESC
  `).all();
  res.json(rows);
});

// POST /api/proventos
router.post('/', (req, res) => {
  const { data_pagamento, ticker, corretora, valor, tipo, observacao } = req.body;
  if (!data_pagamento || !ticker || valor == null || !tipo) {
    return res.status(400).json({ error: 'Campos obrigatórios: data_pagamento, ticker, valor, tipo' });
  }

  const ativo = db.prepare('SELECT ticker FROM ativos WHERE ticker = ?').get(ticker.toUpperCase());
  if (!ativo) {
    return res.status(404).json({ error: `Ativo '${ticker}' não cadastrado.` });
  }

  const stmt = db.prepare(`
    INSERT INTO proventos (data_pagamento, ticker, corretora, valor, tipo, observacao)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  const info = stmt.run(data_pagamento, ticker.toUpperCase(), corretora || null, valor, tipo, observacao || null);
  res.status(201).json(db.prepare('SELECT * FROM proventos WHERE id = ?').get(info.lastInsertRowid));
});

// PUT /api/proventos/:id
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const existing = db.prepare('SELECT * FROM proventos WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'Provento não encontrado' });

  const { data_pagamento, ticker, corretora, valor, tipo, observacao } = req.body;
  db.prepare(`
    UPDATE proventos SET data_pagamento=?, ticker=?, corretora=?, valor=?, tipo=?, observacao=?
    WHERE id=?
  `).run(
    data_pagamento ?? existing.data_pagamento,
    (ticker ?? existing.ticker).toUpperCase(),
    corretora ?? existing.corretora,
    valor ?? existing.valor,
    tipo ?? existing.tipo,
    observacao ?? existing.observacao,
    id
  );
  res.json(db.prepare('SELECT * FROM proventos WHERE id = ?').get(id));
});

// DELETE /api/proventos/:id
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  if (!db.prepare('SELECT id FROM proventos WHERE id = ?').get(id)) {
    return res.status(404).json({ error: 'Provento não encontrado' });
  }
  db.prepare('DELETE FROM proventos WHERE id = ?').run(id);
  res.json({ message: 'Provento removido' });
});

module.exports = router;
