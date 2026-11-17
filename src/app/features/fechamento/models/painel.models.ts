export type SituacaoFechamento = 'SEM_CARDAPIO' | 'FECHADA' | 'AGUARDANDO' | 'EM_ANDAMENTO' | 'PENDENTE';

export interface RefeicaoDoDia {
  tipoRefeicaoId: string;
  refeicao: string;
  ordem: number;
  inicio: string;
  fim: string;
  situacao: SituacaoFechamento;
  cardapioId: string | null;
  itensCardapio: number;
  itensMedidos: number;
  consumosAutorizados: number;
  fechadoEm: string | null;
}

export interface FechamentoPendente {
  data: string;
  tipoRefeicaoId: string;
  refeicao: string;
  itensCardapio: number;
  itensMedidos: number;
}
