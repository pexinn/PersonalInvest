'use strict';

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/aportes',    require('./routes/aportes'));
app.use('/api/carteira',   require('./routes/carteira'));
app.use('/api/proventos',  require('./routes/proventos'));
app.use('/api/patrimonio', require('./routes/patrimonio'));
app.use('/api/ativos',     require('./routes/ativos'));
app.use('/api/dashboard',  require('./routes/dashboard'));
app.use('/api/config',     require('./routes/config'));
app.use('/api/sugestao',   require('./routes/sugestao'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), version: '1.0.0' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('[Error]', err);
  res.status(500).json({ error: err.message || 'Erro interno do servidor' });
});

app.listen(PORT, () => {
  console.log(`\n🚀 PersonalInvest API rodando em http://localhost:${PORT}`);
  console.log(`   Endpoints disponíveis:`);
  console.log(`   GET  http://localhost:${PORT}/api/health`);
  console.log(`   GET  http://localhost:${PORT}/api/dashboard`);
  console.log(`   GET  http://localhost:${PORT}/api/aportes`);
  console.log(`   GET  http://localhost:${PORT}/api/carteira`);
  console.log(`   GET  http://localhost:${PORT}/api/proventos`);
  console.log(`   GET  http://localhost:${PORT}/api/patrimonio`);
  console.log(`   GET  http://localhost:${PORT}/api/ativos\n`);
});

module.exports = app;
