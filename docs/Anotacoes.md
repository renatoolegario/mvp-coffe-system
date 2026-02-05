Sys Paula
Criado terça 03 fevereiro 2026

Sistema de 8k.

Trata-se de um MVP que vou apresentar.
Para isso não precisamos de banco de dados externos, vamos criar um pequeno banco de dados no proprio navegador.
Onde podemos incluir e remover dados de cada uma das tabelas.

-> Teremos uma tabela de clientes
-> Teremos uma tabela de forncedeores
-> Teremos uma tabela de insumos
-> teremos uma tabela de lançamento de insumos (entrada e saida)
-> Teremos uma tabela de tipos de café
-> Teremos uma tabela de fabricação de lotes de tipos de café (entrada e saida)
-> Teremos uma tabela de contas à pagar (valor macro e dados do fornecedor)
-> Teremos uma tabela de contas à pagar resumida (linha a linha de cada parcela valor, data vencimento, se for unica é 1x se for várias parcelas 1 linha para cada referecniando a cotnas a pagar)
-> Teremos uma tabela de contas à receber (valor macro e dados do cliente)
-> Teremos uma tabela de contas à receber resumida (linha a linha de cada parcela valor, data vencimento, se for unica é 1x se for várias parcelas 1 linha para cada referecniando a cotnas a receber)
-> Teremos uma tabela de usuários para acessar sistema
-> Teremos uma tabela de sessão para controlar usuário logado e garantir que teremos 1 unico usuário por sessão daquele email logado.

Temos Gestão de Café
-> Cadastro de insumos ( materias primas )
-> Entrada de insumos (alimentação de estoque), precisa de fornecedor , valor pagamento, data para pagamento (aqui pode diluir o pagamento em x parcelas) 
-> Cadastro de lotes tipos de café e conversão (Nome e conversão em % ), % sobre custo de fabricação.
-> Fabricação de Lotes (alimentação de estoque de lote e diminuição do estoque de insumo)-> quando fabri algum produto teremos data de fabricação e quantidade gerada e quantidade baixada no insumo, custo de fabricação 
-> Dashboard de acompanhamento de Insumos (com histórico de baixas)  e Lotes (com histórico de saidas [vendas] e entradas [fabricação] ), custo de produção médio, custo médio insumo, valor acumulado em estoque quantidade e R$.

Teremos Gestão de Clientes
-> Nova venda -> Selecionar cliente, lote , quantidade, valor negociado, data para pagamento (qui pode diluiar o pagamento em x parcelas)
-> Gestão de vendas (dashboard de vendas + listagem de contas à receber)  
-> Gestão de clientes (dashboard de clientes + listagem de clientes + cadastro de cliente)
-> Histórico comprar por cliente (ao clicar em qualquer cliente na gestão de cliente mostra as compras status se já foi tudo pago , status do cliente (inadimplente ou não), + histórico de cobranças de cada venda -> aqui consigo confirmar recebimento  )


Gestão de fornecedores
-> Dashboard de forncedores (dashboard + listagem de forncedores + se estou devendo ou não) 
-> Ao clicar no forncedor mostra histórico de minhas compras + histórico de pagamento de cada uma (Aqui consigo confirmar pagamento) 

Gestão de Contas à pagar
-> Dashboard macro de como esta minha situação + listagem de contas à pagar e contas pagas , nas contas à pagar consigo confirmar recebimento.
-> Lançamento de contas a pagar vinculada aos fornecedores

Gestão de Contas à receber
-> Dashboard macro de como esta minha situação + listagem de contas à pagar e contas pagas , nas contas à pagar consigo confirmar recebimento.
-> Lançamento de contas a pagar vinculada aos fornecedores

Usuários do sistema
-> Usuario e perfil para controle de acesso

--------------------

Módulos do MVP
1) Autenticação e Acesso

O que faz

Login por email/senha.

Controla sessão ativa no navegador.

Controla permissões por perfil (admin, financeiro, produção, vendedor).

2) Cadastros Base

O que faz

Mantém os dados mestres do sistema (clientes, fornecedores, insumos, produtos/lotes, tipos de café).

Tudo que os outros módulos referenciam.

3) Gestão de Café (Estoque + Produção)

O que faz

Controle de estoque de insumos (matéria-prima).

Cadastro e controle de lotes/produtos.

Fabricação: baixa insumos e dá entrada no estoque de lotes.

Cálculo de custo médio e valor em estoque (R$).

4) Gestão Comercial (Vendas + Clientes)

O que faz

Nova venda: baixa lote do estoque e gera contas a receber (com parcelas).

Dashboard de vendas, recebíveis e inadimplência.

Histórico por cliente: compras + cobranças + status.

5) Gestão de Fornecedores + Compras

O que faz

Entrada de insumos: dá entrada no estoque e gera contas a pagar (com parcelas).

Dashboard de fornecedores: quanto devo, quanto paguei, histórico.

Histórico por fornecedor: compras + pagamentos.

6) Financeiro (Contas a Pagar / Receber)

O que faz

Painel macro (aberto x pago, vencidos, próximos vencimentos).

Listagem e baixa (confirmar pagamento/recebimento) por parcela.

Relatórios simples: fluxo por período.

Tabelas do MVP (o que cada uma faz)
A) Usuários e Sessão
1. usuarios

Função

Armazena quem pode acessar o sistema.
Campos típicos

id, nome, email, senha_hash (simples pro MVP), perfil, ativo, criado_em

2. sessao

Função

Guarda o usuário logado no navegador e valida se está ativo.

Ajuda a garantir “1 sessão ativa” por email no mesmo navegador.
Campos típicos

token, email, criado_em, expira_em, ativo

B) Cadastros
3. clientes

Função

Cadastro de clientes e dados usados em vendas e contas a receber.
Campos típicos

id, nome, cpf_cnpj, telefone, endereco, limite_credito (opcional), ativo, criado_em

4. fornecedores

Função

Cadastro de fornecedores e dados usados em compras e contas a pagar.
Campos típicos

id, razao_social, cpf_cnpj, telefone, endereco, ativo, criado_em

5. insumos

Função

Cadastro de matérias-primas (o que entra e sai do estoque).
Campos típicos

id, nome, unidade (kg, saca, un), estoque_minimo (opcional), ativo, criado_em

6. tipos_cafe

Função

Define “receitas/regras” do produto: conversão e % de custo indireto.
Campos típicos

id, nome, rendimento_percent (conversão), overhead_percent (% sobre custo fabricação), ativo

7. lotes

Função

Representa o estoque do produto final (ex: Lote Catuaí Torra Média).

Pode estar ligado a um tipo_cafe.
Campos típicos

id, nome, tipo_cafe_id, unidade (kg/saca), ativo, criado_em

C) Estoque e Movimentações
8. mov_insumos

Função

Histórico oficial do estoque de insumos (tudo que entra/baixa).

Base para dashboard, custo médio e saldo.
Tipos de movimento

ENTRADA_COMPRA, SAIDA_PRODUCAO, AJUSTE
Campos típicos

id, insumo_id, tipo, quantidade, custo_unit, custo_total, data, referencia_tipo, referencia_id, obs

9. mov_lotes

Função

Histórico oficial do estoque de lotes (entrada por fabricação e saída por venda).
Tipos

ENTRADA_FABRICACAO, SAIDA_VENDA, AJUSTE
Campos típicos

id, lote_id, tipo, quantidade, custo_unit, custo_total, data, referencia_tipo, referencia_id, obs

D) Compras / Entrada de Insumos
10. entrada_insumos

Função

Documento “macro” de uma compra/entrada.

Liga fornecedor + dados gerais da compra e pagamento.
Campos típicos

id, fornecedor_id, data_entrada, valor_total, forma_pagamento, parcelas_qtd, obs, status

11. entrada_insumos_itens

Função

Itens da entrada: quais insumos, quantidades, custo unit.

Gera mov_insumos (ENTRADA_COMPRA).
Campos típicos

id, entrada_id, insumo_id, quantidade, custo_unit, custo_total

E) Produção / Fabricação
12. ordem_producao

Função

Documento macro da fabricação (data, lote produzido, quantidade).

Responsável por gerar entrada no lote.
Campos típicos

id, data_fabricacao, lote_id, quantidade_gerada, custo_total, status, obs

13. ordem_producao_itens

Função

Quais insumos foram consumidos e quanto.

Gera mov_insumos (SAIDA_PRODUCAO).
Campos típicos

id, ordem_id, insumo_id, quantidade_baixada, custo_unit_no_momento, custo_total

(A própria ordem_producao gera mov_lotes ENTRADA_FABRICACAO com custo unit calculado.)

F) Vendas / Contas a Receber
14. vendas

Função

Documento macro da venda: cliente, total, condições.

Dispara baixa do estoque de lote.
Campos típicos

id, cliente_id, data_venda, valor_total, parcelas_qtd, valor_negociado, status, obs

15. vendas_itens

Função

Itens vendidos: lote, quantidade, preço.

Gera mov_lotes (SAIDA_VENDA).
Campos típicos

id, venda_id, lote_id, quantidade, preco_unit, subtotal

G) Financeiro (macro + parcelas)
16. contas_pagar

Função

Documento macro financeiro de uma compra/obrigação.

Normalmente nasce de entrada_insumos.
Campos típicos

id, fornecedor_id, origem_tipo (entrada_insumos), origem_id, valor_total, data_emissao, status

17. contas_pagar_parcelas

Função

Linha a linha: vencimento e baixa de pagamento.

Onde você “confirma pagamento”.
Campos típicos

id, conta_pagar_id, parcela_num, vencimento, valor, status, data_pagamento, forma_pagamento

18. contas_receber

Função

Documento macro financeiro de uma venda/recebível.

Normalmente nasce de vendas.
Campos típicos

id, cliente_id, origem_tipo (venda), origem_id, valor_total, data_emissao, status

19. contas_receber_parcelas

Função

Linha a linha: vencimento e baixa de recebimento.

Onde você “confirma recebimento”.
Campos típicos

id, conta_receber_id, parcela_num, vencimento, valor, status, data_recebimento, forma_recebimento

Como os módulos “conversam” (fluxo simples)
Entrada de Insumos (compra)

Cria entrada_insumos + entrada_insumos_itens

Gera mov_insumos (entrada)

Cria contas_pagar + contas_pagar_parcelas

Fabricação

Cria ordem_producao + ordem_producao_itens

Gera mov_insumos (saída produção)

Gera mov_lotes (entrada fabricação)

Venda

Cria vendas + vendas_itens

Gera mov_lotes (saída venda)

Cria contas_receber + contas_receber_parcelas

--------------------

# MVP – Sistema de Gestão de Café (8k) – Banco no Navegador

## Objetivo
Entregar um MVP demonstrável (sem backend e sem banco externo), rodando 100% no navegador, com:
- Estoque de Insumos (matérias-primas)
- Produção/Fabricação de Lotes
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
  - Lotes (produtos finais)

Telas
- Gestão de Clientes (dashboard + listagem + cadastro)
- Gestão de Fornecedores (dashboard + listagem + cadastro)
- Gestão de Insumos (listagem + cadastro)
- Gestão de Tipos de Café (listagem + cadastro)
- Gestão de Lotes (listagem + cadastro)

---

### 3) Gestão de Café (Estoque + Produção)
Funções
- Entradas de Insumos (compra): aumenta estoque e gera contas a pagar.
- Fabricação de Lotes: baixa insumos, calcula custo, aumenta estoque do lote.
- Painéis:
  - Estoque de insumos: saldo, custo médio, valor em estoque (R$), histórico.
  - Estoque de lotes: saldo, custo médio, valor em estoque (R$), histórico.

Telas
- Entrada de Insumos (novo lançamento + itens + parcelas)
- Fabricação de Lotes (novo lançamento + insumos consumidos)
- Dashboard Insumos
- Dashboard Lotes

---

### 4) Gestão Comercial (Vendas + Clientes)
Funções
- Nova venda: seleciona cliente, lote, quantidade, valor negociado, parcelas.
- Baixa estoque do lote (saída venda).
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
- Saldo lote = soma(ENTRADAS) - soma(SAIDAS)

### Custos
- Entrada de insumo:
  - custo_unit = custo informado no item
  - custo_total = quantidade * custo_unit

- Fabricação:
  - custo_base = soma(custo_total dos insumos consumidos)
  - overhead = custo_base * (overhead_percent do tipo de café / 100)
  - custo_total_producao = custo_base + overhead
  - custo_unit_lote = custo_total_producao / quantidade_gerada
  - movimento de lote (ENTRADA_FABRICACAO) grava custo_unit_lote

- Venda:
  - movimentação de lote (SAIDA_VENDA) usa custo_unit atual do lote (médio calculado por entradas)
  - lucro pode ser exibido: receita - custo (MVP opcional)

### Parcelas
- Se parcelas_qtd = 1: gera 1 parcela (num=1)
- Se parcelas_qtd > 1: gera N parcelas, valores iguais ou ajuste na última (MVP pode dividir igual)

### Status Inadimplência (Cliente)
- inadimplente = existe parcela_receber vencida (vencimento < hoje) e status = ABERTA

--------------------

{
  "meta": {
	"seed_version": "1.0.0",
	"generated_at": "2026-02-04T12:00:00-03:00",
	"currency": "BRL",
	"timezone": "America/Sao_Paulo"
  },
  "usuarios": [
	{
	  "id": "usr_admin_01",
	  "nome": "Administrador",
	  "email": "admin@cafemvp.com",
	  "senha_hash": "mvp_admin_123",
	  "perfil": "admin",
	  "ativo": true,
	  "criado_em": "2026-01-01T09:00:00-03:00"
	}
  ],
  "sessao": [],
  "clientes": [
	{
	  "id": "cli_001",
	  "nome": "Cafeteria Central",
	  "cpf_cnpj": "12.345.678/0001-10",
	  "telefone": "(34) 99999-1001",
	  "endereco": "Uberlândia - MG",
	  "ativo": true,
	  "criado_em": "2026-01-10T10:00:00-03:00"
	},
	{
	  "id": "cli_002",
	  "nome": "Empório do Café",
	  "cpf_cnpj": "45.111.222/0001-90",
	  "telefone": "(34) 99999-1002",
	  "endereco": "Patos de Minas - MG",
	  "ativo": true,
	  "criado_em": "2026-01-12T10:00:00-03:00"
	},
	{
	  "id": "cli_003",
	  "nome": "Mercado Santo Grão",
	  "cpf_cnpj": "09.888.777/0001-55",
	  "telefone": "(34) 99999-1003",
	  "endereco": "Araxá - MG",
	  "ativo": true,
	  "criado_em": "2026-01-15T10:00:00-03:00"
	}
  ],
  "fornecedores": [
	{
	  "id": "for_001",
	  "razao_social": "AgroInsumos Minas",
	  "cpf_cnpj": "11.222.333/0001-44",
	  "telefone": "(34) 99999-2001",
	  "endereco": "Uberaba - MG",
	  "ativo": true,
	  "criado_em": "2026-01-05T09:00:00-03:00"
	},
	{
	  "id": "for_002",
	  "razao_social": "Embalagens Brasil",
	  "cpf_cnpj": "22.333.444/0001-55",
	  "telefone": "(34) 99999-2002",
	  "endereco": "Franca - SP",
	  "ativo": true,
	  "criado_em": "2026-01-06T09:00:00-03:00"
	},
	{
	  "id": "for_003",
	  "razao_social": "Química Alimentos LTDA",
	  "cpf_cnpj": "33.444.555/0001-66",
	  "telefone": "(34) 99999-2003",
	  "endereco": "Ribeirão Preto - SP",
	  "ativo": true,
	  "criado_em": "2026-01-06T09:00:00-03:00"
	}
  ],
  "insumos": [
	{ "id": "ins_001", "nome": "Café Verde (Grão Cru)", "unidade": "kg", "estoque_minimo": 200, "ativo": true, "criado_em": "2026-01-05T09:10:00-03:00" },
	{ "id": "ins_002", "nome": "Embalagem 250g (Pouch)", "unidade": "un", "estoque_minimo": 500, "ativo": true, "criado_em": "2026-01-05T09:12:00-03:00" },
	{ "id": "ins_003", "nome": "Válvula Aromática", "unidade": "un", "estoque_minimo": 500, "ativo": true, "criado_em": "2026-01-05T09:13:00-03:00" },
	{ "id": "ins_004", "nome": "Etiqueta (Rótulo)", "unidade": "un", "estoque_minimo": 500, "ativo": true, "criado_em": "2026-01-05T09:14:00-03:00" },
	{ "id": "ins_005", "nome": "Caixa de Transporte", "unidade": "un", "estoque_minimo": 50, "ativo": true, "criado_em": "2026-01-05T09:15:00-03:00" }
  ],
  "tipos_cafe": [
	{ "id": "tc_001", "nome": "Torra Média", "rendimento_percent": 85, "overhead_percent": 12, "ativo": true },
	{ "id": "tc_002", "nome": "Torra Escura", "rendimento_percent": 82, "overhead_percent": 15, "ativo": true },
	{ "id": "tc_003", "nome": "Moído (Padrão)", "rendimento_percent": 98, "overhead_percent": 6, "ativo": true }
  ],
  "lotes": [
	{ "id": "lot_001", "nome": "Lote Torra Média 250g", "tipo_cafe_id": "tc_001", "unidade": "kg", "ativo": true, "criado_em": "2026-01-08T10:00:00-03:00" },
	{ "id": "lot_002", "nome": "Lote Torra Escura 250g", "tipo_cafe_id": "tc_002", "unidade": "kg", "ativo": true, "criado_em": "2026-01-08T10:01:00-03:00" }
  ],

  "entrada_insumos": [
	{
	  "id": "ent_001",
	  "fornecedor_id": "for_001",
	  "data_entrada": "2026-01-10T09:00:00-03:00",
	  "valor_total": 12000.0,
	  "forma_pagamento": "boleto",
	  "parcelas_qtd": 3,
	  "obs": "Compra de café verde para produção.",
	  "status": "confirmada"
	},
	{
	  "id": "ent_002",
	  "fornecedor_id": "for_002",
	  "data_entrada": "2026-01-18T09:00:00-03:00",
	  "valor_total": 1800.0,
	  "forma_pagamento": "pix",
	  "parcelas_qtd": 1,
	  "obs": "Embalagens e insumos de rotulagem.",
	  "status": "confirmada"
	}
  ],
  "entrada_insumos_itens": [
	{ "id": "ent_item_001", "entrada_id": "ent_001", "insumo_id": "ins_001", "quantidade": 1000, "custo_unit": 12.0, "custo_total": 12000.0 },

	{ "id": "ent_item_002", "entrada_id": "ent_002", "insumo_id": "ins_002", "quantidade": 2000, "custo_unit": 0.55, "custo_total": 1100.0 },
	{ "id": "ent_item_003", "entrada_id": "ent_002", "insumo_id": "ins_003", "quantidade": 2000, "custo_unit": 0.22, "custo_total": 440.0 },
	{ "id": "ent_item_004", "entrada_id": "ent_002", "insumo_id": "ins_004", "quantidade": 2000, "custo_unit": 0.13, "custo_total": 260.0 }
  ],

  "ordem_producao": [
	{
	  "id": "op_001",
	  "data_fabricacao": "2026-01-20T08:30:00-03:00",
	  "lote_id": "lot_001",
	  "quantidade_gerada": 250,
	  "custo_total": 4032.0,
	  "status": "finalizada",
	  "obs": "Torra média - primeiro lote do mês."
	},
	{
	  "id": "op_002",
	  "data_fabricacao": "2026-01-25T08:30:00-03:00",
	  "lote_id": "lot_002",
	  "quantidade_gerada": 180,
	  "custo_total": 2928.0,
	  "status": "finalizada",
	  "obs": "Torra escura - lote menor."
	}
  ],
  "ordem_producao_itens": [
	{
	  "id": "op_item_001",
	  "ordem_id": "op_001",
	  "insumo_id": "ins_001",
	  "quantidade_baixada": 280,
	  "custo_unit_no_momento": 12.0,
	  "custo_total": 3360.0
	},
	{
	  "id": "op_item_002",
	  "ordem_id": "op_002",
	  "insumo_id": "ins_001",
	  "quantidade_baixada": 220,
	  "custo_unit_no_momento": 12.0,
	  "custo_total": 2640.0
	}
  ],

  "vendas": [
	{
	  "id": "ven_001",
	  "cliente_id": "cli_001",
	  "data_venda": "2026-01-27T10:00:00-03:00",
	  "valor_total": 3750.0,
	  "parcelas_qtd": 1,
	  "valor_negociado": 3750.0,
	  "status": "confirmada",
	  "obs": "Venda à vista."
	},
	{
	  "id": "ven_002",
	  "cliente_id": "cli_002",
	  "data_venda": "2026-01-30T10:00:00-03:00",
	  "valor_total": 4320.0,
	  "parcelas_qtd": 3,
	  "valor_negociado": 4320.0,
	  "status": "confirmada",
	  "obs": "Venda parcelada."
	}
  ],
  "vendas_itens": [
	{ "id": "ven_item_001", "venda_id": "ven_001", "lote_id": "lot_001", "quantidade": 150, "preco_unit": 25.0, "subtotal": 3750.0 },
	{ "id": "ven_item_002", "venda_id": "ven_002", "lote_id": "lot_002", "quantidade": 160, "preco_unit": 27.0, "subtotal": 4320.0 }
  ],

  "contas_pagar": [
	{
	  "id": "cp_001",
	  "fornecedor_id": "for_001",
	  "origem_tipo": "entrada_insumos",
	  "origem_id": "ent_001",
	  "valor_total": 12000.0,
	  "data_emissao": "2026-01-10T09:05:00-03:00",
	  "status": "aberta"
	},
	{
	  "id": "cp_002",
	  "fornecedor_id": "for_002",
	  "origem_tipo": "entrada_insumos",
	  "origem_id": "ent_002",
	  "valor_total": 1800.0,
	  "data_emissao": "2026-01-18T09:05:00-03:00",
	  "status": "paga"
	}
  ],
  "contas_pagar_parcelas": [
	{ "id": "cpp_001", "conta_pagar_id": "cp_001", "parcela_num": 1, "vencimento": "2026-02-10", "valor": 4000.0, "status": "aberta", "data_pagamento": null, "forma_pagamento": "boleto" },
	{ "id": "cpp_002", "conta_pagar_id": "cp_001", "parcela_num": 2, "vencimento": "2026-03-10", "valor": 4000.0, "status": "aberta", "data_pagamento": null, "forma_pagamento": "boleto" },
	{ "id": "cpp_003", "conta_pagar_id": "cp_001", "parcela_num": 3, "vencimento": "2026-04-10", "valor": 4000.0, "status": "aberta", "data_pagamento": null, "forma_pagamento": "boleto" },

	{ "id": "cpp_004", "conta_pagar_id": "cp_002", "parcela_num": 1, "vencimento": "2026-01-18", "valor": 1800.0, "status": "paga", "data_pagamento": "2026-01-18", "forma_pagamento": "pix" }
  ],

  "contas_receber": [
	{
	  "id": "cr_001",
	  "cliente_id": "cli_001",
	  "origem_tipo": "venda",
	  "origem_id": "ven_001",
	  "valor_total": 3750.0,
	  "data_emissao": "2026-01-27T10:05:00-03:00",
	  "status": "recebida"
	},
	{
	  "id": "cr_002",
	  "cliente_id": "cli_002",
	  "origem_tipo": "venda",
	  "origem_id": "ven_002",
	  "valor_total": 4320.0,
	  "data_emissao": "2026-01-30T10:05:00-03:00",
	  "status": "aberta"
	}
  ],
  "contas_receber_parcelas": [
	{ "id": "crp_001", "conta_receber_id": "cr_001", "parcela_num": 1, "vencimento": "2026-01-27", "valor": 3750.0, "status": "recebida", "data_recebimento": "2026-01-27", "forma_recebimento": "pix" },

	{ "id": "crp_002", "conta_receber_id": "cr_002", "parcela_num": 1, "vencimento": "2026-02-28", "valor": 1440.0, "status": "aberta", "data_recebimento": null, "forma_recebimento": "boleto" },
	{ "id": "crp_003", "conta_receber_id": "cr_002", "parcela_num": 2, "vencimento": "2026-03-30", "valor": 1440.0, "status": "aberta", "data_recebimento": null, "forma_recebimento": "boleto" },
	{ "id": "crp_004", "conta_receber_id": "cr_002", "parcela_num": 3, "vencimento": "2026-04-30", "valor": 1440.0, "status": "aberta", "data_recebimento": null, "forma_recebimento": "boleto" }
  ],

  "mov_insumos": [
	{
	  "id": "mi_001",
	  "insumo_id": "ins_001",
	  "tipo": "ENTRADA_COMPRA",
	  "quantidade": 1000,
	  "custo_unit": 12.0,
	  "custo_total": 12000.0,
	  "data": "2026-01-10T09:02:00-03:00",
	  "referencia_tipo": "entrada_insumos",
	  "referencia_id": "ent_001",
	  "obs": "Entrada compra café verde."
	},
	{
	  "id": "mi_002",
	  "insumo_id": "ins_002",
	  "tipo": "ENTRADA_COMPRA",
	  "quantidade": 2000,
	  "custo_unit": 0.55,
	  "custo_total": 1100.0,
	  "data": "2026-01-18T09:02:00-03:00",
	  "referencia_tipo": "entrada_insumos",
	  "referencia_id": "ent_002",
	  "obs": "Entrada compra embalagem."
	},
	{
	  "id": "mi_003",
	  "insumo_id": "ins_003",
	  "tipo": "ENTRADA_COMPRA",
	  "quantidade": 2000,
	  "custo_unit": 0.22,
	  "custo_total": 440.0,
	  "data": "2026-01-18T09:02:00-03:00",
	  "referencia_tipo": "entrada_insumos",
	  "referencia_id": "ent_002",
	  "obs": "Entrada compra válvula."
	},
	{
	  "id": "mi_004",
	  "insumo_id": "ins_004",
	  "tipo": "ENTRADA_COMPRA",
	  "quantidade": 2000,
	  "custo_unit": 0.13,
	  "custo_total": 260.0,
	  "data": "2026-01-18T09:02:00-03:00",
	  "referencia_tipo": "entrada_insumos",
	  "referencia_id": "ent_002",
	  "obs": "Entrada compra etiqueta."
	},

	{
	  "id": "mi_005",
	  "insumo_id": "ins_001",
	  "tipo": "SAIDA_PRODUCAO",
	  "quantidade": 280,
	  "custo_unit": 12.0,
	  "custo_total": 3360.0,
	  "data": "2026-01-20T08:45:00-03:00",
	  "referencia_tipo": "ordem_producao",
	  "referencia_id": "op_001",
	  "obs": "Consumo café verde na produção (op_001)."
	},
	{
	  "id": "mi_006",
	  "insumo_id": "ins_001",
	  "tipo": "SAIDA_PRODUCAO",
	  "quantidade": 220,
	  "custo_unit": 12.0,
	  "custo_total": 2640.0,
	  "data": "2026-01-25T08:45:00-03:00",
	  "referencia_tipo": "ordem_producao",
	  "referencia_id": "op_002",
	  "obs": "Consumo café verde na produção (op_002)."
	}
  ],

  "mov_lotes": [
	{
	  "id": "ml_001",
	  "lote_id": "lot_001",
	  "tipo": "ENTRADA_FABRICACAO",
	  "quantidade": 250,
	  "custo_unit": 16.128,
	  "custo_total": 4032.0,
	  "data": "2026-01-20T09:10:00-03:00",
	  "referencia_tipo": "ordem_producao",
	  "referencia_id": "op_001",
	  "obs": "Entrada lote por fabricação (op_001)."
	},
	{
	  "id": "ml_002",
	  "lote_id": "lot_002",
	  "tipo": "ENTRADA_FABRICACAO",
	  "quantidade": 180,
	  "custo_unit": 16.2666666667,
	  "custo_total": 2928.0,
	  "data": "2026-01-25T09:10:00-03:00",
	  "referencia_tipo": "ordem_producao",
	  "referencia_id": "op_002",
	  "obs": "Entrada lote por fabricação (op_002)."
	},

	{
	  "id": "ml_003",
	  "lote_id": "lot_001",
	  "tipo": "SAIDA_VENDA",
	  "quantidade": 150,
	  "custo_unit": 16.128,
	  "custo_total": 2419.2,
	  "data": "2026-01-27T10:10:00-03:00",
	  "referencia_tipo": "venda",
	  "referencia_id": "ven_001",
	  "obs": "Saída lote por venda (ven_001)."
	},
	{
	  "id": "ml_004",
	  "lote_id": "lot_002",
	  "tipo": "SAIDA_VENDA",
	  "quantidade": 160,
	  "custo_unit": 16.2666666667,
	  "custo_total": 2602.666666672,
	  "data": "2026-01-30T10:10:00-03:00",
	  "referencia_tipo": "venda",
	  "referencia_id": "ven_002",
	  "obs": "Saída lote por venda (ven_002)."
	}
  ]
}


--------------------

Os menus laterais terão que ser por grupos, expandiveis.
Cada um dos itens dos menus laterais terão que ter seus icones.

Assim como teer a logotipo superior que vai estar armaeznado em public/logotipo.jpg

Na página de usuários teremos a listagem dos usuários e um botão superior direito de "Cadastrar usuário" ao clicar em cadastrar usuário vai gerar um componente lateral direito ocupando 100% da altura e apenas uma pequena parte de width com os campos para cadastrar novo cliente, teremos que garantir exclusividade de dados de email e garantir um senha de 5 digitos no minimo.
Ao clicar em salvar e der certo,  fecha o modal e gera um pequeno alerta inferior com um icone de sucesso falando usuário cadastrado com sucesso.
Assim como logo em seguida a listagem de usuário se atualiza.
Essa mesma lógica deve acontecer em:
→ Clientes
→ Fornecedores
→ Insumos
→ Tipos de Café
→ 

--------------------

Temos que garantir que em system quando clicarmos em criar alimentar banco de dados tem que criar um indexeddb que vai existir sempre, a não ser que limpemos (crie um novo botão no system de resetar banco de dados).
Esse banco de dados vai ser criado e também persistira independente de qual pagína eu esteja no sistema temos que garantir que ele sempre poderá ser acessado via endpoint por qualquer página.


--------------------

Possuem vários tipos de cafés de insumo 
Cada Produto gerado pode consumir vários insumos

Tipos de café 
Tipa a 
Tibo b
Tipo c

Tipo de venda pode ser em kg , sacos variados 5kg ou 60k 
Possuem outros tipos de produtos que vendem
Cobrança via ASAAS 

--------------------

Entrga inicial:
Dashboard 
A receber vencidods , vencem hoje, a pagar vencidos vencem hoje

Vendas de produtos 
Café torredo base tipo a , tipo b, tipo c

No cadastro de produto alem da margem ter a possibilidade de tipos de vendas.
varejo ou atacado e o valor do kg para cada um para na hora da venda ele já puxar

Tipo b é a mistura do a com o b

--------------------

Vendas cliente, 
Cliente, registro do numero de venda, data produto, detalhes, quantiadade , valor uitário
desconto , custo de frete 
Format de pagamento pacela de pagamento e dias de vencimento

--------------------

Contas a pagar , insumos e contas da empresa, aluguel, salários.

--------------------
 
Contas a receber 
Lista valores a receber, paga mas pode pagar parcialmente 

--------------------

Alguns pagamentos são passadas direto para o fornecedor ou seja não vai para empresa ou seja temos que fazer uma conciliação baixando contas a receber e contas à pagar.

--------------------

Controle de vendas 
→ Histórico de clientes baseado na ultima compra realizada para melhorar o fluxo de venda para fazer um remarketing para eles.

--------------------

Cadastro de cliente , alguns clientes não tem o cpf do cliente então pode ser um campo obrigatóiro, mas não ter não vai dar para emitir boletos 

No cadastro ao ir digitar o nome do cliente listar abaixo like % cliente para evitar cadastro dudplicado já que não teremos o cpf / cnpj como campo obrigatório.

--------------------

Margem de lucro nem sempre é % mas pode ser por R$ no cadastro de tipos de café 

--------------------

Gerar custo da torra para cada produção 

--------------------

A produção vai acontecer em 2 momentos.
A baixa sempre vai a mesma porem o que vai ser gerado nem sempre é a porcentagem do rendimento.

Então vamos ter a etapa de Ir para produção (planejar produção)
E outra para confirmar produção ← aqui nós colocamos o real produzido

--------------------

No cadastro do insumo tem um valor do frete e também dos chapas para bater carga.
geralmente fica entre 22 reais por saca de 60kg 

Na entrada de insumos ter a opção de entrar via peso KG ou via Saco 

o custo do frete e o custo dos  chapas são feitso no ato da mercadoria pode sre que seja negociado mas serão lançados em contas separadas do fornecedor.

O pagamento do forncedor também pode ser parcial da mesma maneira do cliente.

--------------------

 Fabriação do café existe um terceiro que faz a torração ou seja o custo fixo da produção não e'somente o insumo e sim o custo da produção de torrefação, pago por saco ou seja os 1096kg utilizados para produção de 1000 kgs de pó café vai ser 1096 / 60 * custo da produção 

geralmente 50,00 ou 55 reais depende do torrador que vai ser torrado.

Na produção ter a opçao de tipo de torrefação grande ou penqueno e o valor planejado.

--------------------

Temos que gerar no tipo de café também pode ser utilizado outros tipos de café e não somente insumo.
Ou seja 1 café pode misturar com o outro e transformar em um segundo 

--------------------

No dashboard de insumo para cada insumo ter o fornecedor e o histórico daquele lote, somente do que ainda existe do que já foi consumido não precisa aparecer só para termos ciencia do que vai ser gerado e da onde veio a informação isso para cada tipo de insumo

--------------------

Tipos de café para gerar nem sempre é as mesmas batidas os mesmos insumos que foi utilizado ou seja na produção ter a possibilidade de falar quais são os insumos que vão ser consumidos, e isso gera um lote que possamos controlar o histórico dele ou seja o mesmo produto Tipo de café não é gerado baseado no mesmo insumo vamos ter que modificar lógica de produção.

E na geração tirar uma foto da amostragem do café para anexarmos no processo da criação 

--------------------

Na venda ter o tipo de café e também ter o insumo, e trazer a sujestão de preço baseado no tipo de venda "varejo" ou "atacado"
Exemplo tipo A 5kg = 310,00

Inclir preço de frete também 
No momento da venda já colocar a opção de recebeu na hora ou seja já gera conta a receber e já efetua o pagamento

--------------------

Recebimento vem de cheque e também pix 

--------------------















