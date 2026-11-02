import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { Subject, of, throwError } from 'rxjs';
import { DashboardPageComponent } from './dashboard-page.component';
import { DashboardApiService } from '../../data-access/dashboard-api.service';
import { ConsolidacaoConsumo } from '../../models/dashboard.models';

describe('DashboardPageComponent', () => {
  it('permite ler um relatório salvo mesmo sem cardápio ativo no filtro', () => {
    const api = jasmine.createSpyObj<DashboardApiService>('DashboardApiService',
      ['buscarConsolidacao', 'buscarIndicadores', 'listarRelatorios']);
    api.buscarConsolidacao.and.returnValue(throwError(() => ({ status: 404 })));
    api.buscarIndicadores.and.returnValue(throwError(() => ({ status: 404 })));
    api.listarRelatorios.and.returnValue(of([]));
    TestBed.configureTestingModule({ providers: [{ provide: DashboardApiService, useValue: api }] });
    const fixture = TestBed.createComponent(DashboardPageComponent);
    fixture.componentInstance.selecionarAba('analise');
    fixture.componentInstance.relatorio.set({
      id: 'relatorio-antigo', dataReferencia: '2026-09-17', turno: 'MANHA', status: 'CONCLUIDO',
      provedor: 'fake', modelo: 'regras-locais-v1', promptVersao: 'v1', indicadores: null,
      resultado: { resumoExecutivo: 'Resumo histórico preservado', nivelAceitacao: 'BAIXA',
        riscoDesperdicio: 'ALTO', evidencias: [], recomendacoes: [], observacaoLimitacoes: 'Histórico' },
      erro: null, tentativas: 1, criadoEm: '2026-09-17T12:00:00Z',
      iniciadoEm: '2026-09-17T12:00:00Z', concluidoEm: '2026-09-17T12:01:00Z', turmaId: null, escopoCardapio: null,
    });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Resumo histórico preservado');
    expect(fixture.nativeElement.textContent).not.toContain('Indicadores atuais ·');
    fixture.destroy();
  });

  it('navega e atualiza indicadores sem consultar ou gerar relatórios', () => {
    const api = jasmine.createSpyObj<DashboardApiService>('DashboardApiService',
      ['buscarConsolidacao', 'buscarIndicadores', 'listarRelatorios', 'criarRelatorio']);
    api.buscarConsolidacao.and.returnValue(throwError(() => ({ status: 404 })));
    api.buscarIndicadores.and.returnValue(throwError(() => ({ status: 503 })));
    TestBed.configureTestingModule({ providers: [{ provide: DashboardApiService, useValue: api }] });
    const fixture = TestBed.createComponent(DashboardPageComponent);
    fixture.detectChanges();
    fixture.componentInstance.atualizarFiltros('turno', 'MANHA');
    fixture.componentInstance.verIndicadoresAtuais();
    expect(api.buscarIndicadores).toHaveBeenCalledTimes(3);
    expect(api.listarRelatorios).not.toHaveBeenCalled();
    expect(api.criarRelatorio).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).not.toContain('Gerar análise IA');
    fixture.destroy();
  });

  it('abre histórico sem recalcular indicadores e só gera análise por ação explícita', fakeAsync(() => {
    const api = jasmine.createSpyObj<DashboardApiService>('DashboardApiService',
      ['buscarConsolidacao', 'buscarIndicadores', 'listarRelatorios', 'buscarRelatorio', 'criarRelatorio',
        'buscarCardapiosAnalise']);
    const datasComFechamento = Array.from({ length: 20 }, (_, i) => `2026-09-${String(i + 1).padStart(2, '0')}`);
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
    api.buscarCardapiosAnalise.and.returnValue(of([{
      chave: 'c1', nome: 'Almoço', itens: ['Arroz'], receitaIds: ['r1'], datasServido: datasComFechamento,
      datasComFechamento, ocorrencias: 20, analisavel: true, motivo: null,
    }]));
    api.listarRelatorios.and.returnValue(of([]));
    api.buscarRelatorio.and.returnValue(of({
      id: 'salvo', dataReferencia: '2026-09-17', turno: 'MANHA', status: 'CONCLUIDO',
      provedor: 'fake', modelo: 'regras-locais-v1', promptVersao: 'v1', indicadores: null,
      resultado: null, erro: null, tentativas: 1, criadoEm: '2026-09-17T12:00:00Z',
      iniciadoEm: null, concluidoEm: '2026-09-17T12:01:00Z', turmaId: null, escopoCardapio: null,
    }));
    api.criarRelatorio.and.returnValue(of({ relatorioId: 'novo', status: 'PENDENTE',
      statusUrl: '/api/v1/relatorios-ia/novo' }));
    TestBed.configureTestingModule({ providers: [{ provide: DashboardApiService, useValue: api }] });
    const fixture = TestBed.createComponent(DashboardPageComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    component.selecionarAba('analise');
    component.atualizarFiltros('turno', 'MANHA');
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
    component.selecionarCardapio('c1');
    fixture.detectChanges();
    expect(api.criarRelatorio).not.toHaveBeenCalled();
    const gerar = Array.from(fixture.nativeElement.querySelectorAll('button'))
      .find(button => (button as HTMLButtonElement).textContent?.includes('Gerar análise IA')) as HTMLButtonElement;
    gerar.click();
    tick();
    expect(api.criarRelatorio).toHaveBeenCalledOnceWith({
      dataReferencia: component.dataReferencia(), turno: 'MANHA',
      receitaIds: ['r1'], datasSelecionadas: datasComFechamento,
    });
    fixture.destroy();
  }));

  it('desmarcar um item do cardápio só tira o check, não remove o item da lista', fakeAsync(() => {
    const api = jasmine.createSpyObj<DashboardApiService>('DashboardApiService',
      ['buscarConsolidacao', 'buscarIndicadores', 'listarRelatorios', 'buscarCardapiosAnalise']);
    const datas = Array.from({ length: 21 }, (_, i) => `2026-09-${String(i + 1).padStart(2, '0')}`);
    api.buscarConsolidacao.and.returnValue(throwError(() => ({ status: 404 })));
    const indicadores = (receitaIds: string[]) => ({
      schemaVersion: '2', calculoVersao: 'indicadores-v1', status: 'DISPONIVEL' as const,
      dataReferencia: '2026-09-21', inicioHistorico: '2026-08-19', turno: 'MANHA',
      execucaoPlanejamento: null, atendimentos: null, topComidas: [],
      aceitacaoItens: [{ receitaId: 'r1', item: 'Leite com achocolatado', porcoesPreparadas: 100,
        porcoesServidas: 90, porcoesConsumidas: 80, restoNoPrato: 10, percentual: 88.9, fechamentos: 21 },
        { receitaId: 'r2', item: 'Arroz branco', porcoesPreparadas: 100, porcoesServidas: 90,
          porcoesConsumidas: 80, restoNoPrato: 10, percentual: 87.1, fechamentos: 21 }]
        .filter(item => receitaIds.includes(item.receitaId)),
      aceitacaoItensSemana: [], quantidadeFechamentosDoMes: 21, porTurma: [],
      ingredientes: null, rotacaoCardapio: null, avisos: [],
    });
    api.buscarIndicadores.and.callFake((_d, _t, receitaIds: string[] = []) =>
      of(indicadores(receitaIds.length ? receitaIds : ['r1', 'r2'])));
    api.buscarCardapiosAnalise.and.returnValue(of([{
      chave: 'c1', nome: 'Almoço', itens: ['Leite com achocolatado', 'Arroz branco'],
      receitaIds: ['r1', 'r2'], datasServido: datas, datasComFechamento: datas,
      ocorrencias: 21, analisavel: true, motivo: null,
    }]));
    api.listarRelatorios.and.returnValue(of([]));
    TestBed.configureTestingModule({ providers: [{ provide: DashboardApiService, useValue: api }] });
    const fixture = TestBed.createComponent(DashboardPageComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    component.selecionarAba('analise');
    component.selecionarCardapio('c1');
    tick();
    expect(component.itensParaAnalise().map(i => i.receitaId)).toEqual(['r1', 'r2']);

    component.alternarItem('r2');
    tick();

    expect(component.itensParaAnalise().map(i => i.receitaId)).toEqual(['r1', 'r2']);
    expect(component.itemSelecionado('r1')).toBeTrue();
    expect(component.itemSelecionado('r2')).toBeFalse();
    fixture.destroy();
  }));

  it('ignora a resposta de um filtro anterior após a troca de turno', () => {
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
    TestBed.configureTestingModule({ providers: [{ provide: DashboardApiService, useValue: api }] });
    const fixture = TestBed.createComponent(DashboardPageComponent);
    const component = fixture.componentInstance;
    component.ngOnInit();
    component.atualizarFiltros('turno', 'MANHA');
    const dados: ConsolidacaoConsumo = {
      data: '2026-09-17', turno: 'MANHA', cardapioId: '1', cardapio: 'Atual',
      quantidadePlanejada: 100, consumosAutorizados: 80, tentativasBloqueadas: 0,
      taxaConsumoPlanejado: 80, sobraEstimada: 20,
    };
    atual.next(dados);
    anterior.next({ ...dados, turno: 'NOITE', cardapio: 'Antigo' });
    expect(component.consolidacao()?.cardapio).toBe('Atual');
    fixture.destroy();
  });
});
