import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ValidarConsumoRequest, ValidarConsumoResponse } from '../models/fila.models';

@Injectable({ providedIn: 'root' })
export class FilaApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = 'http://localhost:8080/api/v1/fila';

  validarConsumo(request: ValidarConsumoRequest): Observable<ValidarConsumoResponse> {
    return this.http.post<ValidarConsumoResponse>(`${this.baseUrl}/validacoes`, request);
  }
}
