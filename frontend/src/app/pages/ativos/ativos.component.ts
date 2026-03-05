import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { MatSortModule, MatSort } from '@angular/material/sort';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatSliderModule } from '@angular/material/slider';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { ApiService } from '../../core/services/api.service';

@Component({
  selector: 'app-ativos',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule,
    MatTableModule, MatPaginatorModule, MatSortModule,
    MatFormFieldModule, MatInputModule, MatSelectModule,
    MatButtonModule, MatIconModule, MatSnackBarModule, MatSliderModule,
    MatSlideToggleModule
  ],
  templateUrl: './ativos.component.html',
  styleUrl: './ativos.component.scss'
})
export class AtivosComponent implements OnInit {
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  form: FormGroup;
  dataSource = new MatTableDataSource<any>([]);
  showForm = false;
  editingTicker: string | null = null;
  loading = false;

  categorias = ['ACOES','FIIS','EUA','FIXA','CRIPTO'];
  moedas = ['BRL','USD'];
  displayedColumns = ['ticker','nome','categoria','moeda','nota','percentual_ideal','preco_atual','ativo','acoes'];

  constructor(private api: ApiService, private fb: FormBuilder, private snack: MatSnackBar) {
    this.form = this.fb.group({
      ticker:           ['', [Validators.required, Validators.pattern(/^[A-Z0-9 ._-]{1,20}$/i)]],
      nome:             [''],
      categoria:        ['ACOES', Validators.required],
      moeda:            ['BRL', Validators.required],
      nota:             [5],
      percentual_ideal: [0],
      ativo:            [1],
      preco_atual:      [0],
      atualizacao_manual:[false]
    });
  }

  ngOnInit() { this.load(); }

  load() {
    this.loading = true;
    this.api.getAtivos({ ativo: 'todos' }).subscribe({
      next: data => {
        this.dataSource.data = data;
        this.loading = false;
        setTimeout(() => { this.dataSource.sort = this.sort; this.dataSource.paginator = this.paginator; });
      },
      error: () => { this.loading = false; }
    });
  }

  submit() {
    if (this.form.invalid) return;
    const raw = { ...this.form.value, ticker: this.form.value.ticker.toUpperCase() };
    const obs = this.editingTicker
      ? this.api.editarAtivo(this.editingTicker, raw)
      : this.api.criarAtivo(raw);
    obs.subscribe({
      next: () => { this.snack.open(this.editingTicker ? 'Ativo atualizado!' : 'Ativo cadastrado!', '✓', { duration: 2000 }); this.reset(); this.load(); },
      error: (e) => this.snack.open(e.error?.error || 'Erro', '✗', { duration: 5000 })
    });
  }

  edit(row: any) {
    this.editingTicker = row.ticker;
    this.showForm = true;
    this.form.patchValue(row);
    this.form.get('ticker')!.disable();
  }

  delete(ticker: string) {
    if (!confirm(`Remover/inativar ${ticker}?`)) return;
    this.api.deletarAtivo(ticker).subscribe({
      next: (r: any) => { this.snack.open(r.message, '', { duration: 3000 }); this.load(); },
      error: (e) => this.snack.open(e.error?.error, '', { duration: 4000 })
    });
  }

  reset() {
    this.editingTicker = null;
    this.showForm = false;
    this.form.reset({ categoria: 'ACOES', moeda: 'BRL', nota: 5, percentual_ideal: 0, ativo: 1, preco_atual: 0, atualizacao_manual: false });
    this.form.get('ticker')!.enable();
  }

  getCatChip(cat: string) { return 'chip-' + cat.toLowerCase(); }
}
