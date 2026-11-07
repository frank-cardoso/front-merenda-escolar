import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ModalComponent } from './modal.component';

@Component({
  imports: [ModalComponent],
  template: `
    <app-modal [aberto]="aberto()" titulo="Novo aluno" (fechar)="fechou = fechou + 1">
      <p class="conteudo">Conteúdo</p>
    </app-modal>
  `,
})
class HospedeComponent {
  readonly aberto = signal(false);
  fechou = 0;
}

describe('ModalComponent', () => {
  let fixture: ComponentFixture<HospedeComponent>;
  let hospede: HospedeComponent;
  let dialog: HTMLDialogElement;

  beforeEach(() => {
    fixture = TestBed.createComponent(HospedeComponent);
    hospede = fixture.componentInstance;
    fixture.detectChanges();
    dialog = fixture.nativeElement.querySelector('dialog');
  });

  afterEach(() => hospede.aberto.set(false));

  function abrir(): void {
    hospede.aberto.set(true);
    fixture.detectChanges();
  }

  it('abre e fecha o dialog conforme aberto', () => {
    expect(dialog.open).toBeFalse();

    abrir();
    expect(dialog.open).toBeTrue();
    expect(dialog.matches(':modal')).toBeTrue();

    hospede.aberto.set(false);
    fixture.detectChanges();
    expect(dialog.open).toBeFalse();
  });

  it('emite fechar no Esc sem fechar sozinho', () => {
    abrir();
    const evento = new Event('cancel', { cancelable: true });
    dialog.dispatchEvent(evento);

    expect(hospede.fechou).toBe(1);
    expect(evento.defaultPrevented).toBeTrue();
    expect(dialog.open).toBeTrue();
  });

  it('emite fechar no clique no fundo e não no conteúdo', () => {
    abrir();
    (fixture.nativeElement.querySelector('.conteudo') as HTMLElement).click();
    expect(hospede.fechou).toBe(0);

    dialog.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    dialog.click();
    expect(hospede.fechou).toBe(1);
  });

  it('não fecha quando o gesto começa no conteúdo e termina no fundo', () => {
    abrir();
    (fixture.nativeElement.querySelector('.conteudo') as HTMLElement)
      .dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    dialog.click();
    expect(hospede.fechou).toBe(0);
  });

  it('fecha quando o gesto começa e termina no fundo', () => {
    abrir();
    dialog.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    dialog.click();
    expect(hospede.fechou).toBe(1);
  });

  it('emite fechar no botão X', () => {
    abrir();
    (fixture.nativeElement.querySelector('button[aria-label="Fechar"]') as HTMLButtonElement).click();
    expect(hospede.fechou).toBe(1);
  });

  it('liga o aria-labelledby ao título', () => {
    const titulo = fixture.nativeElement.querySelector('h2') as HTMLElement;
    expect(titulo.textContent?.trim()).toBe('Novo aluno');
    expect(dialog.getAttribute('aria-labelledby')).toBe(titulo.id);
    expect(titulo.id).not.toBe('');
  });
});
