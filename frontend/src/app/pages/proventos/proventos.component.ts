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
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatChipsModule } from '@angular/material/chips';
import { ApiService } from '../../core/services/api.service';
import { Observable, startWith, map } from 'rxjs';

@Component({
  selector: 'app-proventos',
  standalone: true,
  imports: [
    CommonModule, CurrencyPipe, DatePipe, ReactiveFormsModule,
    MatTableModule, MatPaginatorModule, MatSortModule,
    MatFormFieldModule, MatInputModule, MatSelectModule,
    MatButtonModule, MatIconModule, MatSnackBarModule,
    MatDatepickerModule, MatNativeDateModule,
    MatAutocompleteModule, MatChipsModule
  ],
  templateUrl: './proventos.component.html',
  styleUrl: './proventos.component.scss'
})
export class ProventosComponent implements OnInit {
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  form: FormGroup;
  dataSource = new MatTableDataSource<any>([]);
  showForm = false;
  editingId: number | null = null;
  loading = false;
  total = 0;
  totalGeral = 0;
  ativos: any[] = [];
  filteredTickers: Observable<string[]> | undefined;

  tipos = ['Dividendo','JCP','Rendimento','Aluguel','Outros'];
  displayedColumns = ['data_pagamento','ticker','tipo','corretora','valor','acoes'];

  constructor(private api: ApiService, private fb: FormBuilder, private snack: MatSnackBar) {
    this.form = this.fb.group({
      data_pagamento: [new Date(), Validators.required],
      ticker: ['', Validators.required],
      corretora: [''],
      valor: [null, [Validators.required, Validators.min(0.01)]],
      tipo: ['Dividendo', Validators.required],
      observacao: ['']
    });
  }

  ngOnInit() {
    this.api.getAtivos().subscribe(data => {
      this.ativos = data;
      this.setupAutocomplete();
    });
    this.load();
  }

  setupAutocomplete() {
    this.filteredTickers = this.form.get('ticker')!.valueChanges.pipe(
      startWith(''),
      map(v => this.ativos.filter(a => a.ticker.includes((v || '').toUpperCase())).map(a => a.ticker).slice(0, 10))
    );
  }

  load() {
    this.loading = true;
    this.api.getProventos({ limit: 200 }).subscribe({
      next: (res: any) => {
        this.dataSource.data = res.data;
        this.total = res.total;
        this.totalGeral = res.data.reduce((s: number, r: any) => s + r.valor, 0);
        this.loading = false;
        setTimeout(() => { this.dataSource.sort = this.sort; this.dataSource.paginator = this.paginator; });
      },
      error: () => { this.loading = false; }
    });
  }

  submit() {
    if (this.form.invalid) return;
    const raw = this.form.value;
    const body = {
      ...raw,
      data_pagamento: raw.data_pagamento instanceof Date ? raw.data_pagamento.toISOString().split('T')[0] : raw.data_pagamento,
      ticker: raw.ticker.toUpperCase()
    };
    const obs = this.editingId ? this.api.editarProvento(this.editingId, body) : this.api.criarProvento(body);
    obs.subscribe({
      next: () => { this.snack.open('Provento salvo!', '✓', { duration: 2000 }); this.reset(); this.load(); },
      error: (e) => this.snack.open(e.error?.error || 'Erro', '✗', { duration: 4000 })
    });
  }

  edit(r: any) {
    this.editingId = r.id; this.showForm = true;
    this.form.patchValue({ ...r, data_pagamento: new Date(r.data_pagamento + 'T00:00:00') });
  }

  delete(id: number) {
    if (!confirm('Remover?')) return;
    this.api.deletarProvento(id).subscribe(() => { this.load(); });
  }

  reset() { this.editingId = null; this.showForm = false; this.form.reset({ data_pagamento: new Date(), tipo: 'Dividendo' }); }
}
