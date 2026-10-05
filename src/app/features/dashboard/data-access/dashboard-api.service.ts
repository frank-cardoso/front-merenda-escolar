import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { IndicadoresLogisticos } from '../models/indicadores.models';
import { RelatorioResumo } from '../models/dashboard.models';
import {
  ConsolidacaoConsumo,
  CardapioAnalise,
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

  buscarIndicadores(data: string, turno: Turno, receitaIds: string[] = [], datas: string[] = []): Observable<IndicadoresLogisticos> {
    let params = new HttpParams().set('data', data).set('turno', turno);
    if (receitaIds.length) params = params.set('receitaIds', receitaIds.join(','));
    if (datas.length) params = params.set('datas', datas.join(','));
    return this.http.get<IndicadoresLogisticos>(`${this.baseUrl}/gestao/indicadores`, { params });
  }

  buscarCardapiosAnalise(inicio: string, fim: string, turno: Turno): Observable<CardapioAnalise[]> {
    const params = new HttpParams().set('inicio', inicio).set('fim', fim).set('turno', turno);
    return this.http.get<CardapioAnalise[]>(`${this.baseUrl}/gestao/cardapios-analise`, { params });
  }

  listarRelatorios(data: string, turno: Turno): Observable<RelatorioResumo[]> {
    const params = new HttpParams().set('data', data).set('turno', turno);
    return this.http.get<RelatorioResumo[]>(`${this.baseUrl}/relatorios-ia`, { params });
  }
}
