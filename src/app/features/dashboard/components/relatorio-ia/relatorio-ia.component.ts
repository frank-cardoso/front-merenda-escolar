import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { AcaoPlano, RelatorioIA } from '../../models/dashboard.models';
import { AceitacaoItem, IndicadorMedido } from '../../models/indicadores.models';
import { dataBr, dataHoraLocal, numeroBr } from '../../models/formato';

const arredondar = (n: number) => Math.round(n * 10) / 10;
const inteiroBr = (n: number) => n.toLocaleString('pt-BR', { maximumFractionDigits: 0 });

const METAS = { aceitacao: 90, sobra: 10 };

const FAIXAS: Record<string, string> = {
  ALTA: 'Alta', MEDIA: 'Média', BAIXA: 'Baixa', BAIXO: 'Baixo', MEDIO: 'Médio', ALTO: 'Alto',
};

const ROTULO_ACAO: Record<AcaoPlano['tipo'], string> = {
  REVISAR_PREPARACAO: 'Preparo', REDUZIR_PREPARO: 'Quantidade', REVER_PLANEJAMENTO: 'Planejamento',
};

interface Cartao { titulo: string; valor: string | null; detalhe: string; faixa: string | null }

@Component({
  selector: 'app-relatorio-ia',
  templateUrl: './relatorio-ia.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RelatorioIaComponent {
  readonly relatorio = input.required<RelatorioIA>();

  readonly metaAceitacao = METAS.aceitacao;
  readonly metaSobra = METAS.sobra;
  readonly rotuloAcao = (tipo: AcaoPlano['tipo']) => ROTULO_ACAO[tipo];
  readonly numeroBr = numeroBr;

  readonly cabecalho = computed(() =>
    `${this.relatorio().refeicao} · últimos 30 dias até ${dataBr(this.relatorio().dataReferencia)}`);
  readonly geradoEm = computed(() => dataHoraLocal(this.relatorio().criadoEm));

  readonly cartoes = computed<Cartao[]>(() => {
    const indicadores = this.relatorio().indicadores;
    if (!indicadores) return [];
    const exec = indicadores.execucaoPlanejamento;
    const atendidos = exec?.mediaAtendidosDia;
    const planejados = exec?.mediaPlanejadaDia;
    const percentualAcao = indicadores.planoDeAcao?.find(a => a.tipo === 'REVER_PLANEJAMENTO')?.valor;
    const percentual = percentualAcao ?? (planejados ? atendidos! / planejados * 100 : null);
    return [
      this.cartaoMedido('Aceitação', indicadores.aceitacao, `meta ${METAS.aceitacao}%`),
      this.cartaoMedido('Desperdício', indicadores.desperdicio, 'perda sobre o preparado (sobra na panela + resto no prato)'),
      atendidos != null && planejados != null
        ? { titulo: 'Refeições servidas', valor: inteiroBr(atendidos),
          detalhe: `por dia de ${inteiroBr(planejados)} planejadas${percentual != null ? ` (${numeroBr(percentual)}%)` : ''}`, faixa: null }
        : { titulo: 'Refeições servidas', valor: null, detalhe: 'Não avaliável', faixa: null },
    ];
  });

  readonly itens = computed(() => [...(this.relatorio().indicadores?.aceitacaoItens ?? [])]
    .sort((a, b) => (a.percentual ?? Infinity) - (b.percentual ?? Infinity)));

  readonly plano = computed(() => this.relatorio().indicadores?.planoDeAcao);

  readonly medicaoCompleta = computed(() => {
    const indicadores = this.relatorio().indicadores;
    return indicadores?.status === 'DISPONIVEL' && indicadores.aceitacao?.status === 'DISPONIVEL' && this.itens().length > 0;
  });

  aceitacaoOk(item: AceitacaoItem): boolean {
    return item.percentual == null || arredondar(item.percentual) >= METAS.aceitacao;
  }

  /** Aceitação abaixo da meta ou sobra na panela a partir do limite. */
  destacado(item: AceitacaoItem): boolean {
    return !this.aceitacaoOk(item) || (item.sobraPercentual ?? 0) >= METAS.sobra;
  }

  private cartaoMedido(titulo: string, medido: IndicadorMedido | null | undefined, detalhe: string): Cartao {
    if (medido?.status !== 'DISPONIVEL' || medido.percentual == null) {
      return { titulo, valor: null, detalhe: medido?.motivo || 'Não avaliável', faixa: null };
    }
    const faixa = medido.nivel ?? medido.risco;
    return { titulo, valor: `${numeroBr(medido.percentual)}%`, detalhe, faixa: faixa ? FAIXAS[faixa] ?? null : null };
  }
}
