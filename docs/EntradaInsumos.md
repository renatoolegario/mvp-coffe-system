# Página Entrada de Insumos

## Descrição

Registro de compras de insumos com conversão obrigatória para `kg`, parcelamento com status de pagamento e custos extras opcionais vinculados à mesma entrada.

## Props utilizadas

- Nenhuma.

## Funções internas

- Seleciona fornecedor e insumo da compra principal.
- Define modo obrigatório da entrada (`KG` ou `SACO`).
- Quando `SACO` é selecionado, exige:
  - `kg` por saco.
  - quantidade de sacos.
- Calcula automaticamente:
  - `kg` totais para persistência.
  - custo unitário em `kg`.
- Gera parcelas da compra principal com:
  - valor.
  - vencimento.
  - status (`A prazo` ou `Pago`).
- Permite adicionar custos extras opcionais por linha com:
  - fornecedor.
  - valor total.
  - descrição.
  - status de pagamento.
  - quantidade de parcelas e vencimentos.
- Exibe entradas recentes com resumo de custo e status das parcelas.

## Regras de conversão

- Banco sempre recebe movimentação em `kg`.
- Entrada em saco:
  - Quantidade informada = sacos.
  - Quantidade para estoque (`kg`) = `quantidade_sacos * kg_por_saco`.
  - Custo unitário em `kg` = `valor_total / kg_totais`.
- Entrada em kg:
  - Quantidade para estoque (`kg`) = `quantidade_kg`.
  - Custo unitário em `kg` = `valor_total / quantidade_kg`.

## Regras de pagamento

- Parcelas iniciam com status padrão `A prazo (não pago)`.
- Se o status for `Pago`, a parcela é registrada como `PAGA` já na criação.
- Custos extras seguem a mesma lógica de status e parcelamento da entrada principal.

## Resultado esperado

- Estoque e movimentação sempre em `kg`.
- Contas a pagar da entrada principal e dos custos extras geradas de forma integrada.
- Parcelas salvas com status correto (`ABERTA`/`PAGA`) e vencimentos.
