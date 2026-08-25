export type MetodoIdentificacao = 'QR_CODE' | 'FACIAL';
export type ResultadoValidacao = 'AUTORIZADO' | 'BLOQUEADO';

export interface ValidarConsumoRequest {
  alunoCodigo: string;
  metodoIdentificacao: MetodoIdentificacao;
}

export interface ValidarConsumoResponse {
  resultado: ResultadoValidacao;
  sinal: 'VERDE' | 'VERMELHO';
  alunoId: string | null;
  alunoNome: string | null;
  turno: 'MANHA' | 'TARDE' | 'NOITE' | null;
  cardapio: string | null;
  registradoEm: string | null;
  motivo: string | null;
}
