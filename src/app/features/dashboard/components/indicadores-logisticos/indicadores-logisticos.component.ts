import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { IndicadoresLogisticos, PorTurma } from '../../models/indicadores.models';
import { AceitacaoItensComponent } from '../aceitacao-itens/aceitacao-itens.component';

@Component({
  selector: 'app-indicadores-logisticos',
  imports: [AceitacaoItensComponent],
  templateUrl: './indicadores-logisticos.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IndicadoresLogisticosComponent {
  readonly dados = input.required<IndicadoresLogisticos>();
  readonly turmaSelecionada = input<string>('TODAS');
  readonly periodoAceitacao = signal<'mes' | 'semana'>('mes');

  readonly porTurmaFiltrado = computed(() => {
    const filtro = this.turmaSelecionada();
    const linhas = this.dados().porTurma;
    return filtro === 'TODAS' ? linhas : linhas.filter(turma => this.chaveTurma(turma) === filtro);
  });

  /** Métricas da Fila: números da turma escolhida quando dá para isolar; senão, do turno inteiro. */
  readonly atendimentosExibidos = computed(() => {
    if (this.turmaSelecionada() === 'TODAS') return this.dados().atendimentos;
    const turma = this.porTurmaFiltrado()[0];
    return turma ? { alunosUnicos: turma.alunosUnicos, repeticoes: turma.repeticoes } : null;
  });

  nomeTurmaSelecionada(): string {
    return this.porTurmaFiltrado()[0]?.turma ?? '';
  }

  limitarBarra(valor: number | null): number { return Math.max(0, Math.min(100, valor ?? 0)); }
  chaveTurma(turma: PorTurma): string { return turma.turmaId ?? turma.turma; }
  itensAceitacao() {
    return this.periodoAceitacao() === 'mes'
      ? this.dados().aceitacaoItens : this.dados().aceitacaoItensSemana;
  }
}
