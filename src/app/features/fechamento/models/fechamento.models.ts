/**
 * Uma linha do fechamento: um item do cardápio e os três números que a cozinha observa.
 *
 * `porcoesServidas` não entra aqui porque não é observada, é derivada: o que foi preparado menos
 * o que sobrou na panela. Também não dá para tirar do QR — a catraca conta refeições e não diz
 * quais itens cada aluno pegou, então usar a contagem dela por item seria suposição.
 */
export interface LinhaFechamento {
  receitaId: string;
  nome: string;
  porcoesPreparadas: number;
  sobraNaoDistribuida: number;
  restoNoPrato: number;
}

export interface MedicaoSobraRequest {
  data: string;
  tipoRefeicaoId: string;
  receitaId: string;
  porcoesPreparadas: number;
  porcoesServidas: number;
  sobraNaoDistribuida: number;
  restoNoPrato: number;
}

export interface MedicaoSobraResponse {
  data: string;
  tipoRefeicaoId: string;
  receitaId: string;
  porcoesPreparadas: number;
  porcoesServidas: number;
  sobraNaoDistribuida: number;
  restoNoPrato: number;
}

export interface FechamentoSobraRequest {
  medicoes: MedicaoSobraRequest[];
}
