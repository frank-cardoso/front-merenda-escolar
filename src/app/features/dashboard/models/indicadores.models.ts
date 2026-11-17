import { AcaoPlano } from './dashboard.models';

export interface IndicadoresLogisticos {
  schemaVersion: string;
  calculoVersao: string;
  status: 'DISPONIVEL' | 'INDISPONIVEL';
  dataReferencia: string;
  inicioHistorico: string;
  /** Fotografias antigas (schemaVersion 4) só têm o turno. */
  turno?: string | null;
  refeicao?: { id: string; nome: string } | null;
  execucaoPlanejamento: {
    refeicoesPlanejadas: number;
    consumosRegistrados: number;
    percentual: number | null;
    metaPercentual: number;
    diferencaMetaPp: number | null;
    statusMeta: 'ATINGIDA' | 'ABAIXO' | 'NAO_AVALIAVEL';
    mediaAtendidosDia?: number | null;
    mediaPlanejadaDia?: number | null;
  } | null;
  atendimentos: { alunosUnicos: number; repeticoes: number } | null;
  topComidas: ItemRanking[];
  aceitacaoItens: AceitacaoItem[];
  aceitacaoItensSemana: AceitacaoItem[];
  quantidadeFechamentosDoMes?: number;
  quantidadeFechamentosDaSemana?: number;
  datasFechamentosDoMes?: string[];
  porTurma: PorTurma[];
  ingredientes: AnaliseIngredientes | null;
  rotacaoCardapio: AnaliseIndisponivel | null;
  avisos: string[];
  /** Ausente nos relatórios antigos (schemaVersion 5). */
  planoDeAcao?: AcaoPlano[];
  aceitacao?: IndicadorMedido | null;
  desperdicio?: IndicadorMedido | null;
}

/** Aceitação e desperdício medidos nos fechamentos; `nivel` (aceitação) e `risco` (desperdício) são os rótulos de faixa. */
export interface IndicadorMedido {
  status: 'DISPONIVEL' | 'DADOS_INSUFICIENTES';
  nivel?: string;
  risco?: string;
  percentual: number | null;
  motivo: string | null;
}

export interface PorTurma {
  /** Ausente em schemaVersion 2/3 e nulo no balde "Sem turma". */
  turmaId?: string | null;
  turma: string; consumosRegistrados: number; alunosUnicos: number;
  repeticoes: number; percentual: number | null; statusMeta: string; motivo: string;
}

export interface ItemRanking {
  item: string;
  planejamentos: number;
  execucoesRegistradas: number;
  escolas: number;
  origens: string[];
  metrica: string;
  percentual: number;
}

export interface AceitacaoItem {
  receitaId: string;
  item: string;
  porcoesPreparadas: number;
  porcoesServidas: number;
  porcoesConsumidas: number;
  restoNoPrato: number;
  percentual: number | null;
  /** (preparado − servido) / preparado; ausente em relatórios schema 5. */
  sobraPercentual?: number | null;
  fechamentos: number;
}

interface AnaliseIndisponivel {
  status: string;
  motivo: string;
  cicloSugeridoDias: number | null;
}

export interface IngredienteResto {
  ingredienteId: string;
  ingrediente: string;
  amostra: number;
  percentualRestoCom: number;
  percentualRestoSem: number | null;
  diferencaPp: number;
}

export interface AnaliseIngredientes {
  status: 'DISPONIVEL' | 'DADOS_INSUFICIENTES';
  basePercentualResto: number | null;
  acimaDaBase: IngredienteResto[];
  motivo: string;
}
