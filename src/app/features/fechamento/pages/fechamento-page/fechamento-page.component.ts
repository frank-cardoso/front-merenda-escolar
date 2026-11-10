import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { catchError, finalize, map, of, switchMap, tap } from 'rxjs';
import { CardapioApiService } from '../../../cardapio/data-access/cardapio-api.service';
import { DashboardApiService } from '../../../dashboard/data-access/dashboard-api.service';
import { FechamentoApiService } from '../../data-access/fechamento-api.service';
import { FechamentoPainelApiService } from '../../data-access/fechamento-painel-api.service';
import { NotificacaoService } from '../../../../shared/notificacao/notificacao.service';
import { escolherRefeicaoInicial, PainelDiaComponent } from '../../components/painel-dia/painel-dia.component';
import { LinhaFechamento } from '../../models/fechamento.models';
import { RefeicaoDoDia } from '../../models/painel.models';

/**
 * Fechamento da refeição: quem serviu registra o que sobrou.
 *
 * Pede tres numeros por item: preparado, o que sobrou na panela e o que voltou no prato. O servido
 * e derivado (preparado menos sobra), nunca informado.
 *
 * A contagem da fila serve so de sugestao inicial para o preparado. Ela nao pode virar o servido
 * por item: o QR registra uma refeicao e nao diz quais itens o aluno pegou, entao assumir que os
 * 91 alunos pegaram todos os itens seria inventar o denominador da aceitacao.
 */
@Component({
  selector: 'app-fechamento-page',
  imports: [FormsModule, PainelDiaComponent],
  templateUrl: './fechamento-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class FechamentoPageComponent implements OnInit {
  private readonly notificacao = inject(NotificacaoService);
  private readonly cardapioApi = inject(CardapioApiService);
  private readonly dashboardApi = inject(DashboardApiService);
  private readonly fechamentoApi = inject(FechamentoApiService);
  private readonly painelApi = inject(FechamentoPainelApiService);
  private readonly rota = inject(ActivatedRoute);
  private versaoPainel = 0;
  private versaoCarga = 0;

  readonly refeicoes = signal<RefeicaoDoDia[]>([]);

  readonly data = signal(this.hoje());
  readonly tipoRefeicaoId = signal('');
  readonly linhas = signal<LinhaFechamento[]>([]);
  readonly consumos = signal(0);
  readonly nomeCardapio = signal('');
  readonly medicoesExistentes = signal(0);
  readonly carregando = signal(false);
  readonly fechando = signal(false);
  readonly aviso = signal<string | null>(null);
  readonly relatorioId = signal<string | null>(null);

  readonly podeFechar = computed(() =>
    this.linhas().length > 0 && this.linhas().every((linha) => this.linhaConsistente(linha)));

  readonly totalPreparado = computed(() => this.somar('porcoesPreparadas'));
  readonly totalPanela = computed(() => this.somar('sobraNaoDistribuida'));
  readonly totalPrato = computed(() => this.somar('restoNoPrato'));

  ngOnInit(): void {
    const parametros = this.rota.snapshot.queryParamMap;
    const data = parametros.get('data');
    if (data && /^\d{4}-\d{2}-\d{2}$/.test(data)) this.data.set(data);
    this.carregarPainel(parametros.get('refeicao'));
  }

  trocarData(data: string): void {
    if (!data) return;
    this.data.set(data);
    this.versaoCarga++;
    this.carregando.set(false);
    this.linhas.set([]);
    this.refeicoes.set([]);
    this.aviso.set(null);
    this.relatorioId.set(null);
    this.carregarPainel();
  }

  escolherRefeicao(tipoRefeicaoId: string): void {
    this.tipoRefeicaoId.set(tipoRefeicaoId);
    this.carregar();
  }

  /** Só a última consulta vale: trocar a data com uma resposta antiga em voo não pode sobrescrevê-la. */
  private carregarPainel(pedida?: string | null, manterSelecao = false): void {
    const versao = ++this.versaoPainel;
    this.painelApi.doDia(this.data()).subscribe({
      next: (refeicoes) => {
        if (versao !== this.versaoPainel) return;
        this.refeicoes.set(refeicoes);
        if (manterSelecao) return;
        this.tipoRefeicaoId.set(escolherRefeicaoInicial(refeicoes, pedida));
        if (this.tipoRefeicaoId()) {
          this.carregar();
        } else {
          this.linhas.set([]);
          this.aviso.set('Não há refeições configuradas.');
        }
      },
      error: () => {
        if (versao === this.versaoPainel) this.notificacao.erro('Não foi possível carregar as refeições do dia.');
      },
    });
  }

  carregar(): void {
    if (!this.tipoRefeicaoId()) return;
    const versao = ++this.versaoCarga;
    const vigente = () => versao === this.versaoCarga;
    this.carregando.set(true);
    this.aviso.set(null);
    this.relatorioId.set(null);
    this.linhas.set([]);
    this.medicoesExistentes.set(0);

    const data = this.data();
    const tipoRefeicaoId = this.tipoRefeicaoId();

    this.cardapioApi.listar()
      .pipe(finalize(() => { if (vigente()) this.carregando.set(false); }))
      .subscribe({
        next: (cardapios) => {
          if (!vigente()) return;
          const cardapio = cardapios.find((c) => c.data === data && c.tipoRefeicaoId === tipoRefeicaoId);
          if (!cardapio) {
            this.aviso.set('Não há cardápio cadastrado para esta data e refeição.');
            return;
          }
          this.nomeCardapio.set(cardapio.nomeRefeicao);
          const semVinculo = cardapio.itens.filter((item) => !item.receitaId);
          if (semVinculo.length > 0) {
            this.aviso.set('Itens sem vínculo com o catálogo de receitas: '
              + semVinculo.map((item) => item.nome).join(', ')
              + '. Regrave o cardápio para poder medir.');
            return;
          }
          this.buscarConsumos(cardapio.itens.map((item) => ({
            receitaId: item.receitaId!,
            nome: item.nome,
          })), vigente);
        },
        error: (erro: HttpErrorResponse) => {
          if (vigente()) this.notificacao.erro(this.mensagem(erro));
        },
      });
  }

  /** A contagem da fila preenche preparadas e servidas; as perdas comecam zeradas. */
  private buscarConsumos(itens: { receitaId: string; nome: string }[], vigente: () => boolean): void {
    this.dashboardApi.buscarConsolidacao(this.data(), this.tipoRefeicaoId()).subscribe({
      next: (consolidacao) => {
        if (!vigente()) return;
        this.consumos.set(consolidacao.consumosAutorizados);
        this.linhas.set(itens.map((item) => ({
          ...item,
          porcoesPreparadas: consolidacao.consumosAutorizados,
          sobraNaoDistribuida: 0,
          restoNoPrato: 0,
        })));
        this.fechamentoApi.listarMedicoes(this.data(), this.tipoRefeicaoId()).subscribe({
          next: (medicoes) => {
            if (!vigente()) return;
            this.medicoesExistentes.set(medicoes.length);
            if (!medicoes.length) return;
            const porReceita = new Map(medicoes.map((medicao) => [medicao.receitaId, medicao]));
            this.linhas.update((linhas) => linhas.map((linha) => {
              const medicao = porReceita.get(linha.receitaId);
              return medicao ? {
                ...linha,
                porcoesPreparadas: medicao.porcoesPreparadas,
                sobraNaoDistribuida: medicao.sobraNaoDistribuida,
                restoNoPrato: medicao.restoNoPrato,
              } : linha;
            }));
          },
          error: (erro: HttpErrorResponse) => {
            if (vigente()) this.notificacao.erro(this.mensagem(erro));
          },
        });
      },
      error: (erro: HttpErrorResponse) => {
        if (vigente()) this.notificacao.erro(this.mensagem(erro));
      },
    });
  }

  atualizar(indice: number, campo: keyof LinhaFechamento, valor: string): void {
    const numero = Math.max(0, Number(valor) || 0);
    this.linhas.update((linhas) => linhas.map((linha, posicao) =>
      posicao === indice ? { ...linha, [campo]: numero } : linha));
  }

  /** Servido nao e informado: e o que foi preparado menos o que ficou na panela. */
  servidas(linha: LinhaFechamento): number {
    return linha.porcoesPreparadas - linha.sobraNaoDistribuida;
  }

  naoSobrouNada(): void {
    this.linhas.update((linhas) => linhas.map((linha) => ({
      ...linha,
      sobraNaoDistribuida: 0,
      restoNoPrato: 0,
    })));
  }

  /**
   * Com o servido derivado, a soma fecha sozinha. Sobram duas regras: nao pode sobrar mais do que
   * foi preparado, e nao pode voltar mais do que foi servido. O back-end valida as duas de novo.
   */
  linhaConsistente(linha: LinhaFechamento): boolean {
    return linha.sobraNaoDistribuida <= linha.porcoesPreparadas
      && linha.restoNoPrato <= this.servidas(linha);
  }

  fechar(): void {
    if (!this.podeFechar() || this.fechando()) return;

    this.fechando.set(true);
    this.relatorioId.set(null);

    const data = this.data();
    const tipoRefeicaoId = this.tipoRefeicaoId();
    const medicoes = this.linhas().map((linha) => ({
        data, tipoRefeicaoId,
        receitaId: linha.receitaId,
        porcoesPreparadas: linha.porcoesPreparadas,
        porcoesServidas: this.servidas(linha),
        sobraNaoDistribuida: linha.sobraNaoDistribuida,
        restoNoPrato: linha.restoNoPrato,
      }));

    // O fechamento já está gravado quando o relatório é pedido; uma recusa do relatório não o desfaz.
    this.fechamentoApi.registrarFechamento({ medicoes }).pipe(
      tap((gravadas) => {
        if (this.data() !== data) return;
        if (this.tipoRefeicaoId() === tipoRefeicaoId) this.medicoesExistentes.set(gravadas.length);
        this.carregarPainel(null, true);
      }),
      switchMap(() => this.dashboardApi.criarRelatorio({ dataReferencia: data, tipoRefeicaoId }).pipe(
        map((resposta) => ({ resposta, falha: null })),
        catchError((falha: HttpErrorResponse) => of({ resposta: null, falha })),
      )),
      finalize(() => this.fechando.set(false)),
    ).subscribe({
      next: ({ resposta, falha }) => {
        if (falha) {
          this.notificacao.sucesso('Refeição fechada.');
          if (falha.status === 422) {
            this.notificacao.aviso(`Relatório de IA não gerado. ${this.mensagem(falha)}`);
          } else {
            this.notificacao.erro(this.mensagem(falha));
          }
          return;
        }
        if (this.data() === data && this.tipoRefeicaoId() === tipoRefeicaoId) this.relatorioId.set(resposta.relatorioId);
        this.notificacao.sucesso('Refeição fechada e relatório solicitado. Acompanhe no Dashboard — aceitação e '
          + 'desperdício passam a ser calculados a partir do que foi registrado aqui.');
      },
      error: (erro: HttpErrorResponse) => this.notificacao.erro(this.mensagem(erro)),
    });
  }

  private somar(campo: 'porcoesPreparadas' | 'sobraNaoDistribuida' | 'restoNoPrato'): number {
    return this.linhas().reduce((total, linha) => total + linha[campo], 0);
  }

  private mensagem(erro: HttpErrorResponse): string {
    const detalhe = erro.error?.detail ?? erro.error?.message;
    return detalhe ? String(detalhe) : 'Não foi possível concluir a operação.';
  }

  private hoje(): string {
    const agora = new Date();
    const mes = String(agora.getMonth() + 1).padStart(2, '0');
    const dia = String(agora.getDate()).padStart(2, '0');
    return `${agora.getFullYear()}-${mes}-${dia}`;
  }
}
