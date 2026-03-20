# Página Contas a Pagar

## Descrição

Painel financeiro com contas e parcelas a pagar, separado entre histórico de vencidas e contas ainda a vencer.

## Props utilizadas

- Nenhuma.

## Funções internas

- Separa a visão em duas tabs:
  - `Contas vencidas`: histórico de parcelas já vencidas, com filtro interno por fornecedor e busca rápida.
  - `Contas à vencer`: parcelas em aberto que ainda não venceram, com filtro adicional de intervalo de datas.
- Lista tabelas com informações cruciais da parcela e ações rápidas para detalhar a conta e atualizar o pagamento.
- Abre um drawer lateral para detalhamento completo da conta selecionada.
- Confirma pagamento em drawer lateral com valor editável e forma de pagamento.
- Se pagamento for menor, exige ação para diferença:
  - Encerrar com baixa completa; ou
  - Jogar diferença para próxima cobrança (nova conta vinculada ao fornecedor com vencimento em +7 dias).
- Ao quitar a última parcela, o status da `contas_pagar` é sincronizado para `PAGO`.

## Resultado esperado

- Controle de obrigações financeiras sem calendário mensal, priorizando operação em tabela, histórico de atrasos e atualização rápida das parcelas.
