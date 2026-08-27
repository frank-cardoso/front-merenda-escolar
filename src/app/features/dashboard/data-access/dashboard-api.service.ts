import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  ConsolidacaoConsumo,
  CriarRelatorioIARequest,
  CriarRelatorioIAResponse,
  RelatorioIA,
  Turno,
} from '../models/dashboard.models';

@Injectable({ providedIn: 'root' })
export class DashboardApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiBaseUrl;

  buscarConsolidacao(data: string, turno: Turno): Observable<ConsolidacaoConsumo> {
    const params = new HttpParams().set('data', data).set('turno', turno);
    return this.http.get<ConsolidacaoConsumo>(`${this.baseUrl}/gestao/consolidacoes`, { params });
  }

  criarRelatorio(request: CriarRelatorioIARequest): Observable<CriarRelatorioIAResponse> {
    return this.http.post<CriarRelatorioIAResponse>(`${this.baseUrl}/relatorios-ia`, request);
  }

  buscarRelatorio(id: string): Observable<RelatorioIA> {
    return this.http.get<RelatorioIA>(`${this.baseUrl}/relatorios-ia/${id}`);
  }
}
