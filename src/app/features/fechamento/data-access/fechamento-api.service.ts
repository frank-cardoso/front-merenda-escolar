import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { MedicaoSobraRequest } from '../models/fechamento.models';

@Injectable({ providedIn: 'root' })
export class FechamentoApiService {
  private readonly http = inject(HttpClient);

  /** Uma chamada por item. Relançar o mesmo item no mesmo dia e turno sobrescreve. */
  registrarMedicao(request: MedicaoSobraRequest): Observable<unknown> {
    return this.http.post(`${environment.apiBaseUrl}/medicoes-sobra`, request);
  }
}
