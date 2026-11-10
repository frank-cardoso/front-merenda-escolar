import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../../environments/environment';
import { FechamentoPainelApiService } from './fechamento-painel-api.service';

describe('FechamentoPainelApiService', () => {
  let http: HttpTestingController;
  let service: FechamentoPainelApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    http = TestBed.inject(HttpTestingController);
    service = TestBed.inject(FechamentoPainelApiService);
  });

  afterEach(() => http.verify());

  it('busca as refeições do dia em GET /fechamentos/dia', () => {
    let recebidas: unknown[] = [];

    service.doDia('2026-03-10').subscribe((refeicoes) => (recebidas = refeicoes));
    const req = http.expectOne((r) => r.url === `${environment.apiBaseUrl}/fechamentos/dia`);
    expect(req.request.method).toBe('GET');
    expect(req.request.urlWithParams).toBe(`${environment.apiBaseUrl}/fechamentos/dia?data=2026-03-10`);
    req.flush([{ tipoRefeicaoId: 'a' }]);

    expect(recebidas.length).toBe(1);
  });

  it('busca as pendências em GET /fechamentos/pendencias com 7 dias por padrão', () => {
    service.pendencias('2026-03-10').subscribe();
    const req = http.expectOne((r) => r.url === `${environment.apiBaseUrl}/fechamentos/pendencias`);
    expect(req.request.urlWithParams)
      .toBe(`${environment.apiBaseUrl}/fechamentos/pendencias?ate=2026-03-10&dias=7`);
    req.flush([]);
  });

  it('repassa o número de dias informado', () => {
    service.pendencias('2026-03-10', 14).subscribe();
    const req = http.expectOne((r) => r.url === `${environment.apiBaseUrl}/fechamentos/pendencias`);
    expect(req.request.urlWithParams).toContain('dias=14');
    req.flush([]);
  });
});
