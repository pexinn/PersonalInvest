'use strict';

const express = require('express');
const router = express.Router();
const db = require('../database/db');

// GET /api/ativos
router.get('/', (req, res) => {
  const { categoria, ativo = '1' } = req.query;
  let query = 'SELECT * FROM ativos WHERE 1=1';
  const params = [];
  if (categoria) { query += ' AND categoria = ?'; params.push(categoria.toUpperCase()); }
  if (ativo !== 'todos') { query += ' AND ativo = ?'; params.push(Number(ativo)); }
  query += ' ORDER BY categoria, ticker';
  res.json(db.prepare(query).all(...params));
});

// GET /api/ativos/:ticker
router.get('/:ticker', (req, res) => {
  const ativo = db.prepare('SELECT * FROM ativos WHERE ticker = ?').get(req.params.ticker.toUpperCase());
  if (!ativo) return res.status(404).json({ error: 'Ativo não encontrado' });
  res.json(ativo);
});

// POST /api/ativos
router.post('/', (req, res) => {
  const { ticker, nome, categoria, moeda = 'BRL', nota = 5, percentual_ideal = 0 } = req.body;
  if (!ticker || !categoria) {
    return res.status(400).json({ error: 'Campos obrigatórios: ticker, categoria' });
  }
  const validas = ['ACOES', 'FIIS', 'EUA', 'FIXA', 'CRIPTO'];
  if (!validas.includes(categoria.toUpperCase())) {
    return res.status(400).json({ error: `Categoria inválida. Use: ${validas.join(', ')}` });
  }

  try {
    const stmt = db.prepare(`
      INSERT INTO ativos (ticker, nome, categoria, moeda, nota, percentual_ideal)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const info = stmt.run(ticker.toUpperCase(), nome || null, categoria.toUpperCase(), moeda.toUpperCase(), nota, percentual_ideal);
    res.status(201).json(db.prepare('SELECT * FROM ativos WHERE id = ?').get(info.lastInsertRowid));
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      return res.status(409).json({ error: `Ticker '${ticker}' já cadastrado` });
    }
    throw err;
  }
});

// PUT /api/ativos/:ticker
router.put('/:ticker', (req, res) => {
  const existing = db.prepare('SELECT * FROM ativos WHERE ticker = ?').get(req.params.ticker.toUpperCase());
  if (!existing) return res.status(404).json({ error: 'Ativo não encontrado' });

  const { nome, categoria, moeda, nota, percentual_ideal, ativo } = req.body;
  db.prepare(`
    UPDATE ativos SET nome=?, categoria=?, moeda=?, nota=?, percentual_ideal=?, ativo=?
    WHERE ticker=?
  `).run(
    nome ?? existing.nome,
    (categoria ?? existing.categoria).toUpperCase(),
    (moeda ?? existing.moeda).toUpperCase(),
    nota ?? existing.nota,
    percentual_ideal ?? existing.percentual_ideal,
    ativo ?? existing.ativo,
    req.params.ticker.toUpperCase()
  );
  res.json(db.prepare('SELECT * FROM ativos WHERE ticker = ?').get(req.params.ticker.toUpperCase()));
});

// DELETE /api/ativos/:ticker (inativa ao invés de excluir se houver aportes)
router.delete('/:ticker', (req, res) => {
  const ticker = req.params.ticker.toUpperCase();
  const existing = db.prepare('SELECT * FROM ativos WHERE ticker = ?').get(ticker);
  if (!existing) return res.status(404).json({ error: 'Ativo não encontrado' });

  const temAportes = db.prepare('SELECT COUNT(*) as c FROM aportes WHERE ticker = ?').get(ticker).c;
  if (temAportes > 0) {
    db.prepare('UPDATE ativos SET ativo = 0 WHERE ticker = ?').run(ticker);
    return res.json({ message: 'Ativo inativado (possui aportes registrados)' });
  }
  db.prepare('DELETE FROM ativos WHERE ticker = ?').run(ticker);
  res.json({ message: 'Ativo removido' });
});

module.exports = router;
