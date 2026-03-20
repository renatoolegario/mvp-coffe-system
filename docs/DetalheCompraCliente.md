# Página Detalhe da Compra

## Descrição

Tela de aprofundamento de uma venda específica, acessada a partir do histórico do cliente.

## Props utilizadas

- Nenhuma.

## Funções internas

- Lê `venda_id` e `cliente_id` da query string.
- Resolve a venda, o cliente e os itens vinculados pela store global.
- Exibe dados principais da venda:
  - cliente
  - data
  - valor total
  - forma e tipo de pagamento
  - status de entrega
- Lista os itens vendidos com quantidade informada, quantidade em `kg`, preço e total.
- Lista as parcelas vinculadas à conta a receber da venda.
- Consolida eventos financeiros da venda:
  - descontos
  - acréscimos
  - histórico de `venda_detalhes`
- Oferece ação rápida para voltar ao histórico do cliente.

## Exemplo

Ao abrir `/app/detalhe-compra-cliente?venda_id=abc&cliente_id=xyz`, a página recompõe a compra usando:

- `vendas`
- `venda_itens`
- `contas_receber`
- `contas_receber_parcelas`
- `venda_detalhes`
- `clientes`

## Resultado esperado

- Usuário consegue auditar uma venda inteira sem voltar para a listagem.
- Time comercial e financeiro visualizam a mesma compra com contexto completo.
