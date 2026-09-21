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
      iniciadoEm: '2026-09-17T12:00:00Z', concluidoEm: '2026-09-17T12:01:00Z',
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
      ['buscarConsolidacao', 'buscarIndicadores', 'listarRelatorios', 'buscarRelatorio', 'criarRelatorio']);
    api.buscarConsolidacao.and.returnValue(throwError(() => ({ status: 404 })));
    api.buscarIndicadores.and.returnValue(throwError(() => ({ status: 503 })));
    api.listarRelatorios.and.returnValue(of([]));
    api.buscarRelatorio.and.returnValue(of({
      id: 'salvo', dataReferencia: '2026-09-17', turno: 'MANHA', status: 'CONCLUIDO',
      provedor: 'fake', modelo: 'regras-locais-v1', promptVersao: 'v1', indicadores: null,
      resultado: null, erro: null, tentativas: 1, criadoEm: '2026-09-17T12:00:00Z',
      iniciadoEm: null, concluidoEm: '2026-09-17T12:01:00Z',
    }));
    api.criarRelatorio.and.returnValue(of({ relatorioId: 'novo', status: 'PENDENTE',
      statusUrl: '/api/v1/relatorios-ia/novo' }));
    TestBed.configureTestingModule({ providers: [{ provide: DashboardApiService, useValue: api }] });
    const fixture = TestBed.createComponent(DashboardPageComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    component.selecionarAba('analise');
    component.atualizarFiltros('turno', 'MANHA');
    component.abrirRelatorio('salvo');
    tick();
    fixture.detectChanges();
    expect(api.buscarIndicadores).toHaveBeenCalledTimes(1);
    expect(api.criarRelatorio).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).not.toContain('Atualizar indicadores atuais');
    component.selecionarAba('indicadores');
    component.verIndicadoresAtuais();
    expect(component.relatorio()?.id).toBe('salvo');
    component.selecionarAba('analise');
    fixture.detectChanges();
    const gerar = Array.from(fixture.nativeElement.querySelectorAll('button'))
      .find(button => (button as HTMLButtonElement).textContent?.includes('Gerar análise IA')) as HTMLButtonElement;
    gerar.click();
    tick();
    expect(api.criarRelatorio).toHaveBeenCalledOnceWith({
      dataReferencia: component.dataReferencia(), turno: 'MANHA',
    });
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
      execucaoPlanejamento: null, atendimentos: null, topComidas: [], porTurma: [],
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
