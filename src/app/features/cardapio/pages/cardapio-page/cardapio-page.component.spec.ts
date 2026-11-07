import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { environment } from '../../../../../environments/environment';
import { NotificacaoService } from '../../../../shared/notificacao/notificacao.service';
import { Cardapio, CardapioRequest } from '../../models/cardapio.models';
import { CardapioPageComponent } from './cardapio-page.component';

const base = environment.apiBaseUrl;
const request: CardapioRequest = {
  data: '2026-11-07', turno: 'MANHA', nomeRefeicao: 'Lanche', descricao: null,
  quantidadePlanejada: 100, itens: [],
} as CardapioRequest;

const cardapio: Cardapio = {
  id: 'c-1', data: '2026-11-08', turno: 'TARDE', nomeRefeicao: 'Sopa', descricao: null,
  itens: [], quantidadePlanejada: 80, ativo: true,
};

describe('CardapioPageComponent', () => {
  let fixture: ComponentFixture<CardapioPageComponent>;
  let http: HttpTestingController;
  let notificacao: jasmine.SpyObj<NotificacaoService>;

  beforeEach(() => {
    notificacao = jasmine.createSpyObj<NotificacaoService>('NotificacaoService', ['sucesso', 'erro']);
    TestBed.configureTestingModule({
      imports: [CardapioPageComponent],
      providers: [
        provideHttpClient(), provideHttpClientTesting(),
        { provide: NotificacaoService, useValue: notificacao },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(CardapioPageComponent);
    fixture.detectChanges();
    http.expectOne(`${base}/cardapios`).flush([cardapio]);
    http.expectOne(`${base}/receitas`).flush([]);
    fixture.detectChanges();
  });

  afterEach(() => http.verify());

  it('salvar com sucesso notifica e nao renderiza bloco fixo', () => {
    fixture.componentInstance.salvar(request);
    http.expectOne({ method: 'POST', url: `${base}/cardapios` }).flush({});
    http.expectOne(`${base}/cardapios`).flush([]);
    fixture.detectChanges();

    expect(notificacao.sucesso).toHaveBeenCalledOnceWith('Cardápio cadastrado.');
    expect((fixture.nativeElement as HTMLElement).querySelector('[role="status"]')).toBeNull();
  });

  it('falha ao salvar notifica o erro da API', () => {
    fixture.componentInstance.salvar(request);
    http.expectOne({ method: 'POST', url: `${base}/cardapios` })
      .flush({ detail: 'Já existe cardápio para a data' }, { status: 409, statusText: 'Conflict' });
    fixture.detectChanges();

    expect(notificacao.erro).toHaveBeenCalledOnceWith('Já existe cardápio para a data');
    expect((fixture.nativeElement as HTMLElement).querySelector('[role="alert"]')).toBeNull();
  });

  describe('modal do formulário', () => {
    const raiz = () => fixture.nativeElement as HTMLElement;
    const dialog = () => raiz().querySelector('dialog') as HTMLDialogElement;
    const botao = (texto: string) => Array.from(raiz().querySelectorAll('button'))
      .find((b) => b.textContent?.trim() === texto) as HTMLButtonElement;

    it('Novo cardápio abre o modal com o título', () => {
      botao('Novo cardápio').click();
      fixture.detectChanges();

      expect(dialog().open).toBeTrue();
      expect(dialog().querySelector('h2')?.textContent?.trim()).toBe('Novo cardápio');
      expect(dialog().querySelector('app-cardapio-form')).not.toBeNull();
    });

    it('Editar abre o modal com o formulário preenchido', async () => {
      botao('Editar').click();
      fixture.detectChanges();
      await fixture.whenStable();

      expect(dialog().open).toBeTrue();
      expect(dialog().querySelector('h2')?.textContent?.trim()).toBe('Editar cardápio');
      expect((dialog().querySelector('input[name="nomeRefeicao"]') as HTMLInputElement).value).toBe('Sopa');
    });

    it('Cancelar fecha o modal', () => {
      botao('Editar').click();
      fixture.detectChanges();
      botao('Cancelar').click();
      fixture.detectChanges();

      expect(dialog().open).toBeFalse();
      expect(dialog().querySelector('app-cardapio-form')).toBeNull();
    });

    it('salvar com sucesso fecha o modal e erro mantém aberto', () => {
      botao('Editar').click();
      fixture.detectChanges();

      fixture.componentInstance.salvar(request);
      http.expectOne({ method: 'PUT', url: `${base}/cardapios/c-1` })
        .flush({ detail: 'x' }, { status: 409, statusText: 'Conflict' });
      fixture.detectChanges();
      expect(dialog().open).toBeTrue();

      fixture.componentInstance.salvar(request);
      http.expectOne({ method: 'PUT', url: `${base}/cardapios/c-1` }).flush({});
      http.expectOne(`${base}/cardapios`).flush([cardapio]);
      fixture.detectChanges();
      expect(dialog().open).toBeFalse();
    });
  });
});
