import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TransferenciaRequest, Turma } from '../../models/cadastro.models';

/**
 * Transferencia e acao propria, com data da mudanca: e ela que permite trocar o aluno de turma
 * no meio do ano e distingue transferencia de correcao de cadastro.
 */
@Component({
  selector: 'app-transferencia-form',
  imports: [FormsModule],
  templateUrl: './transferencia-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TransferenciaFormComponent {
  readonly turmas = input<Turma[]>([]);
  readonly alunoNome = input('');
  readonly turmaAtualId = input<string | null>(null);
  readonly salvando = input(false);

  readonly transferir = output<TransferenciaRequest>();
  readonly cancelar = output<void>();

  readonly turmaId = signal('');
  readonly dataMudanca = signal('');

  readonly formularioValido = computed(() =>
    this.turmaId().length > 0 && this.dataMudanca().length > 0);

  enviar(): void {
    if (!this.formularioValido()) return;
    this.transferir.emit({ turmaId: this.turmaId(), dataMudanca: this.dataMudanca() });
  }
}
