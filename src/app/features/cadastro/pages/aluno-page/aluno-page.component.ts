import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { NotificacaoService } from '../../../../shared/notificacao/notificacao.service';
import { montarMensagemErro } from '../../application/mensagem-erro';
import { TransferenciaFormComponent } from '../../components/transferencia-form/transferencia-form.component';
import { AlunoApiService } from '../../data-access/aluno-api.service';
import { TurmaApiService } from '../../data-access/turma-api.service';
import { Aluno, TransferenciaRequest, Turma } from '../../models/cadastro.models';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { CameraFotoComponent } from '../../../../shared/components/camera-foto/camera-foto.component';

@Component({
  selector: 'app-aluno-page',
  imports: [FormsModule, TransferenciaFormComponent, CameraFotoComponent, ModalComponent],
  templateUrl: './aluno-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AlunoPageComponent implements OnInit {
  private readonly notificacao = inject(NotificacaoService);
  private readonly alunoApi = inject(AlunoApiService);
  private readonly turmaApi = inject(TurmaApiService);

  readonly alunos = signal<Aluno[]>([]);
  readonly turmas = signal<Turma[]>([]);
  /** Detalhe do aluno aberto: so ele traz turma vigente e historico de vinculos. */
  readonly selecionado = signal<Aluno | null>(null);
  readonly carregando = signal(false);
  readonly salvando = signal(false);
  readonly transferindo = signal(false);
  readonly formularioAberto = signal(false);
  readonly transferenciaAberta = signal(false);
  readonly cadastroRostoAberto = signal(false);
  readonly salvandoRosto = signal(false);

  readonly emEdicao = signal<Aluno | null>(null);
  readonly codigoPublico = signal('');
  readonly matricula = signal('');
  readonly nome = signal('');
  readonly ativo = signal(true);
  readonly turmaInicialId = signal('');
  readonly dataInicio = signal('');

  readonly totalAtivos = computed(() => this.alunos().filter((aluno) => aluno.ativo).length);
  readonly percentualAtivos = computed(() => {
    const total = this.alunos().length;
    return total === 0 ? 0 : Math.round((this.totalAtivos() / total) * 1000) / 10;
  });
  readonly totalTurnos = computed(() => new Set(this.turmas().map((turma) => turma.turno)).size);

  ngOnInit(): void {
    this.carregar();
    this.turmaApi.listar().subscribe({
      next: (turmas) => this.turmas.set(turmas),
      error: (erro: HttpErrorResponse) => this.notificacao.erro(montarMensagemErro(erro)),
    });
  }

  carregar(): void {
    this.carregando.set(true);
    this.alunoApi.listar()
      .pipe(finalize(() => this.carregando.set(false)))
      .subscribe({
        next: (alunos) => this.alunos.set(alunos),
        error: (erro: HttpErrorResponse) => this.notificacao.erro(montarMensagemErro(erro)),
      });
  }

  abrirNovo(): void {
    this.preencher(null);
    this.formularioAberto.set(true);
  }

  abrirEdicao(aluno: Aluno): void {
    this.preencher(aluno);
    this.formularioAberto.set(true);
  }

  fecharFormulario(): void {
    this.formularioAberto.set(false);
    this.emEdicao.set(null);
  }

  formularioValido(): boolean {
    const novo = this.emEdicao() === null;
    const vinculoCompleto = (this.turmaInicialId() === '') === (this.dataInicio() === '');
    return this.matricula().trim().length > 0
      && this.nome().trim().length > 0
      && (!novo || (this.codigoPublico().trim().length > 0 && vinculoCompleto));
  }

  salvar(): void {
    if (!this.formularioValido()) return;

    const emEdicao = this.emEdicao();
    const base = { matricula: this.matricula().trim(), nome: this.nome().trim(), ativo: this.ativo() };
    const operacao = emEdicao
      ? this.alunoApi.atualizar(emEdicao.id, base)
      : this.alunoApi.criar({
        ...base,
        codigoPublico: this.codigoPublico().trim(),
        turmaId: this.turmaInicialId() || null,
        dataInicio: this.dataInicio() || null,
      });

    this.salvando.set(true);
    operacao.pipe(finalize(() => this.salvando.set(false))).subscribe({
      next: (aluno) => {
        this.notificacao.sucesso(emEdicao ? 'Aluno atualizado.' : 'Aluno cadastrado.');
        this.fecharFormulario();
        this.carregar();
        if (this.selecionado()?.id === aluno.id) this.selecionado.set(aluno);
      },
      error: (erro: HttpErrorResponse) => this.notificacao.erro(montarMensagemErro(erro)),
    });
  }

  verHistorico(aluno: Aluno, cadastrarRosto = false): void {
    this.transferenciaAberta.set(false);
    this.alunoApi.detalhar(aluno.id).subscribe({
      next: (detalhe) => {
        this.selecionado.set(detalhe);
        this.cadastroRostoAberto.set(cadastrarRosto);
      },
      error: (erro: HttpErrorResponse) => this.notificacao.erro(montarMensagemErro(erro)),
    });
  }

  fecharDetalhe(): void {
    this.selecionado.set(null);
    this.transferenciaAberta.set(false);
    this.cadastroRostoAberto.set(false);
  }

  abrirTransferencia(): void {
    this.transferenciaAberta.set(true);
  }

  abrirCadastroRosto(): void {
    this.cadastroRostoAberto.set(true);
  }

  /** A foto nunca é guardada aqui nem em lugar nenhum do front: segue direto para o backend virar embedding. */
  cadastrarRosto(fotoBase64: string): void {
    const aluno = this.selecionado();
    if (!aluno) return;

    this.salvandoRosto.set(true);
    this.alunoApi.cadastrarRosto(aluno.id, fotoBase64)
      .pipe(finalize(() => this.salvandoRosto.set(false)))
      .subscribe({
        next: (atualizado) => {
          this.selecionado.set(atualizado);
          this.cadastroRostoAberto.set(false);
          this.notificacao.sucesso('Rosto cadastrado.');
          this.carregar();
        },
        error: (erro: HttpErrorResponse) => this.notificacao.erro(montarMensagemErro(erro)),
      });
  }

  /** A API rejeita data anterior ao inicio do vinculo vigente e sobreposicao; a rejeicao aparece na tela. */
  transferir(request: TransferenciaRequest): void {
    const aluno = this.selecionado();
    if (!aluno) return;

    this.transferindo.set(true);
    this.alunoApi.transferir(aluno.id, request)
      .pipe(finalize(() => this.transferindo.set(false)))
      .subscribe({
        next: (detalhe) => {
          this.selecionado.set(detalhe);
          this.transferenciaAberta.set(false);
          this.notificacao.sucesso('Transferência registrada.');
        },
        error: (erro: HttpErrorResponse) => this.notificacao.erro(montarMensagemErro(erro)),
      });
  }

  private preencher(aluno: Aluno | null): void {
    this.emEdicao.set(aluno);
    this.codigoPublico.set(aluno?.codigoPublico ?? '');
    this.matricula.set(aluno?.matricula ?? '');
    this.nome.set(aluno?.nome ?? '');
    this.ativo.set(aluno?.ativo ?? true);
    this.turmaInicialId.set('');
    this.dataInicio.set('');
  }
}
