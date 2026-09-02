import { parseAlunoQrCode } from './qr-code-parser';

describe('parseAlunoQrCode', () => {
  it('aceita codigo publico em texto puro', () => {
    expect(parseAlunoQrCode('ALU-001')).toEqual({
      valido: true,
      alunoCodigo: 'ALU-001',
      formato: 'texto',
    });
  });

  it('aceita JSON oficial de aluno', () => {
    expect(parseAlunoQrCode('{"tipo":"ALUNO","alunoCodigo":"ALU-002","versao":1}')).toEqual({
      valido: true,
      alunoCodigo: 'ALU-002',
      formato: 'json',
    });
  });

  it('aceita JSON legado com campo codigo', () => {
    expect(parseAlunoQrCode('{"codigo":"ALU-003"}')).toEqual({
      valido: true,
      alunoCodigo: 'ALU-003',
      formato: 'json',
    });
  });

  it('rejeita conteudo vazio', () => {
    expect(parseAlunoQrCode('  ')).toEqual({
      valido: false,
      motivo: 'VAZIO',
    });
  });

  it('rejeita JSON sem codigo de aluno', () => {
    expect(parseAlunoQrCode('{"tipo":"CARDAPIO","id":"123"}')).toEqual({
      valido: false,
      motivo: 'CODIGO_ALUNO_AUSENTE',
    });
  });
});
