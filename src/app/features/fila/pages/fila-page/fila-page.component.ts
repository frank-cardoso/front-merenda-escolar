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

  validarQr(alunoCodigo: string): void {
    if (this.processando()) return;
    this.processando.set(true);
    this.erro.set(null);
    this.filaApi.validarConsumo({ alunoCodigo, metodoIdentificacao: 'QR_CODE' })
      .pipe(finalize(() => this.processando.set(false)))
      .subscribe({
        next: (resultado) => this.resultado.set(resultado),
        error: () => this.erro.set('Nao foi possivel comunicar com a API. Tente novamente.'),
      });
  }
}
