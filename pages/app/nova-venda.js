import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  Drawer,
  FormControlLabel,
  Grid,
  IconButton,
  MenuItem,
  Paper,
  Popover,
  Stack,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import HistoryIcon from "@mui/icons-material/History";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import { useEffect, useMemo, useState } from "react";
import AppLayout from "../../components/template/AppLayout";
import PageHeader from "../../components/atomic/PageHeader";
import { useDataStore } from "../../hooks/useDataStore";
import { formatCurrency, formatDate } from "../../utils/format";

const LOCAL_SALE_MARKER = "Venda local";

const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const todayDate = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const addMonths = (baseDate, offset) => {
  const [year, month, day] = String(baseDate || todayDate())
    .split("-")
    .map((value) => Number(value) || 0);
  const date = new Date(year, Math.max(month - 1, 0), Math.max(day, 1));
  date.setMonth(date.getMonth() + offset);
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, "0");
  const d = `${date.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const createItem = () => ({
  id: crypto.randomUUID(),
  insumo_id: "",
  unidade_codigo: "KG",
  quantidade: "",
  kg_por_saco: "23",
  preco_unit: "",
});

const escapeHtml = (value) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const buildVendaA4Html = ({ resumo, logoUrl }) => {
  const venda = resumo.venda;
  const itensRows = resumo.itens.length
    ? resumo.itens
      .map(
        (item) => `
      <tr>
        <td>${escapeHtml(item.nome)}</td>
        <td>${escapeHtml(item.unidadeLabel)}</td>
        <td>${escapeHtml(String(item.quantidadeInformada))}</td>
        <td>${escapeHtml(formatCurrency(item.precoUnitario))}</td>
        <td>${escapeHtml(formatCurrency(item.total))}</td>
      </tr>
    `,
      )
      .join("")
    : '<tr><td colspan="5">Nenhum item registrado.</td></tr>';

  const parcelasRows = resumo.parcelas.length
    ? resumo.parcelas
      .map(
        (parcela) => `
      <tr>
        <td>${escapeHtml(String(parcela.parcela_num))}</td>
        <td>${escapeHtml(formatDate(parcela.vencimento))}</td>
        <td>${escapeHtml(formatCurrency(parcela.valor))}</td>
        <td>${escapeHtml(parcela.forma_recebimento || "-")}</td>
        <td>${escapeHtml(parcela.status || "-")}</td>
      </tr>
    `,
      )
      .join("")
    : '<tr><td colspan="5">Sem parcelas registradas.</td></tr>';

  const ajustesRows = resumo.ajustes.length
    ? resumo.ajustes
      .map(
        (ajuste) => `
      <tr>
        <td>${escapeHtml(ajuste.tipo)}</td>
        <td>${escapeHtml(ajuste.descricao)}</td>
        <td>${escapeHtml(formatCurrency(ajuste.valor))}</td>
        <td>${escapeHtml(formatDate(ajuste.data_evento || venda.data_venda))}</td>
      </tr>
    `,
      )
      .join("")
    : '<tr><td colspan="4">Sem ajustes comerciais registrados.</td></tr>';

  return `
<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>Ordem de Venda ${escapeHtml(resumo.orderCode)}</title>
  <style>
    @page { size: A4; margin: 12mm; }
    body { font-family: Arial, sans-serif; color: #1f2937; margin: 0; }
    .sheet { width: 100%; }
    .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #111827; padding-bottom: 8px; margin-bottom: 14px; }
    .title h1 { margin: 0; font-size: 18px; }
    .title p { margin: 2px 0 0; font-size: 12px; color: #4b5563; }
    .logo { width: 68px; height: 68px; object-fit: contain; }
    .block { margin-bottom: 12px; }
    .block h2 { margin: 0 0 6px; font-size: 13px; text-transform: uppercase; color: #111827; }
    .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 14px; font-size: 12px; }
    .meta strong { color: #111827; }
    table { width: 100%; border-collapse: collapse; font-size: 11px; }
    th, td { border: 1px solid #d1d5db; padding: 6px; text-align: left; vertical-align: top; }
    th { background: #f3f4f6; font-size: 10px; text-transform: uppercase; letter-spacing: .02em; }
    .totals { display: flex; justify-content: flex-end; margin-top: 8px; font-size: 12px; }
    .totals .box { min-width: 220px; border: 1px solid #d1d5db; padding: 8px; }
    .totals .line { display: flex; justify-content: space-between; margin-bottom: 4px; }
    .totals .line:last-child { margin-bottom: 0; font-weight: 700; font-size: 13px; }
    .obs { font-size: 12px; padding: 8px; border: 1px solid #d1d5db; background: #f9fafb; white-space: pre-wrap; }
  </style>
</head>
<body>
  <div class="sheet">
    <div class="header">
      <div class="title">
        <h1>Logotipo da Empresa + Ordem de Venda</h1>
        <p>Identificação da Ordem de Venda: ${escapeHtml(String(venda.id || "-"))}</p>
      </div>
      <img class="logo" src="${escapeHtml(logoUrl)}" alt="Logotipo da Empresa" />
    </div>

    <section class="block">
      <h2>Descrição completa da compra</h2>
      <div class="meta">
        <div><strong>Cliente:</strong> ${escapeHtml(resumo.clienteNome)}</div>
        <div><strong>Ordem:</strong> #${escapeHtml(resumo.orderCode)}</div>
        <div><strong>Data da venda:</strong> ${escapeHtml(formatDate(venda.data_venda))}</div>
        <div><strong>Programada entrega:</strong> ${escapeHtml(formatDate(venda.data_programada_entrega))}</div>
        <div><strong>Data de entrega:</strong> ${escapeHtml(formatDate(venda.data_entrega))}</div>
        <div><strong>Status de entrega:</strong> ${escapeHtml(venda.status_entrega || "PENDENTE")}</div>
      </div>
      <div class="obs" style="margin-top:8px;"><strong>Observações:</strong> ${escapeHtml(venda.obs || "-")}</div>
    </section>

    <section class="block">
      <h2>Itens vendidos</h2>
      <table>
        <thead>
          <tr>
            <th>Produto</th>
            <th>Unidade</th>
            <th>Quantidade</th>
            <th>Preço Unitário</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>${itensRows}</tbody>
      </table>
      <div class="totals">
        <div class="box">
          <div class="line"><span>Subtotal</span><span>${escapeHtml(formatCurrency(resumo.subtotal))}</span></div>
          <div class="line"><span>Desconto</span><span>${escapeHtml(formatCurrency(resumo.descontoValor))}</span></div>
          <div class="line"><span>Valor adicional</span><span>${escapeHtml(formatCurrency(resumo.acrescimoValor))}</span></div>
          <div class="line"><span>Total</span><span>${escapeHtml(formatCurrency(venda.valor_total))}</span></div>
        </div>
      </div>
    </section>

    <section class="block">
      <h2>Dados para pagamento e ajustes comerciais</h2>
      <div class="meta" style="margin-bottom:8px;">
        <div><strong>Tipo:</strong> ${escapeHtml(venda.tipo_pagamento || "A_VISTA")}</div>
        <div><strong>Forma:</strong> ${escapeHtml(venda.forma_pagamento || "-")}</div>
      </div>
      <table style="margin-bottom:8px;">
        <thead>
          <tr>
            <th>Parcela</th>
            <th>Vencimento</th>
            <th>Valor</th>
            <th>Forma</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>${parcelasRows}</tbody>
      </table>
      <table>
        <thead>
          <tr>
            <th>Tipo</th>
            <th>Descrição</th>
            <th>Valor</th>
            <th>Data</th>
          </tr>
        </thead>
        <tbody>${ajustesRows}</tbody>
      </table>
    </section>
  </div>
  <script>
    window.addEventListener("load", function () {
      setTimeout(function () { window.print(); }, 250);
    });
    window.onafterprint = function () { window.close(); };
  </script>
</body>
</html>
`;
};

const NovaVendaPage = () => {
  const clientes = useDataStore((state) => state.clientes);
  const insumos = useDataStore((state) => state.insumos);
  const auxUnidades = useDataStore((state) => state.auxUnidades);
  const auxFormasPagamento = useDataStore((state) => state.auxFormasPagamento);
  const vendas = useDataStore((state) => state.vendas);
  const vendaItens = useDataStore((state) => state.vendaItens);
  const contasReceber = useDataStore((state) => state.contasReceber);
  const contasReceberParcelas = useDataStore((state) => state.contasReceberParcelas);
  const vendaDetalhes = useDataStore((state) => state.vendaDetalhes);
  const addVenda = useDataStore((state) => state.addVenda);
  const confirmarEntregaVenda = useDataStore((state) => state.confirmarEntregaVenda);

  const [clienteId, setClienteId] = useState("");
  const [dataProgramadaEntrega, setDataProgramadaEntrega] = useState(todayDate());
  const [obs, setObs] = useState("");
  const [vendaLocal, setVendaLocal] = useState(false);

  const [itens, setItens] = useState([createItem()]);

  const [descontoTipo, setDescontoTipo] = useState("VALOR");
  const [descontoValor, setDescontoValor] = useState("");
  const [descontoDescricao, setDescontoDescricao] = useState("");

  const [acrescimoTipo, setAcrescimoTipo] = useState("VALOR");
  const [acrescimoValor, setAcrescimoValor] = useState("");
  const [acrescimoDescricao, setAcrescimoDescricao] = useState("");

  const [tipoPagamento, setTipoPagamento] = useState("A_VISTA");
  const [formaPagamentoVista, setFormaPagamentoVista] = useState("PIX");
  const [parcelasQtd, setParcelasQtd] = useState(1);
  const [parcelas, setParcelas] = useState([]);

  const [historicoOpen, setHistoricoOpen] = useState(false);
  const [infoAnchorEl, setInfoAnchorEl] = useState(null);
  const [infoItemId, setInfoItemId] = useState(null);

  const formasPagamento = useMemo(
    () =>
      auxFormasPagamento.length
        ? auxFormasPagamento
        : [
          { codigo: "CHEQUE", label: "Cheque" },
          { codigo: "TRANSFERENCIA", label: "Transferência" },
          { codigo: "DINHEIRO", label: "Dinheiro" },
          { codigo: "PIX", label: "Pix" },
          { codigo: "CREDITO", label: "Crédito" },
          { codigo: "DEBITO", label: "Débito" },
        ],
    [auxFormasPagamento],
  );

  const unidades = useMemo(
    () =>
      auxUnidades.length
        ? auxUnidades
        : [
          { codigo: "KG", label: "Quilograma" },
          { codigo: "SACO", label: "Saco" },
        ],
    [auxUnidades],
  );

  const unidadesById = useMemo(
    () => new Map(auxUnidades.map((unidade) => [String(unidade.id), unidade])),
    [auxUnidades],
  );

  const clientesById = useMemo(
    () => new Map(clientes.map((cliente) => [cliente.id, cliente])),
    [clientes],
  );

  const insumosById = useMemo(
    () => new Map(insumos.map((insumo) => [insumo.id, insumo])),
    [insumos],
  );

  const insumosVendaveis = useMemo(
    () => insumos.filter((insumo) => Boolean(insumo.pode_ser_vendido)),
    [insumos],
  );

  const clienteSelecionado = useMemo(
    () => clientes.find((cliente) => cliente.id === clienteId) || null,
    [clientes, clienteId],
  );

  const clienteBalcao = Boolean(clienteSelecionado?.protegido);

  const itemComCalculo = useMemo(
    () =>
      itens.map((item) => {
        const insumo = insumos.find((i) => i.id === item.insumo_id);
        const quantidadeInformada = toNumber(item.quantidade);
        const kgPorSaco = toNumber(item.kg_por_saco) || toNumber(insumo?.kg_por_saco) || 1;
        const quantidadeKg =
          item.unidade_codigo === "SACO"
            ? quantidadeInformada * kgPorSaco
            : quantidadeInformada;
        const precoUnit = toNumber(item.preco_unit);

        return {
          ...item,
          insumo,
          quantidadeInformada,
          quantidadeKg,
          precoUnit,
          total: quantidadeInformada * precoUnit,
        };
      }),
    [itens, insumos],
  );

  const subtotal = useMemo(
    () => itemComCalculo.reduce((acc, item) => acc + item.total, 0),
    [itemComCalculo],
  );

  const descontoAbs = useMemo(() => {
    const valor = toNumber(descontoValor);
    if (descontoTipo === "PERCENTUAL") return (subtotal * valor) / 100;
    return valor;
  }, [descontoTipo, descontoValor, subtotal]);

  const acrescimoAbs = useMemo(() => {
    const valor = toNumber(acrescimoValor);
    if (acrescimoTipo === "PERCENTUAL") return (subtotal * valor) / 100;
    return valor;
  }, [acrescimoTipo, acrescimoValor, subtotal]);

  const totalFinal = useMemo(
    () => Math.max(0, subtotal - descontoAbs + acrescimoAbs),
    [subtotal, descontoAbs, acrescimoAbs],
  );

  useEffect(() => {
    if (vendaLocal) {
      setDataProgramadaEntrega(todayDate());
    }
  }, [vendaLocal]);

  useEffect(() => {
    if (clienteBalcao && tipoPagamento === "A_PRAZO") {
      setTipoPagamento("A_VISTA");
      setParcelas([]);
      setParcelasQtd(1);
    }
  }, [clienteBalcao, tipoPagamento]);

  useEffect(() => {
    if (tipoPagamento !== "A_PRAZO") {
      setParcelas([]);
      return;
    }

    const quantidade = Math.max(1, Number(parcelasQtd) || 1);
    const valorBase = quantidade ? Number((totalFinal / quantidade).toFixed(2)) : 0;
    const base = Array.from({ length: quantidade }, (_, index) => ({
      parcela_num: index + 1,
      valor:
        index === quantidade - 1
          ? Number((totalFinal - valorBase * (quantidade - 1)).toFixed(2))
          : valorBase,
      vencimento: addMonths(todayDate(), index),
      forma_pagamento: formasPagamento[0]?.codigo || "PIX",
      status: "ABERTA",
    }));

    setParcelas(base);
  }, [tipoPagamento, parcelasQtd, totalFinal, formasPagamento]);

  const handleItemChange = (id, field, value) => {
    setItens((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;

        if (field === "insumo_id") {
          const insumo = insumos.find((i) => i.id === value);
          const unidadeCodigo = String(insumo?.unidade_codigo || "KG").toUpperCase();
          const kgPorSaco = String(toNumber(insumo?.kg_por_saco) || 23);

          return {
            ...item,
            insumo_id: value,
            unidade_codigo: unidadeCodigo,
            kg_por_saco: kgPorSaco,
            preco_unit: "",
          };
        }

        return { ...item, [field]: value };
      }),
    );
  };

  const handleParcelaChange = (index, field, value) => {
    setParcelas((prev) =>
      prev.map((parcela, current) =>
        current === index ? { ...parcela, [field]: value } : parcela,
      ),
    );
  };

  const itensByVendaId = useMemo(() => {
    const grouped = new Map();
    for (const item of vendaItens) {
      const current = grouped.get(item.venda_id) || [];
      current.push(item);
      grouped.set(item.venda_id, current);
    }
    return grouped;
  }, [vendaItens]);

  const contaReceberByVendaId = useMemo(() => {
    const map = new Map();
    for (const conta of contasReceber) {
      if (conta.origem_tipo === "venda" && conta.origem_id) {
        map.set(conta.origem_id, conta);
      }
    }
    return map;
  }, [contasReceber]);

  const parcelasByContaId = useMemo(() => {
    const grouped = new Map();
    for (const parcela of contasReceberParcelas) {
      const current = grouped.get(parcela.conta_receber_id) || [];
      current.push(parcela);
      grouped.set(parcela.conta_receber_id, current);
    }
    return grouped;
  }, [contasReceberParcelas]);

  const detalhesByVendaId = useMemo(() => {
    const grouped = new Map();
    for (const detalhe of vendaDetalhes) {
      const current = grouped.get(detalhe.venda_id) || [];
      current.push(detalhe);
      grouped.set(detalhe.venda_id, current);
    }
    return grouped;
  }, [vendaDetalhes]);

  const historicoVendas = useMemo(
    () =>
      [...vendas]
        .sort(
          (a, b) =>
            new Date(b.data_venda || 0).getTime() - new Date(a.data_venda || 0).getTime(),
        )
        .map((venda) => {
          const itensVenda = (itensByVendaId.get(venda.id) || []).map((item) => {
            const insumo = insumosById.get(item.insumo_id);
            const unidade = unidadesById.get(String(item.unidade_id));
            const quantidadeInformada = toNumber(item.quantidade_informada);
            const precoUnitario = toNumber(item.preco_unitario);
            return {
              ...item,
              nome: insumo?.nome || "Produto removido",
              unidadeLabel:
                unidade?.label || (toNumber(item.kg_por_saco) > 0 ? "Saco" : "Quilograma"),
              quantidadeInformada,
              precoUnitario,
              total: quantidadeInformada * precoUnitario,
            };
          });

          const contaReceber = contaReceberByVendaId.get(venda.id);
          const parcelasVenda = (parcelasByContaId.get(contaReceber?.id) || []).sort(
            (a, b) => (Number(a.parcela_num) || 0) - (Number(b.parcela_num) || 0),
          );

          const ajustes = [
            ...(toNumber(venda.desconto_valor) > 0
              ? [
                {
                  tipo: "Desconto",
                  descricao: venda.desconto_descricao || venda.desconto_tipo || "Sem descrição",
                  valor: toNumber(venda.desconto_valor) * -1,
                  data_evento: venda.data_venda,
                },
              ]
              : []),
            ...(toNumber(venda.acrescimo_valor) > 0
              ? [
                {
                  tipo: "Valor adicional",
                  descricao: venda.acrescimo_descricao || venda.acrescimo_tipo || "Sem descrição",
                  valor: toNumber(venda.acrescimo_valor),
                  data_evento: venda.data_venda,
                },
              ]
              : []),
            ...(detalhesByVendaId.get(venda.id) || []).map((detalhe) => ({
              tipo: detalhe.tipo_evento || "Evento",
              descricao: detalhe.descricao || "Sem descrição",
              valor: toNumber(detalhe.valor),
              data_evento: detalhe.data_evento,
            })),
          ];

          const subtotalVenda = itensVenda.reduce((acc, item) => acc + item.total, 0);

          return {
            venda,
            orderCode: String(venda.id || "").slice(0, 8).toUpperCase(),
            clienteNome: clientesById.get(venda.cliente_id)?.nome || "-",
            itens: itensVenda,
            parcelas: parcelasVenda,
            ajustes,
            subtotal: subtotalVenda,
            descontoValor: toNumber(venda.desconto_valor),
            acrescimoValor: toNumber(venda.acrescimo_valor),
          };
        }),
    [
      vendas,
      itensByVendaId,
      insumosById,
      unidadesById,
      contaReceberByVendaId,
      parcelasByContaId,
      detalhesByVendaId,
      clientesById,
    ],
  );

  const infoItem = useMemo(
    () => itemComCalculo.find((item) => item.id === infoItemId) || null,
    [itemComCalculo, infoItemId],
  );

  const infoInsumo = infoItem?.insumo || null;

  const canSubmit =
    Boolean(clienteId) &&
    !(clienteBalcao && tipoPagamento === "A_PRAZO") &&
    itemComCalculo.every(
      (item) => item.insumo_id && item.quantidadeInformada > 0 && item.precoUnit > 0,
    ) &&
    (tipoPagamento !== "A_PRAZO" || parcelas.every((parcela) => toNumber(parcela.valor) > 0));

  const handleGenerateA4 = (resumo) => {
    if (typeof window === "undefined") return;

    const printWindow = window.open("", "_blank", "noopener,noreferrer,width=1000,height=780");
    if (!printWindow) return;

    const html = buildVendaA4Html({
      resumo,
      logoUrl: `${window.location.origin}/logotipo.jpg`,
    });

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!canSubmit) return;

    const dataEntrega = vendaLocal ? todayDate() : dataProgramadaEntrega || todayDate();
    const obsLimpa = String(obs || "").trim();
    const hasLocalMarker = obsLimpa.toLowerCase().includes(LOCAL_SALE_MARKER.toLowerCase());
    const obsFinal =
      vendaLocal && !hasLocalMarker
        ? [LOCAL_SALE_MARKER, obsLimpa].filter(Boolean).join(" | ")
        : obsLimpa;

    const resultado = await addVenda({
      cliente_id: clienteId,
      itens: itemComCalculo.map((item) => ({
        insumo_id: item.insumo_id,
        quantidade: item.quantidadeInformada,
        unidade_codigo: item.unidade_codigo,
        kg_por_saco: toNumber(item.kg_por_saco) || toNumber(item.insumo?.kg_por_saco) || 23,
        preco_unit: item.precoUnit,
      })),
      parcelas_qtd: tipoPagamento === "A_PRAZO" ? parcelasQtd : 1,
      obs: obsFinal,
      data_programada_entrega: dataEntrega,
      tipo_pagamento: tipoPagamento,
      forma_pagamento: formaPagamentoVista,
      desconto:
        toNumber(descontoValor) > 0
          ? {
            tipo: descontoTipo,
            valor: toNumber(descontoValor),
            descricao: descontoDescricao,
          }
          : null,
      acrescimo:
        toNumber(acrescimoValor) > 0
          ? {
            tipo: acrescimoTipo,
            valor: toNumber(acrescimoValor),
            descricao: acrescimoDescricao,
          }
          : null,
      parcelas_custom:
        tipoPagamento === "A_PRAZO"
          ? parcelas.map((parcela) => ({
            ...parcela,
            valor: toNumber(parcela.valor),
            vencimento: `${parcela.vencimento} 00:00:00`,
          }))
          : [],
    });

    if (!resultado?.vendaId) return;

    if (vendaLocal) {
      await confirmarEntregaVenda({
        venda_id: resultado.vendaId,
        data_entrega: dataEntrega,
        custos_extras: [],
      });
    }

    setClienteId("");
    setDataProgramadaEntrega(todayDate());
    setObs("");
    setVendaLocal(false);
    setItens([createItem()]);
    setDescontoTipo("VALOR");
    setDescontoValor("");
    setDescontoDescricao("");
    setAcrescimoTipo("VALOR");
    setAcrescimoValor("");
    setAcrescimoDescricao("");
    setTipoPagamento("A_VISTA");
    setFormaPagamentoVista("PIX");
    setParcelasQtd(1);
    setParcelas([]);
  };

  const infoSaldoKg = toNumber(infoInsumo?.saldo_kg);
  const infoKgPorSaco = toNumber(infoInsumo?.kg_por_saco) || 1;
  const infoSaldoSaco = infoKgPorSaco ? infoSaldoKg / infoKgPorSaco : 0;
  const infoCustoKg = toNumber(infoInsumo?.custo_medio_kg);
  const infoCustoSaco = infoCustoKg * infoKgPorSaco;

  return (
    <AppLayout>
      <PageHeader
        title="Nova Venda"
        subtitle="Coluna esquerda para cliente/comercial/pagamento e coluna direita para itens."
        action={
          <Button
            variant="outlined"
            startIcon={<HistoryIcon />}
            onClick={() => setHistoricoOpen(true)}
          >
            Histórico das vendas
          </Button>
        }
      />

      <Box component="form" onSubmit={handleSubmit}>
        <Grid container spacing={3} alignItems="flex-start">
          <Grid item xs={12} md={5}>
            <Stack spacing={2}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Cliente e Comercial
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <TextField
                      select
                      label="Cliente"
                      value={clienteId}
                      onChange={(event) => setClienteId(event.target.value)}
                      fullWidth
                      required
                    >
                      {clientes.map((cliente) => (
                        <MenuItem key={cliente.id} value={cliente.id}>
                          {cliente.nome}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Data programada de entrega"
                      type="date"
                      value={dataProgramadaEntrega}
                      onChange={(event) => setDataProgramadaEntrega(event.target.value)}
                      disabled={vendaLocal}
                      fullWidth
                      InputLabelProps={{ shrink: true }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={vendaLocal}
                          onChange={(event) => setVendaLocal(event.target.checked)}
                        />
                      }
                      label="Venda local"
                      sx={{ mt: { xs: 1, sm: 2 } }}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      label="Observação"
                      value={obs}
                      onChange={(event) => setObs(event.target.value)}
                      multiline
                      minRows={2}
                      fullWidth
                      placeholder="Ex.: retirar no balcão, horário combinado, instruções do pedido"
                    />
                  </Grid>
                </Grid>
                {vendaLocal ? (
                  <Alert sx={{ mt: 2 }} severity="info">
                    Venda local ativa: entrega programada para hoje e confirmação automática de entregue.
                  </Alert>
                ) : null}
              </Paper>

              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Pagamento
                </Typography>
                <Stack spacing={2}>
                  <TextField
                    select
                    label="Tipo"
                    value={tipoPagamento}
                    onChange={(event) => setTipoPagamento(event.target.value)}
                  >
                    <MenuItem value="A_VISTA">À vista</MenuItem>
                    <MenuItem value="A_PRAZO" disabled={clienteBalcao}>
                      A prazo
                    </MenuItem>
                  </TextField>

                  {clienteBalcao ? (
                    <Alert severity="warning">
                      Cliente Balcão só pode ser vendido à vista.
                    </Alert>
                  ) : null}

                  {tipoPagamento === "A_VISTA" ? (
                    <TextField
                      select
                      label="Forma"
                      value={formaPagamentoVista}
                      onChange={(event) => setFormaPagamentoVista(event.target.value)}
                    >
                      {formasPagamento.map((forma) => (
                        <MenuItem key={forma.codigo} value={forma.codigo}>
                          {forma.label}
                        </MenuItem>
                      ))}
                    </TextField>
                  ) : (
                    <>
                      <TextField
                        label="Quantidade de parcelas"
                        type="number"
                        value={parcelasQtd}
                        onChange={(event) =>
                          setParcelasQtd(Math.max(1, Number(event.target.value) || 1))
                        }
                      />
                      <Stack spacing={1}>
                        {parcelas.map((parcela, index) => (
                          <Grid container spacing={1} key={`parcela-${parcela.parcela_num}`}>
                            <Grid item xs={12} sm={2}>
                              <TextField
                                label="Nº"
                                value={parcela.parcela_num}
                                disabled
                                fullWidth
                              />
                            </Grid>
                            <Grid item xs={12} sm={4}>
                              <TextField
                                label="Vencimento"
                                type="date"
                                value={parcela.vencimento}
                                onChange={(event) =>
                                  handleParcelaChange(index, "vencimento", event.target.value)
                                }
                                InputLabelProps={{ shrink: true }}
                                fullWidth
                              />
                            </Grid>
                            <Grid item xs={12} sm={3}>
                              <TextField
                                label="Valor"
                                type="number"
                                value={parcela.valor}
                                onChange={(event) =>
                                  handleParcelaChange(index, "valor", event.target.value)
                                }
                                fullWidth
                              />
                            </Grid>
                            <Grid item xs={12} sm={3}>
                              <TextField
                                select
                                label="Forma"
                                value={parcela.forma_pagamento}
                                onChange={(event) =>
                                  handleParcelaChange(index, "forma_pagamento", event.target.value)
                                }
                                fullWidth
                              >
                                {formasPagamento.map((forma) => (
                                  <MenuItem key={forma.codigo} value={forma.codigo}>
                                    {forma.label}
                                  </MenuItem>
                                ))}
                              </TextField>
                            </Grid>
                          </Grid>
                        ))}
                      </Stack>
                    </>
                  )}
                </Stack>
              </Paper>

              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Desconto
                </Typography>
                <Grid container spacing={1.5}>
                  <Grid item xs={12} sm={4}>
                    <TextField
                      select
                      label="Tipo"
                      value={descontoTipo}
                      onChange={(event) => setDescontoTipo(event.target.value)}
                      fullWidth
                    >
                      <MenuItem value="VALOR">Valor</MenuItem>
                      <MenuItem value="PERCENTUAL">Percentual</MenuItem>
                    </TextField>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <TextField
                      label={descontoTipo === "PERCENTUAL" ? "Percentual" : "Valor"}
                      type="number"
                      value={descontoValor}
                      onChange={(event) => setDescontoValor(event.target.value)}
                      fullWidth
                    />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <TextField
                      label="Descrição"
                      value={descontoDescricao}
                      onChange={(event) => setDescontoDescricao(event.target.value)}
                      fullWidth
                    />
                  </Grid>
                </Grid>
              </Paper>

              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Valor Adicional
                </Typography>
                <Grid container spacing={1.5}>
                  <Grid item xs={12} sm={4}>
                    <TextField
                      select
                      label="Tipo"
                      value={acrescimoTipo}
                      onChange={(event) => setAcrescimoTipo(event.target.value)}
                      fullWidth
                    >
                      <MenuItem value="VALOR">Valor</MenuItem>
                      <MenuItem value="PERCENTUAL">Percentual</MenuItem>
                    </TextField>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <TextField
                      label={acrescimoTipo === "PERCENTUAL" ? "Percentual" : "Valor"}
                      type="number"
                      value={acrescimoValor}
                      onChange={(event) => setAcrescimoValor(event.target.value)}
                      fullWidth
                    />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <TextField
                      label="Descrição"
                      value={acrescimoDescricao}
                      onChange={(event) => setAcrescimoDescricao(event.target.value)}
                      fullWidth
                    />
                  </Grid>
                </Grid>
              </Paper>

              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Resumo da Venda
                </Typography>
                <Stack spacing={0.8}>
                  <Typography variant="body2">Subtotal: {formatCurrency(subtotal)}</Typography>
                  <Typography variant="body2">Desconto: {formatCurrency(descontoAbs)}</Typography>
                  <Typography variant="body2">Adicional: {formatCurrency(acrescimoAbs)}</Typography>
                  <Divider sx={{ my: 0.8 }} />
                  <Typography variant="h6" color="primary">
                    Total final: {formatCurrency(totalFinal)}
                  </Typography>
                </Stack>
                <Button
                  type="submit"
                  variant="contained"
                  size="large"
                  fullWidth
                  disabled={!canSubmit}
                  sx={{ mt: 2 }}
                >
                  Registrar venda ({formatCurrency(totalFinal)})
                </Button>
              </Paper>
            </Stack>
          </Grid>

          <Grid item xs={12} md={7}>
            <Paper sx={{ p: 3 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6">Itens da Venda</Typography>
                <Button
                  variant="outlined"
                  startIcon={<AddIcon />}
                  onClick={() => setItens((prev) => [...prev, createItem()])}
                >
                  Adicionar item
                </Button>
              </Stack>

              <Stack spacing={2}>
                {itemComCalculo.map((item) => (
                  <Paper key={item.id} variant="outlined" sx={{ p: 2 }}>
                    <Grid container spacing={1.5} alignItems="center">
                      <Grid item xs={12} md={5}>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <IconButton
                            size="small"
                            onMouseEnter={(event) => {
                              setInfoAnchorEl(event.currentTarget);
                              setInfoItemId(item.id);
                            }}
                            onMouseLeave={() => {
                              setInfoAnchorEl(null);
                              setInfoItemId(null);
                            }}
                            onClick={(event) => {
                              setInfoAnchorEl(event.currentTarget);
                              setInfoItemId(item.id);
                            }}
                          >
                            <InfoOutlinedIcon fontSize="small" />
                          </IconButton>
                          <TextField
                            select
                            label="Produto"
                            value={item.insumo_id}
                            onChange={(event) =>
                              handleItemChange(item.id, "insumo_id", event.target.value)
                            }
                            fullWidth
                          >
                            {insumosVendaveis.map((insumo) => (
                              <MenuItem key={insumo.id} value={insumo.id}>
                                {insumo.nome}
                              </MenuItem>
                            ))}
                          </TextField>
                        </Stack>
                      </Grid>

                      <Grid item xs={12} md={2}>
                        <TextField
                          select
                          label="Unidade"
                          value={item.unidade_codigo}
                          onChange={(event) =>
                            handleItemChange(item.id, "unidade_codigo", event.target.value)
                          }
                          fullWidth
                        >
                          {unidades.map((unidade) => (
                            <MenuItem key={unidade.codigo} value={unidade.codigo}>
                              {unidade.label}
                            </MenuItem>
                          ))}
                        </TextField>
                      </Grid>

                      <Grid item xs={12} md={2}>
                        <TextField
                          label="Quantidade"
                          type="number"
                          value={item.quantidade}
                          onChange={(event) =>
                            handleItemChange(item.id, "quantidade", event.target.value)
                          }
                          fullWidth
                        />
                      </Grid>

                      <Grid item xs={12} md={2}>
                        <TextField
                          label={item.unidade_codigo === "SACO" ? "Preço por saco" : "Preço por kg"}
                          type="number"
                          value={item.preco_unit}
                          onChange={(event) =>
                            handleItemChange(item.id, "preco_unit", event.target.value)
                          }
                          fullWidth
                        />
                      </Grid>

                      <Grid item xs={8} md={1}>
                        <Stack spacing={0.6} alignItems={{ xs: "flex-start", md: "flex-end" }}>
                          <Typography variant="body2" fontWeight={700}>
                            {formatCurrency(item.total)}
                          </Typography>
                          <IconButton
                            onClick={() =>
                              setItens((prev) =>
                                prev.length > 1 ? prev.filter((row) => row.id !== item.id) : prev,
                              )
                            }
                            disabled={itens.length <= 1}
                          >
                            <DeleteOutlineIcon />
                          </IconButton>
                        </Stack>
                      </Grid>
                    </Grid>
                  </Paper>
                ))}
              </Stack>
            </Paper>
          </Grid>
        </Grid>
      </Box>

      <Popover
        open={Boolean(infoAnchorEl && infoInsumo)}
        anchorEl={infoAnchorEl}
        onClose={() => {
          setInfoAnchorEl(null);
          setInfoItemId(null);
        }}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        transformOrigin={{ vertical: "top", horizontal: "left" }}
        disableRestoreFocus
        PaperProps={{ sx: { p: 2, minWidth: 300, pointerEvents: "none" } }}
      >
        {infoInsumo ? (
          <Stack spacing={0.7}>
            <Typography variant="subtitle2" fontWeight={700}>
              {infoInsumo.nome}
            </Typography>
            <Typography variant="body2">
              Estoque Atual Kg: {infoSaldoKg.toFixed(2)} | Custo por Kg: {formatCurrency(infoCustoKg)}
            </Typography>
            <Typography variant="body2">
              Estoque Atual Saco: {infoSaldoSaco.toFixed(2)} | Custo por Saco: {formatCurrency(infoCustoSaco)}
            </Typography>
            <Typography variant="body2">
              Unidade Padrão: {unidades.find((u) => u.codigo === infoInsumo.unidade_codigo)?.label || infoInsumo.unidade_codigo || "-"}
            </Typography>
          </Stack>
        ) : null}
      </Popover>

      <Drawer
        anchor="right"
        open={historicoOpen}
        onClose={() => setHistoricoOpen(false)}
        sx={{ zIndex: (theme) => theme.zIndex.tooltip + 1 }}
        PaperProps={{
          sx: {
            width: { xs: "100%", md: "30vw" },
            minWidth: { md: 360 },
            height: "100vh",
            p: 2.5,
          },
        }}
      >
        <Typography variant="h6" fontWeight={700} gutterBottom>
          Histórico das vendas
        </Typography>
        <Typography variant="body2" color="text.secondary" mb={2}>
          Visão macro dos lançamentos com geração de PDF A4 da ordem de venda.
        </Typography>

        <Stack spacing={1.5} sx={{ overflowY: "auto", pr: 0.5 }}>
          {historicoVendas.map((resumo) => (
            <Paper key={resumo.venda.id} variant="outlined" sx={{ p: 1.5 }}>
              <Stack spacing={1}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography fontWeight={700}>Ordem #{resumo.orderCode}</Typography>
                  <Chip
                    size="small"
                    label={resumo.venda.status_entrega || "PENDENTE"}
                    color={resumo.venda.status_entrega === "ENTREGUE" ? "success" : "warning"}
                  />
                </Stack>
                <Typography variant="body2">Cliente: {resumo.clienteNome}</Typography>
                <Typography variant="body2">Data: {formatDate(resumo.venda.data_venda)}</Typography>
                <Typography variant="body2">Total: {formatCurrency(resumo.venda.valor_total)}</Typography>
                <Typography variant="body2">
                  Pagamento: {resumo.venda.tipo_pagamento || "A_VISTA"}
                </Typography>

                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<PictureAsPdfIcon />}
                  onClick={() => handleGenerateA4(resumo)}
                >
                  Gerar PDF A4
                </Button>
              </Stack>
            </Paper>
          ))}

          {!historicoVendas.length ? (
            <Typography variant="body2" color="text.secondary">
              Nenhuma venda registrada até o momento.
            </Typography>
          ) : null}
        </Stack>
      </Drawer>
    </AppLayout>
  );
};

export default NovaVendaPage;
