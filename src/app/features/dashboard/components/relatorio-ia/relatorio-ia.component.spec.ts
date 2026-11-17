import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RelatorioIA } from '../../models/dashboard.models';
import { IndicadoresLogisticos } from '../../models/indicadores.models';
import { RelatorioIaComponent } from './relatorio-ia.component';

function item(nome: string, percentual: number | null, sobra: number | null, fechamentos = 10) {
  return { receitaId: nome, item: nome, porcoesPreparadas: 100, porcoesServidas: 90, porcoesConsumidas: 80,
    restoNoPrato: 7, percentual, sobraPercentual: sobra, fechamentos };
}

function indicadores(extra: Partial<IndicadoresLogisticos> = {}): IndicadoresLogisticos {
  return {
    schemaVersion: '6', calculoVersao: 'v', status: 'DISPONIVEL', dataReferencia: '2026-11-09',
    inicioHistorico: '2026-10-11',
    execucaoPlanejamento: { refeicoesPlanejadas: 101, consumosRegistrados: 38, percentual: 37.6, metaPercentual: 80,
      diferencaMetaPp: -42.4, statusMeta: 'ABAIXO', mediaAtendidosDia: 38, mediaPlanejadaDia: 101 },
    atendimentos: null, topComidas: [],
    aceitacaoItens: [item('Arroz', 95, 2), item('Banana', 78, 4), item('Suco', 92, 12)],
    aceitacaoItensSemana: [], porTurma: [], ingredientes: null, rotacaoCardapio: null, avisos: [],
    planoDeAcao: [
      { tipo: 'REVISAR_PREPARACAO', receitaId: 'b', item: 'Banana', texto: 'Revisar o preparo da Banana.', valor: 78, referencia: 90 },
      { tipo: 'REDUZIR_PREPARO', receitaId: 's', item: 'Suco', texto: 'Reduzir o preparo do Suco.', valor: 12, referencia: 10 },
      { tipo: 'REVER_PLANEJAMENTO', receitaId: null, item: null, texto: 'Rever a quantidade planejada.', valor: 38, referencia: 80 },
    ],
    aceitacao: { status: 'DISPONIVEL', nivel: 'MEDIA', percentual: 82.5, motivo: '' },
    desperdicio: { status: 'DISPONIVEL', risco: 'BAIXO', percentual: 8, motivo: '' },
    ...extra,
  };
}

function relatorio(extra: Partial<RelatorioIA> = {}): RelatorioIA {
  return {
    id: 'r', dataReferencia: '2026-11-09', turno: null, tipoRefeicaoId: 'l', refeicao: 'Lanche da manhã',
    status: 'CONCLUIDO', provedor: 'groq', modelo: 'm', promptVersao: 'v4-secretaria',
    indicadores: indicadores(),
    resultado: { resumoExecutivo: 'O lanche vai bem.', nivelAceitacao: 'MEDIA', riscoDesperdicio: 'BAIXO',
      evidencias: ['Evidência antiga'], recomendacoes: ['Recomendação antiga'],
      observacaoLimitacoes: 'Limitação X.' },
    erro: null, tentativas: 1, criadoEm: new Date(2026, 10, 9, 12, 0).toISOString(),
    iniciadoEm: null, concluidoEm: null, turmaId: null,
    ...extra,
  };
}

function montar(r: RelatorioIA): ComponentFixture<RelatorioIaComponent> {
  TestBed.configureTestingModule({});
  const fixture = TestBed.createComponent(RelatorioIaComponent);
  fixture.componentRef.setInput('relatorio', r);
  fixture.detectChanges();
  return fixture;
}

const texto = (f: ComponentFixture<unknown>) => (f.nativeElement.textContent as string).replace(/\s+/g, ' ');

describe('RelatorioIaComponent', () => {
  it('mostra cabeçalho, cartões, plano na ordem e leitura da IA', () => {
    const f = montar(relatorio());
    const t = texto(f);
    expect(t).toContain('Lanche da manhã · últimos 30 dias até 09/11/2026');
    expect(t).toContain('Gerado em 09/11/2026 12:00');
    expect(t).toContain('82,5%');
    expect(t).toContain('meta 90%');
    expect(t).toContain('8%');
    expect(t).toContain('perda sobre o preparado (sobra na panela + resto no prato)');
    expect(t).not.toContain('meta até');
    expect(t).toContain('Refeições servidas');
    expect(t).not.toContain('Alunos atendidos');
    expect(t).toContain('38 por dia de 101 planejadas (38%)');
    expect(t.indexOf('Revisar o preparo da Banana.')).toBeGreaterThan(t.indexOf('O que fazer'));
    expect(t.indexOf('Reduzir o preparo do Suco.')).toBeGreaterThan(t.indexOf('Revisar o preparo da Banana.'));
    expect(t).toContain('Leitura da IA');
    expect(t).toContain('O lanche vai bem.');
    expect(t).not.toContain('Texto da versão anterior');
    expect(t).not.toMatch(/groq|schemaVersion/);
    f.destroy();
  });

  it('resumo feito sem IA não aparece como leitura da IA', () => {
    const f = montar(relatorio({ provedor: 'deterministico', modelo: null }));
    const t = texto(f);
    expect(t).not.toContain('Leitura da IA');
    expect(t).toContain('Resumo do período');
    expect(t).toContain('Resumo gerado sem IA: o serviço de IA não respondeu.');
    expect(t).toContain('O lanche vai bem.');
    f.destroy();
  });

  it('ordena a tabela pela aceitação crescente e destaca itens fora da meta', () => {
    const f = montar(relatorio());
    const linhas = Array.from(f.nativeElement.querySelectorAll('[data-testid="linha-item"]') as NodeListOf<HTMLElement>);
    expect(linhas.map(l => l.querySelector('th')!.textContent!.trim())).toEqual(['Banana', 'Suco', 'Arroz']);
    expect(linhas.map(l => l.dataset['destaque'])).toEqual(['sim', 'sim', 'nao']);
    f.destroy();
  });

  it('plano vazio mostra a mensagem de nenhuma ação', () => {
    const f = montar(relatorio({ indicadores: indicadores({ planoDeAcao: [] }) }));
    expect(texto(f)).toContain('Nenhuma ação necessária: todos os itens medidos estão dentro das metas.');
    f.destroy();
  });

  it('sem ação de planejamento, o percentual do cartão sai das médias exatas', () => {
    const f = montar(relatorio({ indicadores: indicadores({ planoDeAcao: [], execucaoPlanejamento: {
      refeicoesPlanejadas: 101, consumosRegistrados: 38, percentual: 37.6, metaPercentual: 80, diferencaMetaPp: -42.4,
      statusMeta: 'ABAIXO', mediaAtendidosDia: 38.4, mediaPlanejadaDia: 101.2 } }) }));
    expect(texto(f)).toContain('38 por dia de 101 planejadas (37,9%)');
    f.destroy();
  });

  it('aceitação 89,96 arredonda para 90 e não é destacada', () => {
    const f = montar(relatorio({ indicadores: indicadores({ aceitacaoItens: [item('Arroz', 89.96, 2), item('Banana', 89.9, 2)] }) }));
    const linhas = Array.from(f.nativeElement.querySelectorAll('[data-testid="linha-item"]') as NodeListOf<HTMLElement>);
    expect(linhas.map(l => l.dataset['destaque'])).toEqual(['sim', 'nao']);
    f.destroy();
  });

  it('indicadores indisponíveis não afirmam que está tudo dentro das metas', () => {
    const f = montar(relatorio({ indicadores: indicadores({ planoDeAcao: [], status: 'INDISPONIVEL' }) }));
    const t = texto(f);
    expect(t).toContain('Ainda não há medição suficiente para recomendar ações.');
    expect(t).not.toContain('Nenhuma ação necessária');
    f.destroy();
  });

  it('aceitação disponível sem itens na tabela não afirma que está tudo dentro das metas', () => {
    const f = montar(relatorio({ indicadores: indicadores({ planoDeAcao: [], aceitacaoItens: [] }) }));
    const t = texto(f);
    expect(t).toContain('Ainda não há medição suficiente para recomendar ações.');
    expect(t).not.toContain('Nenhuma ação necessária');
    f.destroy();
  });

  it('"Como foi calculado" vem recolhido e contém as limitações', () => {
    const f = montar(relatorio());
    const detalhes = f.nativeElement.querySelector('details[data-testid="como-calculado"]') as HTMLDetailsElement;
    expect(detalhes.open).toBeFalse();
    expect(detalhes.textContent).toContain('Limitação X.');
    f.destroy();
  });

  it('relatório antigo sem plano abre, sem "O que fazer", com texto anterior em "Como foi calculado"', () => {
    const f = montar(relatorio({ indicadores: indicadores({ planoDeAcao: undefined, aceitacaoItens: [item('Arroz', 95, null)],
      execucaoPlanejamento: null }) }));
    const t = texto(f);
    expect(t).not.toContain('O que fazer');
    const detalhes = f.nativeElement.querySelector('details[data-testid="como-calculado"]') as HTMLElement;
    expect(detalhes.textContent).toContain('Texto da versão anterior');
    expect(detalhes.textContent).toContain('Evidência antiga');
    expect(detalhes.textContent).toContain('Recomendação antiga');
    expect(t).toContain('O lanche vai bem.');
    f.destroy();
  });
});
