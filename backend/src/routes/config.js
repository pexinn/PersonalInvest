'use strict';

const express = require('express');
const router = express.Router();
const db = require('../database/db');

// GET /api/config/alocacao - Listar cota alvo por categoria
router.get('/alocacao', (req, res) => {
  try {
    const config = db.prepare('SELECT * FROM config_alocacao').all();
    res.json(config);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/config/alocacao - Salvar cota alvo por categoria
router.post('/alocacao', (req, res) => {
  try {
    const configs = req.body; // Array de { categoria, percentual_alvo }
    
    if (!Array.isArray(configs)) {
      return res.status(400).json({ error: 'Payload deve ser um array' });
    }

    const transaction = db.transaction((data) => {
      for (const item of data) {
        db.prepare(`
          INSERT INTO config_alocacao (categoria, percentual_alvo)
          VALUES (?, ?)
          ON CONFLICT(categoria) DO UPDATE SET percentual_alvo = excluded.percentual_alvo
        `).run(item.categoria, item.percentual_alvo);
      }
    });

    transaction(configs);
    res.json({ message: 'Configurações salvas com sucesso' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
