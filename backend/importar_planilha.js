const fs = require('fs');
const path = require('path');
const db = require(path.resolve(__dirname, 'src/database/db.js'));

try {
  require.resolve('csv-parser');
} catch (e) {
  console.log("Instalando dependência 'csv-parser' necessária para importação...");
  require('child_process').execSync('npm install csv-parser', { stdio: 'inherit' });
}
const csv = require('csv-parser');

const parseCurrency = (val) => {
  if (!val) return 0;
  if(val === '#DIV/0!' || val === '#VALUE!' || val === '#N/A') return 0;
  let s = val.toString().trim();
  s = s.replace(/R\$\s*/g, '').replace(/\$\s*/g, '');
  // if '-' is before R$, it becomes - value
  s = s.replace(/\./g, '').replace(',', '.');
  const num = parseFloat(s);
  return isNaN(num) ? 0 : num;
};

const parseDate = (val) => {
  if (!val) return null;
  if(val.includes('/')) {
    const parts = val.split('/');
    if (parts.length === 3) {
      if(parts[2].length === 2 && parts[2] > 50) parts[2] = '19' + parts[2];
      else if(parts[2].length === 2) parts[2] = '20' + parts[2];
      // Format to YYYY-MM-DD
      return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    }
  }
  return val;
};

const guessCategoria = (ticker, nome, moeda) => {
  ticker = (ticker || '').toUpperCase();
  nome = (nome || '').toUpperCase();
  moeda = (moeda || '').toUpperCase();
  if (moeda === 'DOLAR' || moeda === 'USD') return 'EUA';
  
  // Specific exceptions the user requested or are common ETFs
  if (ticker === 'DIVO11' || ticker === 'NSDV11' || ticker === 'BOVA11') return 'ACOES';
  
  if (ticker.endsWith('11') && ticker.length >= 5 && ticker.length <= 6) return 'FIIS';
  if (ticker.includes('IPCA') || ticker.includes('SELIC') || ticker.includes('PREFIXADO') || ticker.includes('CDB') || ticker.includes('TESOURO')) return 'FIXA';
  if (ticker.includes('FIA ') || ticker.includes('FIC ') || ticker.includes('FIM ') || ticker.includes('CAPITAL') || ticker.includes('DEVANT') || ticker.includes('FUNDO') || ticker.includes('FMP')) return 'FUNDOS';
  return 'ACOES'; // default
};

const mapMoeda = (val) => {
  const m = (val || '').toUpperCase();
  if (m === 'DOLAR' || m === 'USD') return 'USD';
  return 'BRL';
};

const mapTipoProvento = (val) => {
  const t = (val || '').toUpperCase();
  if (t.includes('RENDIMENTO')) return 'Rendimento';
  if (t.includes('DIVIDENDO')) return 'Dividendo';
  if (t.includes('JCP') || t.includes('JUROS SOBRE CAPITAL')) return 'JCP';
  if (t.includes('ALUGUEL')) return 'Aluguel';
  return 'Outros'; 
};

const importData = async () => {
  console.log('--- Importador PersonalInvest ---');
  
  const dataPath = path.resolve(__dirname, 'data');
  const aportesFile = path.join(dataPath, 'Investimentos - Aportes.csv');
  const proventosFile = path.join(dataPath, 'Investimentos - Proventos.csv');

  if (!fs.existsSync(aportesFile)) {
    console.error(`❌ O arquivo ${aportesFile} não foi encontrado.`);
    process.exit(1);
  }

  db.pragma('foreign_keys = OFF');

  const insertAtivo = db.prepare(`
    INSERT OR IGNORE INTO ativos 
    (ticker, nome, categoria, moeda, nota, percentual_ideal, ativo, preco_atual, atualizacao_manual)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertAporte = db.prepare(`
    INSERT INTO aportes (data, ticker, moeda, valor_total, quantidade)
    VALUES (?, ?, ?, ?, ?)
  `);
  
  const insertProvento = db.prepare(`
    INSERT INTO proventos (data_pagamento, ticker, corretora, moeda, valor, tipo)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  // 1. Process Aportes
  console.log('⏳ Lendo Aportes e Cadastro de Ativos...');
  let ativosCount = 0;
  let aportesCount = 0;

  const ativosMap = new Set(); 

  const seenHeadersAportes = {};

  await new Promise((resolve, reject) => {
    fs.createReadStream(aportesFile)
      .pipe(csv({ 
        skipLines: 1,
        mapHeaders: ({ header }) => {
          if (!seenHeadersAportes[header]) {
            seenHeadersAportes[header] = 1;
            return header || 'Empty';
          }
          seenHeadersAportes[header]++;
          return `${header}_${seenHeadersAportes[header]}`;
        }
      })) // Pula a primeira linha que é o super header
      .on('data', (row) => {
        // As colunas no CSV do Google começam com Data, Mês/ano, Titulo, Moeda, Investido, Qtde
        // Vamos extrair do CSV original
        const dataOrig = row['Data'];
        const titulo = row['Titulo'];
        const moeda = row['Moeda'];
        const investido = row['Investido'];
        const qtde = row['Qtde'];

        if (!titulo || titulo.trim() === '' || titulo === '#VALUE!' || titulo === '#N/A' || titulo === 'Titulo' || titulo.includes('Ação')) return;
        if (!dataOrig || dataOrig.trim() === '') return; // Aporte precisa de data
        
        const ticker = titulo.trim().toUpperCase();
        
        try {
          // Cadastrar ativo caso não exista na sessão atual
          if (!ativosMap.has(ticker)) {
            const cat = guessCategoria(ticker, titulo, moeda);
            const moed = mapMoeda(moeda);
            insertAtivo.run(ticker, titulo, cat, moed, 5, 0, 1, 0, 0);
            ativosMap.add(ticker);
            ativosCount++;
          }

          // Criar aporte
          const dt = parseDate(dataOrig);
          if (!dt) return;

          const valTotal = parseCurrency(investido);
          const quantidade = parseCurrency(qtde);

          // Se o valor total ou a quantidade for diferente de zero, adiciona o aporte
          if (valTotal !== 0 || quantidade !== 0) {
            insertAporte.run(dt, ticker, mapMoeda(moeda), valTotal, quantidade);
            aportesCount++;
          }
        } catch (err) {
          console.error('Error inserting row:', titulo, dataOrig, err.message);
        }
      })
      .on('end', resolve)
      .on('error', reject);
  });
  
  console.log(`✅ ${ativosMap.size} Ativos encontrados/validados em Aportes.`);
  console.log(`✅ ${aportesCount} Aportes importados.`);

  // 2. Process Proventos
  if (fs.existsSync(proventosFile)) {
    console.log('⏳ Lendo Proventos...');
    let proventosCount = 0;
    
    const seenHeadersProventos = {};

    await new Promise((resolve, reject) => {
      fs.createReadStream(proventosFile)
        .pipe(csv({ 
          skipLines: 1,
          mapHeaders: ({ header }) => {
            if (!seenHeadersProventos[header]) {
              seenHeadersProventos[header] = 1;
              return header || 'Empty';
            }
            seenHeadersProventos[header]++;
            return `${header}_${seenHeadersProventos[header]}`;
          }
        })) // Pula o super header
        .on('data', (row) => {
          // Colunas: Data Pagamento, Mês/ano, Corretora, Ativo, Moeda, Valor, Tipo
          const dataPagamento = row['Data Pagamento'];
          const ativo = row['Ativo'];
          const corretora = row['Corretora'];
          const valor = row['Valor'];
          const tipo = row['Tipo'];

          if (!ativo || ativo.trim() === '' || ativo.includes('Ativo') || ativo === '#VALUE!') return;
          if (!dataPagamento || dataPagamento.trim() === '') return;

          const ticker = ativo.trim().toUpperCase();
          const dt = parseDate(dataPagamento);
          const v = parseCurrency(valor);
          
          if (!dt || v === 0) return;

          const t = mapTipoProvento(tipo);
          
          // Assegura que o ativo existe
          if (!ativosMap.has(ticker)) {
             insertAtivo.run(ticker, ticker, guessCategoria(ticker, ticker, row['Moeda']), mapMoeda(row['Moeda']), 5, 0, 1, 0, 0);
             ativosMap.add(ticker);
          }

          insertProvento.run(dt, ticker, corretora || '', mapMoeda(row['Moeda']), v, t);
          proventosCount++;
        })
        .on('end', resolve)
        .on('error', reject);
    });
    
    console.log(`✅ ${proventosCount} Proventos importados.`);
  } else {
    console.log(`⚠️ Arquivo de proventos não encontrado: ${proventosFile}. Pulando...`);
  }

  db.pragma('foreign_keys = ON');
  console.log('\n🚀 Importação concluída! Verifique o console do backend caso ele esteja rodando e reinicie se necessário.');
};

importData().catch(console.error);
