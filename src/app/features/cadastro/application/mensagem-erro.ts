import { HttpErrorResponse } from '@angular/common/http';

/**
 * Mostra o detail que a API devolve (409 de turma em uso, 400 de validacao, transferencia
 * rejeitada), para a rejeicao aparecer como a regra de negocio e nao como erro generico.
 */
export function montarMensagemErro(erro: HttpErrorResponse): string {
  if (erro.status === 0) {
    return 'Não foi possível comunicar com a API. Confirme se o backend está rodando em http://localhost:8081.';
  }

  const detalhe = erro.error?.detail;
  if (detalhe) return `${detalhe} (HTTP ${erro.status})`;

  return `Erro ${erro.status} ao processar a solicitação.`;
}
