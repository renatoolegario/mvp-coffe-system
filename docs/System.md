# Página System

## Descrição
Página administrativa para controlar o IndexedDB local, permitindo recriar as tabelas e exportar um seed.json.

## Props utilizadas
- Nenhuma.

## Funções internas
- Alimentar banco de dados: recria o IndexedDB e importa dados do arquivo `/docs/seed.json`.
- Gerar seed.json: exporta os dados atuais do IndexedDB para download.
- Mostrar dados em JSON: exibe os dados atuais do IndexedDB na própria tela.

## Resultado esperado
- Usuário consegue resetar o IndexedDB, baixar um seed completo para reutilização futura e visualizar os dados atuais em JSON na tela.
