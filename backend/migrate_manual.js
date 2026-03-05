const db = require('better-sqlite3')('data/personalinvest.db');
db.exec('ALTER TABLE ativos ADD COLUMN preco_atual REAL DEFAULT 0;');
db.exec('ALTER TABLE ativos ADD COLUMN atualizacao_manual BOOLEAN DEFAULT 0;');
console.log('Migração concluída.');
