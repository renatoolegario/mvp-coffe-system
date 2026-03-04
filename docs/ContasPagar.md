# Página Contas a Pagar

## Descrição
Painel financeiro com contas e parcelas a pagar.

## Props utilizadas
- Nenhuma.

## Funções internas
- Filtra contas por fornecedor e período de vencimento (`Data between`).
- Lista apenas contas com ao menos uma parcela em aberto.
- Seleção única de conta para detalhar parcelas na lateral direita.
- Confirma pagamento em modal com valor editável e forma de pagamento.
- Se pagamento for menor, exige ação para diferença:
  - Encerrar com baixa completa; ou
  - Jogar diferença para próxima cobrança (nova conta vinculada ao fornecedor com vencimento em +7 dias).

## Resultado esperado
- Controle de obrigações financeiras com tratamento explícito de diferenças de pagamento.
