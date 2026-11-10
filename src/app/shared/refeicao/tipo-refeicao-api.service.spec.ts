import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { rotuloRefeicao, TipoRefeicao, TipoRefeicaoRequest } from './tipo-refeicao.models';
import { TipoRefeicaoApiService } from './tipo-refeicao-api.service';

const almoco: TipoRefeicao = {
  id: 'id-almoco', nome: 'Almoço', ordem: 3, inicio: '11:30:00', fim: '13:00:00', turnos: ['INTEGRAL'],
};

describe('TipoRefeicaoApiService', () => {
  it('lista a grade em GET /tipos-refeicao', () => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    const http = TestBed.inject(HttpTestingController);
    let recebidos: TipoRefeicao[] = [];

    TestBed.inject(TipoRefeicaoApiService).listar().subscribe((tipos) => (recebidos = tipos));
    http.expectOne({ method: 'GET', url: `${environment.apiBaseUrl}/tipos-refeicao` }).flush([almoco]);

    expect(recebidos).toEqual([almoco]);
    http.verify();
  });

  it('cria em POST /tipos-refeicao e edita em PUT /tipos-refeicao/{id} com o corpo', () => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    const http = TestBed.inject(HttpTestingController);
    const api = TestBed.inject(TipoRefeicaoApiService);
    const request: TipoRefeicaoRequest = { nome: 'Almoço', inicio: '11:30', fim: '13:00', turnos: ['INTEGRAL'] };
    let criada: TipoRefeicao | undefined;
    let editada: TipoRefeicao | undefined;

    api.criar(request).subscribe((tipo) => (criada = tipo));
    const post = http.expectOne({ method: 'POST', url: `${environment.apiBaseUrl}/tipos-refeicao` });
    expect(post.request.body).toEqual(request);
    post.flush(almoco);

    api.atualizar('id-almoco', request).subscribe((tipo) => (editada = tipo));
    const put = http.expectOne({ method: 'PUT', url: `${environment.apiBaseUrl}/tipos-refeicao/id-almoco` });
    expect(put.request.body).toEqual(request);
    put.flush(almoco);

    expect(criada).toEqual(almoco);
    expect(editada).toEqual(almoco);
    http.verify();
  });

  it('rotula a refeição com a janela sem os segundos', () => {
    expect(rotuloRefeicao(almoco)).toBe('Almoço (11:30–13:00)');
    expect(rotuloRefeicao({ ...almoco, inicio: '11:30', fim: '13:00' })).toBe('Almoço (11:30–13:00)');
  });
});
