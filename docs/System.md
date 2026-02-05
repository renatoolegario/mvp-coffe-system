# Página System

## Descrição
Página administrativa para controlar o banco PostgreSQL, permitindo recriar as tabelas e exportar um seed.json.

## Props utilizadas
- Nenhuma.

## Funções internas
- Alimentar banco de dados: faz truncate em todas as tabelas e importa dados do arquivo `/docs/seed.json` via endpoint.
- Gerar seed.json: exporta os dados atuais do PostgreSQL para download.
- Mostrar dados em JSON: faz query em todas as tabelas e exibe o resultado na própria tela.

## Resultado esperado
- Usuário consegue alimentar o banco, baixar um seed completo para reutilização futura e visualizar os dados atuais em JSON na tela.
- A interface reflete dados vindos dos endpoints conectados ao PostgreSQL.
