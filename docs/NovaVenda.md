# Página Nova Venda

## Descrição

Registro de novas vendas com itens, parcelas, data programada de entrega e confirmação de entrega com despesas extras vinculadas à venda.

## Props utilizadas

- Nenhuma.

## Funções internas

- Adiciona itens de venda.
- Gera movimentações do estoque por tipo de café.
- Cria contas a receber e parcelas.
- Lista vendas programadas e não entregues no painel lateral.
- Abre modal lateral para confirmar entrega e opcionalmente lançar despesa extra vinculada à venda.

## Resultado esperado

- Vendas registradas e estoque atualizado.
- Vendas com status de entrega (`PENDENTE`/`ENTREGUE`).
- Despesas extras geradas pela entrega aparecem em contas a pagar com `venda_id` para rastreabilidade.
