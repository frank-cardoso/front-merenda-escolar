# Frontend — Controle de Merenda Escolar

Aplicacao Angular 20 com Standalone Components e Tailwind CSS para operacao da fila e gestao da merenda escolar.

## Execucao

Pre-requisitos: Node.js LTS e pnpm.

```powershell
pnpm install
pnpm start
```

A aplicacao abre em `http://localhost:4200` e espera a API em `http://localhost:8080`.

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
