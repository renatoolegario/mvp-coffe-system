# Description

Este documento descreve o schema e fluxo **atuais** do MVP.

## Tabelas principais em uso
- `usuarios`
- `clientes`
- `fornecedores`
- `insumos`
- `movimento_producao`
- `producao`
- `detalhes_producao`
- `custos_adicionais_producao`
- `vendas`
- `venda_detalhes`
- `contas_pagar`
- `contas_pagar_parcelas`
- `contas_receber`
- `contas_receber_parcelas`
- `transferencias`
- `empresa_configuracao_estoque`
- `empresa_configuracao_integracoes`

## Fluxos

### Entrada de insumos
Registra movimento de entrada em `movimento_producao` e cria documentos financeiros em `contas_pagar` + `contas_pagar_parcelas`.

### Produção
Cria `producao`, detalha consumo em `detalhes_producao`, reserva/entrada em `movimento_producao` e gera custos financeiros adicionais quando aplicável.

### Venda
Cria `vendas`, parcelas em `contas_receber_parcelas` e histórico em `venda_detalhes`.

### Entrega de venda
Atualiza status de entrega em `vendas` e pode gerar despesas vinculadas em `contas_pagar`.

## Segurança da API
- `POST /api/v1/auth/login` valida credenciais e gera token com expiração em 7 dias.
- Demais endpoints exigem `Authorization: Bearer <token>`.
- Existe validação de sessão em `GET /api/v1/auth/validate`.

## Observação
Referências antigas a `tipos_cafe`, `mov_lotes`, `mov_insumos`, `ordem_producao` e `entrada_insumos` são legadas e não fazem parte do fluxo atual.
