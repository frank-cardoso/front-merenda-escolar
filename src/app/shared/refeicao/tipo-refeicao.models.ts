export interface TipoRefeicao {
  id: string;
  nome: string;
  ordem: number;
  inicio: string;
  fim: string;
  turnos: string[];
}

export interface TipoRefeicaoRequest {
  nome: string;
  inicio: string;
  fim: string;
  turnos: string[];
}

/** A API devolve a hora como `HH:mm:ss`; a tela mostra só `HH:mm`. */
export function rotuloRefeicao(tipo: TipoRefeicao): string {
  return `${tipo.nome} (${tipo.inicio.slice(0, 5)}–${tipo.fim.slice(0, 5)})`;
}
