# Página Configuração da Empresa

## Descrição

Permite configurar as faixas de status do estoque em percentual sobre o estoque mínimo.

## Props utilizadas

- Nenhuma.

## Funções internas

- Busca e atualiza as faixas pelo endpoint `/api/v1/configuracao-empresa/estoque`.
- Valida no backend que as faixas não se sobrepõem.

## Resultado esperado

- Definição centralizada dos status (ex.: Crítico, Normal, Elevado e Excesso) aplicada no dashboard de insumos.
