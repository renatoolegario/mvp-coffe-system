# MVP – Sistema de Gestão de Café (8k) – PostgreSQL

## Objetivo
Entregar um MVP demonstrável com backend e banco PostgreSQL, rodando com:
- Estoque de Insumos (matérias-primas)
- Produção/Fabricação de Café
- Vendas e Controle de Recebíveis
- Compras e Controle de Pagáveis
- Dashboards macro (estoque, produção, vendas, inadimplência, fornecedores)

Armazenamento: PostgreSQL (persistência via API).

---

## Módulos

### 1) Autenticação e Acesso
Funções
- Login por email/senha (MVP).
- Cria sessão local (token + expiração).
- Impede acesso sem sessão ativa.
- Perfil define permissões no menu (admin/financeiro/vendas/producao).

Telas
- Login
- Usuários (admin): listar/criar/editar/desativar

---

### 2) Cadastros Base
Funções
- CRUD completo dos mestres:
  - Clientes
  - Fornecedores
  - Insumos
  - Tipos de Café

Telas
- Gestão de Clientes (dashboard + listagem + cadastro)
- Gestão de Fornecedores (dashboard + listagem + cadastro)
- Gestão de Insumos (listagem + cadastro)
- Gestão de Tipos de Café (listagem + cadastro)

---

### 3) Gestão de Café (Estoque + Produção)
Funções
- Entradas de Insumos (compra): aumenta estoque e gera contas a pagar.
- Fabricação de Café: baixa insumo base, calcula custo, aumenta estoque por tipo.
- Painéis:
  - Estoque de insumos: saldo, custo médio, valor em estoque (R$), histórico.
  - Estoque por tipo: saldo, custo médio, valor em estoque (R$), histórico.

Telas
- Entrada de Insumos (novo lançamento + itens + parcelas)
- Fabricação de Café (novo lançamento + resumo de consumo)
- Dashboard Insumos
- Dashboard Estoque

---

### 4) Gestão Comercial (Vendas + Clientes)
Funções
- Nova venda: seleciona cliente, tipo de café, quantidade, valor negociado, parcelas.
- Baixa estoque do tipo (saída venda).
- Gera contas a receber (macro + parcelas).
- Histórico do cliente:
  - Compras
  - Parcelas (abertas/pagas)
  - Status inadimplente (se existir parcela vencida em aberto)

Telas
- Nova Venda
- Gestão de Vendas (dashboard + listagem + detalhe)
- Detalhe do Cliente (histórico + cobranças/recebimentos)

---

### 5) Gestão de Fornecedores + Compras
Funções
- Dashboard de fornecedores:
  - total em aberto, vencidos, pagos
- Detalhe do fornecedor:
  - histórico de compras
  - histórico de pagamentos (parcelas)

Telas
- Dashboard Fornecedores
- Detalhe do Fornecedor

---

### 6) Financeiro (Contas a Pagar / Receber)
Funções
- Dashboard macro:
  - em aberto, pagos, vencidos, próximos vencimentos
- Listagens:
  - Contas (macro)
  - Parcelas (linha a linha) – onde confirma pagamento/recebimento
- Baixa de parcela (marca pago/recebido com data e forma)

Telas
- Contas a Pagar (dashboard + listagem macro + parcelas)
- Contas a Receber (dashboard + listagem macro + parcelas)

---

## Regras de Negócio (essenciais)

### Estoque (por movimentação)
- Saldo insumo = soma(ENTRADAS) - soma(SAIDAS)
- Saldo tipo de café = soma(ENTRADAS) - soma(SAIDAS)

### Custos
- Entrada de insumo:
  - custo_unit = custo informado no item
  - custo_total = quantidade * custo_unit

- Fabricação:
  - custo_base = quantidade_insumo * custo_unit
  - custo_total = custo_base + margem_lucro

- Venda:
  - custo_unit = custo médio do tipo
  - valor_total = quantidade * custo_unit

---

Para detalhes completos de módulos, regras de negócio e fluxo do MVP, consulte `docs/description.md`.
