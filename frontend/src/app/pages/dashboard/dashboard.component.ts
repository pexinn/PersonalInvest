import { Component, OnInit, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule, CurrencyPipe, DecimalPipe } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatChipsModule } from '@angular/material/chips';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule, CurrencyPipe, DecimalPipe,
    MatCardModule, MatIconModule, MatButtonModule,
    MatProgressBarModule, MatChipsModule, RouterLink
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent implements OnInit, AfterViewInit {
  @ViewChild('alocacaoChart') alocacaoChartRef!: ElementRef;
  @ViewChild('evolucaoChart') evolucaoChartRef!: ElementRef;
  @ViewChild('proventosChart') proventosChartRef!: ElementRef;

  dashboard: any = null;
  loading = true;
  error = '';
  private charts: Chart[] = [];

  categorias = [
    { key: 'ACOES', label: 'Ações',      icon: 'trending_up', color: '#3f51b5' },
    { key: 'FIIS',  label: 'FIIs',       icon: 'business',    color: '#4caf50' },
    { key: 'EUA',   label: 'EUA',        icon: 'public',      color: '#ff9800' },
    { key: 'FIXA',  label: 'Renda Fixa', icon: 'savings',     color: '#e91e63' },
    { key: 'FUNDOS',label: 'Fundos Ações',icon: 'pie_chart',   color: '#00bcd4' },
    { key: 'CRIPTO',label: 'Cripto',     icon: 'currency_bitcoin', color: '#9c27b0' },
  ];

  constructor(private api: ApiService) {}

  ngOnInit() {
    this.api.getDashboard().subscribe({
      next: (data) => {
        this.dashboard = data;
        this.loading = false;
        setTimeout(() => this.buildCharts(), 100);
      },
      error: (err) => {
        this.error = 'Erro ao carregar dashboard. Verifique se o backend está rodando.';
        this.loading = false;
      }
    });
  }

  ngAfterViewInit() {}

  getCategoriaData(key: string) {
    return this.dashboard?.por_categoria?.find((c: any) => c.categoria === key);
  }

  getCategoriaNome(key: string) {
    return this.categorias.find(c => c.key === key)?.label || key;
  }

  buildCharts() {
    if (!this.dashboard) return;
    this.charts.forEach(c => c.destroy());
    this.charts = [];

    // Gráfico de alocação por categoria (donut)
    const cats = this.dashboard.por_categoria?.filter((c: any) => c.valor_atual > 0) || [];
    if (cats.length > 0 && this.alocacaoChartRef) {
      const total = cats.reduce((s: number, c: any) => s + c.valor_atual, 0);
      const colors = ['#3f51b5','#4caf50','#ff9800','#e91e63','#9c27b0','#00bcd4'];
      const chart = new Chart(this.alocacaoChartRef.nativeElement, {
        type: 'doughnut',
        data: {
          labels: cats.map((c: any) => this.getCategoriaNome(c.categoria)),
          datasets: [{
            data: cats.map((c: any) => c.valor_atual),
            backgroundColor: colors.slice(0, cats.length),
            borderWidth: 2,
            borderColor: '#fff'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'bottom', labels: { font: { family: 'Inter' } } },
            tooltip: {
              callbacks: {
                label: (ctx) => {
                  const pct = ((ctx.parsed / total) * 100).toFixed(1);
                  const val = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(ctx.parsed);
                  return `${ctx.label}: ${val} (${pct}%)`;
                }
              }
            }
          },
          cutout: '65%'
        }
      });
      this.charts.push(chart);
    }

    // Gráfico de evolução de aportes (barras por mês)
    const evolucao = this.dashboard.evolucao_aportes?.slice(-12) || [];
    if (evolucao.length > 0 && this.evolucaoChartRef) {
      const chart2 = new Chart(this.evolucaoChartRef.nativeElement, {
        type: 'bar',
        data: {
          labels: evolucao.map((e: any) => e.mes),
          datasets: [
            {
              label: 'Aportado',
              data: evolucao.map((e: any) => e.aportado),
              backgroundColor: '#3f51b5',
              borderRadius: 4
            },
            {
              label: 'Retirado',
              data: evolucao.map((e: any) => e.retirado),
              backgroundColor: '#f44336',
              borderRadius: 4
            }
          ]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { position: 'top' } },
          scales: {
            y: {
              ticks: {
                callback: (v: any) => 'R$ ' + Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 0 })
              }
            }
          }
        }
      });
      this.charts.push(chart2);
    }

    // Gráfico de proventos mensais
    const proventos = this.dashboard.proventos_mensais?.slice(-12) || [];
    if (proventos.length > 0 && this.proventosChartRef) {
      const chart3 = new Chart(this.proventosChartRef.nativeElement, {
        type: 'bar',
        data: {
          labels: proventos.map((p: any) => p.mes),
          datasets: [{
            label: 'Proventos',
            data: proventos.map((p: any) => p.total),
            backgroundColor: '#ff9800',
            borderRadius: 4
          }]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { position: 'top' } },
          scales: {
            y: {
              ticks: {
                callback: (v: any) => 'R$ ' + Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 0 })
              }
            }
          }
        }
      });
      this.charts.push(chart3);
    }
  }
}
