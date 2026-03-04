# Página Retorno da Produção

## Descrição

Tela dedicada ao retorno da produção (status 2), com acompanhamento de pendências e histórico.

## Props utilizadas

- Nenhuma.

## Funções internas

- Exibe duas abas:
  - `Produções pendentes`
  - `Histórico de Produções`
- Coluna de `ID` com botão de cópia (ícone) para facilitar auditoria.
- Ação `Detalhes` disponível em pendentes e histórico, exibindo insumos enviados na OP e custos já lançados.
- Ação `Confirmar retorno` com ícone.
- Formulário de retorno exibido em menu lateral direito (`Drawer`) com altura total da viewport e largura de 30% em desktop.
- Finaliza produção via `confirmarRetornoProducao`.
- Permite estornar produção via `cancelarProducao`.

## Resultado esperado

- Produções pendentes e histórico acessíveis por abas.
- Dados da ordem de produção consultáveis via ação de detalhes.
- Produção finalizada com status 2 ao confirmar retorno.
- Entrada do produto final e lançamentos financeiros vinculados à produção.
