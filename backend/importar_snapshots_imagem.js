const db = require('./src/database/db');

const snapshots = [
  {
    data: '2021-03-01',
    descricao: 'Snapshot Março 2021',
    itens: [
      { categoria: 'Investimentos', valor: 95485.59 },
      { categoria: 'Carro', valor: 33254.00 },
      { categoria: 'Reserva', valor: 5000.00 },
      { categoria: 'FGTS', valor: 30000.00 },
      { categoria: 'Conta Corrente', valor: 6000.00 },
      { categoria: 'Dívida', valor: 0.00 }
    ]
  },
  {
    data: '2023-01-01',
    descricao: 'Snapshot Janeiro 2023',
    itens: [
      { categoria: 'Investimentos', valor: 144732.58 },
      { categoria: 'Carro', valor: 43343.00 },
      { categoria: 'Reserva', valor: 7500.00 },
      { categoria: 'FGTS', valor: 32500.00 },
      { categoria: 'Conta Corrente', valor: 9100.00 },
      { categoria: 'Dívida', valor: 0.00 }
    ]
  },
  {
    data: '2024-01-01',
    descricao: 'Snapshot Janeiro 2024',
    itens: [
      { categoria: 'Investimentos', valor: 175244.74 },
      { categoria: 'Carro', valor: 76723.00 },
      { categoria: 'Reserva', valor: 8959.33 },
      { categoria: 'FGTS', valor: 41257.09 },
      { categoria: 'Conta Corrente', valor: 4422.78 },
      { categoria: 'Dívida', valor: -17369.03 }
    ]
  },
  {
    data: '2025-01-01',
    descricao: 'Snapshot Janeiro 2025',
    itens: [
      { categoria: 'Investimentos', valor: 54000.00 },
      { categoria: 'Carro', valor: 74413.00 },
      { categoria: 'Reserva', valor: 11400.00 },
      { categoria: 'FGTS', valor: 0.00 },
      { categoria: 'Conta Corrente', valor: 0.00 },
      { categoria: 'Skins', valor: 14490.56 },
      { categoria: 'Casa', valor: 400000.00 },
      { categoria: 'Dívida', valor: -194789.70 }
    ]
  }
];

const insertData = db.transaction(() => {
  for (const s of snapshots) {
    const result = db.prepare('INSERT INTO patrimonio_snapshots (data, descricao) VALUES (?, ?)').run(s.data, s.descricao);
    const snapshotId = result.lastInsertRowid;

    const stmtItem = db.prepare('INSERT INTO patrimonio_itens (snapshot_id, categoria, valor) VALUES (?, ?, ?)');
    for (const item of s.itens) {
      stmtItem.run(snapshotId, item.categoria, item.valor);
    }
  }
});

try {
  insertData();
  console.log('Snapshots importados com sucesso!');
} catch (err) {
  console.error('Erro ao importar snapshots:', err);
}
