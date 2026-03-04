# Página Detalhe do Cliente

## Descrição

Consulta de clientes em tabela com busca por `like`, com ações em drawer lateral para:

- editar dados cadastrais;
- visualizar histórico de compras;
- acompanhar parcelas e confirmar recebimento.

Também permite exportar planilhas `.xlsx` com:

- todos os clientes e seus dados cadastrais;
- histórico completo do cliente (vendas, itens, parcelas e eventos financeiros);
- parcelas do cliente com origem da venda e dados de recebimento.

Quando a parcela estiver em aberto, o botão de confirmação redireciona para `Contas a Receber` com filtros automáticos de cliente/parcela.

## Props utilizadas

- Nenhuma.

## Funções internas

- Filtragem dinâmica de clientes por nome/CPF-CNPJ/telefone.
- Abertura de drawers de ação por cliente.
- Exportações XLSX de clientes, histórico e parcelas.
- Redirecionamento para confirmação financeira em `Contas a Receber` com query string.

## Resultado esperado

- Listagem de clientes em tabela (sem select de cliente).
- Ações por linha de cliente para cadastro/histórico/parcelas.
- Botão de download no cabeçalho para exportar dados cadastrais de todos os clientes.
- Botão de download no drawer de histórico.
- Botão de download no drawer de parcelas.
- Botão de confirmação de parcela em aberto direcionando para a baixa em `Contas a Receber`.
