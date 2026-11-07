import { ChangeDetectionStrategy, Component } from '@angular/core';
import { NotificacaoHostComponent } from './shared/notificacao/notificacao-host.component';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  imports: [RouterLink, RouterLinkActive, RouterOutlet, NotificacaoHostComponent],
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
