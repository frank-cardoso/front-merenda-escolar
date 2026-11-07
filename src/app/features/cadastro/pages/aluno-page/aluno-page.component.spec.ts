import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { environment } from '../../../../../environments/environment';
import { NotificacaoService } from '../../../../shared/notificacao/notificacao.service';
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
const comRosto: Aluno = { ...resumo, id: 'a-2', matricula: '2026002', nome: 'João', temRostoCadastrado: true };
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
  let notificacao: NotificacaoService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AlunoPageComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    http = TestBed.inject(HttpTestingController);
    notificacao = TestBed.inject(NotificacaoService);
    spyOn(notificacao, 'erro');
    fixture = TestBed.createComponent(AlunoPageComponent);
    raiz = fixture.nativeElement;
    fixture.detectChanges();
    http.expectOne(`${base}/alunos`).flush([resumo, comRosto]);
    http.expectOne(`${base}/turmas`).flush(turmas);
    fixture.detectChanges();
  });

  afterEach(() => http.verify());

  const modalForm = () => raiz.querySelectorAll('dialog')[0] as HTMLDialogElement;
  const dialog = () => raiz.querySelectorAll('dialog')[1] as HTMLDialogElement;

  function botao(texto: string): HTMLButtonElement {
    const botoes = Array.from(raiz.querySelectorAll('button'));
    return botoes.find((b) => b.textContent?.trim() === texto) as HTMLButtonElement;
  }

  it('notifica a rejeicao da API quando a transferencia e invalida', async () => {
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

    expect(notificacao.erro).toHaveBeenCalledTimes(1);
    const mensagem = (notificacao.erro as jasmine.Spy).calls.mostRecent().args[0] as string;
    expect(mensagem).toContain('Data da mudanca anterior ao inicio do vinculo vigente');
    expect(mensagem).toContain('409');
    expect(raiz.querySelector('[role="alert"]')).toBeNull();
  });

  it('mostra na lista se o aluno tem rosto cadastrado', () => {
    const linhas = Array.from(raiz.querySelectorAll('tbody tr'));
    const celulaRosto = (linha: Element) => linha.querySelectorAll('td')[3].textContent?.trim();

    expect(celulaRosto(linhas[0])).toBe('Não');
    expect(celulaRosto(linhas[1])).toBe('Sim');
  });

  it('abre o cadastro de rosto direto pela linha da lista', () => {
    expect(raiz.querySelector('app-camera-foto')).toBeNull();

    botao('Rosto').click();
    http.expectOne(`${base}/alunos/a-1`).flush(detalhe);
    fixture.detectChanges();

    expect(raiz.querySelector('app-camera-foto')).not.toBeNull();
    expect(dialog().open).toBeTrue();
    expect(dialog().querySelector('h2')?.textContent).toContain('Maria');
    expect(dialog().querySelector('app-camera-foto')).not.toBeNull();
    expect(botao('Rosto').getAttribute('aria-label')).toBe('Cadastrar rosto de Maria');
  });

  it('Turma e histórico abre o modal do aluno sem câmera', () => {
    expect(dialog().open).toBeFalse();

    botao('Turma e histórico').click();
    http.expectOne(`${base}/alunos/a-1`).flush(detalhe);
    fixture.detectChanges();

    expect(dialog().open).toBeTrue();
    expect(dialog().querySelector('h2')?.textContent).toContain('Maria');
    expect(dialog().textContent).toContain('Histórico de vínculos');
    expect(dialog().querySelector('app-camera-foto')).toBeNull();
  });

  it('fechar o modal do aluno destrói a câmera', () => {
    botao('Rosto').click();
    http.expectOne(`${base}/alunos/a-1`).flush(detalhe);
    fixture.detectChanges();
    expect(raiz.querySelector('app-camera-foto')).not.toBeNull();

    (dialog().querySelector('button[aria-label="Fechar"]') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(dialog().open).toBeFalse();
    expect(raiz.querySelector('app-camera-foto')).toBeNull();

    botao('Turma e histórico').click();
    http.expectOne(`${base}/alunos/a-1`).flush(detalhe);
    fixture.detectChanges();
    expect(dialog().open).toBeTrue();
    expect(raiz.querySelector('app-camera-foto')).toBeNull();
  });

  it('Editar abre o modal com o formulário preenchido e Cancelar fecha', async () => {
    botao('Editar').click();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(modalForm().open).toBeTrue();
    expect(modalForm().querySelector('h2')?.textContent?.trim()).toBe('Editar aluno');
    expect((modalForm().querySelector('input[name="nome"]') as HTMLInputElement).value).toBe('Maria');

    botao('Cancelar').click();
    fixture.detectChanges();
    expect(modalForm().open).toBeFalse();
    expect(modalForm().querySelector('form')).toBeNull();
  });

  it('Novo aluno abre o modal e salvar com sucesso fecha, com erro mantém aberto', () => {
    botao('Novo aluno').click();
    fixture.detectChanges();
    expect(modalForm().open).toBeTrue();
    expect(modalForm().querySelector('h2')?.textContent?.trim()).toBe('Novo aluno');

    const c = fixture.componentInstance;
    c.codigoPublico.set('ALU-9'); c.matricula.set('9'); c.nome.set('Zé');
    c.salvar();
    http.expectOne({ method: 'POST', url: `${base}/alunos` })
      .flush({ detail: 'x' }, { status: 409, statusText: 'Conflict' });
    fixture.detectChanges();
    expect(modalForm().open).toBeTrue();

    c.salvar();
    http.expectOne({ method: 'POST', url: `${base}/alunos` }).flush({ ...resumo, id: 'a-9' });
    http.expectOne(`${base}/alunos`).flush([resumo, comRosto]);
    fixture.detectChanges();
    expect(modalForm().open).toBeFalse();
  });
});
