export type QrCodeAlunoParseResult =
  | {
      valido: true;
      alunoCodigo: string;
      formato: 'texto' | 'json';
    }
  | {
      valido: false;
      motivo: 'VAZIO' | 'CODIGO_ALUNO_AUSENTE';
    };

type QrCodeAlunoPayload = {
  alunoCodigo?: unknown;
  codigo?: unknown;
};

export function parseAlunoQrCode(conteudoQr: string): QrCodeAlunoParseResult {
  const valor = conteudoQr.trim();
  if (!valor) return { valido: false, motivo: 'VAZIO' };

  try {
    const payload = JSON.parse(valor) as QrCodeAlunoPayload;
    const codigo = payload.alunoCodigo ?? payload.codigo;

    if (typeof codigo !== 'string' || !codigo.trim()) {
      return { valido: false, motivo: 'CODIGO_ALUNO_AUSENTE' };
    }

    return {
      valido: true,
      alunoCodigo: codigo.trim(),
      formato: 'json',
    };
  } catch {
    return {
      valido: true,
      alunoCodigo: valor,
      formato: 'texto',
    };
  }
}
