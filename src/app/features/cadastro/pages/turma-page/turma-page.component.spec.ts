import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { environment } from '../../../../../environments/environment';
import { NotificacaoService } from '../../../../shared/notificacao/notificacao.service';
import { Turma } from '../../models/cadastro.models';
import { TurmaPageComponent } from './turma-page.component';

const url = `${environment.apiBaseUrl}/turmas`;
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
    http.expectOne(url).flush([turma]);
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
