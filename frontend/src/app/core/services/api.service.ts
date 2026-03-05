import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private base = environment.apiUrl;

  constructor(private http: HttpClient) {}

  // Dashboard
  getDashboard(): Observable<any> {
    return this.http.get(`${this.base}/dashboard`);
  }

  // Aportes
  getAportes(params: any = {}): Observable<any> {
    return this.http.get(`${this.base}/aportes`, { params });
  }
  criarAporte(body: any): Observable<any> {
    return this.http.post(`${this.base}/aportes`, body);
  }
  editarAporte(id: number, body: any): Observable<any> {
    return this.http.put(`${this.base}/aportes/${id}`, body);
  }
  deletarAporte(id: number): Observable<any> {
    return this.http.delete(`${this.base}/aportes/${id}`);
  }

  // Carteira
  getCarteira(categoria?: string): Observable<any[]> {
    const url = categoria ? `${this.base}/carteira/${categoria}` : `${this.base}/carteira`;
    return this.http.get<any[]>(url);
  }

  // Proventos
  getProventos(params: any = {}): Observable<any> {
    return this.http.get(`${this.base}/proventos`, { params });
  }
  criarProvento(body: any): Observable<any> {
    return this.http.post(`${this.base}/proventos`, body);
  }
  editarProvento(id: number, body: any): Observable<any> {
    return this.http.put(`${this.base}/proventos/${id}`, body);
  }
  deletarProvento(id: number): Observable<any> {
    return this.http.delete(`${this.base}/proventos/${id}`);
  }

  // Patrimônio
  getPatrimonio(): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/patrimonio`);
  }
  getPatrimonioHistorico(): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/patrimonio/historico`);
  }
  criarPatrimonio(body: any): Observable<any> {
    return this.http.post(`${this.base}/patrimonio`, body);
  }
  deletarPatrimonio(id: number): Observable<any> {
    return this.http.delete(`${this.base}/patrimonio/${id}`);
  }

  // Ativos
  getAtivos(params: any = {}): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/ativos`, { params });
  }
  criarAtivo(body: any): Observable<any> {
    return this.http.post(`${this.base}/ativos`, body);
  }
  editarAtivo(ticker: string, body: any): Observable<any> {
    return this.http.put(`${this.base}/ativos/${ticker}`, body);
  }
  deletarAtivo(ticker: string): Observable<any> {
    return this.http.delete(`${this.base}/ativos/${ticker}`);
  }

  // Configuração e Rebalanceamento
  getConfigAlocacao(): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/config/alocacao`);
  }
  salvarConfigAlocacao(body: any): Observable<any> {
    return this.http.post(`${this.base}/config/alocacao`, body);
  }
  getSugestao(valor: number): Observable<any> {
    return this.http.get(`${this.base}/sugestao`, { params: { valor: valor.toString() } });
  }
}
