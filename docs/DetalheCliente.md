# Página Detalhe do Cliente

## Descrição

Consulta de clientes em tabela com busca por `like`, com ações em drawer lateral para:

- editar dados cadastrais;
- visualizar histórico de compras;
- acompanhar parcelas e confirmar recebimento.

Também permite lançar ajuste de **desconto** ou **juros** no momento da confirmação do recebimento da parcela. O ajuste gera um evento financeiro adicional vinculado à venda, mantendo histórico intacto.

## Props utilizadas

- Nenhuma.

## Funções internas

- Filtragem dinâmica de clientes por nome/CPF-CNPJ/telefone.
- Abertura de drawers de ação por cliente.
- Fluxo de confirmação de recebimento com modal.
- Registro de ajuste em histórico de detalhes da venda.

## Resultado esperado

- Listagem de clientes em tabela (sem select de cliente).
- Ações por linha de cliente para cadastro/histórico/parcelas.
- Parcelas em aberto com botão de confirmação e modal de ajuste.
- Histórico com eventos de desconto/juros por venda.
