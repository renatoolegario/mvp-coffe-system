# Página Gestão de Insumos

## Descrição

Cadastro de insumos com tipo de entrada configurável (`kg` ou `saco`) e classificação de uso (`Consumível` ou `Físico`).

## Props utilizadas

- Nenhuma.

## Funções internas

- Cria insumos.
- Lista insumos cadastrados.
- Define conversão de `kg_por_saco` quando o cadastro for em sacos.
- Permite selecionar e editar o tipo do insumo (`Consumível` por padrão).

## Resultado esperado

- Insumos preparados para entradas e produção.
- Tipo do insumo persistido para diferenciar itens físicos e consumíveis.
- Estoque mínimo informado na mesma unidade configurada no cadastro (`kg` ou `saco`).
