import {
  Alert,
  Button,
  Chip,
  Drawer,
  IconButton,
  MenuItem,
  Paper,
  Snackbar,
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
import { Close, DownloadRounded, OpenInNewRounded } from "@mui/icons-material";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import AppLayout from "../../components/template/AppLayout";
import PageHeader from "../../components/atomic/PageHeader";
import { useDataStore } from "../../hooks/useDataStore";
import { authenticatedFetch } from "../../hooks/useSession";
import { formatCurrency, formatDate } from "../../utils/format";
import { downloadWorkbookXlsx } from "../../utils/xlsx";

const drawerPaperSx = {
  width: { xs: "100%", md: "30vw" },
  minWidth: { md: 360 },
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

const boolLabel = (value) => (value ? "Sim" : "Não");

const buildClienteForm = (cliente) => ({
  id: cliente?.id || "",
  nome: cliente?.nome || "",
  cpf_cnpj: cliente?.cpf_cnpj || "",
  telefone: cliente?.telefone || "",
  endereco: cliente?.endereco || "",
  data_aniversario: cliente?.data_aniversario || "",
});

const buildCobrancaForm = (cliente) => ({
  descricao: cliente?.nome ? `Cobrança manual - ${cliente.nome}` : "",
  value: "",
  due_date: exportDate(),
  billing_type: "BOLETO",
  venda_id: "",
});

const readApiBody = async (response) => {
  try {
    return await response.json();
  } catch (error) {
    return {};
  }
};

const canDeleteCharge = (charge) =>
  !charge?.deleted &&
  !["RECEIVED", "CONFIRMED", "RECEIVED_IN_CASH", "REFUNDED", "DELETED"].includes(
    String(charge?.status || "").toUpperCase(),
  );

const DetalheClientePage = () => {
  const router = useRouter();
  const clientes = useDataStore((state) => state.clientes);
  const vendas = useDataStore((state) => state.vendas);
  const vendaItens = useDataStore((state) => state.vendaItens || []);
  const contasReceber = useDataStore((state) => state.contasReceber);
  const parcelas = useDataStore((state) => state.contasReceberParcelas);
  const asaasCobrancas = useDataStore((state) => state.asaasCobrancas || []);
  const vendaDetalhes = useDataStore((state) => state.vendaDetalhes || []);
  const insumos = useDataStore((state) => state.insumos || []);
  const updateCliente = useDataStore((state) => state.updateCliente);
  const loadData = useDataStore((state) => state.loadData);

  const [search, setSearch] = useState("");
  const [drawer, setDrawer] = useState({ type: null, clienteId: null });
  const [clienteForm, setClienteForm] = useState({
    id: "",
    nome: "",
    cpf_cnpj: "",
    telefone: "",
    endereco: "",
    data_aniversario: "",
  });
  const [cobrancaForm, setCobrancaForm] = useState(buildCobrancaForm(null));
  const [asaasConfigurado, setAsaasConfigurado] = useState(false);
  const [feedback, setFeedback] = useState({
    open: false,
    severity: "success",
    message: "",
  });
  const [loadingAction, setLoadingAction] = useState(false);

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

  const itensByVendaId = useMemo(() => {
    const mapa = new Map();
    vendaItens.forEach((item) => {
      if (!item.venda_id) return;
      const atual = mapa.get(item.venda_id) || [];
      atual.push(item);
      mapa.set(item.venda_id, atual);
    });
    return mapa;
  }, [vendaItens]);

  const eventosByVendaId = useMemo(() => {
    const mapa = new Map();
    historicoDrawer.forEach((evento) => {
      const atual = mapa.get(evento.venda.id) || [];
      atual.push(evento);
      mapa.set(evento.venda.id, atual);
    });
    return mapa;
  }, [historicoDrawer]);

  const parcelasByVendaId = useMemo(() => {
    const mapa = new Map();
    parcelasDrawer.forEach((parcela) => {
      const atual = mapa.get(parcela.venda.id) || [];
      atual.push(parcela);
      mapa.set(parcela.venda.id, atual);
    });
    return mapa;
  }, [parcelasDrawer]);

  const cobrancasCliente = useMemo(() => {
    if (!selectedCliente) return [];

    return asaasCobrancas
      .filter((cobranca) => cobranca.cliente_id === selectedCliente.id)
      .sort((a, b) =>
        String(b.due_date || "").localeCompare(String(a.due_date || "")),
      );
  }, [asaasCobrancas, selectedCliente]);

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
        data_aniversario: cliente.data_aniversario
          ? formatDate(cliente.data_aniversario)
          : "",
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
            { key: "data_aniversario", header: "Data aniversario" },
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
            { key: "acrescimo_tipo", header: "Tipo acréscimo" },
            { key: "acrescimo_valor", header: "Valor acréscimo" },
            { key: "conta_receber_id", header: "Conta a receber" },
            { key: "parcelas_abertas", header: "Parcelas abertas" },
            { key: "parcelas_recebidas", header: "Parcelas recebidas" },
            { key: "total_recebido", header: "Total recebido" },
            { key: "observacoes", header: "Observações" },
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
            { key: "preco_unitario", header: "Preço unitário" },
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
            { key: "motivo_diferenca", header: "Motivo da diferença" },
            { key: "acao_diferenca", header: "Ação da diferença" },
          ],
          rows: parcelasRows,
        },
        {
          name: "Eventos",
          columns: [
            { key: "evento_id", header: "ID evento" },
            { key: "venda_id", header: "ID venda" },
            { key: "data_evento", header: "Data do evento" },
            { key: "tipo_evento", header: "Tipo de evento" },
            { key: "valor", header: "Valor" },
            { key: "descricao", header: "Descrição" },
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
            { key: "parcela_num", header: "Número da parcela" },
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
            { key: "motivo_diferenca", header: "Motivo da diferença" },
            { key: "acao_diferenca", header: "Ação da diferença" },
            {
              key: "fornecedor_destino_id",
              header: "Fornecedor destino (quando houver)",
            },
            { key: "comprovante_url", header: "Comprovante URL" },
            { key: "observacao_recebimento", header: "Observação do recebimento" },
          ],
          rows,
        },
      ],
    });
  };

  const handleOpenDrawer = (type, cliente) => {
    setDrawer({ type, clienteId: cliente.id });
    setClienteForm(buildClienteForm(cliente));
    if (type === "cobrancas") {
      setCobrancaForm(buildCobrancaForm(cliente));
    }
  };

  const handleVerMaisHistorico = (vendaId) => {
    if (!selectedCliente || !vendaId) return;

    router.push({
      pathname: "/app/detalhe-compra-cliente",
      query: {
        cliente_id: selectedCliente.id,
        venda_id: vendaId,
        drawer: "historico",
      },
    });
  };

  useEffect(() => {
    if (!router.isReady) return;

    const drawerType =
      typeof router.query.drawer === "string" ? router.query.drawer : null;
    const clienteId =
      typeof router.query.cliente_id === "string" ? router.query.cliente_id : null;

    if (!drawerType || !clienteId) return;
    if (!["cadastro", "historico", "parcelas", "cobrancas"].includes(drawerType))
      return;

    const cliente = clientes.find((item) => item.id === clienteId);
    if (!cliente) return;

    setDrawer((atual) =>
      atual.type === drawerType && atual.clienteId === clienteId
        ? atual
        : { type: drawerType, clienteId },
    );
    setClienteForm(buildClienteForm(cliente));
  }, [router.isReady, router.query.drawer, router.query.cliente_id, clientes]);

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

  useEffect(() => {
    const loadIntegracoes = async () => {
      try {
        const response = await authenticatedFetch(
          "/api/v1/configuracao-empresa/integracoes",
        );
        const data = await readApiBody(response);
        if (!response.ok) return;

        const asaas = (data.integracoes || []).find(
          (item) => item.provedor === "asaas",
        );
        setAsaasConfigurado(Boolean(asaas?.configurado));
      } catch (error) {
        setAsaasConfigurado(false);
      }
    };

    loadIntegracoes();
  }, []);

  useEffect(() => {
    if (drawer.type !== "cobrancas" || !selectedCliente) return;
    setCobrancaForm(buildCobrancaForm(selectedCliente));
  }, [drawer.type, selectedCliente]);

  const handleSyncClienteAsaas = async () => {
    if (!selectedCliente) return;
    setLoadingAction(true);

    try {
      const response = await authenticatedFetch(
        "/api/v1/integracoes/asaas/clientes/sincronizar",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ cliente_id: selectedCliente.id }),
        },
      );
      const data = await readApiBody(response);
      if (!response.ok) {
        throw new Error(data.error || "Não foi possível sincronizar o cliente.");
      }

      await loadData();
      setFeedback({
        open: true,
        severity: "success",
        message: `Cliente sincronizado com ASAAS: ${data.asaas_customer_id}.`,
      });
    } catch (error) {
      setFeedback({
        open: true,
        severity: "error",
        message: error.message || "Erro ao sincronizar cliente no ASAAS.",
      });
    } finally {
      setLoadingAction(false);
    }
  };

  const handleCriarCobrancaManual = async () => {
    if (!selectedCliente) return;

    const value = Number(cobrancaForm.value) || 0;
    if (value <= 0 || !cobrancaForm.due_date) {
      setFeedback({
        open: true,
        severity: "error",
        message: "Informe valor e vencimento válidos para a cobrança.",
      });
      return;
    }

    setLoadingAction(true);
    try {
      const response = await authenticatedFetch(
        "/api/v1/integracoes/asaas/cobrancas",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            cliente_id: selectedCliente.id,
            venda_id: cobrancaForm.venda_id || null,
            billing_type: cobrancaForm.billing_type,
            due_date: cobrancaForm.due_date,
            value,
            descricao: cobrancaForm.descricao,
            origem_tipo: cobrancaForm.venda_id ? "VENDA" : "MANUAL",
          }),
        },
      );
      const data = await readApiBody(response);
      if (!response.ok) {
        throw new Error(data.error || "Não foi possível criar a cobrança.");
      }

      await loadData();
      setCobrancaForm(buildCobrancaForm(selectedCliente));
      setFeedback({
        open: true,
        severity: "success",
        message: "Cobrança manual criada com sucesso no ASAAS.",
      });
    } catch (error) {
      setFeedback({
        open: true,
        severity: "error",
        message: error.message || "Erro ao criar cobrança manual no ASAAS.",
      });
    } finally {
      setLoadingAction(false);
    }
  };

  const handleRemoverCobranca = async (chargeId) => {
    if (!chargeId) return;
    setLoadingAction(true);

    try {
      const response = await authenticatedFetch(
        `/api/v1/integracoes/asaas/cobrancas/${chargeId}`,
        {
          method: "DELETE",
        },
      );
      const data = await readApiBody(response);
      if (!response.ok) {
        throw new Error(data.error || "Não foi possível remover a cobrança.");
      }

      await loadData();
      setFeedback({
        open: true,
        severity: "success",
        message: "Cobrança removida com sucesso do ASAAS.",
      });
    } catch (error) {
      setFeedback({
        open: true,
        severity: "error",
        message: error.message || "Erro ao remover cobrança do ASAAS.",
      });
    } finally {
      setLoadingAction(false);
    }
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
                  <TableCell>Data aniversário</TableCell>
                  <TableCell align="right">Ações</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {clientesFiltrados.map((cliente) => (
                  <TableRow key={cliente.id} hover>
                    <TableCell>{cliente.nome}</TableCell>
                    <TableCell>{cliente.cpf_cnpj || "-"}</TableCell>
                    <TableCell>{cliente.telefone || "-"}</TableCell>
                    <TableCell>{formatDate(cliente.data_aniversario)}</TableCell>
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
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => handleOpenDrawer("cobrancas", cliente)}
                        >
                          Cobranças ASAAS
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
        sx={{ zIndex: (theme) => theme.zIndex.modal + 20 }}
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
            {drawer.type === "cobrancas" ? "Cobranças ASAAS" : null}
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
              label="Data de aniversário"
              type="date"
              value={clienteForm.data_aniversario}
              onChange={(event) =>
                setClienteForm((prev) => ({
                  ...prev,
                  data_aniversario: event.target.value,
                }))
              }
              InputLabelProps={{ shrink: true }}
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
                <Stack spacing={1.2}>
                  <Stack
                    direction="row"
                    justifyContent="space-between"
                    alignItems="center"
                    spacing={1}
                  >
                    <Typography fontWeight={600}>Venda #{venda.id.slice(0, 8)}</Typography>
                    <Chip
                      label={venda.status_entrega || "PENDENTE"}
                      size="small"
                      color={venda.status_entrega === "ENTREGUE" ? "success" : "warning"}
                    />
                  </Stack>
                  <Typography variant="body2" color="text.secondary">
                    {formatDate(venda.data_venda)} • {formatCurrency(venda.valor_total)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Itens: {(itensByVendaId.get(venda.id) || []).length} • Parcelas:{" "}
                    {(parcelasByVendaId.get(venda.id) || []).length} • Eventos:{" "}
                    {(eventosByVendaId.get(venda.id) || []).length}
                  </Typography>
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<OpenInNewRounded />}
                    onClick={() => handleVerMaisHistorico(venda.id)}
                  >
                    Ver mais
                  </Button>
                </Stack>
              </Paper>
            ))}

            {!selectedClienteVendas.length ? (
              <Alert severity="info">
                Este cliente ainda não possui compras registradas.
              </Alert>
            ) : null}
          </Stack>
        ) : null}

        {drawer.type === "cobrancas" ? (
          <Stack spacing={2}>
            {!asaasConfigurado ? (
              <Alert severity="warning">
                A integração ASAAS ainda não está configurada em Configuração da
                Empresa.
              </Alert>
            ) : null}

            <Paper variant="outlined" sx={{ p: 2 }}>
              <Stack spacing={1.2}>
                <Typography fontWeight={600}>Cliente sincronizado</Typography>
                <Typography variant="body2" color="text.secondary">
                  ID ASAAS: {selectedCliente?.asaas_customer_id || "Ainda não sincronizado"}
                </Typography>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={handleSyncClienteAsaas}
                  disabled={!asaasConfigurado || loadingAction}
                >
                  {selectedCliente?.asaas_customer_id
                    ? "Revalidar cliente no ASAAS"
                    : "Sincronizar cliente no ASAAS"}
                </Button>
              </Stack>
            </Paper>

            <Paper variant="outlined" sx={{ p: 2 }}>
              <Stack spacing={1.5}>
                <Typography fontWeight={600}>Nova cobrança manual</Typography>
                <TextField
                  label="Descrição"
                  value={cobrancaForm.descricao}
                  onChange={(event) =>
                    setCobrancaForm((prev) => ({
                      ...prev,
                      descricao: event.target.value,
                    }))
                  }
                  fullWidth
                />
                <TextField
                  label="Valor"
                  type="number"
                  value={cobrancaForm.value}
                  onChange={(event) =>
                    setCobrancaForm((prev) => ({
                      ...prev,
                      value: event.target.value,
                    }))
                  }
                  fullWidth
                />
                <TextField
                  label="Vencimento"
                  type="date"
                  value={cobrancaForm.due_date}
                  onChange={(event) =>
                    setCobrancaForm((prev) => ({
                      ...prev,
                      due_date: event.target.value,
                    }))
                  }
                  InputLabelProps={{ shrink: true }}
                  fullWidth
                />
                <TextField
                  select
                  label="Tipo de cobrança"
                  value={cobrancaForm.billing_type}
                  onChange={(event) =>
                    setCobrancaForm((prev) => ({
                      ...prev,
                      billing_type: event.target.value,
                    }))
                  }
                  fullWidth
                >
                  <MenuItem value="BOLETO">Boleto</MenuItem>
                  <MenuItem value="PIX">Pix</MenuItem>
                  <MenuItem value="UNDEFINED">A definir</MenuItem>
                </TextField>
                <TextField
                  select
                  label="Vincular a uma venda (opcional)"
                  value={cobrancaForm.venda_id}
                  onChange={(event) =>
                    setCobrancaForm((prev) => ({
                      ...prev,
                      venda_id: event.target.value,
                    }))
                  }
                  fullWidth
                >
                  <MenuItem value="">Sem vínculo</MenuItem>
                  {selectedClienteVendas.map((venda) => (
                    <MenuItem key={venda.id} value={venda.id}>
                      {`Venda #${venda.id.slice(0, 8)} • ${formatCurrency(
                        venda.valor_total,
                      )}`}
                    </MenuItem>
                  ))}
                </TextField>
                <Button
                  variant="contained"
                  onClick={handleCriarCobrancaManual}
                  disabled={!asaasConfigurado || loadingAction}
                >
                  Criar cobrança manual
                </Button>
              </Stack>
            </Paper>

            <Stack spacing={1.5}>
              {cobrancasCliente.map((cobranca) => (
                <Paper key={cobranca.id} variant="outlined" sx={{ p: 2 }}>
                  <Stack spacing={1}>
                    <Stack
                      direction="row"
                      justifyContent="space-between"
                      alignItems="center"
                    >
                      <Typography fontWeight={600}>
                        Cobrança {cobranca.asaas_payment_id || cobranca.id}
                      </Typography>
                      <Chip
                        label={cobranca.status || "PENDING"}
                        size="small"
                        color={
                          ["RECEIVED", "CONFIRMED"].includes(
                            String(cobranca.status || "").toUpperCase(),
                          )
                            ? "success"
                            : cobranca.deleted
                              ? "default"
                              : "warning"
                        }
                      />
                    </Stack>
                    <Typography variant="body2" color="text.secondary">
                      {formatDate(cobranca.due_date)} •{" "}
                      {formatCurrency(cobranca.value)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Tipo: {cobranca.billing_type || "-"} • Venda:{" "}
                      {cobranca.venda_id ? `#${cobranca.venda_id.slice(0, 8)}` : "Sem vínculo"}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {cobranca.descricao || "Sem descrição"}
                    </Typography>
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                      {cobranca.invoice_url ? (
                        <Button
                          size="small"
                          variant="outlined"
                          component="a"
                          href={cobranca.invoice_url}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Abrir fatura
                        </Button>
                      ) : null}
                      {canDeleteCharge(cobranca) ? (
                        <Button
                          size="small"
                          variant="outlined"
                          color="error"
                          onClick={() => handleRemoverCobranca(cobranca.id)}
                          disabled={loadingAction}
                        >
                          Remover cobrança
                        </Button>
                      ) : null}
                    </Stack>
                  </Stack>
                </Paper>
              ))}

              {!cobrancasCliente.length ? (
                <Alert severity="info">
                  Nenhuma cobrança ASAAS encontrada para este cliente.
                </Alert>
              ) : null}
            </Stack>
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

      <Snackbar
        open={feedback.open}
        autoHideDuration={4500}
        onClose={() => setFeedback((prev) => ({ ...prev, open: false }))}
      >
        <Alert
          severity={feedback.severity}
          onClose={() => setFeedback((prev) => ({ ...prev, open: false }))}
          variant="filled"
        >
          {feedback.message}
        </Alert>
      </Snackbar>
    </AppLayout>
  );
};

export default DetalheClientePage;
