import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NotificacaoHostComponent } from './notificacao-host.component';
import { NotificacaoService } from './notificacao.service';

describe('NotificacaoHostComponent', () => {
  let fixture: ComponentFixture<NotificacaoHostComponent>;
  let servico: NotificacaoService;
  let raiz: HTMLElement;

  beforeEach(() => {
    jasmine.clock().install();
    TestBed.configureTestingModule({ imports: [NotificacaoHostComponent] });
    servico = TestBed.inject(NotificacaoService);
    fixture = TestBed.createComponent(NotificacaoHostComponent);
    raiz = fixture.nativeElement;
    fixture.detectChanges();
  });

  afterEach(() => jasmine.clock().uninstall());

  it('renderiza a mensagem de sucesso como status educado', () => {
    servico.sucesso('Turma cadastrada.');
    fixture.detectChanges();

    const item = raiz.querySelector('[role="status"]');
    expect(item?.textContent).toContain('Turma cadastrada.');
    expect(item?.getAttribute('aria-live')).toBe('polite');
    expect(raiz.querySelector('[role="alert"]')).toBeNull();
  });

  it('renderiza o erro como alerta assertivo', () => {
    servico.erro('Erro 409 ao processar a solicitação.');
    fixture.detectChanges();

    const item = raiz.querySelector('[role="alert"]');
    expect(item?.textContent).toContain('Erro 409');
    expect(item?.getAttribute('aria-live')).toBe('assertive');
  });

  it('o botão X fecha a notificação', () => {
    servico.sucesso('Ok.');
    fixture.detectChanges();

    (raiz.querySelector('button[aria-label="Fechar notificação"]') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(raiz.querySelector('[role="status"]')).toBeNull();
    expect(servico.notificacoes()).toEqual([]);
  });

  it('o destaque aparece na região central do topo, separado das notificações simples', () => {
    servico.sucesso('Turma cadastrada.');
    servico.destaque({ tipo: 'sucesso', titulo: 'Ana', selo: 'AUTORIZADO', detalhe: 'Arroz' });
    fixture.detectChanges();

    const central = raiz.querySelector('[data-regiao="destaque"]');
    const canto = raiz.querySelector('[data-regiao="simples"]');
    expect(central?.textContent).toContain('Ana');
    expect(central?.textContent).not.toContain('Turma cadastrada.');
    expect(canto?.textContent).toContain('Turma cadastrada.');
    expect(canto?.textContent).not.toContain('Ana');
  });

  it('a variante destaque mostra selo, título e detalhe', () => {
    servico.destaque({ tipo: 'erro', titulo: 'Aluno não identificado', selo: 'BLOQUEADO', detalhe: 'Use o QR Code.' });
    fixture.detectChanges();

    const texto = raiz.querySelector('[role="alert"]')?.textContent ?? '';
    expect(texto).toContain('BLOQUEADO');
    expect(texto).toContain('Aluno não identificado');
    expect(texto).toContain('Use o QR Code.');
  });
});
