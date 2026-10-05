import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import FechamentoPageComponent from './fechamento-page.component';
import { CardapioApiService } from '../../../cardapio/data-access/cardapio-api.service';
import { Cardapio } from '../../../cardapio/models/cardapio.models';
import {
  ConsolidacaoConsumo, CriarRelatorioIAResponse,
} from '../../../dashboard/models/dashboard.models';
import { DashboardApiService } from '../../../dashboard/data-access/dashboard-api.service';
import { FechamentoApiService } from '../../data-access/fechamento-api.service';

const HOJE = new Date();
const DATA = `${HOJE.getFullYear()}-${String(HOJE.getMonth() + 1).padStart(2, '0')}`
  + `-${String(HOJE.getDate()).padStart(2, '0')}`;

function cardapio(itens: { receitaId: string | null; nome: string }[]): Cardapio[] {
  return [{
    id: 'c1', data: DATA, turno: 'MANHA' as const, nomeRefeicao: 'Lanche da manhã',
    descricao: null, quantidadePlanejada: 300, ativo: true,
    itens: itens.map((i) => ({ ...i, quantidade: null })),
  }];
}

function montar(itens: { receitaId: string | null; nome: string }[], consumos = 91) {
  const cardapioApi = jasmine.createSpyObj<CardapioApiService>('CardapioApiService', ['listar']);
  const dashboardApi = jasmine.createSpyObj<DashboardApiService>('DashboardApiService',
    ['buscarConsolidacao', 'criarRelatorio']);
  const fechamentoApi = jasmine.createSpyObj<FechamentoApiService>('FechamentoApiService',
    ['registrarMedicao', 'listarMedicoes']);

  cardapioApi.listar.and.returnValue(of(cardapio(itens)));
  dashboardApi.buscarConsolidacao.and.returnValue(of({
    data: DATA, turno: 'MANHA', cardapioId: 'c1', cardapio: 'Lanche da manhã',
    quantidadePlanejada: 300, consumosAutorizados: consumos, tentativasBloqueadas: 0,
    taxaConsumoPlanejado: 30.33, sobraEstimada: 300 - consumos,
  } as ConsolidacaoConsumo));
  dashboardApi.criarRelatorio.and.returnValue(
    of({ relatorioId: 'r1', status: 'PENDENTE', statusUrl: '/r1' } as CriarRelatorioIAResponse));
  fechamentoApi.registrarMedicao.and.returnValue(of({}));
  fechamentoApi.listarMedicoes.and.returnValue(of([]));

  TestBed.configureTestingModule({
    providers: [
      { provide: CardapioApiService, useValue: cardapioApi },
      { provide: DashboardApiService, useValue: dashboardApi },
      { provide: FechamentoApiService, useValue: fechamentoApi },
    ],
  });
  const fixture = TestBed.createComponent(FechamentoPageComponent);
  fixture.detectChanges();
  return { fixture, componente: fixture.componentInstance, dashboardApi, fechamentoApi };
}

describe('FechamentoPageComponent', () => {
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
    const { componente, fixture, fechamentoApi, dashboardApi } = montar([
      { receitaId: 'r-maca', nome: 'Maçã' },
      { receitaId: 'r-cuscuz', nome: 'Cuscuz' },
    ]);

    componente.fechar();

    expect(fechamentoApi.registrarMedicao).toHaveBeenCalledTimes(2);
    // O servido enviado e o derivado, nao a contagem do QR.
    expect(fechamentoApi.registrarMedicao.calls.first().args[0].porcoesServidas).toBe(91);
    expect(dashboardApi.criarRelatorio).toHaveBeenCalledTimes(1);
    expect(componente.relatorioId()).toBe('r1');
    fixture.destroy();
  });

  it('nao gera relatorio quando uma medicao falha', () => {
    const { componente, fixture, fechamentoApi, dashboardApi } = montar([
      { receitaId: 'r-maca', nome: 'Maçã' },
    ]);
    fechamentoApi.registrarMedicao.and.returnValue(
      throwError(() => ({ error: { detail: 'Resto no prato (99) não pode superar o servido (91)' } })));

    componente.fechar();

    expect(dashboardApi.criarRelatorio).not.toHaveBeenCalled();
    expect(componente.erro()).toContain('não pode superar');
    expect(componente.relatorioId()).toBeNull();
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
