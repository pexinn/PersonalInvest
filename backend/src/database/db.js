'use strict';

const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');
require('dotenv').config();

const dbPath = path.resolve(process.env.DB_PATH || './data/personalinvest.db');
const dataDir = path.dirname(dbPath);

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const schemaPath = path.join(__dirname, 'schema.sql');
const schema = fs.readFileSync(schemaPath, 'utf8');

const db = new Database(dbPath);
db.exec(schema);

// Seed: alguns ativos comuns para facilitar o uso inicial
const seedAtivos = () => {
  const count = db.prepare('SELECT COUNT(*) as c FROM ativos').get();
  if (count.c > 0) return;

  const insert = db.prepare(`
    INSERT OR IGNORE INTO ativos (ticker, nome, categoria, moeda, nota, percentual_ideal)
    VALUES (@ticker, @nome, @categoria, @moeda, @nota, @percentual_ideal)
  `);

  const ativos = [
    { ticker: 'BOVA11', nome: 'iShares Ibovespa ETF', categoria: 'ACOES', moeda: 'BRL', nota: 8, percentual_ideal: 20 },
    { ticker: 'KNRI11', nome: 'Kinea Renda Imobiliária', categoria: 'FIIS', moeda: 'BRL', nota: 8, percentual_ideal: 15 },
    { ticker: 'HGLG11', nome: 'CSHG Logística', categoria: 'FIIS', moeda: 'BRL', nota: 7, percentual_ideal: 10 },
    { ticker: 'MXRF11', nome: 'Maxi Renda', categoria: 'FIIS', moeda: 'BRL', nota: 7, percentual_ideal: 10 },
    { ticker: 'IVV',    nome: 'iShares Core S&P 500 ETF', categoria: 'EUA', moeda: 'USD', nota: 9, percentual_ideal: 20 },
    { ticker: 'VT',     nome: 'Vanguard Total World Stock', categoria: 'EUA', moeda: 'USD', nota: 9, percentual_ideal: 10 },
    { ticker: 'TESOURO SELIC', nome: 'Tesouro Selic', categoria: 'FIXA', moeda: 'BRL', nota: 6, percentual_ideal: 15 },
  ];

  const insertMany = db.transaction((items) => {
    for (const item of items) insert.run(item);
  });

  insertMany(ativos);
  console.log('[DB] Seed de ativos concluído');
};

seedAtivos();

module.exports = db;
