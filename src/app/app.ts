import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  protected readonly itensMenu = [
    { rota: '/fila', rotulo: 'Fila' },
    { rota: '/cardapio', rotulo: 'Cardápios' },
    { rota: '/alunos', rotulo: 'Alunos' },
    { rota: '/turmas', rotulo: 'Turmas' },
    { rota: '/fechamento', rotulo: 'Fechamento' },
    { rota: '/dashboard', rotulo: 'Dashboard' },
  ];
}
