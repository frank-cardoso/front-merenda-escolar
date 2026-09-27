export interface IndicadoresLogisticos {
  schemaVersion: string;
  calculoVersao: string;
  status: 'DISPONIVEL' | 'INDISPONIVEL';
  dataReferencia: string;
  inicioHistorico: string;
  turno: string;
  execucaoPlanejamento: {
    refeicoesPlanejadas: number;
    consumosRegistrados: number;
    percentual: number | null;
    metaPercentual: number;
    diferencaMetaPp: number | null;
    statusMeta: 'ATINGIDA' | 'ABAIXO' | 'NAO_AVALIAVEL';
  } | null;
  atendimentos: { alunosUnicos: number; repeticoes: number } | null;
  topComidas: ItemRanking[];
  aceitacaoItens: AceitacaoItem[];
  aceitacaoItensSemana: AceitacaoItem[];
  quantidadeFechamentosDoMes?: number;
  quantidadeFechamentosDaSemana?: number;
  datasFechamentosDoMes?: string[];
  porTurma: {
    turma: string; consumosRegistrados: number; alunosUnicos: number;
    repeticoes: number; percentual: number | null; statusMeta: string; motivo: string;
  }[];
  ingredientes: AnaliseIndisponivel | null;
  rotacaoCardapio: AnaliseIndisponivel | null;
  avisos: string[];
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
  fechamentos: number;
}

interface AnaliseIndisponivel {
  status: string;
  motivo: string;
  cicloSugeridoDias: number | null;
}
