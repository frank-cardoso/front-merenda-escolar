import {
  AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, Input,
  OnChanges, OnDestroy, ViewChild,
} from '@angular/core';
import { BarController, BarElement, CategoryScale, Chart, LinearScale, Tooltip } from 'chart.js';
import { AceitacaoItem } from '../../models/indicadores.models';

Chart.register(BarController, BarElement, CategoryScale, LinearScale, Tooltip);

@Component({
  selector: 'app-aceitacao-itens',
  template: `<div class="relative h-80"><canvas #canvas role="img"
    aria-label="Aceitação dos itens medida pelos fechamentos da merendeira. Os valores estão na tabela abaixo."></canvas></div>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AceitacaoItensComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input({ required: true }) itens: AceitacaoItem[] = [];
  @ViewChild('canvas') canvas?: ElementRef<HTMLCanvasElement>;
  private chart?: Chart<'bar'>;

  ngAfterViewInit(): void { this.renderizar(); }
  ngOnChanges(): void { this.renderizar(); }
  ngOnDestroy(): void { this.chart?.destroy(); }

  private renderizar(): void {
    if (!this.canvas) return;
    this.chart?.destroy();
    this.chart = new Chart(this.canvas.nativeElement, {
      type: 'bar',
      data: {
        labels: this.itens.map(item => item.item),
        datasets: [{ label: 'Aceitação medida (%)',
          data: this.itens.map(item => item.percentual),
          backgroundColor: '#047857', borderRadius: 4 }],
      },
      options: {
        indexAxis: 'y', responsive: true, maintainAspectRatio: false,
        animation: false,
        scales: { x: { min: 0, max: 100, ticks: { callback: value => `${value}%` } } },
        plugins: { tooltip: { callbacks: { afterLabel: context => {
          const item = this.itens[context.dataIndex];
          return `${item.porcoesConsumidas} consumidas estimadas / ${item.porcoesServidas} servidas · ${item.fechamentos} fechamento(s)`;
        } } } },
      },
    });
  }
}
