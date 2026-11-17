import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { NotificacaoService } from './notificacao.service';

@Component({
  selector: 'app-notificacao-host',
  templateUrl: './notificacao-host.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    .destaque-entrada { animation: destaque-entrada 180ms ease-out; }
    /* Mesma duração do destaque no NotificacaoService: a barra mostra quanto falta para sumir. */
    .destaque-tempo { transform-origin: left; animation: destaque-tempo 6s linear forwards; }

    @keyframes destaque-entrada {
      from { opacity: 0; transform: translateY(-12px) scale(0.98); }
      to { opacity: 1; transform: none; }
    }
    @keyframes destaque-tempo {
      from { transform: scaleX(1); }
      to { transform: scaleX(0); }
    }
    @media (prefers-reduced-motion: reduce) {
      .destaque-entrada, .destaque-tempo { animation: none; }
    }
  `,
})
export class NotificacaoHostComponent {
  protected readonly servico = inject(NotificacaoService);

  /** Lista de no máximo um item, rastreada por id: cada leitura nova recria o cartão e reinicia a animação. */
  protected readonly destaques = computed(() => {
    const atual = this.servico.destaqueAtual();
    return atual ? [atual] : [];
  });
}
