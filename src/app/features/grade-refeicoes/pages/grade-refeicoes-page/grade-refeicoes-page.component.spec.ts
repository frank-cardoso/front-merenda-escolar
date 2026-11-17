import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { environment } from '../../../../../environments/environment';
import { NotificacaoService } from '../../../../shared/notificacao/notificacao.service';
import { TipoRefeicao } from '../../../../shared/refeicao/tipo-refeicao.models';
import { GradeRefeicoesPageComponent } from './grade-refeicoes-page.component';

const url = `${environment.apiBaseUrl}/tipos-refeicao`;
const lancheManha: TipoRefeicao = {
  id: 'r-1', nome: 'Lanche da manhã', ordem: 1, inicio: '09:30:00', fim: '10:00:00', turnos: ['MANHA', 'INTEGRAL'],
};
const almoco: TipoRefeicao = {
  id: 'r-2', nome: 'Almoço', ordem: 2, inicio: '11:30:00', fim: '13:00:00', turnos: ['INTEGRAL'],
};

describe('GradeRefeicoesPageComponent', () => {
  let fixture: ComponentFixture<GradeRefeicoesPageComponent>;
  let http: HttpTestingController;
  let notificacao: jasmine.SpyObj<NotificacaoService>;
  let componente: GradeRefeicoesPageComponent;

  const raiz = () => fixture.nativeElement as HTMLElement;
  const botao = (texto: string) => Array.from(raiz().querySelectorAll('button'))
    .find((b) => b.textContent?.trim() === texto) as HTMLButtonElement;
  const campo = (nome: string) => raiz().querySelector(`[name="${nome}"]`) as HTMLInputElement;
  const digitar = (nome: string, valor: string) => {
    const el = campo(nome);
    el.value = valor;
    el.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  };
  const abrir = async (texto: string) => {
    botao(texto).click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  };
  const marcar = (turno: string) => {
    campo(`turno-${turno}`).click();
    fixture.detectChanges();
  };

  beforeEach(async () => {
    notificacao = jasmine.createSpyObj<NotificacaoService>('NotificacaoService', ['sucesso', 'erro']);
    TestBed.configureTestingModule({
      imports: [GradeRefeicoesPageComponent],
      providers: [
        provideHttpClient(), provideHttpClientTesting(),
        { provide: NotificacaoService, useValue: notificacao },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(GradeRefeicoesPageComponent);
    componente = fixture.componentInstance;
    fixture.detectChanges();
    http.expectOne(url).flush([lancheManha, almoco]);
    fixture.detectChanges();
    await fixture.whenStable();
  });

  afterEach(() => http.verify());

  it('lista a grade com nome, janela e selos de turno com rótulo', () => {
    const linhas = Array.from(raiz().querySelectorAll('tbody tr'));
    expect(linhas.length).toBe(2);
    expect(linhas[0].textContent).toContain('Lanche da manhã');
    expect(linhas[0].textContent).toContain('09:30–10:00');
    const selos = Array.from(linhas[0].querySelectorAll('[data-testid="turno"]')).map((s) => s.textContent?.trim());
    expect(selos).toEqual(['Manhã', 'Integral']);
    expect(linhas[1].textContent).toContain('11:30–13:00');
  });

  it('mostra o texto de apoio', () => {
    expect(raiz().textContent).toContain(
      'A grade define quem tem direito a cada refeição pelo turno da turma. Mudanças valem daqui para frente.');
  });

  it('Nova refeição abre o formulário vazio com salvar desabilitado', async () => {
    await abrir('Nova refeição');

    expect(raiz().querySelector('dialog')?.querySelector('h2')?.textContent?.trim()).toBe('Nova refeição');
    expect(campo('nome').value).toBe('');
    expect(campo('inicio').value).toBe('');
    expect(campo('fim').value).toBe('');
    expect(campo('turno-MANHA').checked).toBeFalse();
    expect(botao('Salvar refeição').disabled).toBeTrue();
  });

  it('Editar preenche nome, horários e caixas de turno', async () => {
    await abrir('Editar');

    expect(campo('nome').value).toBe('Lanche da manhã');
    expect(campo('inicio').value).toBe('09:30');
    expect(campo('fim').value).toBe('10:00');
    expect(campo('turno-MANHA').checked).toBeTrue();
    expect(campo('turno-TARDE').checked).toBeFalse();
    expect(campo('turno-NOITE').checked).toBeFalse();
    expect(campo('turno-INTEGRAL').checked).toBeTrue();
  });

  it('salvar nova refeição chama POST com os turnos marcados, recarrega e notifica', async () => {
    await abrir('Nova refeição');
    digitar('nome', '  Ceia ');
    digitar('inicio', '19:00');
    digitar('fim', '19:30');
    marcar('NOITE');
    marcar('TARDE');
    expect(botao('Salvar refeição').disabled).toBeFalse();

    componente.salvar();
    const post = http.expectOne({ method: 'POST', url });
    expect(post.request.body).toEqual({ nome: 'Ceia', inicio: '19:00', fim: '19:30', turnos: ['TARDE', 'NOITE'] });
    post.flush({});
    http.expectOne({ method: 'GET', url }).flush([lancheManha, almoco]);
    fixture.detectChanges();

    expect(notificacao.sucesso).toHaveBeenCalledOnceWith('Refeição cadastrada.');
    expect(raiz().querySelector('dialog')?.open).toBeFalse();
  });

  it('salvar repetido enquanto o envio está pendente manda um POST só', async () => {
    await abrir('Nova refeição');
    digitar('nome', 'Ceia');
    digitar('inicio', '19:00');
    digitar('fim', '19:30');

    componente.salvar();
    componente.salvar();

    http.expectOne({ method: 'POST', url }).flush({});
    http.expectOne({ method: 'GET', url }).flush([lancheManha, almoco]);
  });

  it('o nome aceita no máximo 60 caracteres', async () => {
    await abrir('Nova refeição');
    expect(campo('nome').maxLength).toBe(60);
  });

  it('salvar edição chama PUT com o id e desmarcar turno o remove', async () => {
    await abrir('Editar');
    marcar('MANHA');

    componente.salvar();
    const put = http.expectOne({ method: 'PUT', url: `${url}/r-1` });
    expect(put.request.body).toEqual({ nome: 'Lanche da manhã', inicio: '09:30', fim: '10:00', turnos: ['INTEGRAL'] });
    put.flush({});
    http.expectOne({ method: 'GET', url }).flush([lancheManha, almoco]);

    expect(notificacao.sucesso).toHaveBeenCalledOnceWith('Refeição atualizada.');
  });

  for (const [status, detail] of [
    [422, 'O início precisa ser antes do fim.'],
    [409, 'Já existe uma refeição com esse nome.'],
  ] as const) {
    it(`erro ${status} mostra o detail da API e mantém o formulário aberto`, async () => {
      await abrir('Editar');

      componente.salvar();
      http.expectOne({ method: 'PUT', url: `${url}/r-1` })
        .flush({ detail }, { status, statusText: 'Erro' });
      fixture.detectChanges();

      expect(notificacao.erro).toHaveBeenCalledOnceWith(detail);
      expect(raiz().querySelector('dialog')?.open).toBeTrue();
      expect(campo('nome').value).toBe('Lanche da manhã');
    });
  }

  it('falha ao carregar a grade notifica', () => {
    const outro = TestBed.createComponent(GradeRefeicoesPageComponent);
    outro.detectChanges();
    http.expectOne(url).flush({}, { status: 500, statusText: 'Server Error' });

    expect(notificacao.erro).toHaveBeenCalledOnceWith('Não foi possível carregar as refeições.');
  });
});
