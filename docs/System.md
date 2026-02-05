# Página System

## Descrição
Página administrativa para controlar o IndexedDB local, permitindo recriar as tabelas e exportar um seed.json.

## Props utilizadas
- Nenhuma.

## Funções internas
- Alimentar banco de dados: recria o IndexedDB e importa dados do arquivo `/docs/seed.json`.
- Gerar seed.json: exporta os dados atuais do IndexedDB para download.
- Mostrar dados em JSON: exibe os dados atuais do IndexedDB na própria tela.
- Resetar banco de dados: limpa o IndexedDB e zera o estado salvo localmente.

## Resultado esperado
- Usuário consegue resetar o IndexedDB, baixar um seed completo para reutilização futura e visualizar os dados atuais em JSON na tela.
- O IndexedDB é inicializado automaticamente para uso em qualquer página do sistema.
