import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { finalize } from 'rxjs';
import { CardapioFormComponent } from '../../components/cardapio-form/cardapio-form.component';
import { CardapioApiService } from '../../data-access/cardapio-api.service';
import { ReceitaApiService } from '../../data-access/receita-api.service';
import { Cardapio, CardapioRequest, Receita } from '../../models/cardapio.models';

@Component({
  selector: 'app-cardapio-page',
  imports: [CardapioFormComponent],
  templateUrl: './cardapio-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CardapioPageComponent implements OnInit {
  private readonly cardapioApi = inject(CardapioApiService);
  private readonly receitaApi = inject(ReceitaApiService);

  readonly cardapios = signal<Cardapio[]>([]);
  readonly receitas = signal<Receita[]>([]);
  readonly carregando = signal(false);
  readonly salvando = signal(false);
  readonly formularioAberto = signal(false);
  readonly emEdicao = signal<Cardapio | null>(null);
  readonly erro = signal<string | null>(null);
  readonly aviso = signal<string | null>(null);

  ngOnInit(): void {
    this.carregar();
    this.carregarReceitas();
  }

  /**
   * O catalogo e carregado uma vez por abertura da tela. Sem ele o formulario nao tem o que
   * oferecer, e a API recusa item que nao esteja no catalogo.
   */
  private carregarReceitas(): void {
    this.receitaApi.listar().subscribe({
      next: (receitas) => this.receitas.set(receitas),
      error: () => this.aviso.set('Catálogo de receitas indisponível: não é possível cadastrar '
        + 'cardápio até ele carregar.'),
    });
  }

  carregar(): void {
    this.carregando.set(true);
    this.erro.set(null);

    this.cardapioApi.listar()
      .pipe(finalize(() => this.carregando.set(false)))
      .subscribe({
        next: (cardapios) => this.cardapios.set(cardapios),
        error: (erro: HttpErrorResponse) => this.erro.set(this.montarMensagemErro(erro)),
      });
  }

  abrirNovo(): void {
    this.emEdicao.set(null);
    this.formularioAberto.set(true);
    this.limparMensagens();
  }

  abrirEdicao(cardapio: Cardapio): void {
    this.emEdicao.set(cardapio);
    this.formularioAberto.set(true);
    this.limparMensagens();
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
    this.limparMensagens();

    operacao.pipe(finalize(() => this.salvando.set(false))).subscribe({
      next: () => {
        this.aviso.set(emEdicao ? 'Cardapio atualizado.' : 'Cardapio cadastrado.');
        this.fecharFormulario();
        this.carregar();
      },
      error: (erro: HttpErrorResponse) => this.erro.set(this.montarMensagemErro(erro)),
    });
  }

  excluir(cardapio: Cardapio): void {
    const confirmado = confirm(
      `Excluir o cardapio "${cardapio.nomeRefeicao}" de ${cardapio.data} (${cardapio.turno})?`);
    if (!confirmado) return;

    this.limparMensagens();
    this.cardapioApi.excluir(cardapio.id).subscribe({
      next: () => {
        this.aviso.set('Cardapio excluido.');
        this.carregar();
      },
      error: (erro: HttpErrorResponse) => this.erro.set(this.montarMensagemErro(erro)),
    });
  }

  resumoItens(cardapio: Cardapio): string {
    return cardapio.itens
      .map((item) => (item.quantidade ? `${item.nome} (${item.quantidade})` : item.nome))
      .join(', ');
  }

  private limparMensagens(): void {
    this.erro.set(null);
    this.aviso.set(null);
  }

  private montarMensagemErro(erro: HttpErrorResponse): string {
    if (erro.status === 0) {
      return 'Nao foi possivel comunicar com a API. Confirme se o backend esta rodando em http://localhost:8081.';
    }

    const detalhe = erro.error?.detail;
    if (detalhe) return detalhe;

    return `Erro ${erro.status} ao processar a solicitacao.`;
  }
}
