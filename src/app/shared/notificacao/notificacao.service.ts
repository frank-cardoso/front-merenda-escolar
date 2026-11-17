import { Injectable, computed, signal } from '@angular/core';

export type TipoNotificacao = 'sucesso' | 'erro' | 'aviso';

export interface Notificacao {
  id: number;
  tipo: TipoNotificacao;
  destaque: boolean;
  mensagem?: string;
  titulo?: string;
  selo?: string;
  detalhe?: string | null;
}

export interface Destaque {
  tipo: Exclude<TipoNotificacao, 'aviso'>;
  titulo: string;
  selo: string;
  detalhe?: string | null;
}

const DURACAO_MS = 5000;
const DURACAO_AVISO_MS = 7000;
const DURACAO_DESTAQUE_MS = 6000;
const LIMITE = 3;

@Injectable({ providedIn: 'root' })
export class NotificacaoService {
  private readonly lista = signal<Notificacao[]>([]);
  private readonly timers = new Map<number, ReturnType<typeof setTimeout>>();
  private proximoId = 1;

  readonly notificacoes = this.lista.asReadonly();
  readonly simples = computed(() => this.lista().filter((n) => !n.destaque));
  readonly destaqueAtual = computed(() => this.lista().find((n) => n.destaque) ?? null);

  sucesso(mensagem: string): void {
    this.adicionar({ tipo: 'sucesso', destaque: false, mensagem }, DURACAO_MS);
  }

  erro(mensagem: string): void {
    this.adicionar({ tipo: 'erro', destaque: false, mensagem }, DURACAO_MS);
  }

  /** Resultado que não é falha nem sucesso pleno: fica mais tempo na tela porque explica o que não aconteceu. */
  aviso(mensagem: string): void {
    this.adicionar({ tipo: 'aviso', destaque: false, mensagem }, DURACAO_AVISO_MS);
  }

  /** Só existe um destaque por vez: a leitura nova da fila substitui a anterior. */
  destaque(n: Destaque): void {
    const anterior = this.destaqueAtual();
    if (anterior) this.fechar(anterior.id);
    this.adicionar({ ...n, destaque: true }, DURACAO_DESTAQUE_MS);
  }

  fechar(id: number): void {
    clearTimeout(this.timers.get(id));
    this.timers.delete(id);
    this.lista.update((itens) => itens.filter((item) => item.id !== id));
  }

  private adicionar(dados: Omit<Notificacao, 'id'>, duracaoMs: number): void {
    const id = this.proximoId++;
    this.lista.update((itens) => [{ ...dados, id }, ...itens]);
    this.timers.set(id, setTimeout(() => this.fechar(id), duracaoMs));
    this.simples().slice(LIMITE).forEach((excedente) => this.fechar(excedente.id));
  }
}
