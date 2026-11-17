import { ChangeDetectionStrategy, Component, ElementRef, effect, input, output, viewChild } from '@angular/core';

let proximoId = 0;

@Component({
  selector: 'app-modal',
  templateUrl: './modal.component.html',
  styles: `
    @media (prefers-reduced-motion: no-preference) {
      dialog[open] { animation: modal-entrada 150ms ease-out; }
      dialog[open]::backdrop { animation: modal-fundo 150ms ease-out; }
    }
    @keyframes modal-entrada { from { opacity: 0; transform: translateY(8px) scale(0.98); } }
    @keyframes modal-fundo { from { opacity: 0; } }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ModalComponent {
  readonly aberto = input.required<boolean>();
  readonly titulo = input.required<string>();
  readonly largura = input<'md' | 'lg'>('md');
  readonly fechar = output<void>();

  protected readonly tituloId = `modal-titulo-${proximoId++}`;
  private pressionouNoFundo = false;
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  constructor() {
    effect(() => {
      const dialog = this.dialog().nativeElement;
      if (this.aberto()) {
        if (dialog.isConnected && !dialog.open) dialog.showModal();
      } else if (dialog.open) {
        dialog.close();
      }
    });
  }

  /** Esc: quem decide fechar é o pai, que pode ter envio em andamento. */
  protected aoCancelar(evento: Event): void {
    evento.preventDefault();
    this.fechar.emit();
  }

  protected aoPressionar(evento: Event): void {
    this.pressionouNoFundo = evento.target === this.dialog().nativeElement;
  }

  /** Só fecha se o gesto inteiro foi no fundo: selecionar texto num campo e soltar fora não conta. */
  protected aoClicar(evento: MouseEvent): void {
    const noFundo = evento.target === this.dialog().nativeElement;
    if (noFundo && this.pressionouNoFundo) this.fechar.emit();
    this.pressionouNoFundo = false;
  }
}
