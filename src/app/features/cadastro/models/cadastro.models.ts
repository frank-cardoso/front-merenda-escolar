export type Turno = 'MANHA' | 'TARDE' | 'NOITE' | 'INTEGRAL';

export interface Turma {
  id: string;
  codigo: string;
  descricao: string;
  turno: Turno;
  quantidadeMaximaAlunos: number | null;
}

export interface TurmaRequest {
  codigo: string;
  descricao: string;
  turno: Turno;
  quantidadeMaximaAlunos: number | null;
}

export interface Vinculo {
  id: string;
  turmaId: string;
  turmaCodigo: string;
  turmaDescricao: string;
  dataInicio: string;
  dataFim: string | null;
}

/** A listagem traz so o resumo: turmaVigente e historicoVinculos vem nulos e so existem no detalhe. */
export interface Aluno {
  id: string;
  codigoPublico: string;
  matricula: string;
  nome: string;
  ativo: boolean;
  temRostoCadastrado: boolean;
  turmaVigente: Vinculo | null;
  historicoVinculos: Vinculo[] | null;
}

export interface AlunoCriarRequest {
  codigoPublico: string;
  matricula: string;
  nome: string;
  ativo: boolean;
  turmaId: string | null;
  dataInicio: string | null;
}

/** No PUT o campo ativo e obrigatorio: a API devolve 400 sem ele. */
export interface AlunoAtualizarRequest {
  matricula: string;
  nome: string;
  ativo: boolean;
}

export interface TransferenciaRequest {
  turmaId: string;
  dataMudanca: string;
}
