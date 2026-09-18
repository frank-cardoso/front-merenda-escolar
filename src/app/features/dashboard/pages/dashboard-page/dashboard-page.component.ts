import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subscription, exhaustMap, finalize, map, switchMap, takeWhile, timeout, timer } from 'rxjs';
import { DashboardApiService } from '../../data-access/dashboard-api.service';
import { ConsolidacaoConsumo, RelatorioIA, RelatorioResumo, Turno } from '../../models/dashboard.models';
import { IndicadoresLogisticos } from '../../models/indicadores.models';
import { IndicadoresLogisticosComponent } from '../../components/indicadores-logisticos/indicadores-logisticos.component';

@Component({
  selector: 'app-dashboard-page',
  imports: [FormsModule, IndicadoresLogisticosComponent],
  templateUrl: './dashboard-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardPageComponent implements OnInit {
  private static readonly LIMITE_CONSULTAS_RELATORIO = 40;
  private readonly dashboardApi = inject(DashboardApiService);
  private consultas = new Subscription();
  private acompanhamento = new Subscription();
  private historicoConsulta = new Subscription();

  readonly turnos: Turno[] = ['MANHA', 'TARDE', 'NOITE', 'INTEGRAL'];
  readonly dataReferencia = signal(this.formatarDataLocal(new Date()));
  readonly turno = signal<Turno>('NOITE');
  readonly consolidacao = signal<ConsolidacaoConsumo | null>(null);
  readonly relatorio = signal<RelatorioIA | null>(null);
  readonly historico = signal<RelatorioResumo[]>([]);
  readonly indicadoresAtuais = signal<IndicadoresLogisticos | null>(null);
  readonly indicadoresExibidos = computed(() => this.relatorio()
    ? this.relatorio()!.indicadores : this.indicadoresAtuais());
  readonly carregandoConsolidacao = signal(false);
  readonly carregandoIndicadores = signal(false);
  readonly gerandoRelatorio = signal(false);
  readonly erro = signal<string | null>(null);
  readonly erroIndicadores = signal<string | null>(null);
  readonly erroHistorico = signal<string | null>(null);

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      this.consultas.unsubscribe();
      this.acompanhamento.unsubscribe();
      this.historicoConsulta.unsubscribe();
    });
  }

  ngOnInit(): void { this.carregarConsolidacao(); }

  carregarConsolidacao(): void {
    this.consultas.unsubscribe();
    this.consultas = new Subscription();
    this.consolidacao.set(null);
    this.indicadoresAtuais.set(null);
    this.carregandoConsolidacao.set(true);
    this.carregandoIndicadores.set(true);
    this.erro.set(null);
    this.erroIndicadores.set(null);
    const data = this.dataReferencia();
    const turno = this.turno();
    this.consultas.add(this.dashboardApi.buscarConsolidacao(data, turno)
      .pipe(finalize(() => this.carregandoConsolidacao.set(false)))
      .subscribe({ next: dados => this.consolidacao.set(dados),
        error: erro => this.erro.set(this.montarMensagemErro(erro)) }));
    this.consultas.add(this.dashboardApi.buscarIndicadores(data, turno)
      .pipe(finalize(() => this.carregandoIndicadores.set(false)))
      .subscribe({ next: dados => this.indicadoresAtuais.set(dados),
        error: () => this.erroIndicadores.set('Não foi possível carregar os indicadores. Tente atualizar.') }));
    this.carregarHistorico();
  }

  gerarRelatorio(): void {
    this.acompanhamento.unsubscribe();
    this.gerandoRelatorio.set(true);
    this.relatorio.set(null);
    this.erro.set(null);
    this.acompanhamento = this.dashboardApi.criarRelatorio({
      dataReferencia: this.dataReferencia(), turno: this.turno(),
    }).pipe(
      switchMap(resposta => this.consultarAteTerminar(resposta.relatorioId)),
      finalize(() => this.gerandoRelatorio.set(false)),
    ).subscribe({ next: dados => this.receberRelatorio(dados),
      error: erro => this.erro.set(this.montarMensagemErro(erro)) });
  }

  abrirRelatorio(id: string): void {
    if (!id) return;
    this.acompanhamento.unsubscribe();
    this.relatorio.set(null);
    this.erro.set(null);
    this.gerandoRelatorio.set(true);
    this.acompanhamento = this.consultarAteTerminar(id)
      .pipe(finalize(() => this.gerandoRelatorio.set(false)))
      .subscribe({ next: dados => this.receberRelatorio(dados),
        error: erro => this.erro.set(this.montarMensagemErro(erro)) });
  }

  verIndicadoresAtuais(): void {
    this.acompanhamento.unsubscribe();
    this.relatorio.set(null);
    this.carregarConsolidacao();
  }

  atualizarFiltros(campo: 'data' | 'turno', valor: string): void {
    if (!valor) return;
    this.acompanhamento.unsubscribe();
    if (campo === 'data') this.dataReferencia.set(valor);
    if (campo === 'turno') this.turno.set(valor as Turno);
    this.relatorio.set(null);
    this.carregarConsolidacao();
  }

  private consultarAteTerminar(id: string) {
    let consultasConcluidas = 0;
    return timer(0, 1500).pipe(
      exhaustMap(() => this.dashboardApi.buscarRelatorio(id).pipe(timeout(10000))),
      map(relatorio => ({ relatorio, tentativa: ++consultasConcluidas })),
      takeWhile(({ relatorio, tentativa }) => this.emAndamento(relatorio)
        && tentativa < DashboardPageComponent.LIMITE_CONSULTAS_RELATORIO, true),
    );
  }

  private receberRelatorio({ relatorio, tentativa }: { relatorio: RelatorioIA; tentativa: number }): void {
    this.relatorio.set(relatorio);
    if (!this.emAndamento(relatorio)) this.carregarHistorico();
    if (this.emAndamento(relatorio) && tentativa >= DashboardPageComponent.LIMITE_CONSULTAS_RELATORIO) {
      this.erro.set('O relatório ainda está em processamento. Reabra-o no histórico para consultar novamente.');
      this.carregarHistorico();
    }
  }

  private carregarHistorico(): void {
    this.historicoConsulta.unsubscribe();
    this.historico.set([]);
    this.erroHistorico.set(null);
    this.historicoConsulta = this.dashboardApi.listarRelatorios(this.dataReferencia(), this.turno())
      .subscribe({ next: dados => this.historico.set(dados),
        error: () => this.erroHistorico.set('Não foi possível carregar o histórico de relatórios.') });
  }

  private emAndamento(relatorio: RelatorioIA): boolean {
    return relatorio.status === 'PENDENTE' || relatorio.status === 'PROCESSANDO';
  }

  private montarMensagemErro(erro: HttpErrorResponse): string {
    if (erro.status === 0) return 'Não foi possível comunicar com a API. Confirme se o backend está rodando.';
    if (erro.status === 404) return 'Cardápio ou relatório não encontrado para os filtros selecionados.';
    return `Erro ${erro.status} ao carregar o dashboard. Tente novamente.`;
  }

  private formatarDataLocal(data: Date): string {
    return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}-${String(data.getDate()).padStart(2, '0')}`;
  }
}
