import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize, switchMap } from 'rxjs';
import { CardapioApiService } from '../../../cardapio/data-access/cardapio-api.service';
import { Turno } from '../../../cardapio/models/cardapio.models';
import { DashboardApiService } from '../../../dashboard/data-access/dashboard-api.service';
import { FechamentoApiService } from '../../data-access/fechamento-api.service';
import { LinhaFechamento } from '../../models/fechamento.models';

/**
 * Fechamento do turno: quem serviu registra o que sobrou.
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
  imports: [FormsModule],
  templateUrl: './fechamento-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class FechamentoPageComponent implements OnInit {
  private readonly cardapioApi = inject(CardapioApiService);
  private readonly dashboardApi = inject(DashboardApiService);
  private readonly fechamentoApi = inject(FechamentoApiService);

  readonly turnos: Turno[] = ['MANHA', 'TARDE', 'NOITE', 'INTEGRAL'];

  readonly data = signal(this.hoje());
  readonly turno = signal<Turno>('MANHA');
  readonly linhas = signal<LinhaFechamento[]>([]);
  readonly consumos = signal(0);
  readonly nomeCardapio = signal('');
  readonly medicoesExistentes = signal(0);
  readonly carregando = signal(false);
  readonly fechando = signal(false);
  readonly erro = signal<string | null>(null);
  readonly aviso = signal<string | null>(null);
  readonly relatorioId = signal<string | null>(null);

  readonly podeFechar = computed(() =>
    this.linhas().length > 0 && this.linhas().every((linha) => this.linhaConsistente(linha)));

  ngOnInit(): void {
    this.carregar();
  }

  carregar(): void {
    this.carregando.set(true);
    this.erro.set(null);
    this.aviso.set(null);
    this.relatorioId.set(null);
    this.linhas.set([]);
    this.medicoesExistentes.set(0);

    const data = this.data();
    const turno = this.turno();

    this.cardapioApi.listar()
      .pipe(finalize(() => this.carregando.set(false)))
      .subscribe({
        next: (cardapios) => {
          const cardapio = cardapios.find((c) => c.data === data && c.turno === turno);
          if (!cardapio) {
            this.aviso.set('Não há cardápio cadastrado para esta data e turno.');
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
          })));
        },
        error: (erro: HttpErrorResponse) => this.erro.set(this.mensagem(erro)),
      });
  }

  /** A contagem da fila preenche preparadas e servidas; as perdas comecam zeradas. */
  private buscarConsumos(itens: { receitaId: string; nome: string }[]): void {
    this.dashboardApi.buscarConsolidacao(this.data(), this.turno()).subscribe({
      next: (consolidacao) => {
        this.consumos.set(consolidacao.consumosAutorizados);
        this.linhas.set(itens.map((item) => ({
          ...item,
          porcoesPreparadas: consolidacao.consumosAutorizados,
          sobraNaoDistribuida: 0,
          restoNoPrato: 0,
        })));
        this.fechamentoApi.listarMedicoes(this.data(), this.turno()).subscribe({
          next: (medicoes) => {
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
          error: (erro: HttpErrorResponse) => this.erro.set(this.mensagem(erro)),
        });
      },
      error: (erro: HttpErrorResponse) => this.erro.set(this.mensagem(erro)),
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
    this.erro.set(null);
    this.relatorioId.set(null);

    const data = this.data();
    const turno = this.turno();
    const medicoes = this.linhas().map((linha) => ({
        data, turno,
        receitaId: linha.receitaId,
        porcoesPreparadas: linha.porcoesPreparadas,
        porcoesServidas: this.servidas(linha),
        sobraNaoDistribuida: linha.sobraNaoDistribuida,
        restoNoPrato: linha.restoNoPrato,
      }));

    this.fechamentoApi.registrarFechamento({ medicoes }).pipe(
      switchMap(() => this.dashboardApi.criarRelatorio({ dataReferencia: data, turno })),
      finalize(() => this.fechando.set(false)),
    ).subscribe({
      next: (resposta) => this.relatorioId.set(resposta.relatorioId),
      error: (erro: HttpErrorResponse) => this.erro.set(this.mensagem(erro)),
    });
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
