import { IndicadoresLogisticos } from './indicadores.models';

export type StatusRelatorioIA = 'PENDENTE' | 'PROCESSANDO' | 'CONCLUIDO' | 'FALHOU';

export interface ConsolidacaoConsumo {
  data: string;
  tipoRefeicaoId: string;
  refeicao: string;
  cardapioId: string;
  cardapio: string;
  itensCardapio?: string[];
  receitasCardapio?: string[];
  quantidadePlanejada: number;
  consumosAutorizados: number;
  tentativasBloqueadas: number;
  taxaConsumoPlanejado: number;
  sobraEstimada: number;
}

export interface CriarRelatorioIARequest {
  dataReferencia: string;
  tipoRefeicaoId: string;
  turmaId?: string;
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

export type TipoAcaoPlano = 'REVISAR_PREPARACAO' | 'REDUZIR_PREPARO' | 'REVER_PLANEJAMENTO';

export interface AcaoPlano {
  tipo: TipoAcaoPlano;
  receitaId: string | null;
  item: string | null;
  texto: string;
  valor: number;
  referencia: number;
}

export interface RelatorioIA {
  indicadores: IndicadoresLogisticos | null;
  id: string;
  dataReferencia: string;
  turno: string | null;
  tipoRefeicaoId: string;
  refeicao: string;
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
  turmaId: string | null;
}

export const ROTULO_STATUS_RELATORIO: Record<StatusRelatorioIA, string> = {
  PENDENTE: 'Pendente', PROCESSANDO: 'Processando', CONCLUIDO: 'Concluído', FALHOU: 'Falhou',
};

export interface RelatorioResumo {
  id: string;
  status: StatusRelatorioIA;
  criadoEm: string;
  provedor: string | null;
  modelo: string | null;
}
