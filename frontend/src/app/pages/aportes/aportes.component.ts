import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { MatSortModule, MatSort } from '@angular/material/sort';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatCardModule } from '@angular/material/card';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ApiService } from '../../core/services/api.service';
import { Observable, startWith, map, debounceTime } from 'rxjs';

@Component({
  selector: 'app-aportes',
  standalone: true,
  imports: [
    CommonModule, CurrencyPipe, DatePipe, ReactiveFormsModule,
    MatTableModule, MatPaginatorModule, MatSortModule,
    MatFormFieldModule, MatInputModule, MatSelectModule,
    MatButtonModule, MatIconModule, MatDialogModule, MatSnackBarModule,
    MatCardModule, MatAutocompleteModule,
    MatDatepickerModule, MatNativeDateModule,
    MatChipsModule, MatProgressSpinnerModule
  ],
  templateUrl: './aportes.component.html',
  styleUrl: './aportes.component.scss'
})
export class AportesComponent implements OnInit {
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  form: FormGroup;
  dataSource = new MatTableDataSource<any>([]);
  displayedColumns = ['data','ticker','categoria','moeda','quantidade','preco_unitario','valor_total','acoes'];

  ativos: any[] = [];
  filteredTickers: Observable<string[]> | undefined;
  loading = false;
  showForm = false;
  editingId: number | null = null;
  tickerFilter = '';

  moedas = ['BRL','USD'];
  total = 0;
  totalFilteredValue: number | null = null;
  totalFilteredQuantity: number | null = null;

  constructor(private api: ApiService, private fb: FormBuilder, private snack: MatSnackBar) {
    this.form = this.fb.group({
      data:        [new Date(), Validators.required],
      ticker:      ['', Validators.required],
      moeda:       ['BRL', Validators.required],
      valor_total: [null, [Validators.required, Validators.min(0.01)]],
      quantidade:  [null, [Validators.required]],
      corretora:   [''],
      observacao:  [''],
      tipo:        ['compra']
    });
  }

  ngOnInit() {
    this.loadAtivos();
    this.loadAportes();
    this.setupTickerAutocomplete();
  }

  loadAtivos() {
    this.api.getAtivos().subscribe(data => {
      this.ativos = data;
    });
  }

  loadAportes() {
    this.loading = true;
    const page = this.paginator ? this.paginator.pageIndex : 0;
    const limit = this.paginator ? this.paginator.pageSize : 50;

    const params: any = { page: page + 1, limit };
    if (this.tickerFilter) {
      params.ticker = this.tickerFilter;
    }

    this.api.getAportes(params).subscribe({
      next: (res: any) => {
        this.dataSource.data = res.data;
        this.total = res.total;
        this.totalFilteredValue = res.sum_valor !== undefined ? res.sum_valor : null;
        this.totalFilteredQuantity = res.sum_quantidade !== undefined ? res.sum_quantidade : null;
        this.loading = false;
        // Not assigning dataSource.paginator to prevent client-side interfering
      },
      error: () => { this.loading = false; }
    });
  }

  onFilter(event: Event) {
    const val = (event.target as HTMLInputElement).value;
    this.tickerFilter = val.trim().toUpperCase();
    if (this.paginator) this.paginator.pageIndex = 0;
    this.loadAportes();
  }

  setupTickerAutocomplete() {
    this.filteredTickers = this.form.get('ticker')!.valueChanges.pipe(
      startWith(''),
      map(v => {
        const term = (v || '').toUpperCase();
        return this.ativos
          .filter(a => a.ticker.includes(term) || (a.nome || '').toUpperCase().includes(term))
          .map(a => a.ticker)
          .slice(0, 10);
      })
    );

    // Auto-fill moeda when ticker selected
    this.form.get('ticker')!.valueChanges.pipe(debounceTime(200)).subscribe(ticker => {
      const ativo = this.ativos.find(a => a.ticker === (ticker || '').toUpperCase());
      if (ativo) this.form.get('moeda')!.setValue(ativo.moeda, { emitEvent: false });
    });
  }

  get isSale(): boolean { return this.form.get('tipo')?.value === 'venda'; }

  submitForm() {
    if (this.form.invalid) return;
    const raw = this.form.value;
    const sinal = raw.tipo === 'venda' ? -1 : 1;
    const body = {
      data: raw.data instanceof Date ? raw.data.toISOString().split('T')[0] : raw.data,
      ticker: raw.ticker.toUpperCase(),
      moeda: raw.moeda,
      valor_total: Math.abs(raw.valor_total) * sinal,
      quantidade: Math.abs(raw.quantidade) * sinal,
      corretora: raw.corretora || null,
      observacao: raw.observacao || null,
    };

    this.loading = true;
    const obs = this.editingId
      ? this.api.editarAporte(this.editingId, body)
      : this.api.criarAporte(body);

    obs.subscribe({
      next: () => {
        this.snack.open(this.editingId ? 'Aporte atualizado!' : 'Aporte registrado!', '✓', { duration: 3000 });
        this.resetForm();
        this.loadAportes();
      },
      error: (err) => {
        this.snack.open(err.error?.error || 'Erro ao salvar aporte', '✗', { duration: 5000, panelClass: 'snack-error' });
        this.loading = false;
      }
    });
  }

  editAporte(row: any) {
    this.editingId = row.id;
    this.showForm = true;
    const isVenda = row.valor_total < 0;
    this.form.patchValue({
      data: new Date(row.data + 'T00:00:00'),
      ticker: row.ticker,
      moeda: row.moeda,
      valor_total: Math.abs(row.valor_total),
      quantidade: Math.abs(row.quantidade),
      corretora: row.corretora || '',
      observacao: row.observacao || '',
      tipo: isVenda ? 'venda' : 'compra'
    });
  }

  deleteAporte(id: number) {
    if (!confirm('Remover este lançamento?')) return;
    this.api.deletarAporte(id).subscribe({
      next: () => {
        this.snack.open('Aporte removido', '', { duration: 2000 });
        this.loadAportes();
      }
    });
  }

  resetForm() {
    this.editingId = null;
    this.showForm = false;
    this.loading = false;
    this.form.reset({ data: new Date(), moeda: 'BRL', tipo: 'compra' });
  }

  getCategoriaChip(categoria: string) {
    return 'chip-' + (categoria || '').toLowerCase();
  }
}
