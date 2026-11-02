import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { ValidarConsumoResponse } from '../../models/fila.models';

// Sem numeros fixos: a janela de bloqueio por repeticao e configuravel no backend.
const MOTIVOS: Record<string, string> = {
  CONSUMO_RECENTE_BLOQUEADO: 'Consumo recente: este aluno já foi validado há pouco tempo.',
  ALUNO_NAO_ENCONTRADO_OU_INATIVO: 'Aluno não encontrado ou inativo.',
  CARDAPIO_NAO_CONFIGURADO: 'Cardápio não configurado.',
  FOTO_NAO_INFORMADA: 'Nenhuma foto foi capturada para a validação facial.',
  ALUNO_SEM_ROSTO_CADASTRADO: 'Este aluno ainda não tem rosto cadastrado.',
  ROSTO_NAO_DETECTADO: 'Não foi possível detectar um rosto na foto capturada.',
  ROSTO_NAO_CONFERE: 'O rosto capturado não confere com o cadastrado para este aluno.',
};

@Component({
  selector: 'app-resultado-validacao',
  templateUrl: './resultado-validacao.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResultadoValidacaoComponent {
  readonly resultado = input.required<ValidarConsumoResponse>();
  readonly motivoLegivel = computed(() => {
    const motivo = this.resultado().motivo;
    return motivo ? (MOTIVOS[motivo] ?? motivo) : null;
  });
}
