import { ChangeDetectionStrategy, Component, ElementRef, OnDestroy, output, signal, viewChild } from '@angular/core';

type EstadoCamera = 'inativo' | 'carregando' | 'ativa' | 'erro';

/**
 * Captura uma foto pela webcam e emite como data URL base64 (ex: "data:image/jpeg;base64,...").
 *
 * Usado tanto no cadastro do rosto do aluno quanto na fila (validação facial). Nunca envia nada
 * sozinho: só captura e emite; quem chama decide o que fazer com a foto.
 */
@Component({
  selector: 'app-camera-foto',
  templateUrl: './camera-foto.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CameraFotoComponent implements OnDestroy {
  readonly fotoCapturada = output<string>();

  readonly estado = signal<EstadoCamera>('inativo');
  readonly mensagem = signal('Clique em "Iniciar câmera" para posicionar o rosto.');
  readonly ultimaFoto = signal<string | null>(null);

  private readonly video = viewChild.required<ElementRef<HTMLVideoElement>>('video');
  private stream?: MediaStream;

  ngOnDestroy(): void {
    this.pararCamera();
  }

  // A camera so inicia sob clique explicito: pedir permissao ao abrir a tela surpreende o usuario.
  async iniciarCamera(): Promise<void> {
    if (this.estado() === 'carregando' || this.estado() === 'ativa') return;

    this.estado.set('carregando');
    this.mensagem.set('Solicitando permissão da câmera...');

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
        audio: false,
      });
      this.video().nativeElement.srcObject = this.stream;
      await this.video().nativeElement.play();
      this.estado.set('ativa');
      this.mensagem.set('Posicione o rosto no centro e capture.');
    } catch {
      this.estado.set('erro');
      this.mensagem.set('Não foi possível acessar a câmera. Verifique a permissão do navegador.');
    }
  }

  pararCamera(): void {
    this.stream?.getTracks().forEach((faixa) => faixa.stop());
    this.stream = undefined;
    this.estado.set('inativo');
  }

  capturar(): void {
    if (this.estado() !== 'ativa') return;

    const video = this.video().nativeElement;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const contexto = canvas.getContext('2d');
    if (!contexto) return;

    contexto.drawImage(video, 0, 0, canvas.width, canvas.height);
    const fotoBase64 = canvas.toDataURL('image/jpeg', 0.9);
    this.ultimaFoto.set(fotoBase64);
    this.mensagem.set('Foto capturada. Pode enviar ou capturar de novo.');
    this.fotoCapturada.emit(fotoBase64);
  }

  async carregarImagem(evento: Event): Promise<void> {
    const input = evento.target as HTMLInputElement;
    const arquivo = input.files?.[0];
    if (!arquivo) return;

    try {
      if (arquivo.type !== 'image/jpeg' && arquivo.type !== 'image/png') {
        this.mensagem.set('Escolha um arquivo de imagem (JPG ou PNG).');
        return;
      }

      const dataUrl = await this.lerComoDataUrl(arquivo);
      this.ultimaFoto.set(dataUrl);
      this.mensagem.set('Imagem carregada. Pode enviar ou escolher outra.');
      this.fotoCapturada.emit(dataUrl);
    } catch {
      this.mensagem.set('Não foi possível ler a imagem. Tente outro arquivo.');
    } finally {
      input.value = '';
    }
  }

  private lerComoDataUrl(arquivo: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const leitor = new FileReader();
      leitor.onload = () => resolve(leitor.result as string);
      leitor.onerror = () => reject(leitor.error);
      leitor.readAsDataURL(arquivo);
    });
  }
}
