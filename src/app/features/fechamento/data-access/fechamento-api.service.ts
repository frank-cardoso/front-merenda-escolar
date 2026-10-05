import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { FechamentoSobraRequest, MedicaoSobraRequest, MedicaoSobraResponse } from '../models/fechamento.models';

@Injectable({ providedIn: 'root' })
export class FechamentoApiService {
  private readonly http = inject(HttpClient);

  /** Uma chamada por item. Relançar o mesmo item no mesmo dia e turno sobrescreve. */
  registrarMedicao(request: MedicaoSobraRequest): Observable<unknown> {
    return this.http.post(`${environment.apiBaseUrl}/medicoes-sobra`, request);
  }

  registrarFechamento(request: FechamentoSobraRequest): Observable<MedicaoSobraResponse[]> {
    return this.http.post<MedicaoSobraResponse[]>(`${environment.apiBaseUrl}/medicoes-sobra/fechamento`, request);
  }

  listarMedicoes(data: string, turno: string): Observable<MedicaoSobraResponse[]> {
    return this.http.get<MedicaoSobraResponse[]>(`${environment.apiBaseUrl}/medicoes-sobra`, {
      params: { data, turno },
    });
  }
}
