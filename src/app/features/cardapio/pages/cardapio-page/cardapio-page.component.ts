import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { finalize } from 'rxjs';
import { NotificacaoService } from '../../../../shared/notificacao/notificacao.service';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { CardapioFormComponent } from '../../components/cardapio-form/cardapio-form.component';
import { CardapioApiService } from '../../data-access/cardapio-api.service';
import { ReceitaApiService } from '../../data-access/receita-api.service';
import { TipoRefeicao } from '../../../../shared/refeicao/tipo-refeicao.models';
import { TipoRefeicaoApiService } from '../../../../shared/refeicao/tipo-refeicao-api.service';
import { Cardapio, CardapioRequest, Receita } from '../../models/cardapio.models';

@Component({
  selector: 'app-cardapio-page',
  imports: [CardapioFormComponent, ModalComponent],
  templateUrl: './cardapio-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CardapioPageComponent implements OnInit {
  private readonly notificacao = inject(NotificacaoService);
  private readonly cardapioApi = inject(CardapioApiService);
  private readonly receitaApi = inject(ReceitaApiService);
  private readonly tipoRefeicaoApi = inject(TipoRefeicaoApiService);

  readonly cardapios = signal<Cardapio[]>([]);
  readonly receitas = signal<Receita[]>([]);
  readonly tiposRefeicao = signal<TipoRefeicao[]>([]);
  readonly carregando = signal(false);
  readonly salvando = signal(false);
  readonly formularioAberto = signal(false);
  readonly emEdicao = signal<Cardapio | null>(null);
  readonly catalogoIndisponivel = signal<string | null>(null);

  ngOnInit(): void {
    this.carregar();
    this.carregarReceitas();
    this.carregarTiposRefeicao();
  }

  private carregarTiposRefeicao(): void {
    this.tipoRefeicaoApi.listar().subscribe({
      next: (tipos) => this.tiposRefeicao.set([...tipos].sort((a, b) => a.ordem - b.ordem)),
      error: () => this.notificacao.erro('Não foi possível carregar as refeições.'),
    });
  }

  /**
   * O catalogo e carregado uma vez por abertura da tela. Sem ele o formulario nao tem o que
   * oferecer, e a API recusa item que nao esteja no catalogo.
   */
  private carregarReceitas(): void {
    this.receitaApi.listar().subscribe({
      next: (receitas) => this.receitas.set(receitas),
      error: () => this.catalogoIndisponivel.set('Catálogo de receitas indisponível: não é possível cadastrar '
        + 'cardápio até ele carregar.'),
    });
  }

  carregar(): void {
    this.carregando.set(true);

    this.cardapioApi.listar()
      .pipe(finalize(() => this.carregando.set(false)))
      .subscribe({
        next: (cardapios) => this.cardapios.set(cardapios),
        error: (erro: HttpErrorResponse) => this.notificacao.erro(this.montarMensagemErro(erro)),
      });
  }

  abrirNovo(): void {
    this.emEdicao.set(null);
    this.formularioAberto.set(true);
  }

  abrirEdicao(cardapio: Cardapio): void {
    this.emEdicao.set(cardapio);
    this.formularioAberto.set(true);
  }

  fecharFormulario(): void {
    this.formularioAberto.set(false);
    this.emEdicao.set(null);
  }

  salvar(request: CardapioRequest): void {
    const emEdicao = this.emEdicao();
    const operacao = emEdicao
      ? this.cardapioApi.atualizar(emEdicao.id, request)
      : this.cardapioApi.criar(request);

    this.salvando.set(true);

    operacao.pipe(finalize(() => this.salvando.set(false))).subscribe({
      next: () => {
        this.notificacao.sucesso(emEdicao ? 'Cardápio atualizado.' : 'Cardápio cadastrado.');
        this.fecharFormulario();
        this.carregar();
      },
      error: (erro: HttpErrorResponse) => this.notificacao.erro(this.montarMensagemErro(erro)),
    });
  }

  excluir(cardapio: Cardapio): void {
    const confirmado = confirm(
      `Excluir o cardápio "${cardapio.nomeRefeicao}" de ${cardapio.data} (${cardapio.refeicao})?`);
    if (!confirmado) return;

    this.cardapioApi.excluir(cardapio.id).subscribe({
      next: () => {
        this.notificacao.sucesso('Cardápio excluído.');
        this.carregar();
      },
      error: (erro: HttpErrorResponse) => this.notificacao.erro(this.montarMensagemErro(erro)),
    });
  }

  resumoItens(cardapio: Cardapio): string {
    return cardapio.itens
      .map((item) => (item.quantidade ? `${item.nome} (${item.quantidade})` : item.nome))
      .join(', ');
  }

  private montarMensagemErro(erro: HttpErrorResponse): string {
    if (erro.status === 0) {
      return 'Não foi possível comunicar com a API. Confirme se o backend está rodando em http://localhost:8081.';
    }

    const detalhe = erro.error?.detail;
    if (detalhe) return detalhe;

    return `Erro ${erro.status} ao processar a solicitação.`;
  }
}
