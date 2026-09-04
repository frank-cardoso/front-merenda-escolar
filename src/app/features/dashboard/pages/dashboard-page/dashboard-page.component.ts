import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize, map, switchMap, takeWhile, timer } from 'rxjs';
import { DashboardApiService } from '../../data-access/dashboard-api.service';
import { ConsolidacaoConsumo, RelatorioIA, Turno } from '../../models/dashboard.models';

@Component({
  selector: 'app-dashboard-page',
  imports: [FormsModule],
  templateUrl: './dashboard-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardPageComponent implements OnInit {
  private static readonly LIMITE_CONSULTAS_RELATORIO = 40;

  private readonly dashboardApi = inject(DashboardApiService);
  private readonly destroyRef = inject(DestroyRef);

  readonly turnos: Turno[] = ['MANHA', 'TARDE', 'NOITE', 'INTEGRAL'];
  readonly dataReferencia = signal(this.formatarDataLocal(new Date()));
  readonly turno = signal<Turno>('NOITE');
  readonly consolidacao = signal<ConsolidacaoConsumo | null>(null);
  readonly relatorio = signal<RelatorioIA | null>(null);
  readonly carregandoConsolidacao = signal(false);
  readonly gerandoRelatorio = signal(false);
  readonly erro = signal<string | null>(null);

  ngOnInit(): void {
    this.carregarConsolidacao();
  }

  carregarConsolidacao(): void {
    this.carregandoConsolidacao.set(true);
    this.erro.set(null);

    this.dashboardApi.buscarConsolidacao(this.dataReferencia(), this.turno())
      .pipe(finalize(() => this.carregandoConsolidacao.set(false)))
      .subscribe({
        next: (consolidacao) => this.consolidacao.set(consolidacao),
        error: (erro: HttpErrorResponse) => this.erro.set(this.montarMensagemErro(erro)),
      });
  }

  gerarRelatorio(): void {
    this.gerandoRelatorio.set(true);
    this.relatorio.set(null);
    this.erro.set(null);

    this.dashboardApi.criarRelatorio({
      dataReferencia: this.dataReferencia(),
      turno: this.turno(),
    }).pipe(
      switchMap((resposta) => timer(0, 1500).pipe(
        switchMap((tentativa) => this.dashboardApi.buscarRelatorio(resposta.relatorioId).pipe(
          map((relatorio) => ({ relatorio, tentativa })),
        )),
        takeWhile(
          ({ relatorio, tentativa }) => this.deveContinuarConsultando(relatorio, tentativa),
          true,
        ),
      )),
      finalize(() => this.gerandoRelatorio.set(false)),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe({
      next: ({ relatorio, tentativa }) => {
        this.relatorio.set(relatorio);
        if (this.atingiuLimiteDeConsultas(relatorio, tentativa)) {
          this.erro.set('O relatorio ainda esta em processamento. Tente consultar novamente em alguns instantes.');
        }
      },
      error: (erro: HttpErrorResponse) => {
        this.gerandoRelatorio.set(false);
        this.erro.set(this.montarMensagemErro(erro));
      },
    });
  }

  atualizarFiltros(campo: 'data' | 'turno', valor: string): void {
    if (campo === 'data') this.dataReferencia.set(valor);
    if (campo === 'turno') this.turno.set(valor as Turno);
    this.relatorio.set(null);
    this.carregarConsolidacao();
  }

  private relatorioEstaEmAndamento(relatorio: RelatorioIA): boolean {
    return relatorio.status === 'PENDENTE' || relatorio.status === 'PROCESSANDO';
  }

  private deveContinuarConsultando(relatorio: RelatorioIA, tentativa: number): boolean {
    return this.relatorioEstaEmAndamento(relatorio)
      && tentativa < DashboardPageComponent.LIMITE_CONSULTAS_RELATORIO;
  }

  private atingiuLimiteDeConsultas(relatorio: RelatorioIA, tentativa: number): boolean {
    return this.relatorioEstaEmAndamento(relatorio)
      && tentativa >= DashboardPageComponent.LIMITE_CONSULTAS_RELATORIO;
  }

  private montarMensagemErro(erro: HttpErrorResponse): string {
    if (erro.status === 0) {
      return 'Nao foi possivel comunicar com a API. Confirme se o backend esta rodando em http://localhost:8081.';
    }

    if (erro.status === 404) {
      return 'Nao existe cardapio configurado para a data e turno selecionados.';
    }

    return `Erro ${erro.status} ao carregar dashboard. Verifique o backend e tente novamente.`;
  }

  private formatarDataLocal(data: Date): string {
    const ano = data.getFullYear();
    const mes = String(data.getMonth() + 1).padStart(2, '0');
    const dia = String(data.getDate()).padStart(2, '0');
    return `${ano}-${mes}-${dia}`;
  }
}
