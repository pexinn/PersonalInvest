import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  {
    path: 'dashboard',
    loadComponent: () => import('./pages/dashboard/dashboard.component').then(m => m.DashboardComponent),
    title: 'Dashboard — PersonalInvest'
  },
  {
    path: 'aportes',
    loadComponent: () => import('./pages/aportes/aportes.component').then(m => m.AportesComponent),
    title: 'Aportes — PersonalInvest'
  },
  {
    path: 'carteira/acoes',
    loadComponent: () => import('./pages/carteira/carteira.component').then(m => m.CarteiraComponent),
    data: { categoria: 'ACOES', titulo: 'Ações' },
    title: 'Ações — PersonalInvest'
  },
  {
    path: 'carteira/fiis',
    loadComponent: () => import('./pages/carteira/carteira.component').then(m => m.CarteiraComponent),
    data: { categoria: 'FIIS', titulo: 'FIIs' },
    title: 'FIIs — PersonalInvest'
  },
  {
    path: 'carteira/eua',
    loadComponent: () => import('./pages/carteira/carteira.component').then(m => m.CarteiraComponent),
    data: { categoria: 'EUA', titulo: 'EUA (USD)' },
    title: 'EUA — PersonalInvest'
  },
  {
    path: 'carteira/fundos',
    loadComponent: () => import('./pages/carteira/carteira.component').then(m => m.CarteiraComponent),
    data: { categoria: 'FUNDOS', titulo: 'Fundos de Ações' },
    title: 'Fundos — PersonalInvest'
  },
  {
    path: 'carteira/fixa',
    loadComponent: () => import('./pages/carteira/carteira.component').then(m => m.CarteiraComponent),
    data: { categoria: 'FIXA', titulo: 'Renda Fixa' },
    title: 'Renda Fixa — PersonalInvest'
  },
  {
    path: 'proventos',
    loadComponent: () => import('./pages/proventos/proventos.component').then(m => m.ProventosComponent),
    title: 'Proventos — PersonalInvest'
  },
  {
    path: 'patrimonio',
    loadComponent: () => import('./pages/patrimonio/patrimonio.component').then(m => m.PatrimonioComponent),
    title: 'Patrimônio — PersonalInvest'
  },
  {
    path: 'ativos',
    loadComponent: () => import('./pages/ativos/ativos.component').then(m => m.AtivosComponent),
    title: 'Ativos — PersonalInvest'
  },
  {
    path: 'sugestao',
    loadComponent: () => import('./pages/sugestao/sugestao.component').then(m => m.SugestaoComponent),
    title: 'Sugestão de Aporte — PersonalInvest'
  },
  { path: '**', redirectTo: 'dashboard' }
];
