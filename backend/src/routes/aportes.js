'use strict';

const express = require('express');
const router = express.Router();
const db = require('../database/db');

// GET /api/aportes - listar com filtros
router.get('/', (req, res) => {
  const { ticker, categoria, inicio, fim, page = 1, limit = 50 } = req.query;
  const offset = (page - 1) * limit;

  let query = `
    SELECT a.*, at.categoria, at.nome
    FROM aportes a
    LEFT JOIN ativos at ON a.ticker = at.ticker
    WHERE 1=1
  `;
  const params = [];

  if (ticker) { query += ' AND a.ticker = ?'; params.push(ticker.toUpperCase()); }
  if (categoria) { query += ' AND at.categoria = ?'; params.push(categoria.toUpperCase()); }
  if (inicio) { query += ' AND a.data >= ?'; params.push(inicio); }
  if (fim) { query += ' AND a.data <= ?'; params.push(fim); }

  query += ' ORDER BY a.data DESC, a.id DESC';

  const countQuery = query.replace('SELECT a.*, at.categoria, at.nome', 'SELECT COUNT(*) as total');
  const baseParams = [...params];
  const total = db.prepare(countQuery).get(...baseParams).total;

  query += ' LIMIT ? OFFSET ?';
  params.push(Number(limit), Number(offset));

  const rows = db.prepare(query).all(...params);

  let sum_quantidade = null;
  let sum_valor = null;
  if (ticker) {
    const sumQuery = countQuery.replace('COUNT(*) as total', 'SUM(a.quantidade) as sq, SUM(a.valor_total) as sv');
    const sums = db.prepare(sumQuery).get(...baseParams);
    sum_quantidade = sums.sq || 0;
    sum_valor = sums.sv || 0;
  }

  res.json({ data: rows, total, page: Number(page), limit: Number(limit), sum_quantidade, sum_valor });
});

// POST /api/aportes - novo lançamento
router.post('/', (req, res) => {
  const { data, ticker, moeda = 'BRL', valor_total, quantidade, corretora, observacao } = req.body;

  if (!data || !ticker || valor_total == null || quantidade == null) {
    return res.status(400).json({ error: 'Campos obrigatórios: data, ticker, valor_total, quantidade' });
  }

  // Garante que o ativo existe
  const ativo = db.prepare('SELECT ticker FROM ativos WHERE ticker = ?').get(ticker.toUpperCase());
  if (!ativo) {
    return res.status(404).json({ error: `Ativo '${ticker}' não cadastrado. Cadastre o ativo primeiro.` });
  }

  const stmt = db.prepare(`
    INSERT INTO aportes (data, ticker, moeda, valor_total, quantidade, corretora, observacao)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const info = stmt.run(data, ticker.toUpperCase(), moeda, valor_total, quantidade, corretora || null, observacao || null);
  const novo = db.prepare('SELECT * FROM aportes WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json(novo);
});

// PUT /api/aportes/:id - editar
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const { data, ticker, moeda, valor_total, quantidade, corretora, observacao } = req.body;

  const existing = db.prepare('SELECT * FROM aportes WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'Aporte não encontrado' });

  db.prepare(`
    UPDATE aportes SET
      data = ?, ticker = ?, moeda = ?, valor_total = ?, quantidade = ?,
      corretora = ?, observacao = ?
    WHERE id = ?
  `).run(
    data ?? existing.data,
    (ticker ?? existing.ticker).toUpperCase(),
    moeda ?? existing.moeda,
    valor_total ?? existing.valor_total,
    quantidade ?? existing.quantidade,
    corretora ?? existing.corretora,
    observacao ?? existing.observacao,
    id
  );

  res.json(db.prepare('SELECT * FROM aportes WHERE id = ?').get(id));
});

// DELETE /api/aportes/:id
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  const existing = db.prepare('SELECT id FROM aportes WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'Aporte não encontrado' });
  db.prepare('DELETE FROM aportes WHERE id = ?').run(id);
  res.json({ message: 'Aporte removido com sucesso' });
});

module.exports = router;
