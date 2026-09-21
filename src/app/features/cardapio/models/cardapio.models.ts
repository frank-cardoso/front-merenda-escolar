export type Turno = 'MANHA' | 'TARDE' | 'NOITE' | 'INTEGRAL';

export interface Receita {
  id: string;
  nome: string;
  codigoExterno: string | null;
}

/** `receitaId` e a identidade do item; `nome` e rotulo devolvido pela API. */
export interface ItemCardapio {
  receitaId: string | null;
  nome: string;
  quantidade: string | null;
}

export interface Cardapio {
  id: string;
  data: string;
  turno: Turno;
  nomeRefeicao: string;
  descricao: string | null;
  itens: ItemCardapio[];
  quantidadePlanejada: number;
  ativo: boolean;
}

export interface CardapioRequest {
  data: string;
  turno: Turno;
  nomeRefeicao: string;
  descricao: string | null;
  itens: ItemCardapio[];
  quantidadePlanejada: number;
}
