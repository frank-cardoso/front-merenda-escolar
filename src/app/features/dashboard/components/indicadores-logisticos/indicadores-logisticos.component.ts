import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { IndicadoresLogisticos } from '../../models/indicadores.models';
import { RankingComidasComponent } from '../ranking-comidas/ranking-comidas.component';

@Component({
  selector: 'app-indicadores-logisticos',
  imports: [RankingComidasComponent],
  templateUrl: './indicadores-logisticos.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IndicadoresLogisticosComponent {
  readonly dados = input.required<IndicadoresLogisticos>();
  limitarBarra(valor: number | null): number { return Math.max(0, Math.min(100, valor ?? 0)); }
}
