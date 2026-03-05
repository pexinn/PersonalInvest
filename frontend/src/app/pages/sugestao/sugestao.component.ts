import { Component, OnInit } from '@angular/core';
import { CommonModule, CurrencyPipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ApiService } from '../../core/services/api.service';

@Component({
  selector: 'app-sugestao',
  standalone: true,
  imports: [
    CommonModule, FormsModule, CurrencyPipe, DecimalPipe,
    MatCardModule, MatFormFieldModule, MatInputModule, 
    MatButtonModule, MatIconModule, MatTableModule, 
    MatDividerModule, MatProgressBarModule, MatTooltipModule,
    MatSnackBarModule
  ],
  templateUrl: './sugestao.component.html',
  styles: [`
    .config-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 20px;
      margin-bottom: 30px;
    }
    .suggestion-card {
      margin-top: 30px;
    }
    .cat-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 10px;
      padding: 8px;
      border-radius: 4px;
      background: rgba(0,0,0,0.03);
    }
    .gap-positive { color: #f44336; font-weight: bold; }
    .gap-negative { color: #4caf50; }
    .total-footer {
      display: flex;
      justify-content: space-between;
      font-weight: bold;
      margin-top: 15px;
      padding-top: 10px;
      border-top: 1px solid #ddd;
    }
  `]
})
export class SugestaoComponent implements OnInit {
  valorAporte: number = 0;
  configs: any[] = [
    { categoria: 'ACOES', percentual_alvo: 0 },
    { categoria: 'FIIS', percentual_alvo: 0 },
    { categoria: 'EUA', percentual_alvo: 0 },
    { categoria: 'FIXA', percentual_alvo: 0 },
    { categoria: 'CRIPTO', percentual_alvo: 0 },
    { categoria: 'FUNDOS', percentual_alvo: 0 }
  ];
  
  resultado: any = null;
  loading = false;
  saving = false;

  constructor(private api: ApiService, private snack: MatSnackBar) {}

  ngOnInit() {
    this.loadConfig();
  }

  loadConfig() {
    this.api.getConfigAlocacao().subscribe(res => {
      if (res && res.length > 0) {
        // Mapear valores que já existem
        this.configs.forEach(c => {
          const found = res.find((r: any) => r.categoria === c.categoria);
          if (found) c.percentual_alvo = found.percentual_alvo;
        });
      }
    });
  }

  get totalConfig() {
    return this.configs.reduce((s, c) => s + (c.percentual_alvo || 0), 0);
  }

  salvarConfig() {
    if (this.totalConfig !== 100) {
      this.snack.open('A soma dos percentuais deve ser exatamente 100%', 'OK', { duration: 3000 });
      return;
    }
    this.saving = true;
    this.api.salvarConfigAlocacao(this.configs).subscribe({
      next: () => {
        this.snack.open('Configuração salva!', 'OK', { duration: 2000 });
        this.saving = false;
      },
      error: () => {
        this.snack.open('Erro ao salvar', 'OK', { duration: 2000 });
        this.saving = false;
      }
    });
  }

  calcular() {
    if (this.valorAporte <= 0) return;
    this.loading = true;
    this.api.getSugestao(this.valorAporte).subscribe({
      next: (res) => {
        this.resultado = res;
        this.loading = false;
      },
      error: () => {
        this.snack.open('Erro ao calcular sugestão', 'OK', { duration: 2000 });
        this.loading = false;
      }
    });
  }
}
