import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { Turma, TurmaRequest } from '../models/cadastro.models';

@Injectable({ providedIn: 'root' })
export class TurmaApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/turmas`;

  listar(): Observable<Turma[]> {
    return this.http.get<Turma[]>(this.baseUrl);
  }

  criar(request: TurmaRequest): Observable<Turma> {
    return this.http.post<Turma>(this.baseUrl, request);
  }

  atualizar(id: string, request: TurmaRequest): Observable<Turma> {
    return this.http.put<Turma>(`${this.baseUrl}/${id}`, request);
  }

  excluir(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
