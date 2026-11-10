import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { PendenciasFechamentoComponent } from './pendencias-fechamento.component';
import { FechamentoPendente } from '../../../fechamento/models/painel.models';

const CAFE: FechamentoPendente = {
  data: '2026-03-09', tipoRefeicaoId: 'id-cafe', refeicao: 'Café da manhã', itensCardapio: 3, itensMedidos: 0,
};
const ALMOCO: FechamentoPendente = {
  data: '2026-03-08', tipoRefeicaoId: 'id-almoco', refeicao: 'Almoço', itensCardapio: 4, itensMedidos: 2,
};

function montar(pendencias: FechamentoPendente[]) {
  TestBed.configureTestingModule({ providers: [provideRouter([])] });
  const fixture = TestBed.createComponent(PendenciasFechamentoComponent);
  fixture.componentRef.setInput('pendencias', pendencias);
  fixture.detectChanges();
  return fixture;
}

describe('PendenciasFechamentoComponent', () => {
  it('não renderiza nada sem pendências', () => {
    const fixture = montar([]);
    expect(fixture.nativeElement.textContent.trim()).toBe('');
    expect(fixture.nativeElement.querySelector('section')).toBeNull();
  });

  it('resume no plural e lista cada refeição com link para o fechamento', () => {
    const fixture = montar([CAFE, ALMOCO]);
    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('2 refeições sem fechamento nos últimos 7 dias');
    const links = Array.from(el.querySelectorAll('a'));
    expect(links.map(a => a.textContent?.trim())).toEqual(['09/03 • Café da manhã', '08/03 • Almoço']);
    const url = new URL(links[0].href);
    expect(url.pathname).toBe('/fechamento');
    expect(url.searchParams.get('data')).toBe('2026-03-09');
    expect(url.searchParams.get('refeicao')).toBe('id-cafe');
  });

  it('usa o singular com uma pendência', () => {
    const fixture = montar([CAFE]);
    expect(fixture.nativeElement.textContent).toContain('1 refeição sem fechamento nos últimos 7 dias');
  });
});
