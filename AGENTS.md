# MVP Coffee System

## Papel Deste Arquivo

Este `AGENTS.md` existe para orientar pessoas e agentes que vão manter o projeto. Ele descreve a estrutura real do repositório, o fluxo técnico atual e onde cada responsabilidade do sistema mora hoje.

Se houver conflito entre uma descrição antiga e o código atual, considere o código como fonte de verdade.

## Visão Geral Do Sistema

- Projeto em `Next.js` com `pages router`.
- Frontend administrativo feito principalmente com `React + MUI`.
- Landing page pública usando classes utilitárias em `globals.css`.
- Banco de dados `PostgreSQL`, acessado com `pg`.
- Evolução do schema feita com `node-pg-migrate`.
- Estado global carregado por `Zustand`.
- Autenticação por token `Bearer`, persistido em `localStorage`.
- Dados sensíveis de `usuarios`, `clientes` e `fornecedores` são criptografados.

## Verdades Importantes Do Estado Atual

- O fluxo principal do sistema gira em torno de `GET /api/v1/data` para leitura e `POST /api/v1/command` para escrita.
- As rotas `/app/fabricacao-lotes` e `/app/tipos-cafe` são legadas:
  - `/app/fabricacao-lotes` redireciona para `/app/producao`.
  - `/app/tipos-cafe` exibe aviso de descontinuação.
- O modelo atual usa `insumos` como base tanto para estoque quanto para produto final.
- Não existe suíte de testes automatizados no repositório neste momento, embora exista script `npm test`.
- Algumas estruturas mencionadas em versões antigas do projeto não existem hoje:
  - `/components/molecules`
  - `/components/organisms`
  - `/pages/api/webhook`
  - `/api/v_/routes`
  - `/infra/errors`
  - `/infra/tests`
- A pasta `/functions` existe, mas está vazia no estado atual do projeto.

## Estrutura Real De Pastas

- `pages/`
  - rotas públicas, privadas e APIs do sistema.
- `pages/app/`
  - telas privadas do backoffice.
- `pages/api/v1/`
  - API interna consumida pelo frontend.
- `pages/system/feedbacks/`
  - central de acompanhamento de tarefas e feedbacks.
- `components/atomic/`
  - componentes reutilizáveis pequenos e médios.
- `components/template/`
  - layout base do sistema autenticado.
- `hooks/`
  - sessão e store global com `Zustand`.
- `infra/`
  - conexão com banco, autenticação, OpenAPI e migrations.
- `infra/migrations/`
  - histórico de evolução do banco.
- `utils/`
  - funções puras de formatação, datas, crypto, documentos, estoque e seed.
- `docs/`
  - documentação por tela e documentos de apoio.
- `public/`
  - arquivos estáticos.
- `styles/`
  - CSS global e utilitário.

## Como O Sistema Funciona

### 1. Autenticação

- `POST /api/v1/auth/login` valida email e senha.
- Em caso de sucesso, o backend cria um token em `auth_tokens`.
- O frontend salva a sessão em `localStorage` via `hooks/useSession.js`.
- Rotas privadas validam a sessão e redirecionam para `/login` quando necessário.

### 2. Carregamento De Dados

- `components/template/AppLayout.js` dispara `loadData()` quando a sessão está pronta.
- `hooks/useDataStore.js` chama `GET /api/v1/data`.
- Esse endpoint devolve um snapshot completo das tabelas usadas pela interface.
- A store mantém esse snapshot em memória e as telas derivam seus filtros e resumos localmente.

### 3. Escrita De Dados

- Alterações de negócio passam por `POST /api/v1/command`.
- O corpo da requisição segue o formato:

```json
{
  "action": "nomeDaAcao",
  "payload": {}
}
```

- As ações implementadas hoje são:
  - `addUsuario`
  - `toggleUsuario`
  - `addCliente`
  - `updateCliente`
  - `addFornecedor`
  - `addInsumo`
  - `updateInsumo`
  - `addEntradaInsumos`
  - `createProducao`
  - `confirmarRetornoProducao`
  - `deleteProducao`
  - `cancelarProducao`
  - `addVenda`
  - `confirmarEntregaVenda`
  - `marcarParcelaPaga`
  - `marcarParcelaRecebida`
  - `createTransferencia`

### 4. Banco E Regras

- Não altere schema manualmente no banco.
- Toda mudança estrutural deve nascer em `infra/migrations`.
- Dados pessoais e credenciais são criptografados no backend.
- O frontend trabalha com valores descriptografados, carregados pelos endpoints.

## Mapa Das Páginas

### Públicas

- `/`
  - landing page pública com vitrine de produtos destacados.
  - doc: `docs/Home.md`
- `/login`
  - autenticação do usuário.
  - doc: `docs/Login.md`
- `/cronograma`
  - cronograma operacional de implantação e auditoria.
  - doc: `docs/Cronograma.md`
- `/system`
  - utilitários administrativos de seed/exportação do banco.
  - doc: `docs/System.md`
- `/system/feedbacks`
  - quadro de tarefas, melhorias e feedbacks operacionais.
  - doc: `docs/Feedbacks.md`

### Backoffice Privado

- `/app`
  - dashboard inicial com resumo comercial, financeiro e fluxo de caixa.
  - doc: `docs/AppHome.md`
- `/app/usuarios`
  - cadastro e ativação/desativação de usuários.
  - doc: `docs/Usuarios.md`
- `/app/clientes`
  - cadastro de clientes e acesso ao histórico comercial.
  - doc: `docs/Clientes.md`
- `/app/fornecedores`
  - cadastro de fornecedores.
  - doc: `docs/Fornecedores.md`
- `/app/insumos`
  - catálogo principal de insumos e produtos com unidade, estoque mínimo, venda e vitrine pública.
  - doc: `docs/Insumos.md`
- `/app/producao`
  - etapa 1 da produção: consumo/reserva de insumos.
  - doc: `docs/Producao.md`
- `/app/retorno-producao`
  - etapa 2 da produção: retorno, produtos recebidos e custos adicionais.
  - doc: `docs/RetornoProducao.md`
- `/app/transferencias`
  - movimentação interna entre produtos/insumos, com conversão por unidade.
  - doc: `docs/Transferencias.md`
- `/app/nova-venda`
  - criação de vendas, itens, ajustes comerciais e parcelas.
  - doc: `docs/NovaVenda.md`
- `/app/vendas`
  - gestão operacional de vendas e entregas.
  - doc: `docs/Vendas.md`
- `/app/detalhe-cliente`
  - visão consolidada do cliente, histórico, parcelas e cobranças.
  - doc: `docs/DetalheCliente.md`
- `/app/detalhe-compra-cliente`
  - detalhe aprofundado de uma venda específica do cliente.
  - doc: `docs/DetalheCompraCliente.md`
- `/app/contas-pagar`
  - operação financeira de pagamentos.
  - doc: `docs/ContasPagar.md`
- `/app/contas-receber`
  - operação financeira de recebimentos.
  - doc: `docs/ContasReceber.md`
- `/app/configuracao-empresa`
  - faixas de estoque, integrações e auditoria operacional.
  - doc: `docs/ConfiguracaoEmpresa.md`

### Legadas

- `/app/fabricacao-lotes`
  - redireciona para `/app/producao`.
  - doc: `docs/FabricacaoLotes.md`
- `/app/tipos-cafe`
  - módulo descontinuado.
  - doc: `docs/TiposCafe.md`

## Endpoints Principais

### Autenticação

- `POST /api/v1/auth/login`
- `GET /api/v1/auth/validate`

### Snapshot E Escrita

- `GET /api/v1/data`
- `POST /api/v1/command`

### Dashboards

- `GET /api/v1/dashboard/resumo`
- `GET /api/v1/dashboard/insumos`
- `GET /api/v1/dashboard/fluxo-caixa`

### Configuração Da Empresa

- `GET|POST|PUT|DELETE /api/v1/configuracao-empresa/estoque`
- `GET|PUT /api/v1/configuracao-empresa/integracoes`

### Apoio

- `GET /api/v1/aux/unidades`
- `GET /api/v1/aux/formas-pagamento`
- `GET /api/v1/docs/openapi`

### Sistema

- `POST /api/v1/system/seed`
- `GET|POST|PUT|PATCH /api/v1/system/feedbacks/task`

## Migrations Que Definem O Modelo Atual

- `001` a `014`
  - base inicial de usuários, cadastros, vendas e financeiro.
- `019_refactor_fluxo_producao_unificado`
  - troca o fluxo legado por `producao`, `detalhes_producao`, `custos_adicionais_producao` e `movimento_producao`.
- `035_harden-auth-and-data-security`
  - fortalece autenticação, UUIDs e criptografia.
- `037_align_core_model_and_units`
  - cria `aux_unidade`, ajusta perfis e normaliza unidades.
- `045_add_multi_output_to_producao`
  - cria `producao_resultados` para múltiplos retornos da produção.
- `047_create_feedback_tasks`
  - cria `feedback_tasks` e migra feedbacks legados.
- `048` a `050`
  - aniversários de fornecedores/clientes e campos da homepage em `insumos`.

## Tabelas Mais Importantes No Fluxo Atual

- `usuarios`
- `auth_tokens`
- `clientes`
- `fornecedores`
- `insumos`
- `movimento_producao`
- `producao`
- `detalhes_producao`
- `producao_resultados`
- `custos_adicionais_producao`
- `transferencias`
- `vendas`
- `venda_itens`
- `venda_detalhes`
- `contas_pagar`
- `contas_pagar_parcelas`
- `contas_receber`
- `contas_receber_parcelas`
- `empresa_configuracao_estoque`
- `empresa_configuracao_integracoes`
- `feedback_tasks`

## Regras De Trabalho Para Quem For Mexer No Projeto

- Antes de alterar uma tela, leia a doc correspondente em `docs/`.
- Antes de alterar o banco, revise a sequência de migrations relacionadas.
- Não reintroduza `tipos_cafe`, `mov_lotes`, `mov_insumos`, `ordem_producao` ou `entrada_insumos` como fluxo principal.
- Ao criar nova página, crie também um arquivo em `docs/`.
- Ao criar novo endpoint, atualize `infra/openapi.js` e o `README.md`.
- Ao mexer em `clientes`, `fornecedores` e `usuarios`, preserve o fluxo de criptografia.
- Ao mexer em autenticação, preserve compatibilidade com `hooks/useSession.js`.
- Ao mexer em leitura/escrita do app, considere que grande parte do backoffice depende da dupla `data.js` e `command.js`.

## Documentos De Apoio

- `README.md`
  - onboarding técnico e visão ensinável do sistema.
- `docs/description.md`
  - descrição resumida do schema e fluxos atuais.
- `docs/mvp.md`
  - visão de produto e escopo original do MVP.
