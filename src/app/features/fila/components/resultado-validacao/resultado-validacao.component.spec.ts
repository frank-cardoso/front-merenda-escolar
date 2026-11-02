import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ValidarConsumoResponse } from '../../models/fila.models';
import { ResultadoValidacaoComponent } from './resultado-validacao.component';

describe('ResultadoValidacaoComponent', () => {
  let fixture: ComponentFixture<ResultadoValidacaoComponent>;

  const base: ValidarConsumoResponse = {
    resultado: 'BLOQUEADO', sinal: 'VERMELHO', alunoId: null, alunoNome: null,
    turno: null, cardapio: null, registradoEm: null, motivo: null,
  };

  function render(resposta: ValidarConsumoResponse): string {
    fixture = TestBed.createComponent(ResultadoValidacaoComponent);
    fixture.componentRef.setInput('resultado', resposta);
    fixture.detectChanges();
    return (fixture.nativeElement as HTMLElement).textContent ?? '';
  }

  beforeEach(() => TestBed.configureTestingModule({ imports: [ResultadoValidacaoComponent] }));

  it('mostra o resultado em texto e o motivo traduzido sem numero fixo', () => {
    const texto = render({ ...base, motivo: 'CONSUMO_RECENTE_BLOQUEADO' });
    expect(texto).toContain('BLOQUEADO');
    expect(texto).toContain('Consumo recente');
    expect(texto).toContain('CONSUMO_RECENTE_BLOQUEADO');
    expect(texto).not.toMatch(/\d+ minutos?/);
  });

  it('mostra AUTORIZADO com nome e cardapio', () => {
    const texto = render({ ...base, resultado: 'AUTORIZADO', sinal: 'VERDE', alunoNome: 'Ana', cardapio: 'Arroz' });
    expect(texto).toContain('AUTORIZADO');
    expect(texto).toContain('Ana');
    expect(texto).toContain('Arroz');
  });

  it('motivo desconhecido aparece como veio do backend', () => {
    expect(render({ ...base, motivo: 'OUTRO_CODIGO' })).toContain('OUTRO_CODIGO');
  });
});
