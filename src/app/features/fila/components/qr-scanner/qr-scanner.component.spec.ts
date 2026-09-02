import { ComponentFixture, TestBed } from '@angular/core/testing';
import { QrScannerComponent } from './qr-scanner.component';

describe('QrScannerComponent', () => {
  let fixture: ComponentFixture<QrScannerComponent>;
  let component: QrScannerComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [QrScannerComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(QrScannerComponent);
    component = fixture.componentInstance;
  });

  it('ignora novas leituras quando o scanner esta pausado', () => {
    const codigos: string[] = [];
    component.codigoLido.subscribe((codigo) => codigos.push(codigo));
    fixture.componentRef.setInput('leituraPausada', true);
    fixture.detectChanges();

    (component as unknown as { processarLeitura(codigo: string): void }).processarLeitura('ALU-001');

    expect(codigos).toEqual([]);
  });
});
