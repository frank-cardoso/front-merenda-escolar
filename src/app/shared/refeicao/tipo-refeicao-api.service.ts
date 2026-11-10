import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { TipoRefeicao, TipoRefeicaoRequest } from './tipo-refeicao.models';

@Injectable({ providedIn: 'root' })
export class TipoRefeicaoApiService {
  private readonly http = inject(HttpClient);

  listar(): Observable<TipoRefeicao[]> {
    return this.http.get<TipoRefeicao[]>(`${environment.apiBaseUrl}/tipos-refeicao`);
  }

  criar(request: TipoRefeicaoRequest): Observable<TipoRefeicao> {
    return this.http.post<TipoRefeicao>(`${environment.apiBaseUrl}/tipos-refeicao`, request);
  }

  atualizar(id: string, request: TipoRefeicaoRequest): Observable<TipoRefeicao> {
    return this.http.put<TipoRefeicao>(`${environment.apiBaseUrl}/tipos-refeicao/${id}`, request);
  }
}
