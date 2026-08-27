import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { finalize } from 'rxjs';
import { QrScannerComponent } from '../../components/qr-scanner/qr-scanner.component';
import { ResultadoValidacaoComponent } from '../../components/resultado-validacao/resultado-validacao.component';
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

  validarQr(conteudoQr: string): void {
    if (this.processando()) return;
    const alunoCodigo = this.extrairAlunoCodigo(conteudoQr);
    if (!alunoCodigo) {
      this.erro.set('QR Code invalido: nao foi possivel identificar o codigo do aluno.');
      return;
    }

    this.processando.set(true);
    this.erro.set(null);
    this.filaApi.validarConsumo({ alunoCodigo, metodoIdentificacao: 'QR_CODE' })
      .pipe(finalize(() => this.processando.set(false)))
      .subscribe({
        next: (resultado) => this.resultado.set(resultado),
        error: (erro: HttpErrorResponse) => this.erro.set(this.montarMensagemErro(erro)),
      });
  }

  private extrairAlunoCodigo(conteudoQr: string): string | null {
    const valor = conteudoQr.trim();
    if (!valor) return null;

    try {
      const payload = JSON.parse(valor) as { alunoCodigo?: unknown; codigo?: unknown };
      const codigo = payload.alunoCodigo ?? payload.codigo;
      return typeof codigo === 'string' && codigo.trim() ? codigo.trim() : null;
    } catch {
      return valor;
    }
  }

  private montarMensagemErro(erro: HttpErrorResponse): string {
    if (erro.status === 0) {
      return 'Nao foi possivel comunicar com a API. Confirme se o backend esta rodando em http://localhost:8081.';
    }

    return `Erro ${erro.status} ao validar consumo. Verifique o backend e tente novamente.`;
  }
}
