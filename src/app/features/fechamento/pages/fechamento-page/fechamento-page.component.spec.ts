import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import FechamentoPageComponent from './fechamento-page.component';
import { CardapioApiService } from '../../../cardapio/data-access/cardapio-api.service';
import { Cardapio } from '../../../cardapio/models/cardapio.models';
import {
  ConsolidacaoConsumo, CriarRelatorioIAResponse,
} from '../../../dashboard/models/dashboard.models';
import { DashboardApiService } from '../../../dashboard/data-access/dashboard-api.service';
import { NotificacaoService } from '../../../../shared/notificacao/notificacao.service';
import { FechamentoApiService } from '../../data-access/fechamento-api.service';
import { FechamentoPainelApiService } from '../../data-access/fechamento-painel-api.service';
import { RefeicaoDoDia } from '../../models/painel.models';

const HOJE = new Date();
const DATA = `${HOJE.getFullYear()}-${String(HOJE.getMonth() + 1).padStart(2, '0')}`
  + `-${String(HOJE.getDate()).padStart(2, '0')}`;

function doDia(id: string, situacao: RefeicaoDoDia['situacao'], ordem: number): RefeicaoDoDia {
  return {
    tipoRefeicaoId: id, refeicao: id, ordem, inicio: '11:30', fim: '13:00', situacao,
    cardapioId: 'c1', itensCardapio: 1, itensMedidos: 0, consumosAutorizados: 91, fechadoEm: null,
  };
}

const CAFE = doDia('id-cafe', 'FECHADA', 1);
const ALMOCO = doDia('id-almoco', 'PENDENTE', 3);

function cardapio(itens: { receitaId: string | null; nome: string }[]): Cardapio[] {
  return [{
    id: 'c1', data: DATA, tipoRefeicaoId: 'id-almoco', refeicao: 'Almoço', nomeRefeicao: 'Almoço completo',
    descricao: null, quantidadePlanejada: 300, ativo: true,
    itens: itens.map((i) => ({ ...i, quantidade: null })),
  }];
}

function montar(itens: { receitaId: string | null; nome: string }[], consumos = 91,
  refeicoes: RefeicaoDoDia[] = [ALMOCO], query: Record<string, string> = {}) {
  const cardapioApi = jasmine.createSpyObj<CardapioApiService>('CardapioApiService', ['listar']);
  const dashboardApi = jasmine.createSpyObj<DashboardApiService>('DashboardApiService',
    ['buscarConsolidacao', 'criarRelatorio']);
  const fechamentoApi = jasmine.createSpyObj<FechamentoApiService>('FechamentoApiService',
    ['registrarMedicao', 'registrarFechamento', 'listarMedicoes']);
  const painelApi = jasmine.createSpyObj<FechamentoPainelApiService>('FechamentoPainelApiService', ['doDia']);
  painelApi.doDia.and.returnValue(of(refeicoes));

  cardapioApi.listar.and.returnValue(of(cardapio(itens)));
  dashboardApi.buscarConsolidacao.and.returnValue(of({
    data: DATA, tipoRefeicaoId: 'id-almoco', refeicao: 'Almoço', cardapioId: 'c1', cardapio: 'Almoço completo',
    quantidadePlanejada: 300, consumosAutorizados: consumos, tentativasBloqueadas: 0,
    taxaConsumoPlanejado: 30.33, sobraEstimada: 300 - consumos,
  } as ConsolidacaoConsumo));
  dashboardApi.criarRelatorio.and.returnValue(
    of({ relatorioId: 'r1', status: 'PENDENTE', statusUrl: '/r1' } as CriarRelatorioIAResponse));
  fechamentoApi.registrarFechamento.and.callFake((request) => of(request.medicoes));
  fechamentoApi.listarMedicoes.and.returnValue(of([]));

  const notificacao = jasmine.createSpyObj<NotificacaoService>('NotificacaoService', ['sucesso', 'erro', 'aviso']);

  TestBed.configureTestingModule({
    providers: [
      { provide: NotificacaoService, useValue: notificacao },
      { provide: CardapioApiService, useValue: cardapioApi },
      { provide: DashboardApiService, useValue: dashboardApi },
      { provide: FechamentoApiService, useValue: fechamentoApi },
      { provide: FechamentoPainelApiService, useValue: painelApi },
      { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap(query) } } },
    ],
  });
  const fixture = TestBed.createComponent(FechamentoPageComponent);
  fixture.detectChanges();
  return { fixture, componente: fixture.componentInstance, cardapioApi, dashboardApi, fechamentoApi, notificacao, painelApi };
}

describe('FechamentoPageComponent', () => {
  it('ao abrir sem parâmetros seleciona a primeira pendente e carrega a consolidação dela', () => {
    const { componente, dashboardApi, painelApi, fixture } = montar(
      [{ receitaId: 'r-maca', nome: 'Maçã' }], 91, [CAFE, ALMOCO]);

    expect(painelApi.doDia).toHaveBeenCalledOnceWith(DATA);
    expect(componente.tipoRefeicaoId()).toBe('id-almoco');
    expect(dashboardApi.buscarConsolidacao).toHaveBeenCalledOnceWith(DATA, 'id-almoco');
    fixture.destroy();
  });

  it('usa a data e a refeição da URL quando informadas', () => {
    const { componente, cardapioApi, painelApi, fixture } = montar(
      [{ receitaId: 'r-maca', nome: 'Maçã' }], 91, [CAFE, ALMOCO],
      { data: '2026-03-09', refeicao: 'id-cafe' });

    expect(painelApi.doDia).toHaveBeenCalledOnceWith('2026-03-09');
    expect(componente.data()).toBe('2026-03-09');
    expect(componente.tipoRefeicaoId()).toBe('id-cafe');
    expect(cardapioApi.listar).toHaveBeenCalledTimes(1);
    fixture.destroy();
  });

  it('o clique num cartão carrega aquela refeição', () => {
    const { componente, cardapioApi, fixture } = montar(
      [{ receitaId: 'r-maca', nome: 'Maçã' }], 91, [CAFE, ALMOCO]);
    cardapioApi.listar.calls.reset();

    componente.escolherRefeicao('id-cafe');

    expect(componente.tipoRefeicaoId()).toBe('id-cafe');
    expect(cardapioApi.listar).toHaveBeenCalledTimes(1);
    fixture.destroy();
  });

  it('depois de fechar atualiza o painel do dia', () => {
    const { componente, painelApi, fixture } = montar([{ receitaId: 'r-maca', nome: 'Maçã' }]);
    painelApi.doDia.calls.reset();

    componente.fechar();

    expect(painelApi.doDia).toHaveBeenCalledOnceWith(DATA);
    fixture.destroy();
  });

  it('resposta antiga do painel não sobrescreve a da data atual', () => {
    const { componente, painelApi, fixture } = montar([{ receitaId: 'r-maca', nome: 'Maçã' }]);
    const antiga = new Subject<RefeicaoDoDia[]>();
    const nova = new Subject<RefeicaoDoDia[]>();
    painelApi.doDia.and.returnValues(antiga, nova);

    componente.trocarData('2026-03-09');
    componente.trocarData('2026-03-10');
    nova.next([CAFE]);
    antiga.next([ALMOCO]);

    expect(componente.refeicoes()).toEqual([CAFE]);
    expect(componente.tipoRefeicaoId()).toBe('id-cafe');
    fixture.destroy();
  });

  it('trocar a data limpa o formulário até a nova data carregar', () => {
    const { componente, painelApi, fixture } = montar([{ receitaId: 'r-maca', nome: 'Maçã' }]);
    expect(componente.podeFechar()).toBeTrue();
    painelApi.doDia.and.returnValue(new Subject<RefeicaoDoDia[]>());

    componente.trocarData('2026-03-09');

    expect(componente.podeFechar()).toBeFalse();
    expect(componente.linhas()).toEqual([]);
    expect(componente.refeicoes()).toEqual([]);
    expect(componente.aviso()).toBeNull();
    fixture.destroy();
  });

  it('resposta velha de carregar não sobrescreve a refeição escolhida depois', () => {
    const { componente, cardapioApi, dashboardApi, fixture } = montar([{ receitaId: 'r-maca', nome: 'Maçã' }]);
    const cardapioDe = (tipo: string, receitaId: string): Cardapio[] => [{
      ...cardapio([{ receitaId, nome: receitaId }])[0], tipoRefeicaoId: tipo,
    }];
    const antiga = new Subject<Cardapio[]>();
    const nova = new Subject<Cardapio[]>();
    cardapioApi.listar.and.returnValues(antiga, nova);
    dashboardApi.buscarConsolidacao.calls.reset();

    componente.escolherRefeicao('id-cafe');
    componente.escolherRefeicao('id-almoco');
    nova.next(cardapioDe('id-almoco', 'r-b'));
    nova.complete();
    antiga.next(cardapioDe('id-cafe', 'r-a'));
    antiga.complete();

    expect(componente.linhas().map((l) => l.receitaId)).toEqual(['r-b']);
    expect(dashboardApi.buscarConsolidacao).toHaveBeenCalledOnceWith(DATA, 'id-almoco');
    expect(componente.carregando()).toBeFalse();
    fixture.destroy();
  });

  it('trocar a data com o fechamento em envio: a recarga da nova data prevalece', () => {
    const { componente, painelApi, fechamentoApi, fixture } = montar([{ receitaId: 'r-maca', nome: 'Maçã' }]);
    const envio = new Subject<never[]>();
    fechamentoApi.registrarFechamento.and.returnValue(envio);
    componente.fechar();
    componente.trocarData('2026-03-09');
    painelApi.doDia.calls.reset();

    envio.next([]);

    expect(painelApi.doDia).not.toHaveBeenCalled();
    fixture.destroy();
  });

  it('preenche as linhas com a contagem da fila e zera as perdas', () => {
    const { componente, fixture } = montar([
      { receitaId: 'r-maca', nome: 'Maçã' },
      { receitaId: 'r-cuscuz', nome: 'Cuscuz' },
    ]);

    expect(componente.linhas().length).toBe(2);
    expect(componente.linhas()[0].porcoesPreparadas).toBe(91);
    expect(componente.linhas()[0].sobraNaoDistribuida).toBe(0);
    expect(componente.linhas()[0].restoNoPrato).toBe(0);
    // Servido nao e informado: sai de preparado menos sobra.
    expect(componente.servidas(componente.linhas()[0])).toBe(91);
    expect(componente.podeFechar()).toBeTrue();
    fixture.destroy();
  });

  it('avisa e nao permite medir quando o cardapio tem item sem vinculo de receita', () => {
    const { componente, fixture } = montar([{ receitaId: null, nome: 'peixe' }]);

    expect(componente.linhas()).toEqual([]);
    expect(componente.aviso()).toContain('peixe');
    fixture.destroy();
  });

  it('deriva o servido descontando o que sobrou na panela', () => {
    const { componente, fixture } = montar([{ receitaId: 'r-banana', nome: 'Banana' }]);
    componente.atualizar(0, 'porcoesPreparadas', '100');
    componente.atualizar(0, 'sobraNaoDistribuida', '40');

    // 100 preparadas, 40 na panela: serviu 60, mesmo com 91 refeicoes contadas na fila.
    expect(componente.servidas(componente.linhas()[0])).toBe(60);
    expect(componente.podeFechar()).toBeTrue();
    fixture.destroy();
  });

  it('bloqueia quando volta no prato mais do que foi servido', () => {
    const { componente, fixture } = montar([{ receitaId: 'r-banana', nome: 'Banana' }]);
    componente.atualizar(0, 'porcoesPreparadas', '100');
    componente.atualizar(0, 'sobraNaoDistribuida', '40');
    componente.atualizar(0, 'restoNoPrato', '61');

    expect(componente.podeFechar()).toBeFalse();
    fixture.destroy();
  });

  it('bloqueia quando sobra mais do que foi preparado', () => {
    const { componente, fixture } = montar([{ receitaId: 'r-banana', nome: 'Banana' }]);
    componente.atualizar(0, 'sobraNaoDistribuida', '999');

    expect(componente.podeFechar()).toBeFalse();
    fixture.destroy();
  });

  it('registra uma medicao por item e so entao gera o relatorio', () => {
    const { componente, fixture, fechamentoApi, dashboardApi, notificacao } = montar([
      { receitaId: 'r-maca', nome: 'Maçã' },
      { receitaId: 'r-cuscuz', nome: 'Cuscuz' },
    ]);
    let medicoesAoGerarRelatorio = 0;
    dashboardApi.criarRelatorio.and.callFake(() => {
      medicoesAoGerarRelatorio = fechamentoApi.registrarFechamento.calls.count();
      return of({ relatorioId: 'r1', status: 'PENDENTE', statusUrl: '/r1' } as CriarRelatorioIAResponse);
    });

    componente.fechar();

    expect(fechamentoApi.registrarFechamento).toHaveBeenCalledTimes(1);
    const medicoes = fechamentoApi.registrarFechamento.calls.first().args[0].medicoes;
    expect(medicoes.map((m) => m.receitaId)).toEqual(['r-maca', 'r-cuscuz']);
    // O servido enviado e o derivado, nao a contagem do QR.
    expect(medicoes.every((m) => m.porcoesServidas === 91)).toBeTrue();
    expect(medicoes.every((m) => m.tipoRefeicaoId === 'id-almoco')).toBeTrue();
    // O relatorio so e pedido depois que o fechamento ja foi enviado.
    expect(medicoesAoGerarRelatorio).toBe(1);
    expect(dashboardApi.criarRelatorio).toHaveBeenCalledOnceWith({ dataReferencia: DATA, tipoRefeicaoId: 'id-almoco' });
    expect(componente.relatorioId()).toBe('r1');
    expect(notificacao.sucesso).toHaveBeenCalledOnceWith(jasmine.stringContaining('Refeição fechada'));
    fixture.destroy();
  });

  it('depois de fechar, o botao passa a salvar a edicao', () => {
    const { componente, fixture } = montar([
      { receitaId: 'r-maca', nome: 'Maçã' },
      { receitaId: 'r-cuscuz', nome: 'Cuscuz' },
    ]);
    expect(componente.medicoesExistentes()).toBe(0);

    componente.fechar();
    fixture.detectChanges();

    expect(componente.medicoesExistentes()).toBe(2);
    expect(fixture.nativeElement.textContent).toContain('Salvar edição e gerar relatório');
    fixture.destroy();
  });

  it('nao gera relatorio quando uma medicao falha', () => {
    const { componente, fixture, fechamentoApi, dashboardApi, notificacao } = montar([
      { receitaId: 'r-maca', nome: 'Maçã' },
    ]);
    fechamentoApi.registrarFechamento.and.returnValue(
      throwError(() => ({ error: { detail: 'Resto no prato (99) não pode superar o servido (91)' } })));

    componente.fechar();

    expect(dashboardApi.criarRelatorio).not.toHaveBeenCalled();
    expect(notificacao.erro).toHaveBeenCalledOnceWith(jasmine.stringContaining('não pode superar'));
    expect(notificacao.sucesso).not.toHaveBeenCalled();
    expect(componente.relatorioId()).toBeNull();
    expect(componente.fechando()).toBeFalse();
    fixture.destroy();
  });

  it('fechamento gravado e relatorio recusado com 422 avisa em vez de dar erro', () => {
    const { componente, fixture, dashboardApi, notificacao } = montar([
      { receitaId: 'r-maca', nome: 'Maçã' },
    ]);
    const detail = 'O relatório de IA precisa de pelo menos 20 dias com fechamento nos últimos 30 dias desta refeição; há 1.';
    dashboardApi.criarRelatorio.and.returnValue(
      throwError(() => new HttpErrorResponse({ status: 422, error: { detail } })));

    componente.fechar();

    expect(notificacao.sucesso).toHaveBeenCalledOnceWith('Refeição fechada.');
    expect(notificacao.aviso).toHaveBeenCalledOnceWith(jasmine.stringContaining(detail));
    expect(notificacao.erro).not.toHaveBeenCalled();
    expect(componente.relatorioId()).toBeNull();
    expect(componente.fechando()).toBeFalse();
    fixture.destroy();
  });

  it('fechamento gravado e relatorio com outra falha confirma o fechamento e mostra erro', () => {
    const { componente, fixture, dashboardApi, notificacao } = montar([
      { receitaId: 'r-maca', nome: 'Maçã' },
    ]);
    dashboardApi.criarRelatorio.and.returnValue(
      throwError(() => new HttpErrorResponse({ status: 500, error: {} })));

    componente.fechar();

    expect(notificacao.sucesso).toHaveBeenCalledOnceWith('Refeição fechada.');
    expect(notificacao.erro).toHaveBeenCalledOnceWith('Não foi possível concluir a operação.');
    expect(notificacao.aviso).not.toHaveBeenCalled();
    fixture.destroy();
  });

  it('o botao nao sobrou nada mantem os zeros e o fechamento habilitado', () => {
    const { componente, fixture } = montar([{ receitaId: 'r-maca', nome: 'Maçã' }]);
    componente.atualizar(0, 'restoNoPrato', '9');

    componente.naoSobrouNada();

    expect(componente.linhas()[0].restoNoPrato).toBe(0);
    expect(componente.linhas()[0].sobraNaoDistribuida).toBe(0);
    expect(componente.podeFechar()).toBeTrue();
    fixture.destroy();
  });
});
