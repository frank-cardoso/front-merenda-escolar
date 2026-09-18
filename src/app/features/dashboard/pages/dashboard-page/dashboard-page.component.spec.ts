import { TestBed } from '@angular/core/testing';
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
    expect(fixture.componentInstance.indicadoresExibidos()).toBeNull();
    fixture.destroy();
  });

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
