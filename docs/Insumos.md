# Página Gestão de Insumos

## Descrição

Cadastro de insumos com unidade de trabalho (`kg` ou `saco`), regras de conversão e classificação de finalidade no sistema.

## Props utilizadas

- Nenhuma.

## Funções internas

- Cria insumos.
- Lista insumos cadastrados.
- Quando a unidade for `SACO`, exige `kg_por_saco`.
- Quando a unidade for `KG`, força `kg_por_saco = 1` e oculta o campo.
- A unidade selecionada vale para cadastro e estoque mínimo (campo único).
- Permite configurar vitrine pública com:
  - checkbox `Aparecer na página inicial`;
  - `Valor de venda`;
  - `Descrição`;
  - imagem em base64 para a landing page.
- Permite classificar finalidade com perguntas objetivas:
  - pode usar para produzir outro insumo;
  - pode fabricar internamente;
  - pode vender ao cliente final.
- Exporta em XLSX todos os insumos com configurações e estoque atual.

## Resultado esperado

- Insumos preparados para entradas e produção.
- Produtos vendáveis podem alimentar automaticamente a landing page pública.
- Estoque mínimo sempre alinhado com a unidade padrão configurada no cadastro.
- Download de planilha com visão completa para auditoria e conferência operacional.
