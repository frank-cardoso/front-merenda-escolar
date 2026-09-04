import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  output,
  signal,
  untracked,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Cardapio, CardapioRequest, ItemCardapio, Turno } from '../../models/cardapio.models';

@Component({
  selector: 'app-cardapio-form',
  imports: [FormsModule],
  templateUrl: './cardapio-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CardapioFormComponent {
  readonly cardapio = input<Cardapio | null>(null);
  readonly salvando = input(false);

  readonly salvar = output<CardapioRequest>();
  readonly cancelar = output<void>();

  readonly turnos: Turno[] = ['MANHA', 'TARDE', 'NOITE', 'INTEGRAL'];

  readonly data = signal(this.hoje());
  readonly turno = signal<Turno>('MANHA');
  readonly nomeRefeicao = signal('');
  readonly descricao = signal('');
  readonly quantidadePlanejada = signal(0);
  readonly itens = signal<ItemCardapio[]>([{ nome: '', quantidade: '' }]);

  readonly editando = computed(() => this.cardapio() !== null);
  readonly formularioValido = computed(() =>
    this.nomeRefeicao().trim().length > 0
    && this.quantidadePlanejada() >= 0
    && this.itensPreenchidos().length > 0);

  constructor() {
    // Repovoa o formulario sempre que o pai troca o cardapio em edicao (ou volta para novo).
    effect(() => {
      const emEdicao = this.cardapio();
      untracked(() => this.preencher(emEdicao));
    });
  }

  adicionarItem(): void {
    this.itens.update((itens) => [...itens, { nome: '', quantidade: '' }]);
  }

  removerItem(indice: number): void {
    this.itens.update((itens) => itens.filter((_, posicao) => posicao !== indice));
  }

  atualizarItem(indice: number, campo: 'nome' | 'quantidade', valor: string): void {
    this.itens.update((itens) => itens.map((item, posicao) =>
      posicao === indice ? { ...item, [campo]: valor } : item));
  }

  enviar(): void {
    if (!this.formularioValido()) return;

    this.salvar.emit({
      data: this.data(),
      turno: this.turno(),
      nomeRefeicao: this.nomeRefeicao().trim(),
      descricao: this.descricao().trim() || null,
      itens: this.itensPreenchidos(),
      quantidadePlanejada: Number(this.quantidadePlanejada()),
    });
  }

  private itensPreenchidos(): ItemCardapio[] {
    return this.itens()
      .filter((item) => item.nome.trim().length > 0)
      .map((item) => ({
        nome: item.nome.trim(),
        quantidade: item.quantidade?.trim() || null,
      }));
  }

  private preencher(cardapio: Cardapio | null): void {
    this.data.set(cardapio?.data ?? this.hoje());
    this.turno.set(cardapio?.turno ?? 'MANHA');
    this.nomeRefeicao.set(cardapio?.nomeRefeicao ?? '');
    this.descricao.set(cardapio?.descricao ?? '');
    this.quantidadePlanejada.set(cardapio?.quantidadePlanejada ?? 0);
    this.itens.set(cardapio?.itens?.length
      ? cardapio.itens.map((item) => ({ ...item, quantidade: item.quantidade ?? '' }))
      : [{ nome: '', quantidade: '' }]);
  }

  private hoje(): string {
    const agora = new Date();
    const mes = String(agora.getMonth() + 1).padStart(2, '0');
    const dia = String(agora.getDate()).padStart(2, '0');
    return `${agora.getFullYear()}-${mes}-${dia}`;
  }
}
