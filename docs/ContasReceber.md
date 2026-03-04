# Página Contas a Receber

## Descrição
Painel financeiro com contas e parcelas a receber.
Aceita filtros por query string (`cliente_id` e `parcela_id`) para abrir a tela já focada em um cliente/parcela específica.

## Props utilizadas
- Nenhuma.

## Funções internas
- Filtra faturas por cliente e período de vencimento (`Data between`).
- Lista apenas faturas com pelo menos uma parcela em aberto.
- Seleção única de fatura para exibir as parcelas na lateral direita.
- Permite selecionar parcelas abertas da fatura e confirmar recebimento com ajuste.
- Exibe aviso de filtro rápido quando acessada por atalho de outra tela e permite limpar a query.

## Resultado esperado
- Controle de recebíveis com visão por fatura e baixa de parcelas com rastreio de diferença.
- Ao chegar de `Detalhe do Cliente`, a página deve abrir já filtrada por cliente/parcela.
