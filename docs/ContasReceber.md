# Página Contas a Receber

## Descrição
Painel financeiro com foco em parcelas a receber, separado em duas abas:

- `Contas vencidas`: histórico de todas as parcelas com vencimento anterior ao dia atual, incluindo as já recebidas.
- `Contas à vencer`: parcelas em aberto com vencimento no dia atual ou futuro.

Aceita filtros por query string (`cliente_id` e `parcela_id`) para abrir a tela já focada em um cliente/parcela específica.

## Props utilizadas
- Nenhuma.

## Funções internas
- Filtra globalmente por cliente.
- Usa busca textual para refinar a visualização por cliente, data, conta, parcela ou status.
- Aplica filtro opcional de intervalo de datas apenas na aba `Contas à vencer`.
- Mantém o atalho vindo de `Detalhe do Cliente`, destacando a parcela alvo e escolhendo a aba correta.
- Permite navegar para `Detalhe do Cliente` pela linha da tabela.
- Permite confirmar recebimento individual em drawer lateral, preservando o fluxo de ajuste, diferença e comprovante.
- Exibe, por parcela, se a cobrança ASAAS foi emitida, o status atual e o link salvo.
- Permite emitir posteriormente a cobrança ASAAS de parcelas em aberto que ainda não foram emitidas, usando cliente, valor e vencimento da própria parcela.

## Resultado esperado
- Visão tabular mais direta para contas vencidas e a vencer.
- Histórico de vencidas sem dependência de calendário mensal.
- Filtro por intervalo de datas disponível apenas para parcelas ainda não vencidas.
- Ação de recebimento por linha, sem perder o fluxo de baixa financeira já existente.
- Reemissão operacional simples das cobranças ASAAS a partir da própria parcela em aberto.
