
# MVP – Sistema de Gestão de Café (8k) – Banco no Navegador

## Objetivo
Entregar um MVP demonstrável (sem backend e sem banco externo), rodando 100% no navegador, com:
- Estoque de Insumos (matérias-primas)
- Produção/Fabricação de Café
- Vendas e Controle de Recebíveis
- Compras e Controle de Pagáveis
- Dashboards macro (estoque, produção, vendas, inadimplência, fornecedores)

Armazenamento: IndexedDB (persistência local).

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
  - custo_base = quantidade_insumo * custo_unit_insumo
  - margem_lucro = custo_base * (margem_lucro_percent do tipo de café / 100)
  - custo_total_producao = custo_base + margem_lucro
  - custo_unit_tipo = custo_total_producao / quantidade_gerada
  - movimento de estoque (ENTRADA_FABRICACAO) grava custo_unit_tipo

- Venda:
  - movimentação de estoque (SAIDA_VENDA) usa custo_unit atual do tipo (médio calculado por entradas)
  - lucro pode ser exibido: receita - custo (MVP opcional)

### Parcelas
- Se parcelas_qtd = 1: gera 1 parcela (num=1)
- Se parcelas_qtd > 1: gera N parcelas, valores iguais ou ajuste na última (MVP pode dividir igual)

### Status Inadimplência (Cliente)
- inadimplente = existe parcela_receber vencida (vencimento < hoje) e status = ABERTA

---
