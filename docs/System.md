# Página System

## Descrição
Página administrativa para controlar o IndexedDB local, permitindo recriar as tabelas e exportar um seed.json.

## Props utilizadas
- Nenhuma.

## Funções internas
- Alimentar banco de dados: recria o IndexedDB e importa dados do arquivo `/docs/seed.json`.
- Gerar seed.json: exporta os dados atuais do IndexedDB para download.

## Resultado esperado
- Usuário consegue resetar o IndexedDB e baixar um seed completo para reutilização futura.
