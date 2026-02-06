# Página Produção

## Descrição

Tela dedicada à criação de produção (status 1), com previsão de consumo de insumos e peso final.

## Props utilizadas

- Nenhuma.

## Funções internas

- Permite criação por modo:
  - Produto final (peso informado manualmente).
  - Insumos utilizados (peso previsto calculado).
- Valida saldo de estoque por insumo (kg/saco).
- Lista apenas insumos do tipo consumível nos seletores de produção.
- Registra produção pendente via `createProducao`.
- Exibe botão para navegação para a etapa de retorno em `/app/retorno-producao`.

## Resultado esperado

- Produção criada com status 1.
- Movimentações de saída de insumos registradas para a produção.
