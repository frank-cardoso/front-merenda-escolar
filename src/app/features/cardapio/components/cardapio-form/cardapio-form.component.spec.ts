import { TestBed } from '@angular/core/testing';
import { CardapioRequest } from '../../models/cardapio.models';
import { CardapioFormComponent } from './cardapio-form.component';

describe('CardapioFormComponent', () => {
  it('oferece receitas do catalogo e envia o item por id, sem texto livre', async () => {
    const fixture = TestBed.createComponent(CardapioFormComponent);
    fixture.componentRef.setInput('receitas', [{ id: 'r1', nome: 'Arroz', codigoExterno: null }]);
    fixture.detectChanges();

    const enviados: CardapioRequest[] = [];
    fixture.componentInstance.salvar.subscribe((request) => enviados.push(request));
    fixture.componentInstance.nomeRefeicao.set('Almoco');
    fixture.componentInstance.selecionarReceita(0, 'r1');
    fixture.componentInstance.atualizarQuantidade(0, ' 10 kg ');
    fixture.componentInstance.enviar();

    fixture.detectChanges();
    await fixture.whenStable();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelectorAll('select')[1].querySelectorAll('option').length).toBe(2);
    expect(el.querySelectorAll('input[type="text"]').length).toBe(2);
    expect(enviados[0].itens).toEqual([{ receitaId: 'r1', nome: 'Arroz', quantidade: '10 kg' }]);
  });

  it('nao envia sem item do catalogo escolhido', () => {
    const fixture = TestBed.createComponent(CardapioFormComponent);
    fixture.detectChanges();
    let emitiu = false;
    fixture.componentInstance.salvar.subscribe(() => (emitiu = true));
    fixture.componentInstance.nomeRefeicao.set('Almoco');
    fixture.componentInstance.enviar();
    expect(emitiu).toBeFalse();
  });
});
