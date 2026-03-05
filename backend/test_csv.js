const fs = require('fs');
const csv = require('csv-parser');
const path = require('path');

const aportesFile = path.resolve(__dirname, 'data/Investimentos - Aportes.csv');
let count = 0;
fs.createReadStream(aportesFile)
  .pipe(csv({ skipLines: 1 }))
  .on('data', (row) => {
    if (count < 20) {
      console.log('Row:', row['Data'], row['Titulo']);
      console.log('Keys:', Object.keys(row));
    }
    count++;
  })
  .on('end', () => {
    console.log('Total read:', count);
  });
