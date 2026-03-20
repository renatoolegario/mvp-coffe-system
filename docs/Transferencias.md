# Página Transferências Internas

## Descrição

Tela usada para mover saldo entre dois itens do cadastro de `insumos`, mantendo a operação convertida para `kg` no backend.

## Props utilizadas

- Nenhuma.

## Funções internas

- Seleciona um item de origem e um item de destino.
- Mostra saldo disponível e custo médio do item de origem.
- Permite informar a movimentação em `KG` ou `SACO`.
- Quando a unidade informada é `SACO`, exige `kg por saco`.
- Calcula automaticamente a conversão para `kg`.
- Impede transferência sem saldo suficiente.
- Registra a operação via `createTransferencia`.

## Exemplo

- Origem: Café Verde A
- Destino: Café Torrado Balcão
- Unidade informada: `SACO`
- Quantidade: `2`
- Kg por saco: `23`
- Conversão persistida: `46 kg`

## Resultado esperado

- Saída do saldo na origem.
- Entrada do saldo no destino.
- Rastreabilidade da transferência com observação e custo unitário.
