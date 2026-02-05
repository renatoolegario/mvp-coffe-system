# Página Fabricação de Lotes

## Descrição

Tela de produção com fluxo unificado em 2 etapas:

1. Criar produção (status 1) com insumo final, taxa de conversão e consumo de N insumos.
2. Confirmar retorno (status 2), informando peso real e custos adicionais opcionais por fornecedor.

## Props utilizadas

- Nenhuma.

## Funções internas

- Suporta dois modos de geração:
  - Pelo produto final (usuário define o peso final desejado).
  - Pelos insumos usados (peso final previsto calculado automaticamente).
- Exibe consumo em kg por linha (kg/saco), saldo de estoque e validação de saldo insuficiente.
- Registra criação via `createProducao`.
- Finaliza produção via `confirmarRetornoProducao`, permitindo múltiplos custos adicionais.

## Resultado esperado

- Produção criada como pendente (status 1) sem entrada imediata no insumo final.
- Retorno confirmado (status 2) com peso real e custos adicionais refletidos nos lançamentos financeiros e no estoque.
