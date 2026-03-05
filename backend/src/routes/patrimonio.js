'use strict';

const express = require('express');
const router = express.Router();
const db = require('../database/db');

// GET /api/patrimonio - lista snapshots com itens
router.get('/', (req, res) => {
  const snapshots = db.prepare('SELECT * FROM patrimonio_snapshots ORDER BY data DESC').all();
  const resultado = snapshots.map(snap => {
    const itens = db.prepare('SELECT * FROM patrimonio_itens WHERE snapshot_id = ?').all(snap.id);
    return { ...snap, itens };
  });
  res.json(resultado);
});

// GET /api/patrimonio/historico - série temporal para gráfico
router.get('/historico', (req, res) => {
  const rows = db.prepare(`
    SELECT
      ps.data,
      pi.categoria,
      SUM(pi.valor) as valor
    FROM patrimonio_snapshots ps
    JOIN patrimonio_itens pi ON ps.id = pi.snapshot_id
    GROUP BY ps.data, pi.categoria
    ORDER BY ps.data ASC
  `).all();
  res.json(rows);
});

// POST /api/patrimonio - criar snapshot
router.post('/', (req, res) => {
  const { data, descricao, itens } = req.body;
  if (!data || !itens || !Array.isArray(itens) || itens.length === 0) {
    return res.status(400).json({ error: 'Campos obrigatórios: data, itens (array)' });
  }

  const insertSnap = db.prepare('INSERT INTO patrimonio_snapshots (data, descricao) VALUES (?, ?)');
  const insertItem = db.prepare('INSERT INTO patrimonio_itens (snapshot_id, categoria, valor) VALUES (?, ?, ?)');

  const doInsert = db.transaction(() => {
    const snap = insertSnap.run(data, descricao || null);
    const snapId = snap.lastInsertRowid;
    for (const item of itens) {
      insertItem.run(snapId, item.categoria, item.valor ?? 0);
    }
    return snapId;
  });

  const snapId = doInsert();
  const snap = db.prepare('SELECT * FROM patrimonio_snapshots WHERE id = ?').get(snapId);
  const itensResult = db.prepare('SELECT * FROM patrimonio_itens WHERE snapshot_id = ?').all(snapId);
  res.status(201).json({ ...snap, itens: itensResult });
});

// DELETE /api/patrimonio/:id
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  if (!db.prepare('SELECT id FROM patrimonio_snapshots WHERE id = ?').get(id)) {
    return res.status(404).json({ error: 'Snapshot não encontrado' });
  }
  db.prepare('DELETE FROM patrimonio_snapshots WHERE id = ?').run(id);
  res.json({ message: 'Snapshot removido' });
});

module.exports = router;
