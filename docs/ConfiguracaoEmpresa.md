# Página Configuração da Empresa

## Descrição

Permite configurar as faixas de status do estoque, integrar provedores externos, auditar vínculos por código de origem e registrar feedbacks operacionais.

## Props utilizadas

- Nenhuma.

## Funções internas

- Busca e atualiza as faixas pelo endpoint `/api/v1/configuracao-empresa/estoque`.
- Valida no backend que as faixas não se sobrepõem.
- Permite salvar chaves de integração por provedor.
- Exibe aba de Auditoria para consulta de histórico completo por `Origem (Ref)`.
- Lista e cria feedbacks no endpoint `/api/v1/configuracao-empresa/feedback`.
- Permite finalizar feedbacks em `/api/v1/configuracao-empresa/feedback/:id/finalizar`.

## Resultado esperado

- Definição centralizada dos status (ex.: Crítico, Normal, Elevado e Excesso) aplicada no dashboard de insumos.
- Rastreabilidade completa de eventos financeiros e operacionais vinculados a um mesmo código de referência.
- Gestão simples de afazeres via feedback com filtros por status (Programado e Finalizado).
