import {
  Box,
  Button,
  Divider,
  Grid,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import { useEffect, useMemo, useState } from "react";
import AppLayout from "../../components/template/AppLayout";
import PageHeader from "../../components/atomic/PageHeader";
import { useDataStore } from "../../hooks/useDataStore";
import { formatCurrency } from "../../utils/format";

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

const NovaVendaPage = () => {
  const clientes = useDataStore((state) => state.clientes);
  const insumos = useDataStore((state) => state.insumos);
  const auxUnidades = useDataStore((state) => state.auxUnidades);
  const auxFormasPagamento = useDataStore((state) => state.auxFormasPagamento);
  const addVenda = useDataStore((state) => state.addVenda);

  const [clienteId, setClienteId] = useState("");
  const [dataProgramadaEntrega, setDataProgramadaEntrega] = useState(todayDate());
  const [obs, setObs] = useState("");

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

  const insumosVendaveis = useMemo(
    () => insumos.filter((insumo) => Boolean(insumo.pode_ser_vendido)),
    [insumos],
  );

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
    if (tipoPagamento !== "A_PRAZO") {
      setParcelas([]);
      return;
    }

    const quantidade = Math.max(1, Number(parcelasQtd) || 1);
    const valorBase = quantidade ? Number((totalFinal / quantidade).toFixed(2)) : 0;
    const base = Array.from({ length: quantidade }, (_, index) => ({
      parcela_num: index + 1,
      valor: index === quantidade - 1
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
          const custoMedio = toNumber(insumo?.custo_medio_kg);
          const precoSugerido =
            unidadeCodigo === "SACO"
              ? Number((custoMedio * toNumber(kgPorSaco)).toFixed(2))
              : Number(custoMedio.toFixed(2));

          return {
            ...item,
            insumo_id: value,
            unidade_codigo: unidadeCodigo,
            kg_por_saco: kgPorSaco,
            preco_unit: String(precoSugerido || 0),
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

  const canSubmit =
    Boolean(clienteId) &&
    itemComCalculo.every(
      (item) => item.insumo_id && item.quantidadeInformada > 0 && item.precoUnit > 0,
    ) &&
    (tipoPagamento !== "A_PRAZO" || parcelas.every((parcela) => toNumber(parcela.valor) > 0));

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!canSubmit) return;

    await addVenda({
      cliente_id: clienteId,
      itens: itemComCalculo.map((item) => ({
        insumo_id: item.insumo_id,
        quantidade: item.quantidadeInformada,
        unidade_codigo: item.unidade_codigo,
        kg_por_saco: toNumber(item.kg_por_saco) || 23,
        preco_unit: item.precoUnit,
      })),
      parcelas_qtd: tipoPagamento === "A_PRAZO" ? parcelasQtd : 1,
      obs,
      data_programada_entrega: dataProgramadaEntrega || todayDate(),
      tipo_pagamento: tipoPagamento,
      forma_pagamento: formaPagamentoVista,
      desconto:
        toNumber(descontoValor) > 0
          ? {
            tipo: descontoTipo === "%" ? "PERCENTUAL" : descontoTipo,
            valor: toNumber(descontoValor),
            descricao: descontoDescricao,
          }
          : null,
      acrescimo:
        toNumber(acrescimoValor) > 0
          ? {
            tipo: acrescimoTipo === "%" ? "PERCENTUAL" : acrescimoTipo,
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

    setClienteId("");
    setDataProgramadaEntrega(todayDate());
    setObs("");
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

  return (
    <AppLayout>
      <PageHeader
        title="Nova Venda"
        subtitle="Organize cliente, itens, entrega e pagamento em uma única operação."
      />

      <Box component="form" onSubmit={handleSubmit}>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                1. Cliente e Entrega
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
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
                <Grid item xs={12} md={3}>
                  <TextField
                    label="Data programada de entrega"
                    type="date"
                    value={dataProgramadaEntrega}
                    onChange={(event) => setDataProgramadaEntrega(event.target.value)}
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid item xs={12} md={3}>
                  <TextField
                    label="Observações"
                    value={obs}
                    onChange={(event) => setObs(event.target.value)}
                    fullWidth
                  />
                </Grid>
              </Grid>
            </Paper>
          </Grid>

          <Grid item xs={12}>
            <Paper sx={{ p: 3 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6">2. Itens Vendidos</Typography>
                <Button
                  variant="outlined"
                  startIcon={<AddIcon />}
                  onClick={() => setItens((prev) => [...prev, createItem()])}
                >
                  Adicionar item
                </Button>
              </Stack>

              <Stack spacing={2}>
                {itemComCalculo.map((item, index) => (
                  <Paper key={item.id} variant="outlined" sx={{ p: 2 }}>
                    <Grid container spacing={2} alignItems="center">
                      <Grid item xs={12} md={4}>
                        <TextField
                          select
                          label="Insumo"
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
                      <Grid item xs={12} md={1}>
                        <Typography variant="body2" fontWeight={700}>
                          {formatCurrency(item.total)}
                        </Typography>
                      </Grid>
                      <Grid item xs={12} md={1}>
                        <IconButton
                          onClick={() =>
                            setItens((prev) =>
                              prev.length > 1
                                ? prev.filter((row) => row.id !== item.id)
                                : prev,
                            )
                          }
                          disabled={itens.length <= 1}
                        >
                          <DeleteOutlineIcon />
                        </IconButton>
                      </Grid>
                    </Grid>
                  </Paper>
                ))}
              </Stack>
            </Paper>
          </Grid>

          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3, height: "100%" }}>
              <Typography variant="h6" gutterBottom>
                3. Ajustes Comerciais
              </Typography>
              <Stack spacing={2}>
                <Typography fontWeight={600}>Desconto</Typography>
                <Grid container spacing={1}>
                  <Grid item xs={12} md={4}>
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
                  <Grid item xs={12} md={4}>
                    <TextField
                      label={descontoTipo === "PERCENTUAL" ? "Percentual" : "Valor"}
                      type="number"
                      value={descontoValor}
                      onChange={(event) => setDescontoValor(event.target.value)}
                      fullWidth
                    />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <TextField
                      label="Descrição"
                      value={descontoDescricao}
                      onChange={(event) => setDescontoDescricao(event.target.value)}
                      fullWidth
                    />
                  </Grid>
                </Grid>

                <Typography fontWeight={600}>Valor adicional</Typography>
                <Grid container spacing={1}>
                  <Grid item xs={12} md={4}>
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
                  <Grid item xs={12} md={4}>
                    <TextField
                      label={acrescimoTipo === "PERCENTUAL" ? "Percentual" : "Valor"}
                      type="number"
                      value={acrescimoValor}
                      onChange={(event) => setAcrescimoValor(event.target.value)}
                      fullWidth
                    />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <TextField
                      label="Descrição"
                      value={acrescimoDescricao}
                      onChange={(event) => setAcrescimoDescricao(event.target.value)}
                      fullWidth
                    />
                  </Grid>
                </Grid>

                <Divider />

                <Typography variant="body2">Subtotal: {formatCurrency(subtotal)}</Typography>
                <Typography variant="body2">Desconto: {formatCurrency(descontoAbs)}</Typography>
                <Typography variant="body2">Adicional: {formatCurrency(acrescimoAbs)}</Typography>
                <Typography variant="h6" color="primary">
                  Total final: {formatCurrency(totalFinal)}
                </Typography>
              </Stack>
            </Paper>
          </Grid>

          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3, height: "100%" }}>
              <Typography variant="h6" gutterBottom>
                4. Pagamento
              </Typography>
              <Stack spacing={2}>
                <TextField
                  select
                  label="Tipo"
                  value={tipoPagamento}
                  onChange={(event) => setTipoPagamento(event.target.value)}
                >
                  <MenuItem value="A_VISTA">À vista</MenuItem>
                  <MenuItem value="A_PRAZO">A prazo</MenuItem>
                </TextField>

                {tipoPagamento === "A_VISTA" ? (
                  <TextField
                    select
                    label="Forma de pagamento"
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
                      onChange={(event) => setParcelasQtd(Math.max(1, Number(event.target.value) || 1))}
                    />
                    <Stack spacing={1}>
                      {parcelas.map((parcela, index) => (
                        <Grid container spacing={1} key={`parcela-${parcela.parcela_num}`}>
                          <Grid item xs={12} md={2}>
                            <TextField
                              label="Parcela"
                              value={parcela.parcela_num}
                              disabled
                              fullWidth
                            />
                          </Grid>
                          <Grid item xs={12} md={3}>
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
                          <Grid item xs={12} md={3}>
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
                          <Grid item xs={12} md={2}>
                            <TextField
                              select
                              label="Método"
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
                          <Grid item xs={12} md={2}>
                            <TextField
                              select
                              label="Status"
                              value={parcela.status}
                              onChange={(event) =>
                                handleParcelaChange(index, "status", event.target.value)
                              }
                              fullWidth
                            >
                              <MenuItem value="ABERTA">Programada</MenuItem>
                              <MenuItem value="RECEBIDA">Recebida</MenuItem>
                            </TextField>
                          </Grid>
                        </Grid>
                      ))}
                    </Stack>
                  </>
                )}
              </Stack>
            </Paper>
          </Grid>

          <Grid item xs={12}>
            <Stack direction="row" justifyContent="flex-end">
              <Button type="submit" variant="contained" size="large" disabled={!canSubmit}>
                Registrar venda ({formatCurrency(totalFinal)})
              </Button>
            </Stack>
          </Grid>
        </Grid>
      </Box>
    </AppLayout>
  );
};

export default NovaVendaPage;
