# Página Nova Venda

## Descrição

Registro de novas vendas com layout em duas colunas:
- Coluna esquerda: cliente/comercial, pagamento e ajustes comerciais.
- Coluna direita: inclusão e precificação dos itens vendidos.

A página também oferece histórico lateral de vendas com geração de PDF A4 por ordem.

## Props utilizadas

- Nenhuma.

## Funções internas

- Adiciona itens de venda com seleção de unidade por produto.
- Exibe tooltip/modal suspenso de estoque do produto selecionado (kg/saco, custos e unidade padrão).
- Mantém preço unitário manual (não autopreenche preço no select de produto).
- Aplica desconto e valor adicional (valor ou percentual).
- Cria contas a receber e parcelas conforme tipo de pagamento.
- Regra comercial: Cliente Balcão (`protegido=true`) só pode vender à vista.
- Regra comercial: opção `Venda local` define entrega para hoje e confirma entrega automaticamente.
- Exibe histórico de vendas em drawer lateral direito (100vh / 30% largura) e gera PDF A4 com os detalhes da ordem.

## Resultado esperado

- Venda registrada com itens e financeiro vinculados.
- Baixa de estoque por venda sempre em kg (mesmo quando venda for informada em saco).
- Bloqueio consistente de venda a prazo para Cliente Balcão.
- Ordem de venda exportável em PDF A4 com dados completos da compra, itens e pagamento.
