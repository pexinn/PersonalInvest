const path = require('path');
const db = require(path.resolve(__dirname, 'src/database/db.js'));

console.log('Iniciando limpeza do banco de dados...');

try {
  // Desativa checagem de chave estrangeira temporariamente para permitir o TRUNCATE simulado
  db.pragma('foreign_keys = OFF');

  const deleteAll = db.transaction(() => {
    db.exec('DELETE FROM aportes;');
    db.exec('DELETE FROM proventos;');
    db.exec('DELETE FROM patrimonio_itens;');
    db.exec('DELETE FROM patrimonio_snapshots;');
    db.exec('DELETE FROM ativos;');
    
    // Reseta os IDs numéricos (AUTOINCREMENT) para voltarem a começar do 1
    db.exec(`DELETE FROM sqlite_sequence WHERE name IN ('aportes', 'proventos', 'patrimonio_itens', 'patrimonio_snapshots', 'ativos');`);
  });

  deleteAll();
  db.pragma('foreign_keys = ON');

  console.log('✅ Banco de dados zerado com sucesso!');
  console.log('Todos os ativos, aportes, proventos e histórico de patrimônio foram apagados.');
  console.log('Agora você pode iniciar o cadastro com seus dados reais.');

} catch (error) {
  console.error('❌ Erro ao limpar banco de dados:', error.message);
}
