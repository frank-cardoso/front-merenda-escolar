import { TestBed } from '@angular/core/testing';
import { TipoRefeicao } from '../../../../shared/refeicao/tipo-refeicao.models';
import { CardapioRequest } from '../../models/cardapio.models';
import { CardapioFormComponent } from './cardapio-form.component';

const tipos: TipoRefeicao[] = [
  { id: 'id-cafe', nome: 'Café da manhã', ordem: 1, inicio: '07:00:00', fim: '08:00:00', turnos: ['INTEGRAL'] },
  { id: 'id-almoco', nome: 'Almoço', ordem: 3, inicio: '11:30:00', fim: '13:00:00', turnos: ['INTEGRAL'] },
];

describe('CardapioFormComponent', () => {
  it('oferece receitas do catalogo e envia o item por id, sem texto livre', async () => {
    const fixture = TestBed.createComponent(CardapioFormComponent);
    fixture.componentRef.setInput('receitas', [{ id: 'r1', nome: 'Arroz', codigoExterno: null }]);
    fixture.detectChanges();

    const enviados: CardapioRequest[] = [];
    fixture.componentInstance.salvar.subscribe((request) => enviados.push(request));
    fixture.componentInstance.tipoRefeicaoId.set('id-almoco');
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

  it('escolhe a refeição da grade e envia tipoRefeicaoId', async () => {
    const fixture = TestBed.createComponent(CardapioFormComponent);
    fixture.componentRef.setInput('tiposRefeicao', tipos);
    fixture.componentRef.setInput('receitas', [{ id: 'r1', nome: 'Arroz', codigoExterno: null }]);
    fixture.detectChanges();
    await fixture.whenStable();
    const enviados: CardapioRequest[] = [];
    fixture.componentInstance.salvar.subscribe((request) => enviados.push(request));

    const el: HTMLElement = fixture.nativeElement;
    const select = el.querySelector('select[name="tipoRefeicaoId"]') as HTMLSelectElement;
    const opcoes = Array.from(select.options).map((o) => o.textContent?.trim());
    expect(opcoes).toContain('Almoço (11:30–13:00)');
    select.value = select.options[opcoes.indexOf('Almoço (11:30–13:00)')].value;
    select.dispatchEvent(new Event('change'));
    fixture.componentInstance.nomeRefeicao.set('Almoço completo');
    fixture.componentInstance.selecionarReceita(0, 'r1');
    fixture.componentInstance.enviar();

    expect(enviados[0].tipoRefeicaoId).toBe('id-almoco');
    expect(enviados[0].nomeRefeicao).toBe('Almoço completo');
  });

  it('nao envia sem refeição escolhida', () => {
    const fixture = TestBed.createComponent(CardapioFormComponent);
    fixture.componentRef.setInput('tiposRefeicao', tipos);
    fixture.componentRef.setInput('receitas', [{ id: 'r1', nome: 'Arroz', codigoExterno: null }]);
    fixture.detectChanges();
    let emitiu = false;
    fixture.componentInstance.salvar.subscribe(() => (emitiu = true));
    fixture.componentInstance.nomeRefeicao.set('Almoço completo');
    fixture.componentInstance.selecionarReceita(0, 'r1');
    fixture.componentInstance.enviar();
    expect(emitiu).toBeFalse();
  });

  it('nao envia sem item do catalogo escolhido', () => {
    const fixture = TestBed.createComponent(CardapioFormComponent);
    fixture.detectChanges();
    let emitiu = false;
    fixture.componentInstance.salvar.subscribe(() => (emitiu = true));
    fixture.componentInstance.tipoRefeicaoId.set('id-almoco');
    fixture.componentInstance.nomeRefeicao.set('Almoco');
    fixture.componentInstance.enviar();
    expect(emitiu).toBeFalse();
  });
});
