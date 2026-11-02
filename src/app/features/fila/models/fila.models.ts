export type MetodoIdentificacao = 'QR_CODE' | 'FACIAL';
export type ResultadoValidacao = 'AUTORIZADO' | 'BLOQUEADO';

export interface ValidarConsumoRequest {
  alunoCodigo: string;
  metodoIdentificacao: MetodoIdentificacao;
  /** Só exigido quando metodoIdentificacao é FACIAL: confirma 1:1 contra o rosto já cadastrado do aluno. */
  fotoBase64?: string;
}

export interface ValidarConsumoResponse {
  resultado: ResultadoValidacao;
  sinal: 'VERDE' | 'VERMELHO';
  alunoId: string | null;
  alunoNome: string | null;
  turno: 'MANHA' | 'TARDE' | 'NOITE' | 'INTEGRAL' | null;
  cardapio: string | null;
  registradoEm: string | null;
  motivo: string | null;
}
