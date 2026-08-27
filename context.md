# Contexto Arquitetural — Frontend

## Objetivo

Este frontend nasceu como um prototipo standalone para o Projeto Integrador, mas deve ser preparado para uma futura integracao com um sistema legado corporativo.

A decisao arquitetural e manter a aplicacao funcionando de forma independente e, ao mesmo tempo, organizar as telas principais como componentes embutiveis.

## Direcao de evolucao

As rotas completas do prototipo devem ser apenas cascas de navegacao. A regra visual e os fluxos principais devem morar em componentes reutilizaveis por feature.

Exemplo desejado:

```html
<app-fila-standalone [apiBaseUrl]="apiBaseUrl" />
<app-dashboard-relatorio [apiBaseUrl]="apiBaseUrl" />
```

Com isso, um sistema legado podera renderizar a fila ou o dashboard sem precisar herdar o layout, header, menu ou roteamento do prototipo.

## Componentes candidatos a embed

- `FilaStandaloneComponent`: tela operacional da fila, contendo QR Code, reconhecimento facial e resultado da validacao.
- `DashboardRelatorioStandaloneComponent`: tela gerencial com consolidacao, geracao e acompanhamento de relatorio IA.
- `QrScannerComponent`: componente especializado para leitura de QR Code.
- `ResultadoValidacaoComponent`: componente visual para sinal verde/vermelho.

## Regras para facilitar migracao

- Componentes embutiveis nao devem depender diretamente do `AppComponent`.
- Componentes embutiveis nao devem depender de rotas para funcionar.
- A URL da API deve ser configuravel por input ou provider, sem hardcode interno.
- Componentes de feature podem depender de `data-access` e `models` da propria feature.
- Codigo compartilhado deve ir para `shared` ou `core` somente quando for usado por mais de uma feature.
- A camera e o reconhecimento facial continuam no navegador; o backend recebe somente o identificador final do aluno.

## Estrategia recomendada

Manter tudo neste repositorio durante o prototipo. Extrair para um pacote separado, como `merenda-web-components`, somente quando houver necessidade real de versionamento, publicacao ou consumo por outro sistema.
