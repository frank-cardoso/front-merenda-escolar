import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  Aluno,
  AlunoAtualizarRequest,
  AlunoCriarRequest,
  TransferenciaRequest,
} from '../models/cadastro.models';

@Injectable({ providedIn: 'root' })
export class AlunoApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/alunos`;

  listar(): Observable<Aluno[]> {
    return this.http.get<Aluno[]>(this.baseUrl);
  }

  detalhar(id: string): Observable<Aluno> {
    return this.http.get<Aluno>(`${this.baseUrl}/${id}`);
  }

  criar(request: AlunoCriarRequest): Observable<Aluno> {
    return this.http.post<Aluno>(this.baseUrl, request);
  }

  atualizar(id: string, request: AlunoAtualizarRequest): Observable<Aluno> {
    return this.http.put<Aluno>(`${this.baseUrl}/${id}`, request);
  }

  transferir(id: string, request: TransferenciaRequest): Observable<Aluno> {
    return this.http.post<Aluno>(`${this.baseUrl}/${id}/transferencias`, request);
  }

  cadastrarRosto(id: string, fotoBase64: string): Observable<Aluno> {
    return this.http.post<Aluno>(`${this.baseUrl}/${id}/rosto`, { fotoBase64 });
  }
}
