import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subscription, exhaustMap, finalize, map, switchMap, takeWhile, timeout, timer } from 'rxjs';
import { DashboardApiService } from '../../data-access/dashboard-api.service';
import { CardapioAnalise, ConsolidacaoConsumo, RelatorioIA, RelatorioResumo, Turno } from '../../models/dashboard.models';
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
  readonly minimoFechamentosIA = 20;
  private readonly dashboardApi = inject(DashboardApiService);
  private consultas = new Subscription();
  private acompanhamento = new Subscription();
  private historicoConsulta = new Subscription();

  readonly turnos: Turno[] = ['MANHA', 'TARDE', 'NOITE', 'INTEGRAL'];
  readonly aba = signal<'indicadores' | 'analise'>('indicadores');
  readonly dataReferencia = signal(this.formatarDataLocal(new Date()));
  readonly turno = signal<Turno>('NOITE');
  readonly receitasSelecionadas = signal<string[]>([]);
  readonly cardapiosAnalise = signal<CardapioAnalise[]>([]);
  readonly cardapioSelecionado = signal<string | null>(null);
  readonly consolidacao = signal<ConsolidacaoConsumo | null>(null);
  readonly relatorio = signal<RelatorioIA | null>(null);
  readonly historico = signal<RelatorioResumo[]>([]);
  readonly indicadoresAtuais = signal<IndicadoresLogisticos | null>(null);
  readonly opcoesItens = signal<IndicadoresLogisticos['aceitacaoItens']>([]);
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
    });
  }

  ngOnInit(): void { this.carregarConsolidacao(); }

  selecionarAba(aba: 'indicadores' | 'analise'): void {
    if (this.aba() === aba) return;
    this.aba.set(aba);
    if (aba === 'analise') {
      this.carregarHistorico();
      this.carregarCardapiosAnalise();
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
    const turno = this.turno();
    this.consultas.add(this.dashboardApi.buscarConsolidacao(data, turno)
      .pipe(finalize(() => this.carregandoConsolidacao.set(false)))
      .subscribe({ next: dados => { this.consolidacao.set(dados); this.adicionarOpcoesCardapio(dados); },
        error: erro => this.erroConsolidacao.set(this.montarMensagemErro(erro)) }));
    this.consultas.add(this.dashboardApi.buscarIndicadores(data, turno)
      .pipe(finalize(() => this.carregandoIndicadores.set(false)))
      .subscribe({ next: dados => { this.indicadoresAtuais.set(dados); this.opcoesItens.set(dados.aceitacaoItens); },
        error: () => this.erroIndicadores.set('Não foi possível carregar os indicadores. Tente atualizar.') }));
  }

  gerarRelatorio(): void {
    if (!this.analisePronta()) return;
    this.acompanhamento.unsubscribe();
    this.gerandoRelatorio.set(true);
    this.relatorio.set(null);
    this.erro.set(null);
    const request = {
      dataReferencia: this.dataReferencia(), turno: this.turno(),
      ...(this.receitasSelecionadas().length ? { receitaIds: this.receitasSelecionadas() } : {}),
      ...(this.cardapioSelecionado() ? { datasSelecionadas: this.cardapioSelecionadoDatas() } : {}),
    };
    this.acompanhamento = this.dashboardApi.criarRelatorio(request).pipe(
      switchMap(resposta => this.consultarAteTerminar(resposta.relatorioId)),
      finalize(() => this.gerandoRelatorio.set(false)),
    ).subscribe({ next: dados => this.receberRelatorio(dados),
      error: erro => this.erro.set(this.montarMensagemErro(erro)) });
  }

  fechamentosMensais(): number {
    const cardapio = this.cardapioSelecionadoDetalhes();
    if (cardapio) return cardapio.datasComFechamento.length;
    return this.indicadoresAtuais()?.quantidadeFechamentosDoMes ?? 0;
  }

  itensSelecionadosComFechamentos(): string {
    return this.receitasSelecionadas().map(receitaId => {
      const item = this.opcoesItens().find(opcao => opcao.receitaId === receitaId);
      return item ? `${item.item} (${item.fechamentos} dias medidos)` : receitaId;
    }).join(', ');
  }

  analisePronta(): boolean {
    const cardapio = this.cardapiosAnalise().find(item => item.chave === this.cardapioSelecionado());
    return !!cardapio && cardapio.analisavel && this.receitasSelecionadas().length > 0
      && cardapio.datasComFechamento.length >= this.minimoFechamentosIA
      && this.fechamentosMensais() >= this.minimoFechamentosIA
      && this.receitasSelecionadas().every((id) =>
        (this.opcoesItens().find(item => item.receitaId === id)?.fechamentos ?? 0) >= 3);
  }

  itensComAmostraInsuficiente(): string[] {
    return this.receitasSelecionadas().map(id => this.opcoesItens().find(item => item.receitaId === id))
      .filter(item => item !== undefined && item.fechamentos < 3).map(item => item!.item);
  }

  itensParaAnalise() {
    const cardapio = this.cardapiosAnalise().find(item => item.chave === this.cardapioSelecionado());
    if (!cardapio) return [];
    const ids = new Set(cardapio.receitaIds);
    return this.opcoesItens().filter(item => ids.has(item.receitaId));
  }

  cardapioSelecionadoDetalhes(): CardapioAnalise | null {
    return this.cardapiosAnalise().find(item => item.chave === this.cardapioSelecionado()) ?? null;
  }

  resumoItens(itens: string[], limite = 3): string {
    if (itens.length <= limite) return itens.join(', ');
    return `${itens.slice(0, limite).join(', ')} + ${itens.length - limite} itens`;
  }

  cardapiosSemAmostraMinima(): CardapioAnalise[] {
    return this.cardapiosAnalise().filter(item =>
      !item.analisavel || item.datasComFechamento.length < this.minimoFechamentosIA);
  }

  itemSelecionado(receitaId: string): boolean {
    return this.receitasSelecionadas().includes(receitaId);
  }

  alternarItem(receitaId: string): void {
    this.receitasSelecionadas.update((selecionados) => selecionados.includes(receitaId)
      ? selecionados.filter((id) => id !== receitaId)
      : [...selecionados, receitaId]);
    this.relatorio.set(null);
    this.carregarIndicadoresParaAnalise(this.receitasSelecionadas(), this.cardapioSelecionadoDatas());
  }

  limparItensSelecionados(): void {
    const idsDoCardapio = this.cardapiosAnalise()
      .find(item => item.chave === this.cardapioSelecionado())?.receitaIds ?? [];
    this.receitasSelecionadas.set(idsDoCardapio);
    this.relatorio.set(null);
    this.carregarIndicadoresParaAnalise(idsDoCardapio, this.cardapioSelecionadoDatas());
  }

  selecionarCardapio(chave: string): void {
    const cardapio = this.cardapiosAnalise().find(item => item.chave === chave) ?? null;
    this.cardapioSelecionado.set(cardapio?.chave ?? null);
    if (cardapio) this.adicionarItensDoCardapio(cardapio);
    this.receitasSelecionadas.set(cardapio?.receitaIds ?? []);
    this.relatorio.set(null);
    this.carregarIndicadoresParaAnalise(cardapio?.receitaIds ?? [], cardapio?.datasComFechamento ?? []);
  }

  cardapioSelecionadoDatas(): string[] {
    return this.cardapiosAnalise().find(item => item.chave === this.cardapioSelecionado())?.datasComFechamento ?? [];
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
    this.carregarConsolidacao();
  }

  atualizarFiltros(campo: 'data' | 'turno', valor: string): void {
    if (!valor) return;
    this.acompanhamento.unsubscribe();
    this.consultas.unsubscribe();
    this.historicoConsulta.unsubscribe();
    if (campo === 'data') this.dataReferencia.set(valor);
    if (campo === 'turno') this.turno.set(valor as Turno);
    this.relatorio.set(null);
    this.consolidacao.set(null);
    this.indicadoresAtuais.set(null);
    this.opcoesItens.set([]);
    this.historico.set([]);
    this.erro.set(null);
    this.erroConsolidacao.set(null);
    this.erroIndicadores.set(null);
    this.erroHistorico.set(null);
    this.receitasSelecionadas.set([]);
    this.cardapioSelecionado.set(null);
    this.cardapiosAnalise.set([]);
    if (this.aba() === 'indicadores') this.carregarConsolidacao();
    else {
      this.carregarHistorico();
      this.carregarCardapiosAnalise();
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

  private carregarHistorico(): void {
    this.historicoConsulta.unsubscribe();
    this.historico.set([]);
    this.erroHistorico.set(null);
    this.historicoConsulta = this.dashboardApi.listarRelatorios(this.dataReferencia(), this.turno())
      .subscribe({ next: dados => this.historico.set(dados),
        error: () => this.erroHistorico.set('Não foi possível carregar o histórico de relatórios.') });
  }

  private carregarIndicadoresParaAnalise(receitaIds: string[] = [], datas: string[] = []): void {
    this.indicadoresAtuais.set(null);
    this.erroIndicadores.set(null);
    const data = this.dataReferencia();
    const turno = this.turno();
    this.consultas.unsubscribe();
    this.consultas = new Subscription();
    this.consultas.add(this.dashboardApi.buscarIndicadores(data, turno, receitaIds, datas)
      .subscribe({ next: dados => {
        this.indicadoresAtuais.set(dados);
        this.atualizarOpcoesItens(dados.aceitacaoItens, receitaIds);
      },
        error: () => this.erroIndicadores.set('Não foi possível verificar a amostra dos fechamentos.') }));
  }

  private carregarCardapiosAnalise(): void {
    const fim = this.dataReferencia();
    const inicio = this.somarDias(fim, -29);
    const consulta = this.dashboardApi.buscarCardapiosAnalise?.(inicio, fim, this.turno());
    consulta?.subscribe({ next: cardapios => this.cardapiosAnalise.set(cardapios),
      error: () => this.cardapiosAnalise.set([]) });
  }

  private somarDias(data: string, dias: number): string {
    const valor = new Date(`${data}T12:00:00`);
    valor.setDate(valor.getDate() + dias);
    return this.formatarDataLocal(valor);
  }

  private adicionarOpcoesCardapio(dados: ConsolidacaoConsumo): void {
    const atuais = new Map(this.opcoesItens().map(item => [item.receitaId, item]));
    (dados.receitasCardapio ?? []).forEach((receitaId, indice) => {
      if (!atuais.has(receitaId)) atuais.set(receitaId, {
        receitaId, item: dados.itensCardapio?.[indice] || receitaId,
        porcoesPreparadas: 0, porcoesServidas: 0, porcoesConsumidas: 0,
        restoNoPrato: 0, percentual: null, fechamentos: 0,
      });
    });
    this.opcoesItens.set([...atuais.values()]);
  }

  private adicionarItensDoCardapio(cardapio: CardapioAnalise): void {
    const atuais = new Map(this.opcoesItens().map(item => [item.receitaId, item]));
    cardapio.receitaIds.forEach((receitaId, indice) => {
      const atual = atuais.get(receitaId);
      atuais.set(receitaId, {
        receitaId,
        item: cardapio.itens[indice] || atual?.item || receitaId,
        porcoesPreparadas: atual?.porcoesPreparadas ?? 0,
        porcoesServidas: atual?.porcoesServidas ?? 0,
        porcoesConsumidas: atual?.porcoesConsumidas ?? 0,
        restoNoPrato: atual?.restoNoPrato ?? 0,
        percentual: atual?.percentual ?? null,
        fechamentos: cardapio.datasComFechamento.length,
      });
    });
    this.opcoesItens.set([...atuais.values()]);
  }

  private atualizarOpcoesItens(
    itensMedidos: IndicadoresLogisticos['aceitacaoItens'], receitaIds: string[]
  ): void {
    if (!receitaIds.length) {
      this.opcoesItens.set(itensMedidos);
      return;
    }
    const atuais = new Map(this.opcoesItens().map(item => [item.receitaId, item]));
    const diasDoCardapio = this.cardapioSelecionadoDetalhes()?.datasComFechamento.length;
    itensMedidos.forEach(item => {
      const atual = atuais.get(item.receitaId);
      atuais.set(item.receitaId, {
        ...item,
        // Com um cardápio selecionado, todos os itens usam exatamente os dias
        // completos desse cardápio. Não misturar com a amostra geral do período.
        fechamentos: diasDoCardapio ?? item.fechamentos ?? atual?.fechamentos ?? 0,
      });
    });
    this.opcoesItens.set([...receitaIds]
      .map(receitaId => atuais.get(receitaId))
      .filter(item => item !== undefined) as IndicadoresLogisticos['aceitacaoItens']);
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
