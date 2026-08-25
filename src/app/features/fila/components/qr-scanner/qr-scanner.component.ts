import { AfterViewInit, ChangeDetectionStrategy, Component, OnDestroy, output } from '@angular/core';
import { Html5QrcodeScanner } from 'html5-qrcode';

@Component({
  selector: 'app-qr-scanner',
  template: '<div id="qr-reader" class="overflow-hidden rounded-xl"></div>',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QrScannerComponent implements AfterViewInit, OnDestroy {
  readonly codigoLido = output<string>();
  private scanner?: Html5QrcodeScanner;
  private ultimoCodigo?: string;
  private ultimaLeituraEm = 0;

  ngAfterViewInit(): void {
    this.scanner = new Html5QrcodeScanner('qr-reader', { fps: 10, qrbox: 240 }, false);
    this.scanner.render((codigo) => this.processarLeitura(codigo), () => undefined);
  }

  ngOnDestroy(): void {
    void this.scanner?.clear();
  }

  private processarLeitura(codigo: string): void {
    const agora = Date.now();
    if (codigo === this.ultimoCodigo && agora - this.ultimaLeituraEm < 3000) return;
    this.ultimoCodigo = codigo;
    this.ultimaLeituraEm = agora;
    this.codigoLido.emit(codigo);
  }
}
