import { traduzirMotivo } from '../../application/motivos';
import { Component, output } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { environment } from '../../../../../environments/environment';
import { NotificacaoService } from '../../../../shared/notificacao/notificacao.service';
import { CameraFotoComponent } from '../../../../shared/components/camera-foto/camera-foto.component';
import { QrScannerComponent } from '../../components/qr-scanner/qr-scanner.component';
import { FilaPageComponent } from './fila-page.component';

@Component({ selector: 'app-camera-foto', template: '' })
class CameraFotoStubComponent {
  readonly fotoCapturada = output<string>();
}

@Component({ selector: 'app-qr-scanner', template: '' })
class QrScannerStubComponent {
  readonly codigoLido = output<string>();
}

describe('FilaPageComponent', () => {
  let fixture: ComponentFixture<FilaPageComponent>;
  let http: HttpTestingController;
  let notificacao: jasmine.SpyObj<NotificacaoService>;
  const url = `${environment.apiBaseUrl}/fila/validacoes`;

  beforeEach(() => {
    notificacao = jasmine.createSpyObj<NotificacaoService>('NotificacaoService', ['sucesso', 'erro', 'destaque']);
    TestBed.configureTestingModule({
      imports: [FilaPageComponent],
      providers: [
        provideHttpClient(), provideHttpClientTesting(),
        { provide: NotificacaoService, useValue: notificacao },
      ],
    }).overrideComponent(FilaPageComponent, {
      remove: { imports: [CameraFotoComponent, QrScannerComponent] },
      add: { imports: [CameraFotoStubComponent, QrScannerStubComponent] },
    });
    fixture = TestBed.createComponent(FilaPageComponent);
    http = TestBed.inject(HttpTestingController);
    fixture.componentInstance.selecionarMetodo('FACIAL');
    fixture.detectChanges();
  });

  afterEach(() => http.verify());

  it('nao pede codigo do aluno no modo facial', () => {
    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(fixture.nativeElement.querySelector('#codigo-facial')).toBeNull();
    expect(texto).not.toContain('Código do aluno');
    expect(texto).toContain('O sistema procura o rosto entre os alunos cadastrados. Se não reconhecer, use o QR Code.');
  });

  it('envia a foto sem codigo de aluno no modo facial', () => {
    fixture.componentInstance.validarFacial('data:image/jpeg;base64,AAA');
    const req = http.expectOne(url);
    expect(req.request.body).toEqual({ metodoIdentificacao: 'FACIAL', fotoBase64: 'data:image/jpeg;base64,AAA' });
    expect('alunoCodigo' in req.request.body).toBe(false);
    req.flush({ resultado: 'BLOQUEADO', sinal: 'VERMELHO', motivo: 'ROSTO_NAO_RECONHECIDO' });
  });

  it('autorizada anuncia o aluno com a refeição e o cardápio', () => {
    fixture.componentInstance.validarFacial('data:image/jpeg;base64,AAA');
    http.expectOne(url).flush({
      resultado: 'AUTORIZADO', sinal: 'VERDE', alunoId: '1', alunoNome: 'Helena Duarte',
      tipoRefeicaoId: '9', refeicao: 'Almoço', cardapio: 'Arroz', registradoEm: '2026-11-07T10:00:00', motivo: null,
    });
    fixture.detectChanges();

    expect(notificacao.destaque).toHaveBeenCalledOnceWith(
      { tipo: 'sucesso', titulo: 'Helena Duarte', selo: 'AUTORIZADO', detalhe: 'Almoço • Arroz' });
    expect(fixture.componentInstance.autorizadasNaSessao()).toBe(1);
  });

  it('bloqueada anuncia erro com o motivo traduzido', () => {
    fixture.componentInstance.validarFacial('data:image/jpeg;base64,AAA');
    http.expectOne(url).flush({ resultado: 'BLOQUEADO', sinal: 'VERMELHO', motivo: 'ROSTO_AMBIGUO', alunoNome: null });

    expect(notificacao.destaque).toHaveBeenCalledOnceWith({
      tipo: 'erro', titulo: 'Aluno não identificado', selo: 'BLOQUEADO',
      detalhe: 'Rosto parecido com mais de um aluno. Use o QR Code para confirmar.',
    });
  });

  it('bloqueada fora da refeição da turma traduz o motivo', () => {
    fixture.componentInstance.validarFacial('data:image/jpeg;base64,AAA');
    http.expectOne(url).flush({
      resultado: 'BLOQUEADO', sinal: 'VERMELHO', alunoNome: 'Aluno Teste', motivo: 'REFEICAO_NAO_PREVISTA_PARA_TURMA',
    });

    expect(notificacao.destaque).toHaveBeenCalledOnceWith({
      tipo: 'erro', titulo: 'Aluno Teste', selo: 'BLOQUEADO',
      detalhe: 'Esta refeição não é servida para a turma do aluno.',
    });
  });

  it('bloqueio por turma com os campos novos explica a turma e os turnos da refeição', () => {
    fixture.componentInstance.validarFacial('data:image/jpeg;base64,AAA');
    http.expectOne(url).flush({
      resultado: 'BLOQUEADO', sinal: 'VERMELHO', alunoNome: 'Aluno Teste', motivo: 'REFEICAO_NAO_PREVISTA_PARA_TURMA',
      refeicao: 'Almoço', turnoDaTurma: 'MANHA', turnosDaRefeicao: ['INTEGRAL'],
    });

    expect(notificacao.destaque).toHaveBeenCalledOnceWith({
      tipo: 'erro', titulo: 'Aluno Teste', selo: 'BLOQUEADO',
      detalhe: 'Almoço é para turmas Integral; a turma do aluno é Manhã.',
    });
  });

  it('bloqueio por turma sem turnoDaTurma nem turnosDaRefeicao usa o texto do motivo', () => {
    fixture.componentInstance.validarFacial('data:image/jpeg;base64,AAA');
    http.expectOne(url).flush({
      resultado: 'BLOQUEADO', sinal: 'VERMELHO', alunoNome: 'Aluno Teste', motivo: 'REFEICAO_NAO_PREVISTA_PARA_TURMA',
      refeicao: 'Almoço', turnoDaTurma: null, turnosDaRefeicao: null,
    });

    expect(notificacao.destaque).toHaveBeenCalledOnceWith({
      tipo: 'erro', titulo: 'Aluno Teste', selo: 'BLOQUEADO', detalhe: traduzirMotivo('REFEICAO_NAO_PREVISTA_PARA_TURMA'),
    });
  });

  it('falha de comunicacao vira notificacao de erro', () => {
    fixture.componentInstance.validarFacial('data:image/jpeg;base64,AAA');
    http.expectOne(url).error(new ProgressEvent('error'), { status: 0 });

    expect(notificacao.erro).toHaveBeenCalledWith(jasmine.stringContaining('Não foi possível comunicar com a API'));
  });

  it('QR invalido vira notificacao de erro e nao chama a API', () => {
    fixture.componentInstance.validarQr('{"nome":"x"}');

    expect(notificacao.erro).toHaveBeenCalledWith('QR Code inválido ou fora do padrão esperado.');
    http.expectNone(url);
  });

  it('nao renderiza mais o cartao lateral de resultado', () => {
    fixture.componentInstance.validarFacial('data:image/jpeg;base64,AAA');
    http.expectOne(url).flush({ resultado: 'AUTORIZADO', sinal: 'VERDE', alunoNome: 'Helena Duarte', cardapio: 'Arroz' });
    fixture.detectChanges();

    const raiz = fixture.nativeElement as HTMLElement;
    expect(raiz.querySelector('aside')).toBeNull();
    expect(raiz.textContent).not.toContain('Helena Duarte');
  });
});
