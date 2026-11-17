import { TipoRefeicao } from './tipo-refeicao.models';

export const ROTULO_TURNO: Record<string, string> = {
  MANHA: 'Manhã',
  TARDE: 'Tarde',
  NOITE: 'Noite',
  INTEGRAL: 'Integral',
};

export function rotuloTurno(turno: string): string {
  return ROTULO_TURNO[turno] ?? turno;
}

export function refeicoesDoTurno(grade: TipoRefeicao[], turno: string): TipoRefeicao[] {
  return grade.filter((refeicao) => refeicao.turnos.includes(turno));
}

export function explicarBloqueioPorTurma(refeicao: string, turnosDaRefeicao: string[], turnoDaTurma: string): string {
  const turmaDoAluno = `a turma do aluno é ${rotuloTurno(turnoDaTurma)}.`;
  if (turnosDaRefeicao.length === 0) return `${refeicao} não está liberada para nenhum turno; ${turmaDoAluno}`;

  const rotulos = turnosDaRefeicao.map(rotuloTurno);
  const ultimo = rotulos.pop();
  const lista = rotulos.length ? `${rotulos.join(', ')} e ${ultimo}` : ultimo;
  return `${refeicao} é para turmas ${lista}; ${turmaDoAluno}`;
}
