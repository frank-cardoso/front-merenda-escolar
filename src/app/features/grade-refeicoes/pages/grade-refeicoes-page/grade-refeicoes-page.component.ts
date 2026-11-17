import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { NotificacaoService } from '../../../../shared/notificacao/notificacao.service';
import { TipoRefeicaoApiService } from '../../../../shared/refeicao/tipo-refeicao-api.service';
import { TipoRefeicao, TipoRefeicaoRequest } from '../../../../shared/refeicao/tipo-refeicao.models';
import { ROTULO_TURNO, rotuloTurno } from '../../../../shared/refeicao/turnos';

@Component({
  selector: 'app-grade-refeicoes-page',
  imports: [FormsModule, ModalComponent],
  templateUrl: './grade-refeicoes-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GradeRefeicoesPageComponent implements OnInit {
  private readonly notificacao = inject(NotificacaoService);
  private readonly api = inject(TipoRefeicaoApiService);

  readonly turnos = Object.keys(ROTULO_TURNO);
  readonly rotuloTurno = rotuloTurno;

  readonly grade = signal<TipoRefeicao[]>([]);
  readonly carregando = signal(false);
  readonly salvando = signal(false);
  readonly emEdicao = signal<TipoRefeicao | null>(null);
  readonly formularioAberto = signal(false);

  readonly nome = signal('');
  readonly inicio = signal('');
  readonly fim = signal('');
  readonly turnosMarcados = signal<string[]>([]);

  ngOnInit(): void {
    this.carregar();
  }

  carregar(): void {
    this.carregando.set(true);
    this.api.listar()
      .pipe(finalize(() => this.carregando.set(false)))
      .subscribe({
        next: (grade) => this.grade.set(grade),
        error: () => this.notificacao.erro('Não foi possível carregar as refeições.'),
      });
  }

  janela(refeicao: TipoRefeicao): string {
    return `${hora(refeicao.inicio)}–${hora(refeicao.fim)}`;
  }

  abrirNova(): void {
    this.preencher(null);
    this.formularioAberto.set(true);
  }

  abrirEdicao(refeicao: TipoRefeicao): void {
    this.preencher(refeicao);
    this.formularioAberto.set(true);
  }

  fecharFormulario(): void {
    this.formularioAberto.set(false);
    this.emEdicao.set(null);
  }

  formularioValido(): boolean {
    return this.nome().trim().length > 0 && this.inicio().length > 0 && this.fim().length > 0;
  }

  turnoMarcado(turno: string): boolean {
    return this.turnosMarcados().includes(turno);
  }

  alternarTurno(turno: string, marcado: boolean): void {
    this.turnosMarcados.update((atuais) => marcado
      ? [...atuais.filter((t) => t !== turno), turno]
      : atuais.filter((t) => t !== turno));
  }

  salvar(): void {
    if (!this.formularioValido() || this.salvando()) return;

    const request: TipoRefeicaoRequest = {
      nome: this.nome().trim(),
      inicio: this.inicio(),
      fim: this.fim(),
      turnos: this.turnos.filter((turno) => this.turnoMarcado(turno)),
    };
    const emEdicao = this.emEdicao();
    const operacao = emEdicao ? this.api.atualizar(emEdicao.id, request) : this.api.criar(request);

    this.salvando.set(true);
    operacao.pipe(finalize(() => this.salvando.set(false))).subscribe({
      next: () => {
        this.notificacao.sucesso(emEdicao ? 'Refeição atualizada.' : 'Refeição cadastrada.');
        this.fecharFormulario();
        this.carregar();
      },
      error: (erro: HttpErrorResponse) => this.notificacao.erro(this.montarMensagemErro(erro)),
    });
  }

  private preencher(refeicao: TipoRefeicao | null): void {
    this.emEdicao.set(refeicao);
    this.nome.set(refeicao?.nome ?? '');
    this.inicio.set(refeicao ? hora(refeicao.inicio) : '');
    this.fim.set(refeicao ? hora(refeicao.fim) : '');
    this.turnosMarcados.set(refeicao ? [...refeicao.turnos] : []);
  }

  private montarMensagemErro(erro: HttpErrorResponse): string {
    if (erro.status === 0) {
      return 'Não foi possível comunicar com a API. Confirme se o backend está rodando em http://localhost:8081.';
    }
    return erro.error?.detail ?? `Erro ${erro.status} ao processar a solicitação.`;
  }
}

/** A API devolve `HH:mm:ss`; o input `time` e a tela usam `HH:mm`. */
function hora(valor: string): string {
  return valor.slice(0, 5);
}
