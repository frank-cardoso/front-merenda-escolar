import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { Cardapio, CardapioRequest } from '../models/cardapio.models';

@Injectable({ providedIn: 'root' })
export class CardapioApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/cardapios`;

  listar(): Observable<Cardapio[]> {
    return this.http.get<Cardapio[]>(this.baseUrl);
  }

  criar(request: CardapioRequest): Observable<Cardapio> {
    return this.http.post<Cardapio>(this.baseUrl, request);
  }

  atualizar(id: string, request: CardapioRequest): Observable<Cardapio> {
    return this.http.put<Cardapio>(`${this.baseUrl}/${id}`, request);
  }

  excluir(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
