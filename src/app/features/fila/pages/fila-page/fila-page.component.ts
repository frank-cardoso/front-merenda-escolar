import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { finalize } from 'rxjs';
import { QrScannerComponent } from '../../components/qr-scanner/qr-scanner.component';
import { traduzirMotivo } from '../../application/motivos';
import { parseAlunoQrCode } from '../../application/qr-code-parser';
import { FilaApiService } from '../../data-access/fila-api.service';
import { MetodoIdentificacao, ValidarConsumoResponse } from '../../models/fila.models';
import { CameraFotoComponent } from '../../../../shared/components/camera-foto/camera-foto.component';
import { NotificacaoService } from '../../../../shared/notificacao/notificacao.service';

@Component({
  selector: 'app-fila-page',
  imports: [QrScannerComponent, CameraFotoComponent],
  templateUrl: './fila-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FilaPageComponent {
  private readonly filaApi = inject(FilaApiService);
  private readonly notificacao = inject(NotificacaoService);
  readonly processando = signal(false);
  readonly ultimoCodigoLido = signal<string | null>(null);

  readonly metodo = signal<MetodoIdentificacao>('QR_CODE');

  /**
   * Leituras autorizadas desde que a tela abriu.
   *
   * E contagem da sessao, nao o total do dia: a tela nao carrega o acumulado, e rotular de "hoje"
   * afirmaria um numero que ela nao tem. Serve para tornar visivel que cada bip alimenta o
   * indicador do painel, em vez de exigir que alguem afirme isso.
   */
  readonly autorizadasNaSessao = signal(0);

  validarQr(conteudoQr: string): void {
    if (this.processando()) return;
    const qrCode = parseAlunoQrCode(conteudoQr);
    if (!qrCode.valido) {
      this.ultimoCodigoLido.set(null);
      this.notificacao.erro('QR Code inválido ou fora do padrão esperado.');
      return;
    }

    this.ultimoCodigoLido.set(qrCode.alunoCodigo);
    this.processando.set(true);
    this.filaApi.validarConsumo({ alunoCodigo: qrCode.alunoCodigo, metodoIdentificacao: 'QR_CODE' })
      .pipe(finalize(() => this.processando.set(false)))
      .subscribe({
        next: (resultado) => this.anunciar(resultado),
        error: (erro: HttpErrorResponse) => this.notificacao.erro(this.montarMensagemErro(erro)),
      });
  }

  validarCodigoManual(alunoCodigo: string): void {
    this.validarQr(alunoCodigo);
  }

  selecionarMetodo(metodo: MetodoIdentificacao): void {
    if (this.metodo() === metodo) return;
    this.metodo.set(metodo);
  }

  validarFacial(fotoBase64: string): void {
    if (this.processando()) return;
    this.ultimoCodigoLido.set(null);
    this.processando.set(true);
    this.filaApi.validarConsumo({ metodoIdentificacao: 'FACIAL', fotoBase64 })
      .pipe(finalize(() => this.processando.set(false)))
      .subscribe({
        next: (resultado) => this.anunciar(resultado),
        error: (erro: HttpErrorResponse) => this.notificacao.erro(this.montarMensagemErro(erro)),
      });
  }

  private anunciar(resultado: ValidarConsumoResponse): void {
    const autorizado = resultado.resultado === 'AUTORIZADO';
    if (autorizado) this.autorizadasNaSessao.update((total) => total + 1);
    this.notificacao.destaque({
      tipo: autorizado ? 'sucesso' : 'erro',
      titulo: resultado.alunoNome || 'Aluno não identificado',
      selo: resultado.resultado,
      detalhe: autorizado ? resultado.cardapio : traduzirMotivo(resultado.motivo),
    });
  }

  private montarMensagemErro(erro: HttpErrorResponse): string {
    if (erro.status === 0) {
      return 'Não foi possível comunicar com a API. Confirme se o backend está rodando em http://localhost:8081.';
    }

    return `Erro ${erro.status} ao validar consumo. Verifique o backend e tente novamente.`;
  }
}
