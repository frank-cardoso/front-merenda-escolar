// Sem numeros fixos: a janela de bloqueio por repeticao e configuravel no backend.
const MOTIVOS: Record<string, string> = {
  CONSUMO_RECENTE_BLOQUEADO: 'Consumo recente: este aluno já foi validado há pouco tempo.',
  ALUNO_NAO_ENCONTRADO_OU_INATIVO: 'Aluno não encontrado ou inativo.',
  CARDAPIO_NAO_CONFIGURADO: 'Cardápio não configurado.',
  FOTO_NAO_INFORMADA: 'Nenhuma foto foi capturada para a validação facial.',
  ROSTO_NAO_DETECTADO: 'Não foi possível detectar um rosto na foto capturada.',
  ROSTO_NAO_RECONHECIDO: 'Rosto não reconhecido entre os alunos cadastrados. Use o QR Code.',
  ROSTO_AMBIGUO: 'Rosto parecido com mais de um aluno. Use o QR Code para confirmar.',
  NENHUM_ROSTO_CADASTRADO: 'Nenhum aluno tem rosto cadastrado ainda. Use o QR Code.',
  RECONHECIMENTO_FACIAL_INDISPONIVEL: 'Reconhecimento facial indisponível no momento. Use o QR Code.',
};

export function traduzirMotivo(motivo: string | null): string | null {
  return motivo ? (MOTIVOS[motivo] ?? motivo) : null;
}
