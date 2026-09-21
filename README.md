# Frontend — Controle de Merenda Escolar

Aplicacao Angular 20 com Standalone Components e Tailwind CSS para operacao da fila e gestao da merenda escolar.

## Objetivo funcional da camera

A tela de operacao da fila utilizara a camera do dispositivo para identificar o aluno de duas formas:

1. **Leitura de QR Code:** a camera le o codigo apresentado pelo aluno e extrai seu codigo publico.
2. **Reconhecimento facial:** o `face-api.js` compara localmente o rosto capturado com os descriptors previamente cadastrados, sem enviar fotografias ao backend.

Os dois modos convergem para o mesmo fluxo: depois de identificar o aluno, o frontend envia `alunoCodigo` e `metodoIdentificacao` para `POST /api/v1/fila/validacoes`. A autorizacao, o bloqueio de consumo duplicado e a auditoria permanecem como responsabilidades exclusivas do backend.

O operador podera alternar entre QR Code e reconhecimento facial. Quando a correspondencia facial for insuficiente ou ambigua, a aplicacao devera solicitar a leitura do QR Code como alternativa segura.

### Formatos aceitos no QR Code

O formato mais simples para demonstracao e texto puro:

```text
ALU-001
```

Tambem e aceito um JSON versionado, mais adequado para integracao futura:

```json
{
  "tipo": "ALUNO",
  "alunoCodigo": "ALU-001",
  "versao": 1
}
```

Para compatibilidade com testes iniciais, o frontend tambem aceita JSON com campo `codigo`.

Codigos mockados disponiveis no backend:

- `ALU-001`
- `ALU-002`
- `ALU-003`

## Dashboard gerencial

A rota `/dashboard` consulta `GET /api/v1/gestao/consolidacoes` para exibir os indicadores consolidados da fila. Ao acionar a geracao do relatorio, o frontend chama `POST /api/v1/relatorios-ia` e consulta o status em `GET /api/v1/relatorios-ia/{id}` ate o processamento terminar.

## Execucao

### Dashboard de inteligência logística

O dashboard consulta indicadores determinísticos sem gerar relatório IA. A feature agora inclui:

- Meta interna de execução (padrão 80%), alunos únicos e repetições do dia/turno.
- Ranking Chart.js de execução registrada por item, com tabela acessível de amostras, escolas e origens.
- Contagens por turma; adesão e rejeição não são inferidas sem dados de presença.
- Estados explícitos de dados insuficientes para ingredientes e ciclo de cardápio.
- Histórico dos últimos 20 relatórios por data/turno. Abrir um relatório exibe a análise
  persistida, sem nova chamada ao Gemini. O snapshot permanece salvo no backend para rastreabilidade.

`IndicadoresLogisticosComponent` recebe os dados por input e não depende do roteamento.
Chart.js é carregado no chunk da rota dashboard. O gráfico não usa números produzidos pelo LLM.
Ao mudar filtros, as consultas anteriores são canceladas para não misturar dados de turnos.

O dashboard separa duas abas com os mesmos filtros de data e turno:

- **Indicadores:** consulta consolidação e cálculos do Python, incluindo meta, ranking e
  atendimentos. Atualizar ou navegar pelos filtros não gera relatório nem chama o LLM.
- **Análise IA:** carrega o histórico e permite gerar uma nova análise apenas pelo botão
  "Gerar análise IA". Abrir um relatório salvo consulta o banco. Gráficos, metas, rankings e
  tabelas são exibidos exclusivamente na aba Indicadores.

Alternar entre abas preserva o relatório selecionado e seu acompanhamento. Trocar data ou
turno limpa a seleção e cancela as consultas anteriores; isso não cancela um job já criado
no backend. Relatórios antigos podem ser abertos mesmo sem cardápio ativo no filtro.

Após atualizar: execute `pnpm install` e reinicie Java, Python e Angular. A API precisa expor
`GET /api/v1/gestao/indicadores` e `GET /api/v1/relatorios-ia?data&turno`.

### Desenvolvimento local

Pre-requisitos: Node.js LTS e pnpm.

```powershell
pnpm install
pnpm start
```

A aplicacao abre em `http://localhost:4200` e espera a API em `http://localhost:8081`.

## Organizacao por features

O codigo e agrupado por capacidade de negocio, e nao apenas por tipo tecnico:

```text
src/app/
├── core/
├── shared/
└── features/
    ├── fila/
    │   ├── components/
    │   ├── data-access/
    │   ├── models/
    │   └── pages/
    └── dashboard/
        ├── components/
        ├── data-access/
        ├── models/
        └── pages/
```

Essa decisao mantem cada area funcional autocontida. A fila, por exemplo, concentra sua pagina, scanners, contratos HTTP, servico de API e testes. Se a funcionalidade for incorporada ao sistema legado, suas dependencias ficam explicitas e localizadas.

### Responsabilidade de cada pasta

- `pages`: componentes associados diretamente a rotas.
- `components`: componentes internos e especializados da feature.
- `data-access`: acesso HTTP e estado remoto daquela feature.
- `models`: contratos e tipos usados pela feature.
- `core`: configuracoes e infraestrutura utilizadas por toda a aplicacao.
- `shared`: componentes visuais ou utilitarios verdadeiramente genericos.

### Regras de dependencia

- Uma feature nao importa arquivos internos de outra feature.
- Codigo compartilhado por mais de uma feature pode ser promovido para `shared` ou `core`.
- `shared` nao conhece features.
- `core` nao contem regra de apresentacao especifica de uma feature.
- Regras de negocio de consumo permanecem no backend; o Angular cuida de captura, apresentacao e integracao HTTP.

## Bibliotecas principais

- `html5-qrcode`: leitura do QR Code no navegador.
- `face-api.js`: reconhecimento facial local, sem envio de fotografias ao backend.
- Tailwind CSS: composicao visual.

O reconhecimento facial sera carregado apenas na rota da fila, e os modelos ficarao em assets publicos versionados separadamente.
