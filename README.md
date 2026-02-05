# MVP – Sistema de Gestão de Café (8k) – README

Este repositório contém um **MVP 100% front-end**, feito para demonstração/apresentação, com **banco local no navegador** (IndexedDB).  
O objetivo é simular um mini-ERP de café com **estoque (insumos + tipos de café)**, **produção**, **vendas** e **financeiro (contas a pagar/receber com parcelas)**.

---

## ✅ Visão Geral do Produto

### O que o MVP entrega
- **Cadastro** de clientes, fornecedores, insumos e tipos de café.
- **Entrada de Insumos (compra)**: alimenta estoque e gera **contas a pagar** + **parcelas**.
- **Fabricação de Café**: baixa insumo base, calcula custo, dá entrada em estoque do tipo.
- **Vendas**: baixa tipo do estoque, gera **contas a receber** + **parcelas**.
- **Dashboards**:
  - Estoque de Insumos: saldo, custo médio, valor em estoque, histórico.
  - Estoque por Tipo: saldo, custo médio, valor em estoque, histórico.
  - Financeiro: aberto/pago, vencidos, próximos vencimentos.
  - Clientes: compras, status (inadimplente), histórico de recebimentos.
  - Fornecedores: compras, status (devendo), histórico de pagamentos.

### O que NÃO é objetivo do MVP (por design)
- Não há backend, API externa ou banco externo.
- Segurança real (login/sessão) **não é objetivo** — é apenas controle de acesso para demonstração.
- Multiusuário real e concorrência não são suportados (cada navegador tem seus dados).

---

## 🧠 Conceito de Dados (como o sistema funciona)

### 1) Estoque baseado em movimentações
O saldo NÃO é salvo diretamente como “campo estoque”.
Ele é calculado por:
- **Insumos**: soma(entradas) − soma(saídas)
- **Tipos de café**: soma(entradas) − soma(saídas)

Tabelas envolvidas:
- `mov_insumos` → entradas/saídas/ajustes de insumos
- `mov_lotes` → entradas/saídas/ajustes por tipo de café

### 2) Macro + Parcelas (Financeiro)
Cada compra/venda cria um documento “macro” e, se necessário, várias parcelas.

- Compras → `contas_pagar` + `contas_pagar_parcelas`
- Vendas → `contas_receber` + `contas_receber_parcelas`

---

## 🧩 Módulos

### 1) Autenticação e Usuários
- Login por email/senha (MVP).
- Cria `sessao` local com token e expiração.
- Perfis controlam menu e permissões.

### 2) Cadastros Base
CRUD completo:
- Clientes (`clientes`)
- Fornecedores (`fornecedores`)
- Insumos (`insumos`)
- Tipos de Café (`tipos_cafe`)

### 3) Gestão de Café (Estoque + Produção)
- Entrada de insumos (compra) → estoque + contas a pagar
- Fabricação de café → baixa insumo + entrada por tipo + custo

### 4) Gestão Comercial (Vendas + Clientes)
- Nova venda → baixa tipo + contas a receber
- Status do cliente → inadimplente se existir parcela vencida em aberto

### 5) Fornecedores + Compras
- Dashboard por fornecedor: quanto devo / pago
- Histórico: compras e pagamentos por fornecedor

### 6) Financeiro
- Dash macro + listagem + baixa de parcelas

---

## 🗃️ Estrutura de “Tabelas” (Collections no banco local)

### A) Acesso
- `usuarios`
- `sessao`

### B) Cadastros
- `clientes`
- `fornecedores`
- `insumos`
- `tipos_cafe`

### C) Compras / Entrada Insumos
- `entrada_insumos` (macro)
- `entrada_insumos_itens` (itens)

### D) Produção
- `ordem_producao` (macro)

### E) Vendas
- `vendas` (macro)
- `vendas_itens` (itens)

### F) Financeiro
- `contas_pagar` (macro)
- `contas_pagar_parcelas` (parcelas)
- `contas_receber` (macro)
- `contas_receber_parcelas` (parcelas)

### G) Estoque (histórico oficial)
- `mov_insumos`
- `mov_lotes`

---

## 📦 Seed (Dados iniciais)

O arquivo de seed popula:
- 3 clientes
- 3 fornecedores
- 1 insumo
- 1 tipo de café
- contas a pagar/receber + parcelas
- movimentações de insumos e estoque por tipo coerentes

> O seed é importante para abrir a aplicação e já ter dashboards “vivos” na apresentação.

---

## 🔁 Fluxos principais

### Entrada de Insumos (Compra)
1. Criar `entrada_insumos` + `entrada_insumos_itens`
2. Gerar `mov_insumos` (ENTRADA_COMPRA)
3. Criar `contas_pagar` + `contas_pagar_parcelas`

### Fabricação
1. Criar `ordem_producao`
2. Gerar `mov_insumos` (SAIDA_PRODUCAO)
3. Gerar `mov_lotes` (ENTRADA_FABRICACAO) com custo unit calculado

### Venda
1. Criar `vendas` + `vendas_itens`
2. Gerar `mov_lotes` (SAIDA_VENDA)
3. Criar `contas_receber` + `contas_receber_parcelas`

---

## 🧮 Regras de Custo (MVP)

### Insumos
- `custo_total = quantidade * custo_unit`

### Fabricação
- `custo_base = quantidade_insumo * custo_unit_insumo`
- `margem_lucro = custo_base * (margem_lucro_percent / 100)`
- `custo_total_producao = custo_base + margem_lucro`
- `custo_unit_tipo = custo_total_producao / quantidade_gerada`

---

## 🧪 Como rodar (genérico)
- Instale dependências do projeto (se aplicável)
- Rode o front localmente
- No primeiro acesso:
  - Clique em **Importar Seed** (ou execute a action equivalente no menu)
  - Faça login com:
    - **Email:** `admin@cafemvp.com`
    - **Senha:** `mvp_admin_123`

> Caso o projeto tenha um script de “reset”, ele deve apagar IndexedDB e recarregar o seed.

---

## 🧹 Reset do Banco Local
Para recomeçar uma demo:
- Botão “Resetar Banco” apaga as collections no IndexedDB
- Reimporta o seed automaticamente (opcional)

---

## 📌 Observações importantes (para apresentação)
- Este MVP é uma prova de conceito para validar o modelo de dados, fluxos e dashboards.
- Persistência local permite demonstração offline e velocidade.
- A migração para backend (API + DB) é direta, pois as tabelas já estão normalizadas.

---
