import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { montarMensagemErro } from '../../application/mensagem-erro';
import { TurmaApiService } from '../../data-access/turma-api.service';
import { Turma, TurmaRequest, Turno } from '../../models/cadastro.models';

@Component({
  selector: 'app-turma-page',
  imports: [FormsModule],
  templateUrl: './turma-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TurmaPageComponent implements OnInit {
  private readonly turmaApi = inject(TurmaApiService);

  readonly turnos: Turno[] = ['MANHA', 'TARDE', 'NOITE', 'INTEGRAL'];

  readonly turmas = signal<Turma[]>([]);
  readonly carregando = signal(false);
  readonly salvando = signal(false);
  readonly emEdicao = signal<Turma | null>(null);
  readonly formularioAberto = signal(false);
  readonly erro = signal<string | null>(null);
  readonly aviso = signal<string | null>(null);

  readonly codigo = signal('');
  readonly descricao = signal('');
  readonly turno = signal<Turno>('MANHA');
  readonly quantidadeMaxima = signal<number | null>(null);

  readonly capacidadeTotal = computed(() =>
    this.turmas().reduce((soma, turma) => soma + (turma.quantidadeMaximaAlunos ?? 0), 0));
  readonly turnoPrincipal = computed(() => {
    const contagem = new Map<Turno, number>();
    for (const turma of this.turmas()) contagem.set(turma.turno, (contagem.get(turma.turno) ?? 0) + 1);
    let melhor: { turno: Turno; total: number } | null = null;
    for (const [turno, total] of contagem) {
      if (!melhor || total > melhor.total) melhor = { turno, total };
    }
    return melhor;
  });

  ngOnInit(): void {
    this.carregar();
  }

  carregar(): void {
    this.carregando.set(true);
    this.turmaApi.listar()
      .pipe(finalize(() => this.carregando.set(false)))
      .subscribe({
        next: (turmas) => this.turmas.set(turmas),
        error: (erro: HttpErrorResponse) => this.erro.set(montarMensagemErro(erro)),
      });
  }

  abrirNova(): void {
    this.preencher(null);
    this.formularioAberto.set(true);
  }

  abrirEdicao(turma: Turma): void {
    this.preencher(turma);
    this.formularioAberto.set(true);
  }

  fecharFormulario(): void {
    this.formularioAberto.set(false);
    this.emEdicao.set(null);
  }

  formularioValido(): boolean {
    return this.codigo().trim().length > 0 && this.descricao().trim().length > 0;
  }

  salvar(): void {
    if (!this.formularioValido()) return;

    const request: TurmaRequest = {
      codigo: this.codigo().trim(),
      descricao: this.descricao().trim(),
      turno: this.turno(),
      quantidadeMaximaAlunos: this.quantidadeMaxima() ? Number(this.quantidadeMaxima()) : null,
    };
    const emEdicao = this.emEdicao();
    const operacao = emEdicao
      ? this.turmaApi.atualizar(emEdicao.id, request)
      : this.turmaApi.criar(request);

    this.salvando.set(true);
    this.limparMensagens();
    operacao.pipe(finalize(() => this.salvando.set(false))).subscribe({
      next: () => {
        this.aviso.set(emEdicao ? 'Turma atualizada.' : 'Turma cadastrada.');
        this.fecharFormulario();
        this.carregar();
      },
      error: (erro: HttpErrorResponse) => this.erro.set(montarMensagemErro(erro)),
    });
  }

  /** Turma em uso devolve 409; a mensagem da API e exibida como veio. */
  excluir(turma: Turma): void {
    if (!confirm(`Excluir a turma "${turma.codigo}"?`)) return;

    this.limparMensagens();
    this.turmaApi.excluir(turma.id).subscribe({
      next: () => {
        this.aviso.set('Turma excluída.');
        this.carregar();
      },
      error: (erro: HttpErrorResponse) => this.erro.set(montarMensagemErro(erro)),
    });
  }

  private preencher(turma: Turma | null): void {
    this.emEdicao.set(turma);
    this.codigo.set(turma?.codigo ?? '');
    this.descricao.set(turma?.descricao ?? '');
    this.turno.set(turma?.turno ?? 'MANHA');
    this.quantidadeMaxima.set(turma?.quantidadeMaximaAlunos ?? null);
    this.limparMensagens();
  }

  private limparMensagens(): void {
    this.erro.set(null);
    this.aviso.set(null);
  }
}
