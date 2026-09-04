export type Turno = 'MANHA' | 'TARDE' | 'NOITE' | 'INTEGRAL';

export interface ItemCardapio {
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
