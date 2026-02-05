# Página Entrada de Insumos

## Descrição
Registro de compras com itens, parcelas e atualização de estoque de insumos.

## Props utilizadas
- Nenhuma.

## Funções internas
- Adiciona itens da compra.
- Gera movimentações de insumos.
- Cria contas a pagar e parcelas.
- Mostra conversão de entrada para `kg` quando o insumo é configurado em `saco`.

## Regras de conversão
- Banco sempre recebe movimentação em `kg`.
- Entrada em saco:
  - Quantidade informada = sacos.
  - Quantidade para estoque (`kg`) = `quantidade * kg_por_saco`.
  - Custo unitário em `kg` = `valor_total / (quantidade * kg_por_saco)`.
- Entrada em kg:
  - Quantidade para estoque (`kg`) = `quantidade`.
  - Custo unitário em `kg` = `valor_total / quantidade`.

## Resultado esperado
- Estoque de insumos atualizado em `kg` e financeiro registrado.
- Painel mostra quantidade convertida (sacos e kg) para insumos cadastrados em saco.
