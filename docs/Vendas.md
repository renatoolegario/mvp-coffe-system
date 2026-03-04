# Página Gestão de Vendas

## Descrição
Tela de gestão de vendas com foco operacional:
- calendário mensal com total financeiro e quantidade de vendas por dia;
- filtro por intervalo de datas (default mês corrente);
- painel de histórico das vendas filtradas;
- alerta fixo para entregas atrasadas (sempre visível, independente do filtro);
- finalização de entrega com custos extras;
- exportação CSV do histórico no intervalo + entregas atrasadas.

## Props utilizadas
- Nenhuma.

## Funções internas
- `applyMonth`: aplica mês no calendário e sincroniza intervalo.
- `finalizarEntrega`: confirma entrega e registra custos extras opcionais.
- `handleDownloadSales`: gera CSV para download com linhas duplicadas por parcela/data de pagamento.
- `buildCalendarDays`: monta células do calendário mensal com total e quantidade por dia.

## Resultado esperado
- Usuário acompanha histórico por período.
- Usuário identifica rapidamente entregas atrasadas sem perder visibilidade do histórico.
- Usuário exporta relatório completo de vendas/pagamentos para conferência financeira.
