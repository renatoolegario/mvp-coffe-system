# MVP Coffee System
DOcumentação em docs/description.md e mvp.md


📌 Tecnologias e Frameworks

Frontend - Vercel
Nginx: reverse proxy + TLS (Let's Encrypt), rate-limit de webhooks.
Next.js — framework principal para o front-end e rotas.
React — biblioteca base para componentes.
@mui — biblioteca de UI (Material UI).
Zustand — gerenciamento de estado global.
Blob Storage (Vercel) — armazenamento de arquivos.
CryptoJS — criptografia e segurança.
GitHub — versionamento e colaboração.
Migrations (node-pg-migrate) — controle de versão e histórico de mudanças no banco.
RESTAPI - vai ser controlado pages/api
prettier
ESlint
node-pg-migrate
pg - para conexão com o banco de dados

uuid - Para gerar hash uui4
🔎 Observação: não vamos utilizar TypeScript, todo o projeto será feito em JavaScript/JSX.

#integração relógio evo
A documentação de integração com o relógio evo está em /docs/Evo_API.md 

Teremos os Erros Customizados crinado uma class validationError extends Error <- vou erdar o error dentro dessa nova classe e passar para dentro dela a message
Com o seguinte parametro:
infra/errors/index.js

export class InternalServerError extends Error {
constructor({ cause }) {
super("Um erro interno não esperado aconteceu.", {
cause,
});
this.name = "InternalServerError";
this.action = "Entre em contato com o suporte.";
this.statusCode = 500;
}

toJSON() {
return {
name: this.name,
message: this.message,
action: this.action,
status_code: this.statusCode,
};
}
}

📂 Estrutura de Pastas
Configuração
// jsconfig.json
{
"compilerOptions": {
"baseUrl": "."
}
}

Diretórios principais

/components/atomic → componentes básicos reutilizáveis (botões, inputs, ícones).
/components/molecules → combinações simples de componentes (form fields, cards).
/components/organisms → blocos funcionais maiores (listas, tabelas, modais).
/components/template → layouts de página ou estruturas de tela.
/docs/\*.md → documentação específica de cada página:
-Props utilizadas
-Funções internas
-Descrição do que a página faz
-Resultado esperado

/hooks/ → gerenciamento de estado com Zustand (armazenamento e consumo de dados).
/pages/app/ → páginas do aplicativo (interface principal).
/pages/api/webhook/ → ponto de entrada público para requisições externas, redirecionando para /api/_.
/api/v_/routes/_ → todas as rotas possíveis da versão.
/api/v_/webhook/_ → tratamento de requisições recebidas em /pages/api/webhook.
/api/v_/utils.js\* → funções internas da API:
-Criptografia e descriptografia
-Tratamento e formatação de dados
-Funções auxiliares da API
/infra/migrations/ → arquivos de migrations para versionamento do banco (node-pg-migrate).
/infra/database.js
/infra/tests/ → testes automatizados com Jest.
/public/ → arquivos estáticos (favicon, imagens, vídeos, etc).
/functions/ → funções auxiliares (tratamento de dados, helpers, etc).

🌳 Exemplo de Estrutura
/components
├── atomic
├── molecules
├── organisms
└── template

/docs
└── Home.md

/hooks
└── useUserStore.js

/pages
├── index.js
├── \_app.js
├── app
└── api
└── webhook

/api
└── v1
├── routes
└── utils.js

/infra/migrations/ <-- versionamento do bd
/infra/tests/ <-- Testes automatizados via JEST
/public <-- Arquivos publicos e Favicons
/utils <-- Funções Gerais

✅ Boas Práticas

Documentar cada página em /docs para facilitar onboardings.
Manter versionamento de rotas da API em /api/v*.
Centralizar estado global em Zustand via /hooks.
Utilizar utils apenas para funções puras e reutilizáveis.
Separar claramente a entrypoint pública (/pages/api/webhook) do processamento real (/api/v*/index).
Controlar evolução do banco com migrations (não alterar schema manualmente).
Antes de trabalhar em qualquer página, consultar /docs/[nome-da-pagina] para verificar instruções específicas além das diretrizes padrão do AGENTS.md.
