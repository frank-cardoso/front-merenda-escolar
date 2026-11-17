import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FechamentoPendente } from '../../../fechamento/models/painel.models';

@Component({
  selector: 'app-pendencias-fechamento',
  imports: [RouterLink],
  templateUrl: './pendencias-fechamento.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PendenciasFechamentoComponent {
  readonly pendencias = input<FechamentoPendente[]>([]);

  readonly titulo = computed(() => {
    const total = this.pendencias().length;
    return `${total} ${total === 1 ? 'refeição sem fechamento' : 'refeições sem fechamento'} nos últimos 7 dias`;
  });

  diaMes(data: string): string {
    const [, mes, dia] = data.split('-');
    return `${dia}/${mes}`;
  }
}
