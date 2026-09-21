import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { Receita } from '../models/cardapio.models';

/**
 * Catalogo de receitas. O cadastro de cardapio escolhe por id daqui em vez de digitar nome:
 * a API recusa nome fora do catalogo, e nome nao identifica nada de forma estavel.
 */
@Injectable({ providedIn: 'root' })
export class ReceitaApiService {
  private readonly http = inject(HttpClient);

  listar(): Observable<Receita[]> {
    return this.http.get<Receita[]>(`${environment.apiBaseUrl}/receitas`);
  }
}
