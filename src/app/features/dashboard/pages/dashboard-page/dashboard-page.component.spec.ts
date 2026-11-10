import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Subject, of, throwError } from 'rxjs';
import { DashboardPageComponent } from './dashboard-page.component';
import { DashboardApiService } from '../../data-access/dashboard-api.service';
import { TipoRefeicao } from '../../../../shared/refeicao/tipo-refeicao.models';
import { TipoRefeicaoApiService } from '../../../../shared/refeicao/tipo-refeicao-api.service';
import { ConsolidacaoConsumo } from '../../models/dashboard.models';
import { IndicadoresLogisticos } from '../../models/indicadores.models';
import { FechamentoPainelApiService } from '../../../fechamento/data-access/fechamento-painel-api.service';
import { FechamentoPendente } from '../../../fechamento/models/painel.models';

const CAFE: TipoRefeicao = {
  id: 'id-cafe', nome: 'Café da manhã', ordem: 1, inicio: '07:00:00', fim: '08:00:00', turnos: ['INTEGRAL'],
};
const ALMOCO: TipoRefeicao = {
  id: 'id-almoco', nome: 'Almoço', ordem: 3, inicio: '11:30:00', fim: '13:00:00', turnos: ['INTEGRAL'],
};

function providerTipos(tipos: TipoRefeicao[] = [ALMOCO, CAFE]) {
  const api = jasmine.createSpyObj<TipoRefeicaoApiService>('TipoRefeicaoApiService', ['listar']);
  api.listar.and.returnValue(of(tipos));
  return { provide: TipoRefeicaoApiService, useValue: api };
}

function providerPendencias(pendencias: FechamentoPendente[] = []) {
  const api = jasmine.createSpyObj<FechamentoPainelApiService>('FechamentoPainelApiService', ['pendencias']);
  api.pendencias.and.returnValue(of(pendencias));
  return { api, provider: { provide: FechamentoPainelApiService, useValue: api } };
}

function botaoGerar(fixture: ComponentFixture<DashboardPageComponent>): HTMLButtonElement {
  return Array.from(fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>)
    .find(button => button.textContent?.includes('Gerar análise'))!;
}

function indicadoresVazios(): IndicadoresLogisticos {
  return {
    schemaVersion: '6', calculoVersao: 'indicadores-v1', status: 'DISPONIVEL',
    dataReferencia: '2026-11-09', inicioHistorico: '2026-10-11',
    execucaoPlanejamento: null, atendimentos: null, topComidas: [], aceitacaoItens: [],
    aceitacaoItensSemana: [], porTurma: [], ingredientes: null, rotacaoCardapio: null, avisos: [],
  };
}

describe('DashboardPageComponent', () => {
  it('permite ler um relatório salvo mesmo sem cardápio ativo no filtro', () => {
    const api = jasmine.createSpyObj<DashboardApiService>('DashboardApiService',
      ['buscarConsolidacao', 'buscarIndicadores', 'listarRelatorios']);
    api.buscarConsolidacao.and.returnValue(throwError(() => ({ status: 404 })));
    api.buscarIndicadores.and.returnValue(throwError(() => ({ status: 404 })));
    api.listarRelatorios.and.returnValue(of([]));
    TestBed.configureTestingModule({ providers: [{ provide: DashboardApiService, useValue: api }, providerTipos(), providerPendencias().provider] });
    const fixture = TestBed.createComponent(DashboardPageComponent);
    fixture.componentInstance.selecionarAba('analise');
    fixture.componentInstance.relatorio.set({
      id: 'relatorio-antigo', dataReferencia: '2026-09-17', turno: 'MANHA', tipoRefeicaoId: 'id-almoco', refeicao: 'Almoço', status: 'CONCLUIDO',
      provedor: 'fake', modelo: 'regras-locais-v1', promptVersao: 'v1', indicadores: null,
      resultado: { resumoExecutivo: 'Resumo histórico preservado', nivelAceitacao: 'BAIXA',
        riscoDesperdicio: 'ALTO', evidencias: [], recomendacoes: [], observacaoLimitacoes: 'Histórico' },
      erro: null, tentativas: 1, criadoEm: '2026-09-17T12:00:00Z',
      iniciadoEm: '2026-09-17T12:00:00Z', concluidoEm: '2026-09-17T12:01:00Z', turmaId: null,
    });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Resumo histórico preservado');
    expect(fixture.nativeElement.textContent).not.toContain('Indicadores atuais ·');
    fixture.destroy();
  });

  it('consulta pela primeira refeição da grade ao abrir', () => {
    const api = jasmine.createSpyObj<DashboardApiService>('DashboardApiService',
      ['buscarConsolidacao', 'buscarIndicadores']);
    api.buscarConsolidacao.and.returnValue(throwError(() => ({ status: 404 })));
    api.buscarIndicadores.and.returnValue(throwError(() => ({ status: 404 })));
    TestBed.configureTestingModule({ providers: [{ provide: DashboardApiService, useValue: api }, providerTipos(), providerPendencias().provider] });
    const fixture = TestBed.createComponent(DashboardPageComponent);
    fixture.detectChanges();

    expect(fixture.componentInstance.tipoRefeicaoId()).toBe('id-cafe');
    expect(api.buscarConsolidacao).toHaveBeenCalledOnceWith(fixture.componentInstance.dataReferencia(), 'id-cafe');
    expect(api.buscarIndicadores).toHaveBeenCalledOnceWith(fixture.componentInstance.dataReferencia(), 'id-cafe');
    fixture.destroy();
  });

  it('avisa quando a grade de refeições não carrega', () => {
    const api = jasmine.createSpyObj<DashboardApiService>('DashboardApiService',
      ['buscarConsolidacao', 'buscarIndicadores']);
    const tipos = jasmine.createSpyObj<TipoRefeicaoApiService>('TipoRefeicaoApiService', ['listar']);
    tipos.listar.and.returnValue(throwError(() => ({ status: 500 })));
    TestBed.configureTestingModule({ providers: [
      { provide: DashboardApiService, useValue: api }, { provide: TipoRefeicaoApiService, useValue: tipos },
      providerPendencias().provider] });
    const fixture = TestBed.createComponent(DashboardPageComponent);
    fixture.detectChanges();

    expect(fixture.componentInstance.erroConsolidacao()).toBe('Não foi possível carregar as refeições.');
    expect(api.buscarConsolidacao).not.toHaveBeenCalled();
    fixture.destroy();
  });

  it('navega e atualiza indicadores sem consultar ou gerar relatórios', () => {
    const api = jasmine.createSpyObj<DashboardApiService>('DashboardApiService',
      ['buscarConsolidacao', 'buscarIndicadores', 'listarRelatorios', 'criarRelatorio']);
    api.buscarConsolidacao.and.returnValue(throwError(() => ({ status: 404 })));
    api.buscarIndicadores.and.returnValue(throwError(() => ({ status: 503 })));
    TestBed.configureTestingModule({ providers: [{ provide: DashboardApiService, useValue: api }, providerTipos(), providerPendencias().provider] });
    const fixture = TestBed.createComponent(DashboardPageComponent);
    fixture.detectChanges();
    fixture.componentInstance.atualizarFiltros('refeicao', 'id-cafe');
    fixture.componentInstance.verIndicadoresAtuais();
    expect(api.buscarIndicadores).toHaveBeenCalledTimes(3);
    expect(api.listarRelatorios).not.toHaveBeenCalled();
    expect(api.criarRelatorio).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).not.toContain('Gerar análise');
    fixture.destroy();
  });

  it('abre histórico sem recalcular indicadores e só gera análise por ação explícita', fakeAsync(() => {
    const api = jasmine.createSpyObj<DashboardApiService>('DashboardApiService',
      ['buscarConsolidacao', 'buscarIndicadores', 'listarRelatorios', 'buscarRelatorio', 'criarRelatorio']);
    api.buscarConsolidacao.and.returnValue(throwError(() => ({ status: 404 })));
    api.buscarIndicadores.and.returnValue(of({
      schemaVersion: '2', calculoVersao: 'indicadores-v1', status: 'DISPONIVEL',
      dataReferencia: '2026-09-17', inicioHistorico: '2026-08-19', turno: 'MANHA',
      execucaoPlanejamento: null, atendimentos: null, topComidas: [],
      aceitacaoItens: [{ receitaId: 'r1', item: 'Arroz', porcoesPreparadas: 100, porcoesServidas: 90,
        porcoesConsumidas: 80, restoNoPrato: 10, percentual: 88.9, fechamentos: 20 }],
      aceitacaoItensSemana: [], quantidadeFechamentosDoMes: 20, porTurma: [],
      ingredientes: null, rotacaoCardapio: null, avisos: [],
    }));
    api.listarRelatorios.and.returnValue(of([]));
    api.buscarRelatorio.and.returnValue(of({
      id: 'salvo', dataReferencia: '2026-09-17', turno: null, tipoRefeicaoId: 'id-almoco', refeicao: 'Almoço', status: 'CONCLUIDO',
      provedor: 'fake', modelo: 'regras-locais-v1', promptVersao: 'v1', indicadores: null,
      resultado: null, erro: null, tentativas: 1, criadoEm: '2026-09-17T12:00:00Z',
      iniciadoEm: null, concluidoEm: '2026-09-17T12:01:00Z', turmaId: null,
    }));
    api.criarRelatorio.and.returnValue(of({ relatorioId: 'novo', status: 'PENDENTE',
      statusUrl: '/api/v1/relatorios-ia/novo' }));
    TestBed.configureTestingModule({ providers: [{ provide: DashboardApiService, useValue: api }, providerTipos(), providerPendencias().provider] });
    const fixture = TestBed.createComponent(DashboardPageComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    component.selecionarAba('analise');
    component.atualizarFiltros('refeicao', 'id-cafe');
    const consultasAntesDeAbrir = api.buscarIndicadores.calls.count();
    component.abrirRelatorio('salvo');
    tick();
    fixture.detectChanges();
    expect(api.buscarRelatorio).toHaveBeenCalledOnceWith('salvo');
    expect(api.buscarIndicadores.calls.count()).toBe(consultasAntesDeAbrir);
    expect(api.criarRelatorio).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).not.toContain('Atualizar indicadores atuais');
    component.selecionarAba('indicadores');
    component.verIndicadoresAtuais();
    expect(component.relatorio()?.id).toBe('salvo');
    component.selecionarAba('analise');
    fixture.detectChanges();
    expect(api.criarRelatorio).not.toHaveBeenCalled();
    botaoGerar(fixture).click();
    tick();
    expect(api.criarRelatorio).toHaveBeenCalledOnceWith({
      dataReferencia: component.dataReferencia(), tipoRefeicaoId: 'id-cafe',
    });
    fixture.destroy();
  }));

  describe('gerar análise', () => {
    const LANCHE: TipoRefeicao = {
      id: 'id-lanche', nome: 'Lanche da manhã', ordem: 2, inicio: '09:30:00', fim: '10:00:00', turnos: ['INTEGRAL'],
    };

    function montar(fechamentos: number, datas?: string[]) {
      const api = jasmine.createSpyObj<DashboardApiService>('DashboardApiService',
        ['buscarConsolidacao', 'buscarIndicadores', 'listarRelatorios', 'criarRelatorio']);
      api.buscarConsolidacao.and.returnValue(throwError(() => ({ status: 404 })));
      api.buscarIndicadores.and.returnValue(of({ ...indicadoresVazios(), quantidadeFechamentosDoMes: fechamentos, datasFechamentosDoMes: datas }));
      api.listarRelatorios.and.returnValue(of([
        { id: 'a', status: 'CONCLUIDO', criadoEm: new Date(2026, 10, 9, 12, 0).toISOString(), provedor: 'groq', modelo: 'x' },
        { id: 'b', status: 'PROCESSANDO', criadoEm: new Date(2026, 10, 8, 8, 5).toISOString(), provedor: null, modelo: null },
        { id: 'c', status: 'PENDENTE', criadoEm: new Date(2026, 10, 7, 8, 5).toISOString(), provedor: null, modelo: null },
        { id: 'd', status: 'FALHOU', criadoEm: new Date(2026, 10, 6, 8, 5).toISOString(), provedor: 'gemini', modelo: 'y' },
      ]));
      TestBed.configureTestingModule({ providers: [{ provide: DashboardApiService, useValue: api },
        providerTipos([LANCHE]), providerPendencias().provider] });
      const fixture = TestBed.createComponent(DashboardPageComponent);
      fixture.detectChanges();
      fixture.componentInstance.atualizarFiltros('data', '2026-11-09');
      fixture.componentInstance.selecionarAba('analise');
      fixture.detectChanges();
      return { api, fixture };
    }

    it('mostra a janela e a amostra, sem passo de cardápio, e libera com 21 dias', () => {
      const { fixture } = montar(21);
      const texto = (fixture.nativeElement.textContent as string).replace(/\s+/g, ' ');
      expect(texto).toContain('A análise usa os fechamentos de Lanche da manhã nos 30 dias até 09/11/2026. '
        + 'São necessários pelo menos 20 dias com fechamento; há 21.');
      expect(texto).not.toContain('Escolha o cardápio');
      expect(botaoGerar(fixture).disabled).toBeFalse();
      fixture.destroy();
    });

    it('mostra as datas com fechamento em dd/mm/aaaa', () => {
      const { fixture } = montar(21, ['2026-11-07', '2026-11-09']);
      const texto = (fixture.nativeElement.textContent as string).replace(/\s+/g, ' ');
      expect(texto).toContain('07/11/2026, 09/11/2026.');
      expect(texto).not.toContain('2026-11-07');
      fixture.destroy();
    });

    it('bloqueia com 19 dias', () => {
      const { fixture } = montar(19);
      expect(botaoGerar(fixture).disabled).toBeTrue();
      fixture.destroy();
    });

    it('lista os relatórios salvos com data local e status traduzido, sem provedor', () => {
      const { fixture } = montar(21);
      const opcoes = Array.from(fixture.nativeElement.querySelectorAll('option') as NodeListOf<HTMLOptionElement>)
        .map(o => o.textContent!.trim());
      expect(opcoes).toContain('09/11/2026 12:00 · Concluído');
      expect(opcoes).toContain('08/11/2026 08:05 · Processando');
      expect(opcoes).toContain('07/11/2026 08:05 · Pendente');
      expect(opcoes).toContain('06/11/2026 08:05 · Falhou');
      expect(opcoes.join(' ')).not.toMatch(/groq|gemini/);
      fixture.destroy();
    });
  });

  it('ignora a resposta de um filtro anterior após a troca de refeição', () => {
    const anterior = new Subject<ConsolidacaoConsumo>();
    const atual = new Subject<ConsolidacaoConsumo>();
    const api = jasmine.createSpyObj<DashboardApiService>('DashboardApiService',
      ['buscarConsolidacao', 'buscarIndicadores', 'listarRelatorios']);
    api.buscarConsolidacao.and.returnValues(anterior, atual);
    api.buscarIndicadores.and.returnValue(of({
      schemaVersion: '2', calculoVersao: 'indicadores-v1', status: 'INDISPONIVEL',
      dataReferencia: '2026-09-17', inicioHistorico: '2026-08-19', turno: 'MANHA',
      execucaoPlanejamento: null, atendimentos: null, topComidas: [], aceitacaoItens: [],
      aceitacaoItensSemana: [], porTurma: [],
      ingredientes: null, rotacaoCardapio: null, avisos: [],
    }));
    api.listarRelatorios.and.returnValue(of([]));
    TestBed.configureTestingModule({ providers: [{ provide: DashboardApiService, useValue: api }, providerTipos(), providerPendencias().provider] });
    const fixture = TestBed.createComponent(DashboardPageComponent);
    const component = fixture.componentInstance;
    component.ngOnInit();
    component.atualizarFiltros('refeicao', 'id-cafe');
    const dados: ConsolidacaoConsumo = {
      data: '2026-09-17', tipoRefeicaoId: 'id-almoco', refeicao: 'Almoço', cardapioId: '1', cardapio: 'Atual',
      quantidadePlanejada: 100, consumosAutorizados: 80, tentativasBloqueadas: 0,
      taxaConsumoPlanejado: 80, sobraEstimada: 20,
    };
    atual.next(dados);
    anterior.next({ ...dados, tipoRefeicaoId: 'id-cafe', cardapio: 'Antigo' });
    expect(component.consolidacao()?.cardapio).toBe('Atual');
    fixture.destroy();
  });

  describe('pendências de fechamento', () => {
    const PENDENCIA: FechamentoPendente = {
      data: '2026-03-09', tipoRefeicaoId: 'id-cafe', refeicao: 'Café da manhã', itensCardapio: 3, itensMedidos: 0,
    };

    function montar(pendenciasApi: ReturnType<typeof providerPendencias>) {
      const api = jasmine.createSpyObj<DashboardApiService>('DashboardApiService',
        ['buscarConsolidacao', 'buscarIndicadores']);
      api.buscarConsolidacao.and.returnValue(throwError(() => ({ status: 404 })));
      api.buscarIndicadores.and.returnValue(throwError(() => ({ status: 404 })));
      TestBed.configureTestingModule({ providers: [
        provideRouter([]), { provide: DashboardApiService, useValue: api }, providerTipos(), pendenciasApi.provider] });
      return TestBed.createComponent(DashboardPageComponent);
    }

    it('consulta as pendências dos últimos 7 dias ao carregar e ao trocar a data', () => {
      const pendencias = providerPendencias([PENDENCIA]);
      const fixture = montar(pendencias);
      fixture.detectChanges();
      expect(pendencias.api.pendencias).toHaveBeenCalledOnceWith(fixture.componentInstance.dataReferencia(), 7);
      expect(fixture.nativeElement.textContent).toContain('1 refeição sem fechamento nos últimos 7 dias');

      fixture.componentInstance.atualizarFiltros('data', '2026-03-12');
      expect(pendencias.api.pendencias).toHaveBeenCalledWith('2026-03-12', 7);
      fixture.destroy();
    });

    it('não mostra o aviso na aba Análise IA', () => {
      const fixture = montar(providerPendencias([PENDENCIA]));
      fixture.detectChanges();
      fixture.componentInstance.aba.set('analise');
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).not.toContain('sem fechamento nos últimos 7 dias');
      fixture.destroy();
    });

    it('esconde o aviso, sem notificar erro, quando a consulta falha', () => {
      const pendencias = providerPendencias();
      pendencias.api.pendencias.and.returnValue(throwError(() => ({ status: 500 })));
      const fixture = montar(pendencias);
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).not.toContain('sem fechamento nos últimos 7 dias');
      expect(fixture.componentInstance.pendencias()).toEqual([]);
      expect(fixture.componentInstance.erroConsolidacao()).toBe(
        'Cardápio ou relatório não encontrado para os filtros selecionados.');
      fixture.destroy();
    });
  });
});
