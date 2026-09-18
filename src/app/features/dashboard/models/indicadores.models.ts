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

interface AnaliseIndisponivel {
  status: string;
  motivo: string;
  cicloSugeridoDias: number | null;
}
