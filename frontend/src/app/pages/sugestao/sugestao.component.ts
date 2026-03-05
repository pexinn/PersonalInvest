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
    .page-header h1 {
      display: flex;
      align-items: center;
      gap: 12px;
      font-weight: 500;
      color: #3f51b5;
    }
    .config-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
      gap: 24px;
      margin-bottom: 24px;
    }
    .mat-card {
      border-radius: 12px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.05) !important;
    }
    .mat-card-title {
      font-size: 1.1rem;
      font-weight: 600;
    }
    .cat-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
      padding: 10px 16px;
      border-radius: 8px;
      background: #f8f9fa;
      border: 1px solid #edf2f7;
      transition: background 0.2s;
    }
    .cat-row:hover {
      background: #f1f3f5;
    }
    .gap-positive { color: #d32f2f; font-weight: 600; }
    .gap-negative { color: #2e7d32; }
    .total-footer {
      display: flex;
      justify-content: space-between;
      font-weight: 600;
      margin-top: 16px;
      padding: 12px 16px;
      background: #fff;
      border-radius: 8px;
      border: 1px dashed #cbd5e0;
    }
    .suggestion-card {
      margin-top: 24px;
      border-radius: 12px;
    }
    .results-table {
      width: 100%;
      margin-top: 16px;
      border-radius: 8px;
      overflow: hidden;
    }
    th.mat-header-cell {
      background: #fafafa;
      font-weight: 600;
      color: #4a5568;
    }
    td.mat-cell {
      padding: 12px 16px;
    }
    .category-details {
      margin-top: 32px;
      padding-top: 24px;
      border-top: 1px solid #e2e8f0;
    }
    .category-details h3 {
      font-size: 1rem;
      font-weight: 600;
      margin-bottom: 16px;
      color: #2d3748;
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
