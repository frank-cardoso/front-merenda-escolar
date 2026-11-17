import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { FechamentoPendente, RefeicaoDoDia } from '../models/painel.models';

@Injectable({ providedIn: 'root' })
export class FechamentoPainelApiService {
  private readonly http = inject(HttpClient);

  doDia(data: string): Observable<RefeicaoDoDia[]> {
    return this.http.get<RefeicaoDoDia[]>(`${environment.apiBaseUrl}/fechamentos/dia`, { params: { data } });
  }

  pendencias(ate: string, dias = 7): Observable<FechamentoPendente[]> {
    return this.http.get<FechamentoPendente[]>(`${environment.apiBaseUrl}/fechamentos/pendencias`, {
      params: { ate, dias },
    });
  }
}
