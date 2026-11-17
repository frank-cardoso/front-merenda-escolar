import { TipoRefeicao } from './tipo-refeicao.models';
import { explicarBloqueioPorTurma, refeicoesDoTurno, rotuloTurno } from './turnos';

const refeicao = (nome: string, ordem: number, turnos: string[]): TipoRefeicao =>
  ({ id: String(ordem), nome, ordem, inicio: '07:00:00', fim: '08:00:00', turnos });

const grade: TipoRefeicao[] = [
  refeicao('Café da manhã', 1, ['INTEGRAL']),
  refeicao('Lanche da manhã', 2, ['MANHA', 'INTEGRAL']),
  refeicao('Almoço', 3, ['INTEGRAL']),
  refeicao('Lanche da tarde', 4, ['TARDE', 'INTEGRAL']),
  refeicao('Lanche da noite', 5, ['NOITE']),
  refeicao('Ceia', 6, []),
];

describe('turnos', () => {
  it('rotula os turnos e devolve o próprio valor quando desconhecido', () => {
    expect(rotuloTurno('MANHA')).toBe('Manhã');
    expect(rotuloTurno('TARDE')).toBe('Tarde');
    expect(rotuloTurno('NOITE')).toBe('Noite');
    expect(rotuloTurno('INTEGRAL')).toBe('Integral');
    expect(rotuloTurno('MADRUGADA')).toBe('MADRUGADA');
  });

  it('refeicoesDoTurno respeita a ordem da grade', () => {
    expect(refeicoesDoTurno(grade, 'INTEGRAL').map((r) => r.nome))
      .toEqual(['Café da manhã', 'Lanche da manhã', 'Almoço', 'Lanche da tarde']);
    expect(refeicoesDoTurno(grade, 'NOITE').map((r) => r.nome)).toEqual(['Lanche da noite']);
    expect(refeicoesDoTurno([grade[5]], 'MANHA')).toEqual([]);
  });

  describe('explicarBloqueioPorTurma', () => {
    it('um turno', () => {
      expect(explicarBloqueioPorTurma('Almoço', ['INTEGRAL'], 'MANHA'))
        .toBe('Almoço é para turmas Integral; a turma do aluno é Manhã.');
    });

    it('dois turnos unidos por "e"', () => {
      expect(explicarBloqueioPorTurma('Lanche da manhã', ['MANHA', 'INTEGRAL'], 'NOITE'))
        .toBe('Lanche da manhã é para turmas Manhã e Integral; a turma do aluno é Noite.');
    });

    it('três turnos com vírgula antes do último "e"', () => {
      expect(explicarBloqueioPorTurma('Almoço', ['MANHA', 'TARDE', 'INTEGRAL'], 'NOITE'))
        .toBe('Almoço é para turmas Manhã, Tarde e Integral; a turma do aluno é Noite.');
    });

    it('lista vazia', () => {
      expect(explicarBloqueioPorTurma('Ceia', [], 'TARDE'))
        .toBe('Ceia não está liberada para nenhum turno; a turma do aluno é Tarde.');
    });
  });
});
