export const openApiSpec = {
  openapi: "3.0.3",
  info: {
    title: "MVP Coffee System - APIs Internas",
    version: "1.0.0",
    description:
      "Documentação dos endpoints internos utilizados pelo frontend do sistema.",
  },
  servers: [{ url: "/api/v1", description: "API v1" }],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "Token",
      },
    },
  },
  security: [{ bearerAuth: [] }],
  paths: {
    "/auth/login": {
      post: {
        summary: "Autenticar usuário e gerar token",
        security: [],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email", "senha"],
                properties: {
                  email: { type: "string", format: "email" },
                  senha: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Autenticado com sucesso" },
          401: { description: "Credenciais inválidas" },
        },
      },
    },
    "/auth/validate": {
      get: {
        summary: "Validar token atual",
        responses: {
          200: { description: "Token válido" },
          401: { description: "Token inválido ou expirado" },
        },
      },
    },
    "/data": {
      get: {
        summary: "Carregar snapshot completo para a store",
        responses: { 200: { description: "Dados carregados" } },
      },
    },
    "/aux/unidades": {
      get: {
        summary: "Listar unidades internas (KG/SACO) com ordenação por default",
        responses: { 200: { description: "Unidades carregadas" } },
      },
    },
    "/aux/formas-pagamento": {
      get: {
        summary: "Listar formas de pagamento ativas",
        responses: { 200: { description: "Formas carregadas" } },
      },
    },
    "/command": {
      post: {
        summary: "Executar comando transacional do sistema",
        description:
          "Endpoint central de comandos. Corpo esperado: { action, payload }.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["action"],
                properties: {
                  action: {
                    type: "string",
                    enum: [
                      "addUsuario",
                      "toggleUsuario",
                      "addCliente",
                      "updateCliente",
                      "addFornecedor",
                      "addInsumo",
                      "updateInsumo",
                      "addEntradaInsumos",
                      "createProducao",
                      "confirmarRetornoProducao",
                      "deleteProducao",
                      "cancelarProducao",
                      "addVenda",
                      "confirmarEntregaVenda",
                      "marcarParcelaPaga",
                      "marcarParcelaRecebida",
                      "createTransferencia",
                    ],
                  },
                  payload: { type: "object" },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Comando executado" },
          400: { description: "Comando inválido" },
        },
      },
    },
    "/dashboard/resumo": {
      get: {
        summary: "Resumo geral do dashboard",
        responses: { 200: { description: "Resumo retornado" } },
      },
    },
    "/dashboard/insumos": {
      get: {
        summary: "Indicadores de estoque e custo de insumos",
        responses: { 200: { description: "Dados retornados" } },
      },
    },
    "/dashboard/fluxo-caixa": {
      get: {
        summary: "Fluxo de caixa diário do mês atual",
        responses: { 200: { description: "Fluxo retornado" } },
      },
    },
    "/configuracao-empresa/estoque": {
      get: {
        summary: "Listar faixas de estoque",
        responses: { 200: { description: "Faixas listadas" } },
      },
      post: {
        summary: "Criar faixa de estoque",
        responses: { 201: { description: "Faixa criada" } },
      },
      put: {
        summary: "Atualizar faixas de estoque",
        responses: { 200: { description: "Faixas atualizadas" } },
      },
      delete: {
        summary: "Remover faixa de estoque",
        responses: { 200: { description: "Faixa removida" } },
      },
    },
    "/configuracao-empresa/integracoes": {
      get: {
        summary: "Listar status das integrações",
        responses: { 200: { description: "Integrações listadas" } },
      },
      put: {
        summary: "Salvar chave de integração",
        responses: { 200: { description: "Integração atualizada" } },
      },
    },
    "/configuracao-empresa/feedback": {
      get: {
        summary:
          "Listar feedbacks com filtros opcionais por status e modo admin",
        responses: { 200: { description: "Feedbacks listados" } },
      },
      post: {
        summary: "Criar novo feedback",
        responses: { 201: { description: "Feedback criado" } },
      },
    },
    "/configuracao-empresa/feedback/{id}/finalizar": {
      patch: {
        summary: "Finalizar feedback pendente",
        responses: { 200: { description: "Feedback finalizado" } },
      },
    },
    "/system/seed": {
      post: {
        summary: "Recriar dados base do sistema",
        responses: { 200: { description: "Seed executada" } },
      },
    },
    "/docs/openapi": {
      get: {
        summary: "Obter especificação OpenAPI da API interna",
        responses: { 200: { description: "Spec retornada" } },
      },
    },
  },
};
