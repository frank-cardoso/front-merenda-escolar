import { ChangeDetectionStrategy, Component, input, signal } from '@angular/core';
import { IndicadoresLogisticos } from '../../models/indicadores.models';
import { AceitacaoItensComponent } from '../aceitacao-itens/aceitacao-itens.component';

@Component({
  selector: 'app-indicadores-logisticos',
  imports: [AceitacaoItensComponent],
  templateUrl: './indicadores-logisticos.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IndicadoresLogisticosComponent {
  readonly dados = input.required<IndicadoresLogisticos>();
  readonly periodoAceitacao = signal<'mes' | 'semana'>('mes');
  limitarBarra(valor: number | null): number { return Math.max(0, Math.min(100, valor ?? 0)); }
  itensAceitacao() {
    return this.periodoAceitacao() === 'mes'
      ? this.dados().aceitacaoItens : this.dados().aceitacaoItensSemana;
  }
}
