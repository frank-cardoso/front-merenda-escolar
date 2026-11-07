import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CameraFotoComponent } from './camera-foto.component';

describe('CameraFotoComponent', () => {
  let fixture: ComponentFixture<CameraFotoComponent>;
  let componente: CameraFotoComponent;
  let emitidas: string[];

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [CameraFotoComponent] }).compileComponents();
    fixture = TestBed.createComponent(CameraFotoComponent);
    componente = fixture.componentInstance;
    emitidas = [];
    componente.fotoCapturada.subscribe((foto) => emitidas.push(foto));
    fixture.detectChanges();
  });

  function eventoComArquivo(arquivo: File): Event {
    const transferencia = new DataTransfer();
    transferencia.items.add(arquivo);
    const input = document.createElement('input');
    input.type = 'file';
    input.files = transferencia.files;
    return { target: input } as unknown as Event;
  }

  it('emite o data URL da imagem escolhida', async () => {
    await componente.carregarImagem(eventoComArquivo(new File(['abc'], 'x.png', { type: 'image/png' })));

    expect(emitidas).toEqual(['data:image/png;base64,YWJj']);
    expect(componente.ultimaFoto()).toBe('data:image/png;base64,YWJj');
    expect(componente.mensagem()).toBe('Imagem carregada. Pode enviar ou escolher outra.');
  });

  it('recusa arquivo que nao e imagem', async () => {
    await componente.carregarImagem(eventoComArquivo(new File(['abc'], 'x.pdf', { type: 'application/pdf' })));

    expect(emitidas).toEqual([]);
    expect(componente.mensagem()).toBe('Escolha um arquivo de imagem (JPG ou PNG).');
  });

  it('recusa imagem de formato nao suportado', async () => {
    await componente.carregarImagem(eventoComArquivo(new File(['abc'], 'x.gif', { type: 'image/gif' })));

    expect(emitidas).toEqual([]);
    expect(componente.mensagem()).toBe('Escolha um arquivo de imagem (JPG ou PNG).');
  });

  it('avisa e limpa o input quando a leitura falha', async () => {
    spyOn(FileReader.prototype, 'readAsDataURL').and.callFake(function (this: FileReader) {
      this.onerror?.(new ProgressEvent('error') as ProgressEvent<FileReader>);
    });
    const evento = eventoComArquivo(new File(['abc'], 'x.png', { type: 'image/png' }));

    await componente.carregarImagem(evento);

    expect(emitidas).toEqual([]);
    expect(componente.mensagem()).toBe('Não foi possível ler a imagem. Tente outro arquivo.');
    expect((evento.target as HTMLInputElement).files?.length).toBe(0);
  });

  it('nao pede permissao da camera ao abrir', () => {
    const espiao = spyOn(navigator.mediaDevices, 'getUserMedia');
    TestBed.createComponent(CameraFotoComponent).changeDetectorRef.detectChanges();

    expect(espiao).not.toHaveBeenCalled();
  });
});
