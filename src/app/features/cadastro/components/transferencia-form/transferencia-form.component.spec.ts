import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Turma, TransferenciaRequest } from '../../models/cadastro.models';
import { TransferenciaFormComponent } from './transferencia-form.component';

const turmas: Turma[] = [
  { id: 't-1', codigo: '5A', descricao: '5o ano A', turno: 'MANHA', quantidadeMaximaAlunos: 30 },
  { id: 't-2', codigo: '5B', descricao: '5o ano B', turno: 'TARDE', quantidadeMaximaAlunos: 30 },
];

describe('TransferenciaFormComponent', () => {
  let fixture: ComponentFixture<TransferenciaFormComponent>;
  let component: TransferenciaFormComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TransferenciaFormComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TransferenciaFormComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('turmas', turmas);
    fixture.detectChanges();
  });

  function botaoEnviar(): HTMLButtonElement {
    return fixture.nativeElement.querySelector('button[type="submit"]');
  }

  it('exige turma e data da mudanca antes de habilitar o envio', () => {
    expect(component.formularioValido()).toBeFalse();
    expect(botaoEnviar().disabled).toBeTrue();

    component.turmaId.set('t-2');
    fixture.detectChanges();
    expect(component.formularioValido()).toBeFalse();
    expect(botaoEnviar().disabled).toBeTrue();

    component.dataMudanca.set('2026-08-03');
    fixture.detectChanges();
    expect(component.formularioValido()).toBeTrue();
    expect(botaoEnviar().disabled).toBeFalse();
  });

  it('nao emite transferir enquanto o formulario esta incompleto', () => {
    const emitidos: TransferenciaRequest[] = [];
    component.transferir.subscribe((valor) => emitidos.push(valor));

    component.turmaId.set('t-2');
    component.enviar();

    expect(emitidos).toEqual([]);
  });

  it('emite transferir com turmaId e dataMudanca', () => {
    const emitidos: TransferenciaRequest[] = [];
    component.transferir.subscribe((valor) => emitidos.push(valor));

    component.turmaId.set('t-2');
    component.dataMudanca.set('2026-08-03');
    component.enviar();

    expect(emitidos).toEqual([{ turmaId: 't-2', dataMudanca: '2026-08-03' }]);
  });
  it('envia pelo submit do formulario com turma escolhida no select e data digitada no input', async () => {
    const emitidos: TransferenciaRequest[] = [];
    component.transferir.subscribe((valor) => emitidos.push(valor));
    const raiz: HTMLElement = fixture.nativeElement;

    const select = raiz.querySelector('select[name="turmaId"]') as HTMLSelectElement;
    select.value = 't-2';
    select.dispatchEvent(new Event('change'));
    const data = raiz.querySelector('input[name="dataMudanca"]') as HTMLInputElement;
    data.value = '2026-08-03';
    data.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(botaoEnviar().disabled).toBeFalse();
    botaoEnviar().click();

    expect(emitidos).toEqual([{ turmaId: 't-2', dataMudanca: '2026-08-03' }]);
  });
});
