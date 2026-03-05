const db = require('better-sqlite3')('data/personalinvest.db');

db.pragma('foreign_keys = OFF');

db.transaction(() => {
  // Rename old table
  db.exec('ALTER TABLE ativos RENAME TO ativos_old;');

  // Create new table with updated CHECK constraint
  db.exec(`
    CREATE TABLE ativos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ticker TEXT NOT NULL UNIQUE,
      nome TEXT,
      categoria TEXT NOT NULL CHECK(categoria IN ('ACOES','FIIS','EUA','FIXA','CRIPTO','FUNDOS')),
      moeda TEXT NOT NULL DEFAULT 'BRL' CHECK(moeda IN ('BRL','USD')),
      nota INTEGER DEFAULT 5 CHECK(nota BETWEEN 1 AND 10),
      percentual_ideal REAL DEFAULT 0,
      ativo BOOLEAN DEFAULT 1,
      preco_atual REAL DEFAULT 0,
      atualizacao_manual BOOLEAN DEFAULT 0,
      criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Copy data
  db.exec(`
    INSERT INTO ativos (id, ticker, nome, categoria, moeda, nota, percentual_ideal, ativo, preco_atual, atualizacao_manual, criado_em)
    SELECT id, ticker, nome, categoria, moeda, nota, percentual_ideal, ativo, preco_atual, atualizacao_manual, criado_em
    FROM ativos_old;
  `);

  // Drop old table
  db.exec('DROP TABLE ativos_old;');
})();

db.pragma('foreign_keys = ON');

console.log('Migração de categoria concluída.');
