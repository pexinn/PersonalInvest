import { Component, OnInit } from '@angular/core';
import { CommonModule, CurrencyPipe, DecimalPipe } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { MatTableModule } from '@angular/material/table';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ApiService } from '../../core/services/api.service';

@Component({
  selector: 'app-carteira',
  standalone: true,
  imports: [
    CommonModule, CurrencyPipe, DecimalPipe,
    MatTableModule, MatProgressBarModule, MatIconModule,
    MatChipsModule, MatButtonModule, MatTooltipModule
  ],
  templateUrl: './carteira.component.html',
  styleUrl: './carteira.component.scss'
})
export class CarteiraComponent implements OnInit {
  categoria = '';
  titulo = '';
  ativos: any[] = [];
  loading = false;
  error = '';
  displayedColumns = ['ticker','preco_atual','quantidade_total','preco_medio','valor_investido','valor_atual','retorno_pct','pct_carteira','nota','pct_ideal'];

  constructor(private api: ApiService, private route: ActivatedRoute) {}

  ngOnInit() {
    this.route.data.subscribe(data => {
      this.categoria = data['categoria'];
      this.titulo = data['titulo'];
      this.load();
    });
    // Re-load when params change (same component, different category)
    this.route.data.subscribe(data => {
      if (data['categoria'] !== this.categoria) {
        this.categoria = data['categoria'];
        this.titulo = data['titulo'];
        this.load();
      }
    });
  }

  load() {
    this.loading = true;
    this.api.getCarteira(this.categoria).subscribe({
      next: (data) => {
        this.ativos = data.filter(a => a.quantidade_total > 0);
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Erro ao carregar carteira';
        this.loading = false;
      }
    });
  }

  get totalInvestido() { return this.ativos.reduce((s, a) => s + (a.valor_investido_total || 0), 0); }
  get totalAtual()     { return this.ativos.reduce((s, a) => s + (a.valor_atual || 0), 0); }
  get totalRetorno()   { return this.totalAtual - this.totalInvestido; }
  get totalRetornoPct(){ return this.totalInvestido > 0 ? (this.totalRetorno / this.totalInvestido) * 100 : 0; }
  get totalNotas()     { return this.ativos.reduce((s, a) => s + (a.nota || 0), 0); }

  getMoedaCurrency(moeda: string) { return moeda === 'USD' ? 'USD' : 'BRL'; }
  getNotaColor(nota: number) {
    if (nota >= 8) return '#4caf50';
    if (nota >= 5) return '#ff9800';
    return '#f44336';
  }
  getDiferencaClass(dif: number) {
    if (dif > 0) return 'currency-positive';
    if (dif < 0) return 'currency-negative';
    return '';
  }

  refresh() { this.load(); }
}
