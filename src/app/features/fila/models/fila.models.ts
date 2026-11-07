export type MetodoIdentificacao = 'QR_CODE' | 'FACIAL';
export type ResultadoValidacao = 'AUTORIZADO' | 'BLOQUEADO';

export interface ValidarConsumoRequest {
  /** Obrigatório no QR_CODE; no FACIAL a API ignora, pois identifica o aluno pelo rosto. */
  alunoCodigo?: string;
  metodoIdentificacao: MetodoIdentificacao;
  /** Só exigido quando metodoIdentificacao é FACIAL: a API procura o rosto entre todos os alunos cadastrados. */
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
