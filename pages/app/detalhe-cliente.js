import {
  Alert,
  Button,
  Chip,
  Drawer,
  IconButton,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import { Close, DownloadRounded } from "@mui/icons-material";
import { useMemo, useState } from "react";
import { useRouter } from "next/router";
import AppLayout from "../../components/template/AppLayout";
import PageHeader from "../../components/atomic/PageHeader";
import { useDataStore } from "../../hooks/useDataStore";
import { formatCurrency, formatDate } from "../../utils/format";
import { downloadWorkbookXlsx } from "../../utils/xlsx";

const drawerPaperSx = {
  width: { xs: "100%", md: 540 },
  maxWidth: "100%",
  height: "100vh",
  p: 3,
};

const exportDate = () => new Date().toISOString().slice(0, 10);

const toFileSafeText = (value) => {
  const safe = String(value || "cliente")
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^a-zA-Z0-9_-]/g, "")
    .toLowerCase();
  return safe || "cliente";
};

const boolLabel = (value) => (value ? "Sim" : "Nao");

const DetalheClientePage = () => {
  const router = useRouter();
  const clientes = useDataStore((state) => state.clientes);
  const vendas = useDataStore((state) => state.vendas);
  const vendaItens = useDataStore((state) => state.vendaItens || []);
  const contasReceber = useDataStore((state) => state.contasReceber);
  const parcelas = useDataStore((state) => state.contasReceberParcelas);
  const vendaDetalhes = useDataStore((state) => state.vendaDetalhes || []);
  const insumos = useDataStore((state) => state.insumos || []);
  const updateCliente = useDataStore((state) => state.updateCliente);

  const [search, setSearch] = useState("");
  const [drawer, setDrawer] = useState({ type: null, clienteId: null });
  const [clienteForm, setClienteForm] = useState({
    id: "",
    nome: "",
    cpf_cnpj: "",
    telefone: "",
    endereco: "",
  });

  const clientesFiltrados = useMemo(() => {
    const termo = search.trim().toLowerCase();
    if (!termo) return clientes;
    return clientes.filter((cliente) => {
      const nome = (cliente.nome || "").toLowerCase();
      const documento = (cliente.cpf_cnpj || "").toLowerCase();
      const telefone = (cliente.telefone || "").toLowerCase();
      return (
        nome.includes(termo) ||
        documento.includes(termo) ||
        telefone.includes(termo)
      );
    });
  }, [clientes, search]);

  const selectedCliente = useMemo(
    () => clientes.find((cliente) => cliente.id === drawer.clienteId) || null,
    [clientes, drawer.clienteId],
  );

  const selectedClienteVendas = useMemo(() => {
    if (!selectedCliente) return [];
    return vendas
      .filter((venda) => venda.cliente_id === selectedCliente.id)
      .sort((a, b) => new Date(b.data_venda) - new Date(a.data_venda));
  }, [selectedCliente, vendas]);

  const contasByVendaId = useMemo(() => {
    const mapa = {};
    contasReceber.forEach((conta) => {
      if (conta.origem_tipo === "venda") {
        mapa[conta.origem_id] = conta;
      }
    });
    return mapa;
  }, [contasReceber]);

  const insumoById = useMemo(() => {
    const mapa = {};
    insumos.forEach((insumo) => {
      mapa[insumo.id] = insumo;
    });
    return mapa;
  }, [insumos]);

  const parcelasDrawer = useMemo(() => {
    if (!selectedCliente) return [];
    return selectedClienteVendas.flatMap((venda) => {
      const conta = contasByVendaId[venda.id];
      if (!conta) return [];
      return parcelas
        .filter((parcela) => parcela.conta_receber_id === conta.id)
        .map((parcela) => ({ ...parcela, venda }))
        .sort((a, b) => a.parcela_num - b.parcela_num);
    });
  }, [selectedCliente, selectedClienteVendas, contasByVendaId, parcelas]);

  const historicoDrawer = useMemo(() => {
    if (!selectedCliente) return [];
    return selectedClienteVendas.flatMap((venda) => {
      const movimentos = vendaDetalhes
        .filter((detalhe) => detalhe.venda_id === venda.id)
        .sort((a, b) => new Date(b.data_evento) - new Date(a.data_evento));
      return movimentos.map((movimento) => ({ ...movimento, venda }));
    });
  }, [selectedCliente, selectedClienteVendas, vendaDetalhes]);

  const vendaById = useMemo(() => {
    const mapa = {};
    selectedClienteVendas.forEach((venda) => {
      mapa[venda.id] = venda;
    });
    return mapa;
  }, [selectedClienteVendas]);

  const handleExportClientes = () => {
    if (!clientes.length) return;

    const rows = [...clientes]
      .sort((a, b) => (a.nome || "").localeCompare(b.nome || ""))
      .map((cliente) => ({
        id: cliente.id,
        nome: cliente.nome || "",
        cpf_cnpj: cliente.cpf_cnpj || "",
        telefone: cliente.telefone || "",
        endereco: cliente.endereco || "",
        ativo: boolLabel(cliente.ativo),
        criado_em: formatDate(cliente.criado_em),
      }));

    downloadWorkbookXlsx({
      fileName: `clientes_cadastro_${exportDate()}`,
      sheets: [
        {
          name: "Clientes",
          columns: [
            { key: "id", header: "ID cliente" },
            { key: "nome", header: "Nome" },
            { key: "cpf_cnpj", header: "CPF/CNPJ" },
            { key: "telefone", header: "Telefone" },
            { key: "endereco", header: "Endereco" },
            { key: "ativo", header: "Ativo" },
            { key: "criado_em", header: "Data de cadastro" },
          ],
          rows,
        },
      ],
    });
  };

  const handleExportHistoricoCliente = () => {
    if (!selectedCliente || !selectedClienteVendas.length) return;

    const vendaIds = new Set(selectedClienteVendas.map((venda) => venda.id));
    const parcelasHistorico = parcelasDrawer;
    const itensHistorico = vendaItens.filter((item) => vendaIds.has(item.venda_id));

    const vendasRows = selectedClienteVendas.map((venda) => {
      const conta = contasByVendaId[venda.id];
      const parcelasVenda = parcelasHistorico.filter(
        (parcela) => parcela.venda.id === venda.id,
      );

      const totalRecebido = parcelasVenda.reduce((total, parcela) => {
        return (
          total +
          (Number(parcela.valor_recebido) ||
            Number(parcela.valor_programado) ||
            Number(parcela.valor) ||
            0)
        );
      }, 0);

      return {
        venda_id: venda.id,
        data_venda: formatDate(venda.data_venda),
        cliente: selectedCliente.nome || "",
        valor_total: Number(venda.valor_total) || 0,
        tipo_pagamento: venda.tipo_pagamento || "",
        forma_pagamento: venda.forma_pagamento || "",
        parcelas_qtd: Number(venda.parcelas_qtd) || parcelasVenda.length,
        status_entrega: venda.status_entrega || "",
        data_programada_entrega: formatDate(venda.data_programada_entrega),
        data_entrega: formatDate(venda.data_entrega),
        desconto_tipo: venda.desconto_tipo || "",
        desconto_valor: Number(venda.desconto_valor) || 0,
        acrescimo_tipo: venda.acrescimo_tipo || "",
        acrescimo_valor: Number(venda.acrescimo_valor) || 0,
        conta_receber_id: conta?.id || "",
        parcelas_abertas: parcelasVenda.filter((parcela) => parcela.status === "ABERTA")
          .length,
        parcelas_recebidas: parcelasVenda.filter(
          (parcela) => parcela.status === "RECEBIDA",
        ).length,
        total_recebido: totalRecebido,
        observacoes: venda.obs || "",
      };
    });

    const itensRows = itensHistorico.map((item) => {
      const venda = vendaById[item.venda_id];
      const insumo = insumoById[item.insumo_id];
      return {
        venda_id: item.venda_id,
        data_venda: formatDate(venda?.data_venda),
        produto: insumo?.nome || item.insumo_id || "",
        quantidade_informada: Number(item.quantidade_informada) || 0,
        quantidade_kg: Number(item.quantidade_kg) || 0,
        preco_unitario: Number(item.preco_unitario) || 0,
        valor_total_item: Number(item.valor_total) || 0,
      };
    });

    const parcelasRows = parcelasHistorico.map((parcela) => ({
      venda_id: parcela.venda.id,
      data_venda: formatDate(parcela.venda.data_venda),
      parcela_num: Number(parcela.parcela_num) || 0,
      vencimento: formatDate(parcela.vencimento),
      status: parcela.status || "",
      valor_programado: Number(parcela.valor_programado) || Number(parcela.valor) || 0,
      valor_recebido: Number(parcela.valor_recebido) || 0,
      forma_programada: parcela.forma_recebimento || "",
      forma_real: parcela.forma_recebimento_real || "",
      data_recebimento: formatDate(parcela.data_recebimento),
      origem_recebimento: parcela.origem_recebimento || "",
      motivo_diferenca: parcela.motivo_diferenca || "",
      acao_diferenca: parcela.acao_diferenca || "",
    }));

    const eventosRows = historicoDrawer.map((evento) => ({
      evento_id: evento.id,
      venda_id: evento.venda.id,
      data_evento: formatDate(evento.data_evento),
      tipo_evento: evento.tipo_evento || "",
      valor: Number(evento.valor) || 0,
      descricao: evento.descricao || "",
    }));

    downloadWorkbookXlsx({
      fileName: `historico_cliente_${toFileSafeText(selectedCliente.nome)}_${exportDate()}`,
      sheets: [
        {
          name: "Vendas",
          columns: [
            { key: "venda_id", header: "ID venda" },
            { key: "data_venda", header: "Data venda" },
            { key: "cliente", header: "Cliente" },
            { key: "valor_total", header: "Valor total" },
            { key: "tipo_pagamento", header: "Tipo pagamento" },
            { key: "forma_pagamento", header: "Forma pagamento" },
            { key: "parcelas_qtd", header: "Parcelas" },
            { key: "status_entrega", header: "Status entrega" },
            {
              key: "data_programada_entrega",
              header: "Data programada entrega",
            },
            { key: "data_entrega", header: "Data entrega" },
            { key: "desconto_tipo", header: "Tipo desconto" },
            { key: "desconto_valor", header: "Valor desconto" },
            { key: "acrescimo_tipo", header: "Tipo acrescimo" },
            { key: "acrescimo_valor", header: "Valor acrescimo" },
            { key: "conta_receber_id", header: "Conta a receber" },
            { key: "parcelas_abertas", header: "Parcelas abertas" },
            { key: "parcelas_recebidas", header: "Parcelas recebidas" },
            { key: "total_recebido", header: "Total recebido" },
            { key: "observacoes", header: "Observacoes" },
          ],
          rows: vendasRows,
        },
        {
          name: "Itens venda",
          columns: [
            { key: "venda_id", header: "ID venda" },
            { key: "data_venda", header: "Data venda" },
            { key: "produto", header: "Produto" },
            { key: "quantidade_informada", header: "Quantidade informada" },
            { key: "quantidade_kg", header: "Quantidade kg" },
            { key: "preco_unitario", header: "Preco unitario" },
            { key: "valor_total_item", header: "Valor total item" },
          ],
          rows: itensRows,
        },
        {
          name: "Parcelas",
          columns: [
            { key: "venda_id", header: "ID venda" },
            { key: "data_venda", header: "Data venda" },
            { key: "parcela_num", header: "Parcela" },
            { key: "vencimento", header: "Vencimento" },
            { key: "status", header: "Status" },
            { key: "valor_programado", header: "Valor programado" },
            { key: "valor_recebido", header: "Valor recebido" },
            { key: "forma_programada", header: "Forma programada" },
            { key: "forma_real", header: "Forma real" },
            { key: "data_recebimento", header: "Data recebimento" },
            { key: "origem_recebimento", header: "Origem recebimento" },
            { key: "motivo_diferenca", header: "Motivo diferenca" },
            { key: "acao_diferenca", header: "Acao diferenca" },
          ],
          rows: parcelasRows,
        },
        {
          name: "Eventos",
          columns: [
            { key: "evento_id", header: "ID evento" },
            { key: "venda_id", header: "ID venda" },
            { key: "data_evento", header: "Data evento" },
            { key: "tipo_evento", header: "Tipo evento" },
            { key: "valor", header: "Valor" },
            { key: "descricao", header: "Descricao" },
          ],
          rows: eventosRows,
        },
      ],
    });
  };

  const handleExportParcelasCliente = () => {
    if (!selectedCliente || !parcelasDrawer.length) return;

    const rows = parcelasDrawer.map((parcela) => ({
      cliente: selectedCliente.nome || "",
      venda_id: parcela.venda.id,
      data_venda: formatDate(parcela.venda.data_venda),
      valor_venda: Number(parcela.venda.valor_total) || 0,
      parcela_id: parcela.id,
      parcela_num: Number(parcela.parcela_num) || 0,
      status: parcela.status || "",
      vencimento: formatDate(parcela.vencimento),
      valor_programado: Number(parcela.valor_programado) || Number(parcela.valor) || 0,
      valor_recebido: Number(parcela.valor_recebido) || 0,
      data_recebimento: formatDate(parcela.data_recebimento),
      forma_recebimento_programada: parcela.forma_recebimento || "",
      forma_recebimento_real: parcela.forma_recebimento_real || "",
      origem_recebimento: parcela.origem_recebimento || "",
      motivo_diferenca: parcela.motivo_diferenca || "",
      acao_diferenca: parcela.acao_diferenca || "",
      fornecedor_destino_id: parcela.fornecedor_destino_id || "",
      comprovante_url: parcela.comprovante_url || "",
      observacao_recebimento: parcela.observacao_recebimento || "",
    }));

    downloadWorkbookXlsx({
      fileName: `parcelas_cliente_${toFileSafeText(selectedCliente.nome)}_${exportDate()}`,
      sheets: [
        {
          name: "Parcelas",
          columns: [
            { key: "cliente", header: "Cliente" },
            { key: "venda_id", header: "ID venda origem" },
            { key: "data_venda", header: "Data venda origem" },
            { key: "valor_venda", header: "Valor da venda" },
            { key: "parcela_id", header: "ID parcela" },
            { key: "parcela_num", header: "Numero parcela" },
            { key: "status", header: "Status" },
            { key: "vencimento", header: "Vencimento" },
            { key: "valor_programado", header: "Valor programado" },
            { key: "valor_recebido", header: "Valor recebido" },
            { key: "data_recebimento", header: "Data recebimento" },
            {
              key: "forma_recebimento_programada",
              header: "Forma recebimento programada",
            },
            {
              key: "forma_recebimento_real",
              header: "Forma recebimento real",
            },
            { key: "origem_recebimento", header: "Origem recebimento" },
            { key: "motivo_diferenca", header: "Motivo diferenca" },
            { key: "acao_diferenca", header: "Acao diferenca" },
            {
              key: "fornecedor_destino_id",
              header: "Fornecedor destino (quando houver)",
            },
            { key: "comprovante_url", header: "Comprovante URL" },
            { key: "observacao_recebimento", header: "Observacao recebimento" },
          ],
          rows,
        },
      ],
    });
  };

  const handleOpenDrawer = (type, cliente) => {
    setDrawer({ type, clienteId: cliente.id });
    setClienteForm({
      id: cliente.id,
      nome: cliente.nome || "",
      cpf_cnpj: cliente.cpf_cnpj || "",
      telefone: cliente.telefone || "",
      endereco: cliente.endereco || "",
    });
  };

  const handleIrParaContasReceber = (parcelaId) => {
    if (!selectedCliente || !parcelaId) return;

    router.push({
      pathname: "/app/contas-receber",
      query: {
        cliente_id: selectedCliente.id,
        parcela_id: parcelaId,
      },
    });
  };

  return (
    <AppLayout>
      <PageHeader
        title="Detalhe do Cliente"
        subtitle="Tabela de clientes com ações para cadastro, histórico e parcelas."
        action={
          <Button
            variant="contained"
            startIcon={<DownloadRounded />}
            onClick={handleExportClientes}
            disabled={!clientes.length}
          >
            Baixar clientes
          </Button>
        }
      />

      <Paper sx={{ p: 3 }}>
        <Stack spacing={2}>
          <TextField
            label="Buscar cliente"
            placeholder="Digite nome, CPF/CNPJ ou telefone"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            fullWidth
          />

          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Cliente</TableCell>
                  <TableCell>CPF/CNPJ</TableCell>
                  <TableCell>Telefone</TableCell>
                  <TableCell align="right">Ações</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {clientesFiltrados.map((cliente) => (
                  <TableRow key={cliente.id} hover>
                    <TableCell>{cliente.nome}</TableCell>
                    <TableCell>{cliente.cpf_cnpj || "-"}</TableCell>
                    <TableCell>{cliente.telefone || "-"}</TableCell>
                    <TableCell align="right">
                      <Stack
                        direction="row"
                        spacing={1}
                        justifyContent="flex-end"
                      >
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => handleOpenDrawer("cadastro", cliente)}
                        >
                          Editar dados cadastrais
                        </Button>
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => handleOpenDrawer("historico", cliente)}
                        >
                          Histórico de compras
                        </Button>
                        <Button
                          size="small"
                          variant="contained"
                          onClick={() => handleOpenDrawer("parcelas", cliente)}
                        >
                          Parcelas
                        </Button>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {!clientesFiltrados.length ? (
            <Alert severity="info">
              Nenhum cliente encontrado para o filtro informado.
            </Alert>
          ) : null}
        </Stack>
      </Paper>

      <Drawer
        anchor="right"
        open={Boolean(drawer.type)}
        onClose={() => setDrawer({ type: null, clienteId: null })}
        sx={{ zIndex: (theme) => theme.zIndex.tooltip + 1 }}
        PaperProps={{ sx: drawerPaperSx }}
      >
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          mb={2}
          spacing={1}
        >
          <Typography variant="h6">
            {drawer.type === "cadastro" ? "Editar dados cadastrais" : null}
            {drawer.type === "historico" ? "Histórico de compras" : null}
            {drawer.type === "parcelas" ? "Parcelas do cliente" : null}
          </Typography>

          <Stack direction="row" spacing={1} alignItems="center">
            {drawer.type === "historico" ? (
              <Button
                size="small"
                variant="outlined"
                startIcon={<DownloadRounded />}
                onClick={handleExportHistoricoCliente}
                disabled={!selectedClienteVendas.length}
              >
                Baixar histórico
              </Button>
            ) : null}

            {drawer.type === "parcelas" ? (
              <Button
                size="small"
                variant="outlined"
                startIcon={<DownloadRounded />}
                onClick={handleExportParcelasCliente}
                disabled={!parcelasDrawer.length}
              >
                Baixar parcelas
              </Button>
            ) : null}

            <IconButton onClick={() => setDrawer({ type: null, clienteId: null })}>
              <Close />
            </IconButton>
          </Stack>
        </Stack>

        {drawer.type === "cadastro" ? (
          <Stack spacing={2}>
            <TextField
              label="Nome"
              value={clienteForm.nome}
              onChange={(event) =>
                setClienteForm((prev) => ({
                  ...prev,
                  nome: event.target.value,
                }))
              }
            />
            <TextField
              label="CPF/CNPJ"
              value={clienteForm.cpf_cnpj}
              onChange={(event) =>
                setClienteForm((prev) => ({
                  ...prev,
                  cpf_cnpj: event.target.value,
                }))
              }
            />
            <TextField
              label="Telefone"
              value={clienteForm.telefone}
              onChange={(event) =>
                setClienteForm((prev) => ({
                  ...prev,
                  telefone: event.target.value,
                }))
              }
            />
            <TextField
              label="Endereço"
              value={clienteForm.endereco}
              onChange={(event) =>
                setClienteForm((prev) => ({
                  ...prev,
                  endereco: event.target.value,
                }))
              }
            />
            <Button
              variant="contained"
              onClick={async () => {
                await updateCliente(clienteForm);
                setDrawer({ type: null, clienteId: null });
              }}
            >
              Salvar dados
            </Button>
          </Stack>
        ) : null}

        {drawer.type === "historico" ? (
          <Stack spacing={2}>
            {selectedClienteVendas.map((venda) => (
              <Paper key={venda.id} variant="outlined" sx={{ p: 2 }}>
                <Typography fontWeight={600}>
                  Venda #{venda.id.slice(0, 8)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {formatDate(venda.data_venda)} • {formatCurrency(venda.valor_total)}
                </Typography>
              </Paper>
            ))}

            {historicoDrawer.map((evento) => (
              <Paper key={evento.id} variant="outlined" sx={{ p: 2 }}>
                <Typography fontWeight={600}>
                  Ajuste: {evento.tipo_evento}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Venda #{evento.venda.id.slice(0, 8)} • {formatDate(evento.data_evento)} •{" "}
                  {formatCurrency(evento.valor)}
                </Typography>
                <Typography variant="body2">{evento.descricao}</Typography>
              </Paper>
            ))}

            {!selectedClienteVendas.length ? (
              <Alert severity="info">
                Este cliente ainda não possui compras registradas.
              </Alert>
            ) : null}
          </Stack>
        ) : null}

        {drawer.type === "parcelas" ? (
          <Stack spacing={2}>
            {parcelasDrawer.map((parcela) => {
              const recebida = parcela.status === "RECEBIDA";
              return (
                <Paper key={parcela.id} variant="outlined" sx={{ p: 2 }}>
                  <Stack
                    direction="row"
                    justifyContent="space-between"
                    alignItems="center"
                  >
                    <Typography fontWeight={600}>
                      Venda #{parcela.venda.id.slice(0, 8)} • Parcela {parcela.parcela_num}
                    </Typography>
                    <Chip
                      label={parcela.status}
                      color={recebida ? "success" : "warning"}
                      size="small"
                    />
                  </Stack>
                  <Typography variant="body2" color="text.secondary" mt={0.5}>
                    Vencimento: {formatDate(parcela.vencimento)} • Valor:{" "}
                    {formatCurrency(parcela.valor)}
                  </Typography>
                  {!recebida ? (
                    <Button
                      sx={{ mt: 1 }}
                      size="small"
                      variant="contained"
                      onClick={() => handleIrParaContasReceber(parcela.id)}
                    >
                      Confirmar pagamento
                    </Button>
                  ) : null}
                </Paper>
              );
            })}

            {!parcelasDrawer.length ? (
              <Alert severity="info">
                Nenhuma parcela encontrada para este cliente.
              </Alert>
            ) : null}
          </Stack>
        ) : null}
      </Drawer>
    </AppLayout>
  );
};

export default DetalheClientePage;
