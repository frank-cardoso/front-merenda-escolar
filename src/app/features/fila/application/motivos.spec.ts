import { traduzirMotivo } from './motivos';

describe('traduzirMotivo', () => {
  it('traduz o consumo recente sem numero fixo', () => {
    const texto = traduzirMotivo('CONSUMO_RECENTE_BLOQUEADO');
    expect(texto).toContain('Consumo recente');
    expect(texto).not.toMatch(/\d+ minutos?/);
  });

  it('motivo desconhecido volta como veio do backend', () => {
    expect(traduzirMotivo('OUTRO_CODIGO')).toBe('OUTRO_CODIGO');
  });

  it('sem motivo devolve null', () => {
    expect(traduzirMotivo(null)).toBeNull();
  });

  it('traduz os motivos de bloqueio da identificacao facial 1:N', () => {
    const casos: Record<string, string> = {
      ROSTO_NAO_RECONHECIDO: 'Rosto não reconhecido entre os alunos cadastrados. Use o QR Code.',
      ROSTO_AMBIGUO: 'Rosto parecido com mais de um aluno. Use o QR Code para confirmar.',
      NENHUM_ROSTO_CADASTRADO: 'Nenhum aluno tem rosto cadastrado ainda. Use o QR Code.',
      RECONHECIMENTO_FACIAL_INDISPONIVEL: 'Reconhecimento facial indisponível no momento. Use o QR Code.',
    };
    for (const [motivo, texto] of Object.entries(casos)) {
      expect(traduzirMotivo(motivo)).toContain(texto);
    }
  });

  it('motivos facial antigos deixam de ser traduzidos', () => {
    expect(traduzirMotivo('ROSTO_NAO_CONFERE')).not.toContain('não confere');
    expect(traduzirMotivo('ALUNO_SEM_ROSTO_CADASTRADO')).not.toContain('não tem rosto cadastrado');
  });
});
