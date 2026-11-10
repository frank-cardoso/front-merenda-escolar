import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RefeicaoDoDia } from '../../models/painel.models';
import { escolherRefeicaoInicial, PainelDiaComponent } from './painel-dia.component';

function refeicao(id: string, situacao: RefeicaoDoDia['situacao'], extra: Partial<RefeicaoDoDia> = {}): RefeicaoDoDia {
  return {
    tipoRefeicaoId: id, refeicao: `Refeição ${id}`, ordem: 1, inicio: '11:30', fim: '13:00', situacao,
    cardapioId: 'c-' + id, itensCardapio: 5, itensMedidos: 0, consumosAutorizados: 36, fechadoEm: null, ...extra,
  };
}

describe('escolherRefeicaoInicial', () => {
  it('prefere a pendente à em andamento', () => {
    const lista = [refeicao('a', 'EM_ANDAMENTO'), refeicao('b', 'PENDENTE')];
    expect(escolherRefeicaoInicial(lista)).toBe('b');
  });

  it('usa a em andamento quando não há pendente', () => {
    const lista = [refeicao('a', 'FECHADA'), refeicao('b', 'EM_ANDAMENTO')];
    expect(escolherRefeicaoInicial(lista)).toBe('b');
  });

  it('usa a primeira quando nenhuma é pendente nem em andamento', () => {
    const lista = [refeicao('a', 'FECHADA'), refeicao('b', 'AGUARDANDO')];
    expect(escolherRefeicaoInicial(lista)).toBe('a');
  });

  it('no último recurso prefere a primeira com cardápio à primeira da grade', () => {
    const lista = [
      refeicao('a', 'SEM_CARDAPIO', { cardapioId: null }),
      refeicao('b', 'FECHADA'),
      refeicao('c', 'AGUARDANDO'),
    ];
    expect(escolherRefeicaoInicial(lista)).toBe('b');
  });

  it('cai na primeira da grade quando nenhuma tem cardápio', () => {
    const lista = [refeicao('a', 'SEM_CARDAPIO', { cardapioId: null }), refeicao('b', 'SEM_CARDAPIO', { cardapioId: null })];
    expect(escolherRefeicaoInicial(lista)).toBe('a');
  });

  it('a pedida válida vence', () => {
    const lista = [refeicao('a', 'PENDENTE'), refeicao('b', 'FECHADA')];
    expect(escolherRefeicaoInicial(lista, 'b')).toBe('b');
  });

  it('ignora a pedida fora da lista', () => {
    const lista = [refeicao('a', 'PENDENTE'), refeicao('b', 'FECHADA')];
    expect(escolherRefeicaoInicial(lista, 'x')).toBe('a');
  });

  it('devolve vazio para lista vazia', () => {
    expect(escolherRefeicaoInicial([], 'a')).toBe('');
  });
});

describe('PainelDiaComponent', () => {
  let fixture: ComponentFixture<PainelDiaComponent>;
  const fechadoEm = new Date(2026, 2, 10, 12, 5).toISOString();

  function montar(refeicoes: RefeicaoDoDia[], selecionada = '', data = '') {
    fixture = TestBed.createComponent(PainelDiaComponent);
    fixture.componentRef.setInput('refeicoes', refeicoes);
    fixture.componentRef.setInput('selecionada', selecionada);
    fixture.componentRef.setInput('data', data);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  const botoes = (el: HTMLElement) => Array.from(el.querySelectorAll('button'));

  afterEach(() => fixture.destroy());

  it('renderiza um cartão por refeição com o selo, a fila e os itens', () => {
    const el = montar([
      refeicao('a', 'PENDENTE', { itensMedidos: 0 }),
      refeicao('b', 'EM_ANDAMENTO'),
      refeicao('c', 'FECHADA', { fechadoEm, itensMedidos: 5 }),
      refeicao('d', 'AGUARDANDO'),
      refeicao('e', 'SEM_CARDAPIO', { cardapioId: null, itensCardapio: 0 }),
    ]);

    const cartoes = botoes(el);
    expect(cartoes.length).toBe(5);
    expect(el.querySelector('h3')?.textContent).toContain('Refeições do dia');
    expect(cartoes[0].textContent).toContain('Pendente');
    expect(cartoes[0].textContent).toContain('36 alunos na fila');
    expect(cartoes[0].textContent).toContain('0/5 itens');
    expect(cartoes[1].textContent).toContain('Em andamento');
    expect(cartoes[2].textContent).toContain('Fechada às 12:05');
    expect(cartoes[3].textContent).toContain('Aguardando');
    expect(cartoes[4].textContent).toContain('Sem cardápio');
  });

  it('mostra a data quando o fechamento foi em outro dia que o do painel', () => {
    const el = montar([refeicao('c', 'FECHADA', { fechadoEm })], '', '2026-03-11');

    expect(botoes(el)[0].textContent).toContain('Fechada em 10/03 às 12:05');
  });

  it('mostra só a hora quando o fechamento foi no dia do painel', () => {
    const el = montar([refeicao('c', 'FECHADA', { fechadoEm })], '', '2026-03-10');

    expect(botoes(el)[0].textContent).toContain('Fechada às 12:05');
  });

  it('emite o id ao clicar num cartão com cardápio', () => {
    const el = montar([refeicao('a', 'PENDENTE'), refeicao('b', 'FECHADA', { fechadoEm })]);
    const emitidos: string[] = [];
    fixture.componentInstance.escolher.subscribe((id) => emitidos.push(id));

    botoes(el)[1].click();

    expect(emitidos).toEqual(['b']);
  });

  it('desabilita o cartão sem cardápio', () => {
    const el = montar([refeicao('a', 'SEM_CARDAPIO', { cardapioId: null })]);
    const emitidos: string[] = [];
    fixture.componentInstance.escolher.subscribe((id) => emitidos.push(id));

    botoes(el)[0].click();

    expect(botoes(el)[0].disabled).toBeTrue();
    expect(emitidos).toEqual([]);
  });

  it('marca só o cartão selecionado com aria-current', () => {
    const el = montar([refeicao('a', 'PENDENTE'), refeicao('b', 'PENDENTE')], 'b');

    expect(botoes(el)[0].getAttribute('aria-current')).toBeNull();
    expect(botoes(el)[1].getAttribute('aria-current')).toBe('true');
  });
});
