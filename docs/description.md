
Módulos do MVP
Este resumo complementa a documentação completa em `docs/mvp.md`.
1) Autenticação e Acesso

O que faz

Login por email/senha.

Controla sessão ativa no navegador.

Controla permissões por perfil (admin, financeiro, produção, vendedor).

2) Cadastros Base

O que faz

Mantém os dados mestres do sistema (clientes, fornecedores, insumos e tipos de café).

Tudo que os outros módulos referenciam.

3) Gestão de Café (Estoque + Produção)

O que faz

Controle de estoque de insumos (matéria-prima).

Cadastro e controle de tipos de café (produto final).

Fabricação: baixa insumos e dá entrada no estoque por tipo de café.

Cálculo de custo médio e valor em estoque (R$).

4) Gestão Comercial (Vendas + Clientes)

O que faz

Nova venda: baixa tipo de café do estoque e gera contas a receber (com parcelas).

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

Define “receitas/regras” do produto: conversão, insumo base e margem de lucro.
Campos típicos

id, nome, insumo_id, rendimento_percent (conversão), margem_lucro_percent, ativo

C) Estoque e Movimentações
7. mov_insumos

Função

Histórico oficial do estoque de insumos (tudo que entra/baixa).

Base para dashboard, custo médio e saldo.
Tipos de movimento

ENTRADA_COMPRA, SAIDA_PRODUCAO, AJUSTE
Campos típicos

id, insumo_id, tipo, quantidade, custo_unit, custo_total, data, referencia_tipo, referencia_id, obs

8. mov_lotes

Função

Histórico oficial do estoque por tipo de café (entrada por fabricação e saída por venda).
Tipos

ENTRADA_FABRICACAO, SAIDA_VENDA, AJUSTE
Campos típicos

id, tipo_cafe_id, tipo, quantidade, custo_unit, custo_total, data, referencia_tipo, referencia_id, obs

D) Compras / Entrada de Insumos
9. entrada_insumos

Função

Documento “macro” de uma compra/entrada.

Liga fornecedor + dados gerais da compra e pagamento.
Campos típicos

id, fornecedor_id, data_entrada, valor_total, forma_pagamento, parcelas_qtd, obs, status

10. entrada_insumos_itens

Função

Itens da entrada: quais insumos, quantidades, custo unit.

Gera mov_insumos (ENTRADA_COMPRA).
Campos típicos

id, entrada_id, insumo_id, quantidade, custo_unit, custo_total

E) Produção / Fabricação
11. ordem_producao

Função

Documento macro da fabricação (data, tipo produzido, quantidade).

Responsável por gerar entrada no estoque do tipo.
Campos típicos

id, data_fabricacao, tipo_cafe_id, quantidade_gerada, quantidade_insumo, insumo_id, custo_total, status, obs

(A própria ordem_producao gera mov_lotes ENTRADA_FABRICACAO com custo unit calculado.)

F) Vendas / Contas a Receber
12. vendas

Função

Documento macro da venda: cliente, total, condições.

Dispara baixa do estoque de tipo de café.
Campos típicos

id, cliente_id, data_venda, valor_total, parcelas_qtd, valor_negociado, status, obs

15. vendas_itens

Função

Itens vendidos: tipo de café, quantidade, preço.

Gera mov_lotes (SAIDA_VENDA).
Campos típicos

id, venda_id, tipo_cafe_id, quantidade, preco_unit, subtotal

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

Cria ordem_producao

Gera mov_insumos (saída produção)

Gera mov_lotes (entrada fabricação)

Venda

Cria vendas + vendas_itens

Gera mov_lotes (saída venda)

Cria contas_receber + contas_receber_parcelas

---

Para detalhes completos de módulos, regras de negócio e fluxo do MVP, consulte `docs/mvp.md`.
