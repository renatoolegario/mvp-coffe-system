# Café Essências do Brasil

Sistema de gestão operacional e comercial para café, construído com `Next.js`, `React`, `PostgreSQL` e `Zustand`.

Este repositório tem duas faces:

- uma landing page pública para apresentação e vitrine de produtos;
- um backoffice autenticado para cadastro, estoque, produção, vendas, financeiro, configuração e feedbacks operacionais.

## O Que Este Sistema Faz

O projeto cobre o ciclo principal da operação:

- autenticação de usuários;
- cadastro de clientes, fornecedores e insumos;
- entrada de insumos com reflexo financeiro;
- produção em duas etapas:
  - envio/reserva de insumos;
  - retorno com produtos gerados e custos adicionais;
- transferências internas entre produtos;
- vendas com itens, desconto/acréscimo e contas a receber;
- contas a pagar e contas a receber;
- integração ASAAS com customer por CPF/CNPJ, emissão de 1 cobrança por parcela e baixa via webhook;
- integração Resend e rotinas cron para lembretes operacionais;
- configuração de faixas de estoque e integrações;
- registro de feedbacks e tarefas operacionais.

## Stack Real Do Projeto

- `Next.js 15` com `pages router`
- `React 18`
- `@mui/material` para o backoffice
- `Tailwind CSS v4` no CSS global e na landing page
- `Zustand` para store global
- `pg` para acesso ao PostgreSQL
- `node-pg-migrate` para migrations
- `CryptoJS` para criptografia de campos sensíveis

## Subindo O Projeto Localmente

### 1. Instale as dependências

```bash
npm install
```

### 2. Configure o `.env`

Exemplo:

```env
DATABASE_URL=postgresql://usuario:senha@host:5432/banco?sslmode=require
IV=coffe
SECRET_KEY=system
```

Variáveis esperadas:

- `DATABASE_URL`: conexão com o PostgreSQL
- `IV`: vetor de inicialização usado na criptografia
- `SECRET_KEY`: chave usada na criptografia

### 3. Rode as migrations

```bash
npm run migration:up
```

### 4. Inicie a aplicação

```bash
npm run dev
```

Depois disso:

- landing page: `http://localhost:3000/`
- login: `http://localhost:3000/login`

## Como Pensar Na Arquitetura

### Frontend

O frontend usa um padrão simples:

- `AppLayout` protege as rotas privadas;
- `useSession` gerencia o token salvo no navegador;
- `useDataStore` carrega e mantém um snapshot do banco em memória;
- as páginas leem o snapshot da store e chamam ações para gravar mudanças.

### Backend

A API interna segue dois estilos:

- endpoints específicos para autenticação, dashboards, configuração e sistema;
- um endpoint central de escrita (`/api/v1/command`) com ações nomeadas.

### Banco

O schema evolui apenas por migrations em `infra/migrations`.

Campos sensíveis são criptografados antes de serem persistidos. O backend descriptografa esses dados ao devolver o snapshot para o frontend.

## Fluxo Técnico Principal

### Leitura

O backoffice carrega seus dados assim:

1. usuário faz login;
2. o token é salvo em `localStorage`;
3. `AppLayout` chama `loadData()`;
4. `GET /api/v1/data` devolve o snapshot completo;
5. a store em `hooks/useDataStore.js` distribui os dados para as páginas.

### Escrita

As mutações principais passam por:

```http
POST /api/v1/command
```

Formato:

```json
{
  "action": "addCliente",
  "payload": {
    "id": "uuid",
    "nome": "Cliente Exemplo",
    "email": "cliente@exemplo.com",
    "cpf_cnpj": "11144477735"
  }
}
```

O backend interpreta `action`, valida o `payload`, atualiza o banco e o frontend sincroniza a store local.

## Estrutura Real Do Repositório

```text
pages/
  _app.js
  index.js
  login.js
  cronograma.js
  system.js
  system/feedbacks/
  app/
  api/v1/
components/
  atomic/
  template/
hooks/
infra/
  database.js
  auth.js
  openapi.js
  migrations/
utils/
docs/
styles/
public/
```

### O Que Existe Hoje

- `components/atomic`: blocos reutilizáveis como cabeçalhos, drawers e modais.
- `components/template/AppLayout.js`: layout autenticado com menu lateral e proteção de sessão.
- `hooks/useSession.js`: sessão local e cabeçalhos `Authorization`.
- `hooks/useDataStore.js`: store global e ações que conversam com a API.
- `infra/database.js`: conexão e transações no PostgreSQL.
- `infra/auth.js`: autenticação, validação de token e regra de admin.
- `infra/openapi.js`: contrato OpenAPI da API interna.
- `services/`: regras de integração, especialmente ASAAS e configuração de integrações.
- `utils/`: crypto, formatação, datas, documentos, imagem, seed e estoque.

### O Que Não Existe Mais Ou Não Existe Ainda

Algumas referências antigas não batem com o estado atual do projeto:

- não há `components/molecules` e `components/organisms`;
- não há `pages/api/webhook`;
- não há `infra/errors`;
- não há `infra/tests`;
- a pasta `functions/` está vazia;
- `tipos_cafe` e `fabricacao-lotes` são legados.

## Mapa Das Páginas

### Rotas Públicas E De Apoio

| Rota                | O que faz                                                         | Doc                  |
| ------------------- | ----------------------------------------------------------------- | -------------------- |
| `/`                 | Landing page pública e vitrine de produtos marcados para homepage | `docs/Home.md`       |
| `/login`            | Login com email/senha                                             | `docs/Login.md`      |
| `/cronograma`       | Planejamento de implantação e auditorias                          | `docs/Cronograma.md` |
| `/system`           | Seed, exportação de snapshot e visualização JSON                  | `docs/System.md`     |
| `/system/feedbacks` | Quadro de tarefas, melhorias e acompanhamento técnico             | `docs/Feedbacks.md`  |

### Rotas Privadas Do Backoffice

| Rota                          | O que faz                                                                     | Doc                            |
| ----------------------------- | ----------------------------------------------------------------------------- | ------------------------------ |
| `/app`                        | Dashboard com resumo executivo, calendário financeiro e indicadores           | `docs/AppHome.md`              |
| `/app/usuarios`               | Cadastro e ativação/desativação de usuários                                   | `docs/Usuarios.md`             |
| `/app/clientes`               | Cadastro de clientes e ponto de entrada para histórico comercial              | `docs/Clientes.md`             |
| `/app/fornecedores`           | Cadastro de fornecedores                                                      | `docs/Fornecedores.md`         |
| `/app/insumos`                | Cadastro de insumos e produtos, com unidade, estoque mínimo e vitrine pública | `docs/Insumos.md`              |
| `/app/producao`               | Etapa 1 da produção: reserva/saída de insumos                                 | `docs/Producao.md`             |
| `/app/retorno-producao`       | Etapa 2 da produção: retorno, produtos recebidos e custos extras              | `docs/RetornoProducao.md`      |
| `/app/transferencias`         | Transferência interna entre produtos e insumos                                | `docs/Transferencias.md`       |
| `/app/nova-venda`             | Criação de venda, itens, pagamento e PDF da ordem                             | `docs/NovaVenda.md`            |
| `/app/vendas`                 | Gestão de histórico de vendas e entregas                                      | `docs/Vendas.md`               |
| `/app/detalhe-cliente`        | Histórico comercial e financeiro do cliente                                   | `docs/DetalheCliente.md`       |
| `/app/detalhe-compra-cliente` | Detalhe completo de uma compra específica                                     | `docs/DetalheCompraCliente.md` |
| `/app/contas-pagar`           | Baixa e acompanhamento de parcelas a pagar                                    | `docs/ContasPagar.md`          |
| `/app/contas-receber`         | Baixa e acompanhamento de parcelas a receber                                  | `docs/ContasReceber.md`        |
| `/app/configuracao-empresa`   | Faixas de estoque, integrações e auditoria                                    | `docs/ConfiguracaoEmpresa.md`  |

### Rotas Legadas

| Rota                    | Situação                         |
| ----------------------- | -------------------------------- |
| `/app/fabricacao-lotes` | Redireciona para `/app/producao` |
| `/app/tipos-cafe`       | Módulo descontinuado             |

## API Interna

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

### Configuração

- `GET|POST|PUT|DELETE /api/v1/configuracao-empresa/estoque`
- `GET|PUT /api/v1/configuracao-empresa/integracoes`

### Integrações E Automação

- `POST /api/v1/integracoes/asaas/clientes/sincronizar`
- `POST /api/v1/integracoes/asaas/cobrancas`
- `GET|DELETE /api/v1/integracoes/asaas/cobrancas/[id]`
- `POST /api/v1/integracoes/asaas/webhook`
- `GET /api/v1/cron/cobrancas-asaas-hoje`
- `GET /api/v1/cron/contas-receber-hoje`
- `GET /api/v1/cron/entregas-hoje`

### Apoio

- `GET /api/v1/aux/unidades`
- `GET /api/v1/aux/formas-pagamento`
- `GET /api/v1/docs/openapi`

### Sistema

- `POST /api/v1/system/seed`
- `GET|POST|PUT|PATCH /api/v1/system/feedbacks/task`

## Exemplos De Uso Da API

### Login

```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@empresa.com","senha":"123456"}'
```

Resposta esperada:

```json
{
  "token": "uuid.hash",
  "expira_em": "2026-03-27 10:00:00",
  "usuario": {
    "id": "uuid",
    "nome": "Administrador",
    "email": "admin@empresa.com",
    "perfil": 1
  }
}
```

### Carregar Snapshot Completo

```bash
curl http://localhost:3000/api/v1/data \
  -H "Authorization: Bearer SEU_TOKEN"
```

### Criar Um Feedback/Tarefa

Esse endpoint é público:

```bash
curl -X POST http://localhost:3000/api/v1/system/feedbacks/task \
  -H "Content-Type: application/json" \
  -d '{
    "descricao":"A tela de vendas precisa de um filtro extra por cliente",
    "onde":"Gestão de Vendas",
    "quem":"Operação"
  }'
```

### Executar Um Comando De Negócio

```bash
curl -X POST http://localhost:3000/api/v1/command \
  -H "Authorization: Bearer SEU_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "action":"addCliente",
    "payload":{
      "id":"3b4d8b5c-1234-4bcd-8d10-111111111111",
      "nome":"Cliente Exemplo",
      "email":"cliente@exemplo.com",
      "cpf_cnpj":"11144477735",
      "telefone":"31999999999",
      "endereco":"Belo Horizonte - MG"
    }
  }'
```

## Banco De Dados E Migrations

### Tabelas Ativas Mais Relevantes

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
- `asaas_cobrancas`
- `email_notificacoes`
- `empresa_configuracao_estoque`
- `empresa_configuracao_integracoes`
- `feedback_tasks`

### Linha Do Tempo Mais Importante Das Migrations

- `001` a `014`: base de usuários, cadastros, vendas e financeiro.
- `019_refactor_fluxo_producao_unificado`: cria o modelo atual de produção.
- `035_harden-auth-and-data-security`: consolida UUIDs, criptografia e tokens.
- `037_align_core_model_and_units`: cria `aux_unidade`, ajusta perfis e normaliza unidades.
- `045_add_multi_output_to_producao`: adiciona múltiplos resultados de produção.
- `047_create_feedback_tasks`: cria o quadro moderno de feedbacks/tarefas.
- `048` e `049`: datas de aniversário para fornecedores e clientes.
- `050_add_homepage_fields_to_insumos`: habilita vitrine da landing page.
- `051_add_asaas_resend_and_cron_support`: cria `asaas_cobrancas`, `email_notificacoes` e a base das integrações.
- `052_remove_mvp_brand_references_from_seed_data`: limpa dados de seed legados da marca anterior.
- `053_add_asaas_snapshot_to_contas_receber_parcelas`: adiciona snapshot de emissão/status/link ASAAS em cada parcela.
- `054_add_received_value_to_asaas_cobrancas`: separa valor original da cobrança e valor efetivamente recebido via webhook.

### Tabelas Legadas

Estes nomes aparecem no histórico, mas não devem ser tratados como fluxo principal novo:

- `tipos_cafe`
- `mov_lotes`
- `mov_insumos`
- `ordem_producao`
- `entrada_insumos`

## Fluxos De Negócio Explicados

### 1. Cadastro De Cliente

Como funciona:

1. a tela `/app/clientes` coleta os dados;
2. a store chama `addCliente`;
3. `POST /api/v1/command` recebe `action = "addCliente"`;
4. o backend valida nome, email, CPF/CNPJ e aniversário;
5. os dados são criptografados e salvos em `clientes`.

Impacto:

- habilita vendas futuras;
- alimenta contas a receber;
- aparece em `Detalhe do Cliente`.

### 2. Entrada De Insumos

Como funciona:

1. a operação escolhe fornecedor, insumo, unidade e parcelas;
2. a store chama `addEntradaInsumos`;
3. o backend converte tudo para `kg`;
4. cria movimentação em `movimento_producao`;
5. cria `contas_pagar` e `contas_pagar_parcelas`.

Exemplo prático:

- comprar `10 sacos` de `23 kg`
- total em estoque: `230 kg`
- o sistema persiste o estoque em `kg`, mesmo que a entrada tenha sido informada em saco.

### 3. Produção E Retorno

Como funciona:

1. `/app/producao` registra os insumos consumidos;
2. o backend cria a produção e reserva/baixa os insumos;
3. `/app/retorno-producao` confirma o que realmente voltou;
4. o backend registra produtos gerados em `producao_resultados`;
5. custos adicionais podem gerar contas a pagar vinculadas.

Exemplo prático:

- saída de café verde para uma OP;
- retorno com produto torrado, moagem diferente ou sobra extra;
- o custo final da produção fica associado ao retorno confirmado.

### 4. Venda

Como funciona:

1. `/app/nova-venda` monta cliente, itens e pagamento;
2. a store chama `addVenda`;
3. o backend baixa estoque em `kg`;
4. grava `vendas`, `venda_itens`, `contas_receber` e `contas_receber_parcelas`;
5. quando a venda é a prazo, o fluxo pode abrir confirmação para emitir cobranças ASAAS ou emitir automaticamente, conforme a integração;
6. o histórico aparece em `/app/vendas` e `/app/detalhe-cliente`.

Regra importante:

- `Cliente Balcão` só pode vender à vista.

### 5. Cobrança ASAAS Por Parcela

Como funciona:

1. cada cobrança local nasce com um `id` próprio em `asaas_cobrancas`;
2. esse `id` local é enviado ao ASAAS como `externalReference`;
3. o customer é reaproveitado por `cpf_cnpj` e, se necessário, criado antes da emissão;
4. cada parcela pode gerar uma cobrança própria com `billingType = UNDEFINED` (`Pergunte ao cliente`);
5. o webhook do ASAAS devolve a cobrança, atualiza `asaas_cobrancas` e tenta baixar automaticamente a parcela vinculada;
6. `contas_receber_parcelas` mantém um snapshot com emissão, status e link da cobrança.

Regras importantes:

- o controle de cobrança é por parcela, não por conta agregada;
- a emissão manual em `Contas a Receber` exige vencimento mínimo `D+1`;
- o webhook pode registrar pagamento a menor ou a maior usando `value` e `received_value`.

### 6. Financeiro

Como funciona:

- `Contas a Pagar` opera sobre `contas_pagar_parcelas`.
- `Contas a Receber` opera sobre `contas_receber_parcelas`.
- `Contas a Receber` também pode emitir ou excluir cobranças ASAAS por parcela.
- Ao quitar/receber parcelas, o backend sincroniza o status macro da conta.

Exemplo prático:

- uma parcela a receber pode ter baixa parcial, diferença, comprovante e observação;
- uma parcela recebida via webhook ASAAS pode registrar valor recebido diferente do valor original;
- uma parcela a pagar pode gerar ajuste quando o valor pago não bate com o programado.

### 7. Transferências Internas

Como funciona:

1. a tela seleciona origem e destino;
2. calcula conversão `SACO -> KG` quando necessário;
3. chama `createTransferencia`;
4. o backend tira saldo de um item e credita em outro.

Exemplo prático:

- transferir `2 sacos` de `23 kg` do produto A para o produto B;
- o backend registra `46 kg` saindo da origem e entrando no destino.

### 8. Feedbacks E Tarefas

Como funciona:

1. qualquer pessoa pode abrir uma pendência em `/system/feedbacks`;
2. a tarefa nasce com `status = 1`;
3. durante o trabalho, o técnico muda para `status = 2`;
4. ao concluir, registra `parecer`, `git_commit` e fecha com `status = 3`.

## Onde Consultar Cada Assunto

- visão rápida do projeto: `AGENTS.md`
- schema e fluxo atual: `docs/description.md`
- escopo original do produto: `docs/mvp.md`
- comportamento por tela: arquivos em `docs/*.md`

## Regras Práticas Para Manutenção

- consulte a doc da página antes de editar a tela;
- se criar uma nova rota, crie também sua doc em `docs/`;
- se alterar endpoint, atualize `infra/openapi.js`;
- se alterar banco, crie migration;
- preserve o fluxo de criptografia;
- preserve o padrão `snapshot + command`;
- preserve o vínculo ASAAS usando `asaas_cobrancas.id` como `externalReference` nas cobranças novas;
- preserve o espelhamento de `contas_receber_parcelas` com status/link/flag de emissão do ASAAS;
- não trate módulos legados como caminho principal do sistema.

## Observação Sobre Testes

O projeto possui script `npm test`, mas não há testes automatizados versionados no repositório no estado atual. Isso significa que a validação depende mais de:

- revisão de código;
- consistência das docs;
- smoke test manual das telas e endpoints.
