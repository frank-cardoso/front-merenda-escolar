import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { finalize } from 'rxjs';
import { QrScannerComponent } from '../../components/qr-scanner/qr-scanner.component';
import { ResultadoValidacaoComponent } from '../../components/resultado-validacao/resultado-validacao.component';
import { parseAlunoQrCode } from '../../application/qr-code-parser';
import { FilaApiService } from '../../data-access/fila-api.service';
import { ValidarConsumoResponse } from '../../models/fila.models';

@Component({
  selector: 'app-fila-page',
  imports: [QrScannerComponent, ResultadoValidacaoComponent],
  templateUrl: './fila-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FilaPageComponent {
  private readonly filaApi = inject(FilaApiService);
  readonly processando = signal(false);
  readonly resultado = signal<ValidarConsumoResponse | null>(null);
  readonly erro = signal<string | null>(null);
  readonly ultimoCodigoLido = signal<string | null>(null);

  validarQr(conteudoQr: string): void {
    if (this.processando()) return;
    const qrCode = parseAlunoQrCode(conteudoQr);
    if (!qrCode.valido) {
      this.ultimoCodigoLido.set(null);
      this.erro.set('QR Code invalido ou fora do padrao esperado.');
      return;
    }

    this.ultimoCodigoLido.set(qrCode.alunoCodigo);
    this.processando.set(true);
    this.erro.set(null);
    this.filaApi.validarConsumo({ alunoCodigo: qrCode.alunoCodigo, metodoIdentificacao: 'QR_CODE' })
      .pipe(finalize(() => this.processando.set(false)))
      .subscribe({
        next: (resultado) => this.resultado.set(resultado),
        error: (erro: HttpErrorResponse) => this.erro.set(this.montarMensagemErro(erro)),
      });
  }

  validarCodigoManual(alunoCodigo: string): void {
    this.validarQr(alunoCodigo);
  }

  private montarMensagemErro(erro: HttpErrorResponse): string {
    if (erro.status === 0) {
      return 'Nao foi possivel comunicar com a API. Confirme se o backend esta rodando em http://localhost:8081.';
    }

    return `Erro ${erro.status} ao validar consumo. Verifique o backend e tente novamente.`;
  }
}
