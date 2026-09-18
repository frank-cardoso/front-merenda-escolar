import { TestBed } from '@angular/core/testing';
import { IndicadoresLogisticosComponent } from './indicadores-logisticos.component';

describe('IndicadoresLogisticosComponent', () => {
  it('distingue indicador indisponível de zero consumo', () => {
    const fixture = TestBed.createComponent(IndicadoresLogisticosComponent);
    fixture.componentRef.setInput('dados', {
      status: 'INDISPONIVEL', avisos: ['Serviço temporariamente indisponível'],
      execucaoPlanejamento: null, atendimentos: null, topComidas: [], porTurma: [],
    });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Indicadores indisponíveis');
    expect(fixture.nativeElement.textContent).not.toContain('0%');
  });

  it('exibe execução acima de 100 sem estourar a barra nem inferir adesão da turma', () => {
    const fixture = TestBed.createComponent(IndicadoresLogisticosComponent);
    fixture.componentRef.setInput('dados', {
      status: 'DISPONIVEL', dataReferencia: '2026-09-17', inicioHistorico: '2026-08-19',
      execucaoPlanejamento: { percentual: 160, metaPercentual: 80, statusMeta: 'ATINGIDA',
        diferencaMetaPp: 80, consumosRegistrados: 80, refeicoesPlanejadas: 50 },
      atendimentos: { alunosUnicos: 70, repeticoes: 10 }, topComidas: [],
      porTurma: [{ turma: 'A', alunosUnicos: 70, consumosRegistrados: 80, repeticoes: 10,
        percentual: null, statusMeta: 'NAO_AVALIAVEL', motivo: 'Sem presença' }],
      avisos: [], ingredientes: null, rotacaoCardapio: null,
    });
    fixture.detectChanges();
    const element: HTMLElement = fixture.nativeElement;
    expect(element.textContent).toContain('160%');
    expect(element.textContent).toContain('Sem presença');
    expect(element.querySelector<HTMLElement>('[data-testid="barra-meta"]')?.style.width).toBe('100%');
  });
});
