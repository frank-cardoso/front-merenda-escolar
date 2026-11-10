import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { environment } from '../../../../../environments/environment';
import { NotificacaoService } from '../../../../shared/notificacao/notificacao.service';
import { TipoRefeicao } from '../../../../shared/refeicao/tipo-refeicao.models';
import { Turma } from '../../models/cadastro.models';
import { TurmaPageComponent } from './turma-page.component';

const url = `${environment.apiBaseUrl}/turmas`;
const urlGrade = `${environment.apiBaseUrl}/tipos-refeicao`;
const refeicao = (nome: string, ordem: number, turnos: string[]): TipoRefeicao =>
  ({ id: String(ordem), nome, ordem, inicio: '07:00:00', fim: '08:00:00', turnos });
const grade: TipoRefeicao[] = [
  refeicao('Café da manhã', 1, ['INTEGRAL']),
  refeicao('Lanche da manhã', 2, ['MANHA', 'INTEGRAL']),
  refeicao('Almoço', 3, ['INTEGRAL']),
  refeicao('Lanche da tarde', 4, ['TARDE', 'INTEGRAL']),
];
const integral: Turma = { id: 't-2', codigo: '7A', descricao: '7o ano A', turno: 'INTEGRAL', quantidadeMaximaAlunos: 30 };
const noite: Turma = { id: 't-3', codigo: '8N', descricao: '8o ano N', turno: 'NOITE', quantidadeMaximaAlunos: 20 };
const turma: Turma = { id: 't-1', codigo: '6B', descricao: '6o ano B', turno: 'TARDE', quantidadeMaximaAlunos: 25 };

describe('TurmaPageComponent', () => {
  let fixture: ComponentFixture<TurmaPageComponent>;
  let http: HttpTestingController;
  let notificacao: jasmine.SpyObj<NotificacaoService>;
  let componente: TurmaPageComponent;

  beforeEach(() => {
    notificacao = jasmine.createSpyObj<NotificacaoService>('NotificacaoService', ['sucesso', 'erro']);
    TestBed.configureTestingModule({
      imports: [TurmaPageComponent],
      providers: [
        provideHttpClient(), provideHttpClientTesting(),
        { provide: NotificacaoService, useValue: notificacao },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(TurmaPageComponent);
    componente = fixture.componentInstance;
    fixture.detectChanges();
    http.expectOne(url).flush([turma, integral, noite]);
    http.expectOne(urlGrade).flush(grade);
    fixture.detectChanges();
    componente.codigo.set('5A');
    componente.descricao.set('5o ano A');
  });

  afterEach(() => http.verify());

  it('salvar com sucesso notifica e nao renderiza bloco fixo', () => {
    componente.salvar();
    http.expectOne({ method: 'POST', url }).flush({});
    http.expectOne(url).flush([]);
    fixture.detectChanges();

    expect(notificacao.sucesso).toHaveBeenCalledOnceWith('Turma cadastrada.');
    expect((fixture.nativeElement as HTMLElement).querySelector('[role="status"]')).toBeNull();
  });

  it('falha ao salvar notifica o erro da API', () => {
    componente.salvar();
    http.expectOne({ method: 'POST', url })
      .flush({ detail: 'Código de turma já existe' }, { status: 409, statusText: 'Conflict' });
    fixture.detectChanges();

    expect(notificacao.erro).toHaveBeenCalledTimes(1);
    expect(notificacao.erro.calls.mostRecent().args[0]).toContain('Código de turma já existe');
    expect((fixture.nativeElement as HTMLElement).querySelector('[role="alert"]')).toBeNull();
  });

  describe('direito às refeições', () => {
    const raiz = () => fixture.nativeElement as HTMLElement;
    const linha = (codigo: string) => Array.from(raiz().querySelectorAll('tbody tr'))
      .find((tr) => tr.textContent?.includes(codigo)) as HTMLElement;
    const selos = (codigo: string) => Array.from(linha(codigo).querySelectorAll('[data-testid="refeicoes-da-turma"] span'))
      .map((s) => s.textContent?.trim());

    it('coluna Refeições mostra selos por turno da turma', () => {
      expect(raiz().textContent).toContain('Refeições');
      expect(selos('7A')).toEqual(['Café da manhã', 'Lanche da manhã', 'Almoço', 'Lanche da tarde']);
      expect(selos('6B')).toEqual(['Lanche da tarde']);
    });

    it('mostra o turno com rótulo na coluna, no card e nas opções do formulário', () => {
      expect(linha('7A').querySelector('td:nth-child(3)')?.textContent?.trim()).toBe('Integral');
      expect(Array.from(raiz().querySelectorAll('p')).find((p) => p.textContent?.includes('Turno com mais turmas'))
        ?.nextElementSibling?.textContent?.trim()).toBe('Tarde');

      componente.abrirNova();
      fixture.detectChanges();
      const opcoes = Array.from(raiz().querySelectorAll('select[name="turno"] option'));
      expect(opcoes.map((o) => o.textContent?.trim())).toEqual(['Manhã', 'Tarde', 'Noite', 'Integral']);
      expect(opcoes.map((o) => (o as HTMLOptionElement).value)).toEqual(['MANHA', 'TARDE', 'NOITE', 'INTEGRAL']);
    });

    it('turno sem refeição mostra "Nenhuma refeição"', () => {
      expect(selos('8N')).toEqual(['Nenhuma refeição']);
    });

    it('formulário mostra o direito do turno escolhido e acompanha a troca', () => {
      componente.abrirNova();
      fixture.detectChanges();
      expect(raiz().textContent).toContain('Esta turma terá direito a: Lanche da manhã');

      componente.turno.set('TARDE');
      fixture.detectChanges();
      expect(raiz().textContent).toContain('Esta turma terá direito a: Lanche da tarde');

      componente.turno.set('NOITE');
      fixture.detectChanges();
      expect(raiz().textContent).toContain('Esta turma não terá direito a nenhuma refeição.');
    });
  });

  describe('falha ao carregar a grade', () => {
    it('mantém a tela sem a coluna e sem a dica', () => {
      const outro = TestBed.createComponent(TurmaPageComponent);
      outro.detectChanges();
      http.expectOne(url).flush([turma]);
      http.expectOne(urlGrade).flush({}, { status: 500, statusText: 'Server Error' });
      outro.componentInstance.abrirNova();
      outro.detectChanges();

      const texto = (outro.nativeElement as HTMLElement).textContent ?? '';
      expect(texto).toContain('6B');
      expect(texto).not.toContain('Refeições');
      expect(texto).not.toContain('terá direito');
    });
  });

  describe('modal do formulário', () => {
    const raiz = () => fixture.nativeElement as HTMLElement;
    const dialog = () => raiz().querySelector('dialog') as HTMLDialogElement;
    const botao = (texto: string) => Array.from(raiz().querySelectorAll('button'))
      .find((b) => b.textContent?.trim() === texto) as HTMLButtonElement;

    it('Nova turma abre o modal com título e formulário vazio', () => {
      botao('Nova turma').click();
      fixture.detectChanges();

      expect(dialog().open).toBeTrue();
      expect(dialog().querySelector('h2')?.textContent?.trim()).toBe('Nova turma');
      expect((dialog().querySelector('input[name="codigo"]') as HTMLInputElement).value).toBe('');
    });

    it('Editar abre o modal com o formulário preenchido', async () => {
      botao('Editar').click();
      fixture.detectChanges();
      await fixture.whenStable();

      expect(dialog().open).toBeTrue();
      expect(dialog().querySelector('h2')?.textContent?.trim()).toBe('Editar turma');
      expect((dialog().querySelector('input[name="codigo"]') as HTMLInputElement).value).toBe('6B');
    });

    it('Cancelar fecha o modal', () => {
      botao('Editar').click();
      fixture.detectChanges();
      botao('Cancelar').click();
      fixture.detectChanges();

      expect(dialog().open).toBeFalse();
      expect(dialog().querySelector('form')).toBeNull();
    });

    it('salvar com sucesso fecha o modal e erro mantém aberto', () => {
      botao('Editar').click();
      fixture.detectChanges();

      componente.salvar();
      http.expectOne({ method: 'PUT', url: `${url}/t-1` })
        .flush({ detail: 'x' }, { status: 409, statusText: 'Conflict' });
      fixture.detectChanges();
      expect(dialog().open).toBeTrue();

      componente.salvar();
      http.expectOne({ method: 'PUT', url: `${url}/t-1` }).flush({});
      http.expectOne(url).flush([turma]);
      fixture.detectChanges();
      expect(dialog().open).toBeFalse();
    });
  });
});
