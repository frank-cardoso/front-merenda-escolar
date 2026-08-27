export type Turno = 'MANHA' | 'TARDE' | 'NOITE';
export type StatusRelatorioIA = 'PENDENTE' | 'PROCESSANDO' | 'CONCLUIDO' | 'FALHOU';

export interface ConsolidacaoConsumo {
  data: string;
  turno: Turno;
  cardapioId: string;
  cardapio: string;
  quantidadePlanejada: number;
  consumosAutorizados: number;
  tentativasBloqueadas: number;
  taxaConsumoPlanejado: number;
  sobraEstimada: number;
}

export interface CriarRelatorioIARequest {
  dataReferencia: string;
  turno: Turno;
}

export interface CriarRelatorioIAResponse {
  relatorioId: string;
  status: StatusRelatorioIA;
  statusUrl: string;
}

export interface AnaliseLogistica {
  resumoExecutivo: string;
  nivelAceitacao: string;
  riscoDesperdicio: string;
  evidencias: string[];
  recomendacoes: string[];
  observacaoLimitacoes: string;
}

export interface RelatorioIA {
  id: string;
  dataReferencia: string;
  turno: Turno;
  status: StatusRelatorioIA;
  provedor: string | null;
  modelo: string | null;
  promptVersao: string;
  resultado: AnaliseLogistica | null;
  erro: string | null;
  tentativas: number;
  criadoEm: string;
  iniciadoEm: string | null;
  concluidoEm: string | null;
}
