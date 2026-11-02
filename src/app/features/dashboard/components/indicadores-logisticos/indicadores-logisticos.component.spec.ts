import { TestBed } from '@angular/core/testing';
import { IndicadoresLogisticosComponent } from './indicadores-logisticos.component';

describe('IndicadoresLogisticosComponent', () => {
  it('distingue indicador indisponível de zero consumo', () => {
    const fixture = TestBed.createComponent(IndicadoresLogisticosComponent);
    fixture.componentRef.setInput('dados', {
      status: 'INDISPONIVEL', avisos: ['Serviço temporariamente indisponível'],
      execucaoPlanejamento: null, atendimentos: null, topComidas: [], aceitacaoItens: [],
      aceitacaoItensSemana: [], porTurma: [],
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
      atendimentos: { alunosUnicos: 70, repeticoes: 10 }, topComidas: [], aceitacaoItens: [],
      aceitacaoItensSemana: [],
      porTurma: [{ turma: 'A', alunosUnicos: 70, consumosRegistrados: 80, repeticoes: 10,
        percentual: null, statusMeta: 'NAO_AVALIAVEL', motivo: 'Sem presença' }],
      avisos: [], ingredientes: null, rotacaoCardapio: null,
    });
    fixture.detectChanges();
    const element: HTMLElement = fixture.nativeElement;
    expect(element.textContent).toContain('160%');
    const linhaA = element.querySelector<HTMLElement>('[data-testid="linha-turma-A"]')!;
    expect(linhaA.textContent).not.toContain('%');
    expect(element.querySelector<HTMLElement>('[data-testid="barra-meta"]')?.style.width).toBe('100%');
  });

  it('lista os ingredientes acima da base quando o calculo encontra algum', () => {
    const fixture = TestBed.createComponent(IndicadoresLogisticosComponent);
    fixture.componentRef.setInput('dados', {
      status: 'DISPONIVEL', dataReferencia: '2026-09-17', inicioHistorico: '2026-08-19',
      execucaoPlanejamento: null, atendimentos: null, topComidas: [], aceitacaoItens: [],
      aceitacaoItensSemana: [], porTurma: [], avisos: [], rotacaoCardapio: null,
      ingredientes: {
        status: 'DISPONIVEL', basePercentualResto: 12.5,
        acimaDaBase: [{ ingredienteId: 'i1', ingrediente: 'Chuchu', amostra: 40,
          percentualRestoCom: 28, percentualRestoSem: 10, diferencaPp: 18 }],
        motivo: 'Resto dos pratos com o ingrediente contra os pratos sem ele; associação observada, não causa comprovada.',
      },
    });
    fixture.detectChanges();
    const element: HTMLElement = fixture.nativeElement;
    const lista = element.querySelector('[data-testid="lista-ingredientes-acima-base"]')!;
    expect(lista.textContent).toContain('Chuchu');
    expect(lista.textContent).toContain('28%');
    expect(lista.textContent).toContain('+18 p.p.');
  });

  it('mostra o motivo quando nenhum ingrediente fica acima da base', () => {
    const fixture = TestBed.createComponent(IndicadoresLogisticosComponent);
    fixture.componentRef.setInput('dados', {
      status: 'DISPONIVEL', dataReferencia: '2026-09-17', inicioHistorico: '2026-08-19',
      execucaoPlanejamento: null, atendimentos: null, topComidas: [], aceitacaoItens: [],
      aceitacaoItensSemana: [], porTurma: [], avisos: [], rotacaoCardapio: null,
      ingredientes: { status: 'DISPONIVEL', basePercentualResto: 12.5, acimaDaBase: [],
        motivo: 'Nenhum ingrediente ficou acima dos pratos sem ele com amostra mínima de 30 medições.' },
    });
    fixture.detectChanges();
    const element: HTMLElement = fixture.nativeElement;
    expect(element.querySelector('[data-testid="lista-ingredientes-acima-base"]')).toBeNull();
    expect(element.textContent).toContain('Nenhum ingrediente ficou acima');
  });

  const base = {
    status: 'DISPONIVEL', dataReferencia: '2026-09-17', inicioHistorico: '2026-08-19',
    execucaoPlanejamento: null, atendimentos: null, topComidas: [], aceitacaoItens: [],
    aceitacaoItensSemana: [], avisos: [], ingredientes: null, rotacaoCardapio: null,
  };
  const linha = (turma: string, extra: object = {}) => ({
    turma, alunosUnicos: 3, consumosRegistrados: 4, repeticoes: 1,
    percentual: null, statusMeta: 'NAO_AVALIAVEL', motivo: 'Sem presença', ...extra,
  });

  it('filtra a tabela e a metrica da fila pela turma recebida via input', () => {
    const fixture = TestBed.createComponent(IndicadoresLogisticosComponent);
    fixture.componentRef.setInput('dados', {
      ...base, schemaVersion: '4', atendimentos: { alunosUnicos: 19, repeticoes: 4 },
      porTurma: [linha('5A', { turmaId: 'uuid-5a', alunosUnicos: 10, repeticoes: 1 }),
        linha('5B', { turmaId: 'uuid-5b', alunosUnicos: 9, repeticoes: 3 })],
    });
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelectorAll('[data-testid^="linha-turma-"]').length).toBe(2);

    fixture.componentRef.setInput('turmaSelecionada', 'uuid-5a');
    fixture.detectChanges();

    const linhas = el.querySelectorAll('[data-testid^="linha-turma-"]');
    expect(linhas.length).toBe(1);
    expect(linhas[0].textContent).toContain('5A');
    expect(el.textContent).toContain('Turma 5A');
    expect(el.querySelector('[aria-label="Métricas da fila"]')?.textContent).toContain('10');
  });

  it('renderiza relatório antigo sem turmaId sem quebrar', () => {
    const fixture = TestBed.createComponent(IndicadoresLogisticosComponent);
    fixture.componentRef.setInput('dados', {
      ...base, schemaVersion: '3', porTurma: [linha('5A'), linha('5B')],
    });
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('[data-testid="linha-turma-5A"]')?.textContent).toContain('5A');
    expect(el.querySelector('[data-testid="linha-turma-5B"]')?.textContent).toContain('5B');
    expect(el.querySelectorAll('[data-testid^="linha-turma-"]').length).toBe(2);
  });

  it('mostra a linha "Sem turma" com o mesmo destaque das demais', () => {
    const fixture = TestBed.createComponent(IndicadoresLogisticosComponent);
    fixture.componentRef.setInput('dados', {
      ...base, schemaVersion: '4',
      porTurma: [linha('5A', { turmaId: 'uuid-5a' }), linha('Sem turma', { turmaId: null })],
    });
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    const normal = el.querySelector<HTMLElement>('[data-testid="linha-turma-uuid-5a"]');
    const sem = el.querySelector<HTMLElement>('[data-testid="linha-turma-Sem turma"]');
    expect(normal).not.toBeNull();
    expect(sem).not.toBeNull();
    expect(sem!.textContent).toContain('Sem turma');
    expect(sem!.className).toBe(normal!.className);
    expect(sem!.querySelector('th')!.className).toBe(normal!.querySelector('th')!.className);
    expect(sem!.querySelectorAll('td').length).toBe(normal!.querySelectorAll('td').length);
    expect(sem!.querySelector('td:last-child')!.className).toBe(normal!.querySelector('td:last-child')!.className);
    const cabecalhos = Array.from(el.querySelectorAll('[data-testid^="linha-turma-"]')[0]
      .closest('table')!.querySelectorAll('thead th')).map(th => th.textContent!.trim());
    expect(cabecalhos).toEqual(['Turma', 'Alunos únicos autorizados', 'Autorizações', 'Repetições']);
    const texto = el.textContent!;
    expect(texto).toContain('turma vigente');
    expect(texto).toContain('aparece em "Sem turma"');
    expect(texto).not.toContain('cadastro do aluno');
  });
});
