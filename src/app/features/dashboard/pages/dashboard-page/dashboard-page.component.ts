import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subscription, exhaustMap, finalize, map, switchMap, takeWhile, timeout, timer } from 'rxjs';
import { rotuloRefeicao, TipoRefeicao } from '../../../../shared/refeicao/tipo-refeicao.models';
import { TipoRefeicaoApiService } from '../../../../shared/refeicao/tipo-refeicao-api.service';
import { DashboardApiService } from '../../data-access/dashboard-api.service';
import { ConsolidacaoConsumo, RelatorioIA, RelatorioResumo, ROTULO_STATUS_RELATORIO } from '../../models/dashboard.models';
import { dataBr, dataHoraLocal } from '../../models/formato';
import { IndicadoresLogisticos } from '../../models/indicadores.models';
import { FechamentoPainelApiService } from '../../../fechamento/data-access/fechamento-painel-api.service';
import { FechamentoPendente } from '../../../fechamento/models/painel.models';
import { PendenciasFechamentoComponent } from '../../components/pendencias-fechamento/pendencias-fechamento.component';
import { IndicadoresLogisticosComponent } from '../../components/indicadores-logisticos/indicadores-logisticos.component';
import { RelatorioIaComponent } from '../../components/relatorio-ia/relatorio-ia.component';

@Component({
  selector: 'app-dashboard-page',
  imports: [FormsModule, IndicadoresLogisticosComponent, PendenciasFechamentoComponent, RelatorioIaComponent],
  templateUrl: './dashboard-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardPageComponent implements OnInit {
  private static readonly LIMITE_CONSULTAS_RELATORIO = 40;
  readonly minimoFechamentosIA = 20;
  readonly dataBr = dataBr;
  readonly rotuloStatus = ROTULO_STATUS_RELATORIO;
  private readonly dashboardApi = inject(DashboardApiService);
  private readonly tipoRefeicaoApi = inject(TipoRefeicaoApiService);
  private readonly painelApi = inject(FechamentoPainelApiService);
  private consultas = new Subscription();
  private acompanhamento = new Subscription();
  private historicoConsulta = new Subscription();
  private pendenciasConsulta = new Subscription();

  readonly rotuloRefeicao = rotuloRefeicao;
  readonly tiposRefeicao = signal<TipoRefeicao[]>([]);
  readonly aba = signal<'indicadores' | 'analise'>('indicadores');
  readonly dataReferencia = signal(this.formatarDataLocal(new Date()));
  readonly tipoRefeicaoId = signal('');
  readonly turmaSelecionada = signal<string>('TODAS');
  readonly consolidacao = signal<ConsolidacaoConsumo | null>(null);
  readonly relatorio = signal<RelatorioIA | null>(null);
  readonly historico = signal<RelatorioResumo[]>([]);
  readonly pendencias = signal<FechamentoPendente[]>([]);
  readonly indicadoresAtuais = signal<IndicadoresLogisticos | null>(null);
  readonly carregandoConsolidacao = signal(false);
  readonly carregandoIndicadores = signal(false);
  readonly gerandoRelatorio = signal(false);
  readonly erro = signal<string | null>(null);
  readonly erroConsolidacao = signal<string | null>(null);
  readonly erroIndicadores = signal<string | null>(null);
  readonly erroHistorico = signal<string | null>(null);

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      this.consultas.unsubscribe();
      this.acompanhamento.unsubscribe();
      this.historicoConsulta.unsubscribe();
      this.pendenciasConsulta.unsubscribe();
    });
  }

  ngOnInit(): void {
    this.carregarPendencias();
    this.tipoRefeicaoApi.listar().subscribe({
      next: tipos => {
        const ordenados = [...tipos].sort((a, b) => a.ordem - b.ordem);
        this.tiposRefeicao.set(ordenados);
        if (!ordenados.length) return;
        this.tipoRefeicaoId.set(ordenados[0].id);
        this.carregarConsolidacao();
      },
      error: () => this.erroConsolidacao.set('Não foi possível carregar as refeições.'),
    });
  }

  selecionarAba(aba: 'indicadores' | 'analise'): void {
    if (this.aba() === aba) return;
    this.aba.set(aba);
    if (aba === 'analise') {
      this.carregarHistorico();
      if (!this.indicadoresAtuais()) this.carregarIndicadoresParaAnalise();
    }
    else this.carregarConsolidacao();
  }

  carregarConsolidacao(): void {
    this.consultas.unsubscribe();
    this.consultas = new Subscription();
    this.consolidacao.set(null);
    this.indicadoresAtuais.set(null);
    this.carregandoConsolidacao.set(true);
    this.carregandoIndicadores.set(true);
    this.erroConsolidacao.set(null);
    this.erroIndicadores.set(null);
    const data = this.dataReferencia();
    const tipoRefeicaoId = this.tipoRefeicaoId();
    this.consultas.add(this.dashboardApi.buscarConsolidacao(data, tipoRefeicaoId)
      .pipe(finalize(() => this.carregandoConsolidacao.set(false)))
      .subscribe({ next: dados => this.consolidacao.set(dados),
        error: erro => this.erroConsolidacao.set(this.montarMensagemErro(erro)) }));
    this.consultas.add(this.dashboardApi.buscarIndicadores(data, tipoRefeicaoId)
      .pipe(finalize(() => this.carregandoIndicadores.set(false)))
      .subscribe({ next: dados => this.indicadoresAtuais.set(dados),
        error: () => this.erroIndicadores.set('Não foi possível carregar os indicadores. Tente atualizar.') }));
  }

  gerarRelatorio(): void {
    if (!this.analisePronta()) return;
    this.acompanhamento.unsubscribe();
    this.gerandoRelatorio.set(true);
    this.relatorio.set(null);
    this.erro.set(null);
    const turmaId = this.turmaIdSelecionada();
    const request = {
      dataReferencia: this.dataReferencia(), tipoRefeicaoId: this.tipoRefeicaoId(),
      ...(turmaId ? { turmaId } : {}),
    };
    this.acompanhamento = this.dashboardApi.criarRelatorio(request).pipe(
      switchMap(resposta => this.consultarAteTerminar(resposta.relatorioId)),
      finalize(() => this.gerandoRelatorio.set(false)),
    ).subscribe({ next: dados => this.receberRelatorio(dados),
      error: erro => this.erro.set(this.montarMensagemErro(erro)) });
  }

  fechamentosMensais(): number {
    return this.indicadoresAtuais()?.quantidadeFechamentosDoMes ?? 0;
  }

  analisePronta(): boolean {
    return this.fechamentosMensais() >= this.minimoFechamentosIA;
  }

  rotuloRelatorio(item: RelatorioResumo): string {
    return `${dataHoraLocal(item.criadoEm)} · ${this.rotuloStatus[item.status]}`;
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

  selecionarTurma(valor: string): void {
    this.turmaSelecionada.set(valor);
  }

  nomeRefeicaoSelecionada(): string {
    return this.tiposRefeicao().find(tipo => tipo.id === this.tipoRefeicaoId())?.nome ?? '';
  }

  nomeTurmaSelecionada(): string {
    if (this.turmaSelecionada() === 'TODAS') return '';
    const turma = this.indicadoresAtuais()?.porTurma
      .find(item => (item.turmaId ?? item.turma) === this.turmaSelecionada());
    return turma?.turma ?? '';
  }

  /** null para "Todas as turmas" e para o balde "Sem turma" (turmaId nao é um UUID real). */
  turmaIdSelecionada(): string | null {
    if (this.turmaSelecionada() === 'TODAS') return null;
    const turma = this.indicadoresAtuais()?.porTurma
      .find(item => (item.turmaId ?? item.turma) === this.turmaSelecionada());
    return turma?.turmaId ?? null;
  }

  dataReferenciaFormatada(): string {
    return dataBr(this.dataReferencia());
  }

  verIndicadoresAtuais(): void {
    this.carregarConsolidacao();
  }

  atualizarFiltros(campo: 'data' | 'refeicao', valor: string): void {
    if (!valor) return;
    this.acompanhamento.unsubscribe();
    this.consultas.unsubscribe();
    this.historicoConsulta.unsubscribe();
    if (campo === 'data') {
      this.dataReferencia.set(valor);
      this.carregarPendencias();
    }
    if (campo === 'refeicao') this.tipoRefeicaoId.set(valor);
    this.turmaSelecionada.set('TODAS');
    this.relatorio.set(null);
    this.consolidacao.set(null);
    this.indicadoresAtuais.set(null);
    this.historico.set([]);
    this.erro.set(null);
    this.erroConsolidacao.set(null);
    this.erroIndicadores.set(null);
    this.erroHistorico.set(null);
    if (this.aba() === 'indicadores') this.carregarConsolidacao();
    else {
      this.carregarHistorico();
      this.carregarIndicadoresParaAnalise();
    }
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

  /** Aviso auxiliar: se a consulta falhar, some em silêncio e não atrapalha os indicadores. */
  private carregarPendencias(): void {
    this.pendenciasConsulta.unsubscribe();
    this.pendencias.set([]);
    this.pendenciasConsulta = this.painelApi.pendencias(this.dataReferencia(), 7)
      .subscribe({ next: dados => this.pendencias.set(dados), error: () => this.pendencias.set([]) });
  }

  private carregarHistorico(): void {
    this.historicoConsulta.unsubscribe();
    this.historico.set([]);
    this.erroHistorico.set(null);
    this.historicoConsulta = this.dashboardApi.listarRelatorios(this.dataReferencia(), this.tipoRefeicaoId())
      .subscribe({ next: dados => this.historico.set(dados),
        error: () => this.erroHistorico.set('Não foi possível carregar o histórico de relatórios.') });
  }

  private carregarIndicadoresParaAnalise(): void {
    this.indicadoresAtuais.set(null);
    this.erroIndicadores.set(null);
    const data = this.dataReferencia();
    const tipoRefeicaoId = this.tipoRefeicaoId();
    this.consultas.unsubscribe();
    this.consultas = new Subscription();
    this.consultas.add(this.dashboardApi.buscarIndicadores(data, tipoRefeicaoId)
      .subscribe({ next: dados => this.indicadoresAtuais.set(dados),
        error: () => this.erroIndicadores.set('Não foi possível verificar a amostra dos fechamentos.') }));
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
