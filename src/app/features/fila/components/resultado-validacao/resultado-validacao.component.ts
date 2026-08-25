import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { ValidarConsumoResponse } from '../../models/fila.models';

@Component({
  selector: 'app-resultado-validacao',
  templateUrl: './resultado-validacao.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResultadoValidacaoComponent {
  readonly resultado = input.required<ValidarConsumoResponse>();
}
