-- PersonalInvest Database Schema

PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

-- Cadastro de ativos (tickers)
CREATE TABLE IF NOT EXISTS ativos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ticker TEXT NOT NULL UNIQUE,
  nome TEXT,
  categoria TEXT NOT NULL CHECK(categoria IN ('ACOES','FIIS','EUA','FIXA','CRIPTO')),
  moeda TEXT NOT NULL DEFAULT 'BRL' CHECK(moeda IN ('BRL','USD')),
  nota INTEGER DEFAULT 5 CHECK(nota BETWEEN 1 AND 10),
  percentual_ideal REAL DEFAULT 0,
  ativo BOOLEAN DEFAULT 1,
  preco_atual REAL DEFAULT 0,
  atualizacao_manual BOOLEAN DEFAULT 0,
  criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Aportes: compras e vendas
CREATE TABLE IF NOT EXISTS aportes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  data DATE NOT NULL,
  ticker TEXT NOT NULL,
  moeda TEXT NOT NULL DEFAULT 'BRL' CHECK(moeda IN ('BRL','USD')),
  valor_total REAL NOT NULL,       -- positivo=compra, negativo=venda
  quantidade REAL NOT NULL,        -- positivo=compra, negativo=venda
  preco_unitario REAL GENERATED ALWAYS AS (
    CASE WHEN quantidade != 0 THEN valor_total / quantidade ELSE 0 END
  ) STORED,
  corretora TEXT,
  observacao TEXT,
  criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (ticker) REFERENCES ativos(ticker)
);

-- Proventos: dividendos, JCP, rendimentos, aluguéis
CREATE TABLE IF NOT EXISTS proventos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  data_pagamento DATE NOT NULL,
  ticker TEXT NOT NULL,
  corretora TEXT,
  valor REAL NOT NULL,
  tipo TEXT NOT NULL CHECK(tipo IN ('Dividendo','JCP','Rendimento','Aluguel','Outros')),
  observacao TEXT,
  criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (ticker) REFERENCES ativos(ticker)
);

-- Patrimônio: snapshots mensais
CREATE TABLE IF NOT EXISTS patrimonio_snapshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  data DATE NOT NULL,
  descricao TEXT,
  criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Itens de patrimônio por snapshot
CREATE TABLE IF NOT EXISTS patrimonio_itens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  snapshot_id INTEGER NOT NULL,
  categoria TEXT NOT NULL,   -- Investimentos, Carro, Reserva, FGTS, Dívida, etc.
  valor REAL NOT NULL DEFAULT 0,
  FOREIGN KEY (snapshot_id) REFERENCES patrimonio_snapshots(id) ON DELETE CASCADE
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_aportes_ticker ON aportes(ticker);
CREATE INDEX IF NOT EXISTS idx_aportes_data ON aportes(data);
CREATE INDEX IF NOT EXISTS idx_proventos_ticker ON proventos(ticker);
CREATE INDEX IF NOT EXISTS idx_proventos_data ON proventos(data_pagamento);
