import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { environment } from '../../../../../environments/environment';
import { Aluno, Turma } from '../../models/cadastro.models';
import { AlunoPageComponent } from './aluno-page.component';

const base = environment.apiBaseUrl;
const turmas: Turma[] = [
  { id: 't-1', codigo: '5A', descricao: '5o ano A', turno: 'MANHA', quantidadeMaximaAlunos: 30 },
  { id: 't-2', codigo: '5B', descricao: '5o ano B', turno: 'TARDE', quantidadeMaximaAlunos: 30 },
];
const resumo: Aluno = {
  id: 'a-1', codigoPublico: 'ALU-1', matricula: '2026001', nome: 'Maria', ativo: true,
  temRostoCadastrado: false, turmaVigente: null, historicoVinculos: null,
};
const detalhe: Aluno = {
  ...resumo,
  turmaVigente: {
    id: 'v-1', turmaId: 't-1', turmaCodigo: '5A', turmaDescricao: '5o ano A',
    dataInicio: '2026-02-01', dataFim: null,
  },
  historicoVinculos: [{
    id: 'v-1', turmaId: 't-1', turmaCodigo: '5A', turmaDescricao: '5o ano A',
    dataInicio: '2026-02-01', dataFim: null,
  }],
};

describe('AlunoPageComponent', () => {
  let fixture: ComponentFixture<AlunoPageComponent>;
  let http: HttpTestingController;
  let raiz: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AlunoPageComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(AlunoPageComponent);
    raiz = fixture.nativeElement;
    fixture.detectChanges();
    http.expectOne(`${base}/alunos`).flush([resumo]);
    http.expectOne(`${base}/turmas`).flush(turmas);
    fixture.detectChanges();
  });

  afterEach(() => http.verify());

  function botao(texto: string): HTMLButtonElement {
    const botoes = Array.from(raiz.querySelectorAll('button'));
    return botoes.find((b) => b.textContent?.trim() === texto) as HTMLButtonElement;
  }

  it('mostra no alerta a rejeicao da API quando a transferencia e invalida', async () => {
    botao('Turma e histórico').click();
    http.expectOne(`${base}/alunos/a-1`).flush(detalhe);
    fixture.detectChanges();

    botao('Transferir de turma').click();
    fixture.detectChanges();
    await fixture.whenStable();

    const select = raiz.querySelector('select[name="turmaId"]') as HTMLSelectElement;
    select.value = 't-2';
    select.dispatchEvent(new Event('change'));
    const data = raiz.querySelector('input[name="dataMudanca"]') as HTMLInputElement;
    data.value = '2026-01-10';
    data.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const enviar = raiz.querySelector('app-transferencia-form button[type="submit"]') as HTMLButtonElement;
    enviar.click();

    const requisicao = http.expectOne(`${base}/alunos/a-1/transferencias`);
    expect(requisicao.request.body).toEqual({ turmaId: 't-2', dataMudanca: '2026-01-10' });
    requisicao.flush(
      { detail: 'Data da mudanca anterior ao inicio do vinculo vigente' },
      { status: 409, statusText: 'Conflict' });
    fixture.detectChanges();

    const alerta = raiz.querySelector('[role="alert"]');
    expect(alerta?.textContent).toContain('Data da mudanca anterior ao inicio do vinculo vigente');
    expect(alerta?.textContent).toContain('409');
  });
});
