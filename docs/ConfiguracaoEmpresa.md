# Página Configuração da Empresa

## Descrição

Permite configurar as faixas de status do estoque, integrar provedores externos e auditar vínculos por código de origem.

## Props utilizadas

- Nenhuma.

## Funções internas

- Busca e atualiza as faixas pelo endpoint `/api/v1/configuracao-empresa/estoque`.
- Valida no backend que as faixas não se sobrepõem.
- Permite salvar chaves de integração por provedor.
- Exibe aba de Auditoria para consulta de histórico completo por `Origem (Ref)`.

## Resultado esperado

- Definição centralizada dos status (ex.: Crítico, Normal, Elevado e Excesso) aplicada no dashboard de insumos.
- Rastreabilidade completa de eventos financeiros e operacionais vinculados a um mesmo código de referência.
