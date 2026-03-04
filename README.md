# MVP Coffee System

Sistema MVP de gestão com Next.js + PostgreSQL.

## Stack
- Next.js (frontend + API em `pages/api`)
- PostgreSQL (`pg`)
- Migrations com `node-pg-migrate`
- Zustand no frontend

## Modelo atual (pós refactor de produção)

As tabelas legadas `tipos_cafe`, `mov_lotes`, `mov_insumos`, `ordem_producao` e `entrada_insumos` foram removidas da operação principal.

Fluxo atual:
- Estoque e custos via `movimento_producao`
- Produção via `producao`, `detalhes_producao`, `custos_adicionais_producao`
- Comercial via `vendas`, `venda_detalhes`
- Financeiro via `contas_pagar(_parcelas)` e `contas_receber(_parcelas)`
- Configuração via `empresa_configuracao_estoque` e `empresa_configuracao_integracoes`

## Endpoints API v1
- `POST /api/v1/auth/login`
- `GET /api/v1/auth/validate`
- `GET /api/v1/data`
- `POST /api/v1/command`
- `GET /api/v1/dashboard/resumo`
- `GET /api/v1/dashboard/insumos`
- `GET /api/v1/dashboard/fluxo-caixa`
- `GET|POST|PUT|DELETE /api/v1/configuracao-empresa/estoque`
- `GET|PUT /api/v1/configuracao-empresa/integracoes`
- `POST /api/v1/system/seed`
- `GET /api/v1/docs/openapi`

## Segurança
- Autenticação por token (`Bearer`) com expiração de 7 dias
- Todo endpoint (exceto login) exige token válido
- Dados sensíveis de `usuarios`, `clientes` e `fornecedores` são armazenados criptografados

## Rodando local
1. Configurar `DATABASE_URL` no `.env`
2. Rodar migrations:
```bash
npm run migration:up
```
3. Subir aplicação:
```bash
npm run dev
```

## Sites de suporte (torra e venda de café)

Referências pesquisadas na web em março/2026 para benchmarking de torra, catálogo e operação de e-commerce:

- https://loja.netcafes.com.br/
- https://amarelocafe.com.br/
- https://www.luccacafes.com.br/
- https://www.cafeterroa.com.br/loja
- https://www.cafebazilli.com.br/loja
- https://loja.cafetamura.com.br/cafes-especiais
- https://loja.cafedapreta.com.br/
- https://www.brazilroasters.com.br/
- https://benditatorra.com/
- https://torrarara.com.br/
- https://coratorrefacao.com/
- https://arbor.cafe/
