import { ChangeDetectionStrategy, Component, NgZone, OnDestroy, inject, output, signal } from '@angular/core';
import { Html5Qrcode, Html5QrcodeCameraScanConfig, Html5QrcodeResult } from 'html5-qrcode';

type EstadoScanner = 'inativo' | 'carregando' | 'lendo' | 'erro';

@Component({
  selector: 'app-qr-scanner',
  templateUrl: './qr-scanner.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QrScannerComponent implements OnDestroy {
  readonly codigoLido = output<string>();
  readonly scannerId = `qr-reader-${Math.random().toString(36).slice(2)}`;
  readonly estado = signal<EstadoScanner>('inativo');
  readonly mensagem = signal('Aponte a camera para um QR Code de aluno.');
  readonly arquivoSelecionado = signal<string | null>(null);

  private readonly zone = inject(NgZone);
  private scanner?: Html5Qrcode;
  private ultimoCodigo?: string;
  private ultimaLeituraEm = 0;

  ngOnDestroy(): void {
    void this.pararCamera();
  }

  async iniciarCamera(): Promise<void> {
    if (this.estado() === 'carregando' || this.estado() === 'lendo') return;

    this.estado.set('carregando');
    this.mensagem.set('Solicitando permissao da camera...');

    try {
      this.scanner = this.scanner ?? new Html5Qrcode(this.scannerId);
      await this.scanner.start(
        { facingMode: 'environment' },
        this.configuracaoCamera(),
        (codigo) => this.zone.run(() => this.processarLeitura(codigo)),
        () => undefined,
      );
      this.estado.set('lendo');
      this.mensagem.set('Camera ativa. Aproxime o QR Code do centro do quadro.');
    } catch {
      this.estado.set('erro');
      this.mensagem.set('Nao foi possivel acessar a camera. Verifique a permissao do navegador.');
    }
  }

  async pararCamera(): Promise<void> {
    if (!this.scanner) return;

    try {
      if (this.scanner.isScanning) await this.scanner.stop();
      await this.scanner.clear();
    } finally {
      this.scanner = undefined;
      this.estado.set('inativo');
    }
  }

  async lerArquivo(evento: Event): Promise<void> {
    const input = evento.target as HTMLInputElement;
    const arquivo = input.files?.item(0);
    if (!arquivo) return;

    this.arquivoSelecionado.set(arquivo.name);
    this.estado.set('carregando');
    this.mensagem.set('Lendo QR Code da imagem...');

    try {
      await this.pararCamera();
      this.scanner = new Html5Qrcode(this.scannerId);
      const codigo = await this.scanner.scanFile(arquivo, false);
      this.processarLeitura(codigo);
      this.mensagem.set('QR Code lido pela imagem.');
    } catch {
      this.estado.set('erro');
      this.mensagem.set('Nao foi possivel ler um QR Code valido nessa imagem.');
    } finally {
      input.value = '';
    }
  }

  private processarLeitura(codigo: string): void {
    const agora = Date.now();
    if (codigo === this.ultimoCodigo && agora - this.ultimaLeituraEm < 3000) return;
    this.ultimoCodigo = codigo;
    this.ultimaLeituraEm = agora;
    this.mensagem.set('QR Code identificado. Validando aluno...');
    this.codigoLido.emit(codigo);
  }

  private configuracaoCamera(): Html5QrcodeCameraScanConfig {
    return {
      fps: 10,
      qrbox: { width: 240, height: 240 },
      aspectRatio: 1.777778,
    };
  }
}
