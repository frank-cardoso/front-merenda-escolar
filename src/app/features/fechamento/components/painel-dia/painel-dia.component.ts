import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { RefeicaoDoDia, SituacaoFechamento } from '../../models/painel.models';

/** Pedida válida vence; senão a primeira pendente, depois a em andamento, depois a primeira com cardápio, por fim a primeira da grade. */
export function escolherRefeicaoInicial(refeicoes: RefeicaoDoDia[], pedida?: string | null): string {
  if (pedida && refeicoes.some((r) => r.tipoRefeicaoId === pedida)) return pedida;
  const escolhida = refeicoes.find((r) => r.situacao === 'PENDENTE')
    ?? refeicoes.find((r) => r.situacao === 'EM_ANDAMENTO')
    ?? refeicoes.find((r) => r.situacao !== 'SEM_CARDAPIO')
    ?? refeicoes[0];
  return escolhida?.tipoRefeicaoId ?? '';
}

const CLASSES_SELO: Record<SituacaoFechamento, string> = {
  PENDENTE: 'border-amber-300 bg-amber-100 text-amber-900',
  EM_ANDAMENTO: 'border-blue-300 bg-blue-100 text-blue-900',
  FECHADA: 'border-green-300 bg-green-100 text-green-900',
  AGUARDANDO: 'border-slate-300 bg-slate-100 text-slate-700',
  SEM_CARDAPIO: 'border-slate-300 bg-slate-100 text-slate-700',
};

@Component({
  selector: 'app-painel-dia',
  templateUrl: './painel-dia.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PainelDiaComponent {
  readonly refeicoes = input<RefeicaoDoDia[]>([]);
  readonly data = input<string>('');
  readonly selecionada = input<string>('');
  readonly escolher = output<string>();

  classesSelo(refeicao: RefeicaoDoDia): string {
    return CLASSES_SELO[refeicao.situacao];
  }

  rotuloSelo(refeicao: RefeicaoDoDia): string {
    switch (refeicao.situacao) {
      case 'PENDENTE': return 'Pendente';
      case 'EM_ANDAMENTO': return 'Em andamento';
      case 'AGUARDANDO': return 'Aguardando';
      case 'SEM_CARDAPIO': return 'Sem cardápio';
      case 'FECHADA': return refeicao.fechadoEm ? this.rotuloFechada(refeicao.fechadoEm) : 'Fechada';
    }
  }

  janela(refeicao: RefeicaoDoDia): string {
    return `${refeicao.inicio.slice(0, 5)}–${refeicao.fim.slice(0, 5)}`;
  }

  private rotuloFechada(instante: string): string {
    const quando = new Date(instante);
    const hora = this.horaLocal(instante);
    const dia = `${quando.getFullYear()}-${String(quando.getMonth() + 1).padStart(2, '0')}-${String(quando.getDate()).padStart(2, '0')}`;
    if (!this.data() || dia === this.data()) return `Fechada às ${hora}`;
    return `Fechada em ${dia.slice(8)}/${dia.slice(5, 7)} às ${hora}`;
  }

  private horaLocal(instante: string): string {
    return new Date(instante).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }
}
