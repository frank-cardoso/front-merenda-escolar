import { TestBed } from '@angular/core/testing';
import { NotificacaoService } from './notificacao.service';

describe('NotificacaoService', () => {
  let servico: NotificacaoService;

  beforeEach(() => {
    jasmine.clock().install();
    servico = TestBed.inject(NotificacaoService);
  });

  afterEach(() => jasmine.clock().uninstall());

  it('sucesso e erro entram na lista com o tipo certo', () => {
    servico.sucesso('Aluno cadastrado.');
    servico.erro('Falhou.');

    const [recente, antiga] = servico.notificacoes();
    expect(recente).toEqual(jasmine.objectContaining({ tipo: 'erro', mensagem: 'Falhou.', destaque: false }));
    expect(antiga).toEqual(jasmine.objectContaining({ tipo: 'sucesso', mensagem: 'Aluno cadastrado.' }));
  });

  it('some sozinha depois de 5 segundos', () => {
    servico.sucesso('Ok.');

    jasmine.clock().tick(4999);
    expect(servico.notificacoes().length).toBe(1);
    jasmine.clock().tick(1);
    expect(servico.notificacoes().length).toBe(0);
  });

  it('destaque guarda título, selo e detalhe e some depois de 6 segundos', () => {
    servico.destaque({ tipo: 'sucesso', titulo: 'Ana', selo: 'AUTORIZADO', detalhe: 'Arroz' });

    expect(servico.notificacoes()[0]).toEqual(jasmine.objectContaining({
      tipo: 'sucesso', destaque: true, titulo: 'Ana', selo: 'AUTORIZADO', detalhe: 'Arroz',
    }));
    jasmine.clock().tick(5999);
    expect(servico.notificacoes().length).toBe(1);
    jasmine.clock().tick(1);
    expect(servico.notificacoes().length).toBe(0);
  });

  it('novo destaque substitui o anterior em vez de empilhar', () => {
    servico.destaque({ tipo: 'erro', titulo: 'Aluno não identificado', selo: 'BLOQUEADO' });
    jasmine.clock().tick(3000);
    servico.destaque({ tipo: 'sucesso', titulo: 'Ana', selo: 'AUTORIZADO' });

    expect(servico.notificacoes().map((n) => n.titulo)).toEqual(['Ana']);
    expect(servico.destaqueAtual()?.titulo).toBe('Ana');

    // O timer do destaque substituído venceria em t=6000; o novo segue até t=9000.
    jasmine.clock().tick(3000);
    expect(servico.destaqueAtual()?.titulo).toBe('Ana');
    jasmine.clock().tick(3000);
    expect(servico.destaqueAtual()).toBeNull();
  });

  it('destaque não ocupa vaga no limite das notificações simples', () => {
    servico.sucesso('1');
    servico.sucesso('2');
    servico.sucesso('3');
    servico.destaque({ tipo: 'sucesso', titulo: 'Ana', selo: 'AUTORIZADO' });

    expect(servico.simples().map((n) => n.mensagem)).toEqual(['3', '2', '1']);
    expect(servico.destaqueAtual()?.titulo).toBe('Ana');
  });

  it('fechar remove a notificação e cancela o timer', () => {
    servico.sucesso('A');
    servico.fechar(servico.notificacoes()[0].id);
    expect(servico.notificacoes()).toEqual([]);

    jasmine.clock().tick(3000);
    servico.sucesso('B');
    jasmine.clock().tick(2000);

    expect(servico.notificacoes().map((n) => n.mensagem)).toEqual(['B']);
    jasmine.clock().tick(3000);
    expect(servico.notificacoes()).toEqual([]);
  });

  it('mantém no máximo 3 e derruba a mais antiga', () => {
    servico.sucesso('1');
    servico.sucesso('2');
    servico.sucesso('3');
    servico.sucesso('4');

    expect(servico.notificacoes().map((n) => n.mensagem)).toEqual(['4', '3', '2']);
  });

  it('a notificação derrubada pelo limite não deixa timer ativo', () => {
    servico.sucesso('1');
    jasmine.clock().tick(3000);
    servico.sucesso('2');
    servico.sucesso('3');
    servico.sucesso('4');
    expect(servico.notificacoes().map((n) => n.mensagem)).toEqual(['4', '3', '2']);

    // O timer da '1' (derrubada) venceria em t=5000; as demais seguem até t=8000.
    jasmine.clock().tick(2000);
    expect(servico.notificacoes().length).toBe(3);
    jasmine.clock().tick(3000);
    expect(servico.notificacoes()).toEqual([]);
  });
});
