import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ValidarConsumoRequest, ValidarConsumoResponse } from '../models/fila.models';

@Injectable({ providedIn: 'root' })
export class FilaApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/fila`;

  validarConsumo(request: ValidarConsumoRequest): Observable<ValidarConsumoResponse> {
    return this.http.post<ValidarConsumoResponse>(`${this.baseUrl}/validacoes`, request);
  }
}
