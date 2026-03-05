import { Component, OnInit, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatCardModule } from '@angular/material/card';
import { MatSelectModule } from '@angular/material/select';
import { ApiService } from '../../core/services/api.service';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

const CATEGORIAS_PADRAO = ['Investimentos','Carro','Reserva','FGTS','Previdência','Imóvel','Dívida'];

@Component({
  selector: 'app-patrimonio',
  standalone: true,
  imports: [
    CommonModule, CurrencyPipe, DatePipe, ReactiveFormsModule,
    MatButtonModule, MatFormFieldModule, MatInputModule,
    MatIconModule, MatSnackBarModule, MatDatepickerModule,
    MatNativeDateModule, MatCardModule, MatSelectModule
  ],
  templateUrl: './patrimonio.component.html',
  styleUrl: './patrimonio.component.scss'
})
export class PatrimonioComponent implements OnInit, AfterViewInit {
  @ViewChild('historicoChart') chartRef!: ElementRef;
  snapshots: any[] = [];
  showForm = false;
  loading = false;
  form: FormGroup;
  categoriasPadrao = CATEGORIAS_PADRAO;
  private chart: Chart | null = null;

  constructor(private api: ApiService, private fb: FormBuilder, private snack: MatSnackBar) {
    this.form = this.fb.group({
      data: [new Date(), Validators.required],
      descricao: [''],
      itens: this.fb.array([])
    });
    // Add default items
    CATEGORIAS_PADRAO.forEach(cat => {
      (this.form.get('itens') as FormArray).push(this.fb.group({
        categoria: [cat, Validators.required],
        valor: [0, [Validators.required, Validators.min(0)]]
      }));
    });
  }

  get itens() { return this.form.get('itens') as FormArray; }

  ngOnInit() { this.load(); }
  ngAfterViewInit() { setTimeout(() => this.buildChart(), 200); }

  load() {
    this.api.getPatrimonio().subscribe(data => {
      this.snapshots = data;
      setTimeout(() => this.buildChart(), 100);
    });
  }

  submit() {
    if (this.form.invalid) return;
    const raw = this.form.value;
    const body = {
      data: raw.data instanceof Date ? raw.data.toISOString().split('T')[0] : raw.data,
      descricao: raw.descricao,
      itens: raw.itens.filter((i: any) => i.valor > 0)
    };
    this.api.criarPatrimonio(body).subscribe({
      next: () => { this.snack.open('Snapshot salvo!', '✓', { duration: 2000 }); this.showForm = false; this.load(); },
      error: (e) => this.snack.open(e.error?.error || 'Erro', '✗', { duration: 4000 })
    });
  }

  delete(id: number) {
    if (!confirm('Remover snapshot?')) return;
    this.api.deletarPatrimonio(id).subscribe(() => this.load());
  }

  getTotal(snap: any) {
    return snap.itens?.reduce((s: number, i: any) => s + i.valor, 0) || 0;
  }

  buildChart() {
    if (!this.chartRef || !this.snapshots.length) return;
    if (this.chart) { this.chart.destroy(); this.chart = null; }
    const sorted = [...this.snapshots].reverse().slice(-18);
    const labels = sorted.map(s => s.data);
    const totais = sorted.map(s => this.getTotal(s));
    this.chart = new Chart(this.chartRef.nativeElement, {
      type: 'line',
      data: {
        labels,
        datasets: [{ label: 'Patrimônio', data: totais, borderColor: '#3f51b5', backgroundColor: 'rgba(63,81,181,0.1)', fill: true, tension: 0.3, pointRadius: 5 }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        scales: { y: { ticks: { callback: (v: any) => 'R$ ' + Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 0 }) } } }
      }
    });
  }
}
