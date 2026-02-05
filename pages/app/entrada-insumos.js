import {
  Box,
  Button,
  Divider,
  Grid,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useMemo, useState } from "react";
import AppLayout from "../../components/template/AppLayout";
import PageHeader from "../../components/atomic/PageHeader";
import { useDataStore } from "../../hooks/useDataStore";
import { formatCurrency, formatDate } from "../../utils/format";

const parseNumber = (value) => Number(String(value).replace(",", ".")) || 0;

const buildParcelasVencimentos = (qtd, previous = []) =>
  Array.from({ length: qtd }, (_, index) => previous[index] || "");

const buildParcelasValores = (total, qtd) => {
  const totalNumber = parseNumber(total);
  const qtdNumber = Math.max(1, Number(qtd) || 1);
  const valorBase = totalNumber / qtdNumber;
  return Array.from({ length: qtdNumber }, (_, index) => {
    if (index === qtdNumber - 1) {
      const acumulado = Number((valorBase * (qtdNumber - 1)).toFixed(2));
      return Number((totalNumber - acumulado).toFixed(2));
    }
    return Number(valorBase.toFixed(2));
  });
};

const createExtraCost = () => ({
  id: `extra-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  fornecedor_id: "",
  valor_total: "",
  descricao: "",
  status_pagamento: "A_PRAZO",
  parcelas_qtd: 1,
  parcelas_vencimentos: [""],
});

const EntradaInsumosPage = () => {
  const fornecedores = useDataStore((state) => state.fornecedores);
  const insumos = useDataStore((state) => state.insumos);
  const entradas = useDataStore((state) => state.entradasInsumos);
  const movInsumos = useDataStore((state) => state.movInsumos);
  const contasPagar = useDataStore((state) => state.contasPagar);
  const contasPagarParcelas = useDataStore(
    (state) => state.contasPagarParcelas,
  );
  const addEntradaInsumos = useDataStore((state) => state.addEntradaInsumos);

  const [fornecedorId, setFornecedorId] = useState("");
  const [insumoId, setInsumoId] = useState("");
  const [modoEntrada, setModoEntrada] = useState("KG");
  const [quantidadeKg, setQuantidadeKg] = useState("");
  const [kgPorSacoEntrada, setKgPorSacoEntrada] = useState("");
  const [quantidadeSacos, setQuantidadeSacos] = useState("");
  const [valorTotal, setValorTotal] = useState("");
  const [parcelasQtd, setParcelasQtd] = useState(1);
  const [parcelasValores, setParcelasValores] = useState([""]);
  const [parcelasVencimentos, setParcelasVencimentos] = useState([""]);
  const [parcelasStatus, setParcelasStatus] = useState(["A_PRAZO"]);
  const [custosExtras, setCustosExtras] = useState([]);
  const [obs, setObs] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const insumoSelecionado = useMemo(
    () => insumos.find((insumo) => insumo.id === insumoId),
    [insumoId, insumos],
  );

  const kgPorSaco =
    parseNumber(kgPorSacoEntrada) ||
    Number(insumoSelecionado?.kg_por_saco) ||
    0;
  const quantidadeInformadaKg = parseNumber(quantidadeKg);
  const quantidadeInformadaSacos = parseNumber(quantidadeSacos);
  const quantidadeConvertidaKg =
    modoEntrada === "SACO"
      ? quantidadeInformadaSacos * kgPorSaco
      : quantidadeInformadaKg;

  const totalParcelas = useMemo(
    () =>
      parcelasValores.reduce(
        (total, parcela) => total + parseNumber(parcela),
        0,
      ),
    [parcelasValores],
  );

  const totalValor = parseNumber(valorTotal);
  const parcelasDivergentes = Math.abs(totalParcelas - totalValor) > 0.009;
  const custoUnitarioEmKg = quantidadeConvertidaKg
    ? totalValor / quantidadeConvertidaKg
    : 0;

  const entradasComMovimento = useMemo(
    () =>
      entradas.map((entrada) => {
        const contaDaEntrada = contasPagar.find(
          (conta) =>
            conta.origem_tipo === "entrada_insumos" &&
            conta.origem_id === entrada.id,
        );
        const movimentosDaEntrada = movInsumos.filter(
          (movimento) =>
            movimento.referencia_tipo === "entrada_insumos" &&
            movimento.referencia_id === entrada.id,
        );

        const quantidadeMovimentadaKg = movimentosDaEntrada.reduce(
          (total, movimento) => total + parseNumber(movimento.quantidade),
          0,
        );
        const custoTotalMovimentado = movimentosDaEntrada.reduce(
          (total, movimento) => total + parseNumber(movimento.custo_total),
          0,
        );
        const custoUnitarioMovimentado = quantidadeMovimentadaKg
          ? custoTotalMovimentado / quantidadeMovimentadaKg
          : 0;

        return {
          ...entrada,
          quantidadeMovimentadaKg,
          custoUnitarioMovimentado,
          custoTotalMovimentado,
          parcelas: contasPagarParcelas
            .filter(
              (parcela) =>
                contaDaEntrada && parcela.conta_pagar_id === contaDaEntrada.id,
            )
            .sort((a, b) => Number(a.parcela_num) - Number(b.parcela_num)),
        };
      }),
    [contasPagar, contasPagarParcelas, entradas, movInsumos],
  );

  const handleChangeParcelasQtd = (event) => {
    const nextQtd = Math.max(1, Number(event.target.value) || 1);
    setParcelasQtd(nextQtd);
    setParcelasValores((prev) =>
      Array.from({ length: nextQtd }, (_, index) => prev[index] || ""),
    );
    setParcelasVencimentos((prev) => buildParcelasVencimentos(nextQtd, prev));
    setParcelasStatus((prev) =>
      Array.from({ length: nextQtd }, (_, index) => prev[index] || "A_PRAZO"),
    );
  };

  const handleChangeParcela = (index, value) => {
    setParcelasValores((prev) =>
      prev.map((parcela, currentIndex) =>
        currentIndex === index ? value : parcela,
      ),
    );
  };

  const handleChangeVencimento = (index, value) => {
    setParcelasVencimentos((prev) =>
      prev.map((vencimento, currentIndex) =>
        currentIndex === index ? value : vencimento,
      ),
    );
  };

  const handleChangeStatusParcela = (index, value) => {
    setParcelasStatus((prev) =>
      prev.map((status, currentIndex) =>
        currentIndex === index ? value : status,
      ),
    );
  };

  const handleAddCustoExtra = () => {
    setCustosExtras((prev) => [...prev, createExtraCost()]);
  };

  const handleUpdateCustoExtra = (id, key, value) => {
    setCustosExtras((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        if (key === "parcelas_qtd") {
          const parcelasQtdNext = Math.max(1, Number(value) || 1);
          return {
            ...item,
            parcelas_qtd: parcelasQtdNext,
            parcelas_vencimentos: buildParcelasVencimentos(
              parcelasQtdNext,
              item.parcelas_vencimentos,
            ),
          };
        }
        return { ...item, [key]: value };
      }),
    );
  };

  const handleUpdateVencimentoCustoExtra = (id, index, value) => {
    setCustosExtras((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        return {
          ...item,
          parcelas_vencimentos: item.parcelas_vencimentos.map(
            (vencimento, currentIndex) =>
              currentIndex === index ? value : vencimento,
          ),
        };
      }),
    );
  };

  const handleRemoveCustoExtra = (id) => {
    setCustosExtras((prev) => prev.filter((item) => item.id !== id));
  };

  const canSubmitEntradaBase =
    fornecedorId &&
    insumoId &&
    quantidadeConvertidaKg > 0 &&
    totalValor > 0 &&
    parcelasValores.every((parcela) => parseNumber(parcela) > 0) &&
    parcelasVencimentos.every((vencimento) => Boolean(vencimento)) &&
    !parcelasDivergentes;

  const custosExtrasValidos = custosExtras.every((item) => {
    const valorExtra = parseNumber(item.valor_total);
    const parcelasValoresExtra = buildParcelasValores(
      valorExtra,
      item.parcelas_qtd,
    );
    return (
      item.fornecedor_id &&
      valorExtra > 0 &&
      Boolean(item.descricao) &&
      parcelasValoresExtra.every((valor) => valor > 0) &&
      item.parcelas_vencimentos.every((vencimento) => Boolean(vencimento))
    );
  });

  const canSubmit = canSubmitEntradaBase && custosExtrasValidos;

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!canSubmit) {
      setErrorMessage(
        "Revise os dados da entrada, parcelas e custos extras para continuar.",
      );
      return;
    }

    setErrorMessage("");

    await addEntradaInsumos({
      fornecedor_id: fornecedorId,
      insumo_id: insumoId,
      unidade_entrada: modoEntrada === "SACO" ? "saco" : "kg",
      kg_por_saco_entrada: modoEntrada === "SACO" ? kgPorSaco : null,
      quantidade:
        modoEntrada === "SACO"
          ? quantidadeInformadaSacos
          : quantidadeInformadaKg,
      valor_total: totalValor,
      parcelas_qtd: parcelasQtd,
      parcelas_valores: parcelasValores.map(parseNumber),
      parcelas_vencimentos: parcelasVencimentos.map((vencimento) =>
        new Date(vencimento).toISOString(),
      ),
      parcelas_status: parcelasStatus,
      custos_extras: custosExtras.map((item) => ({
        fornecedor_id: item.fornecedor_id,
        valor_total: parseNumber(item.valor_total),
        descricao: item.descricao,
        status_pagamento: item.status_pagamento,
        parcelas_qtd: item.parcelas_qtd,
      })),
      obs,
    });

    setFornecedorId("");
    setInsumoId("");
    setModoEntrada("KG");
    setQuantidadeKg("");
    setKgPorSacoEntrada("");
    setQuantidadeSacos("");
    setValorTotal("");
    setParcelasQtd(1);
    setParcelasValores([""]);
    setParcelasVencimentos([""]);
    setParcelasStatus(["A_PRAZO"]);
    setCustosExtras([]);
    setObs("");
  };

  return (
    <AppLayout>
      <PageHeader
        title="Entrada de Insumos"
        subtitle="Registre compras em KG/Saco e atualize estoque sempre em KG."
      />
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Nova entrada
            </Typography>
            <Box component="form" onSubmit={handleSubmit}>
              <Stack spacing={2}>
                <TextField
                  select
                  label="Fornecedor"
                  value={fornecedorId}
                  onChange={(event) => setFornecedorId(event.target.value)}
                  required
                >
                  {fornecedores.map((fornecedor) => (
                    <MenuItem key={fornecedor.id} value={fornecedor.id}>
                      {fornecedor.razao_social}
                    </MenuItem>
                  ))}
                </TextField>

                <TextField
                  select
                  label="Insumo"
                  value={insumoId}
                  onChange={(event) => setInsumoId(event.target.value)}
                  required
                >
                  {insumos.map((insumo) => (
                    <MenuItem key={insumo.id} value={insumo.id}>
                      {insumo.nome}
                    </MenuItem>
                  ))}
                </TextField>

                <TextField
                  select
                  label="Flag obrigatório"
                  value={modoEntrada}
                  onChange={(event) => setModoEntrada(event.target.value)}
                  required
                >
                  <MenuItem value="KG">Entrar em KG</MenuItem>
                  <MenuItem value="SACO">Entrar em Saco</MenuItem>
                </TextField>

                {modoEntrada === "KG" ? (
                  <TextField
                    label="Quantidade em KG"
                    type="number"
                    value={quantidadeKg}
                    onChange={(event) => setQuantidadeKg(event.target.value)}
                    inputProps={{ min: 0, step: "0.01" }}
                    required
                  />
                ) : (
                  <>
                    <TextField
                      label="Quantos KG tem cada saco"
                      type="number"
                      value={kgPorSacoEntrada}
                      onChange={(event) =>
                        setKgPorSacoEntrada(event.target.value)
                      }
                      inputProps={{ min: 0, step: "0.01" }}
                      required
                    />
                    <TextField
                      label="Quantidade de sacos"
                      type="number"
                      value={quantidadeSacos}
                      onChange={(event) =>
                        setQuantidadeSacos(event.target.value)
                      }
                      inputProps={{ min: 0, step: "0.01" }}
                      required
                    />
                  </>
                )}

                <Typography variant="caption" color="text.secondary">
                  Conversão para banco (sempre KG):{" "}
                  {quantidadeConvertidaKg.toFixed(2)} kg
                </Typography>

                <TextField
                  label="Valor total"
                  type="number"
                  value={valorTotal}
                  onChange={(event) => setValorTotal(event.target.value)}
                  inputProps={{ min: 0, step: "0.01" }}
                  required
                />

                <Typography variant="caption" color="text.secondary">
                  Valor unitário em KG: {formatCurrency(totalValor)} ÷{" "}
                  {quantidadeConvertidaKg.toFixed(2)} kg ={" "}
                  {formatCurrency(custoUnitarioEmKg)}
                </Typography>

                <TextField
                  label="Quantidade de Parcelas"
                  type="number"
                  value={parcelasQtd}
                  onChange={handleChangeParcelasQtd}
                  inputProps={{ min: 1, step: 1 }}
                  required
                />

                <Stack spacing={1}>
                  {parcelasValores.map((parcela, index) => {
                    const parcelaNum = index + 1;
                    return (
                      <Grid container spacing={1} key={`parcela-${parcelaNum}`}>
                        <Grid item xs={12} sm={4}>
                          <TextField
                            label={`Valor parcela ${parcelaNum}`}
                            type="number"
                            value={parcela}
                            onChange={(event) =>
                              handleChangeParcela(index, event.target.value)
                            }
                            inputProps={{ min: 0, step: "0.01" }}
                            fullWidth
                            required
                          />
                        </Grid>
                        <Grid item xs={12} sm={4}>
                          <TextField
                            label={`Vencimento ${parcelaNum}`}
                            type="date"
                            value={parcelasVencimentos[index] || ""}
                            onChange={(event) =>
                              handleChangeVencimento(index, event.target.value)
                            }
                            fullWidth
                            InputLabelProps={{ shrink: true }}
                            required
                          />
                        </Grid>
                        <Grid item xs={12} sm={4}>
                          <TextField
                            select
                            label="Status pagamento"
                            value={parcelasStatus[index] || "A_PRAZO"}
                            onChange={(event) =>
                              handleChangeStatusParcela(
                                index,
                                event.target.value,
                              )
                            }
                            fullWidth
                            required
                          >
                            <MenuItem value="A_PRAZO">
                              A prazo (não pago)
                            </MenuItem>
                            <MenuItem value="PAGO">Pago</MenuItem>
                          </TextField>
                        </Grid>
                      </Grid>
                    );
                  })}
                </Stack>

                <Typography
                  variant="body2"
                  color={parcelasDivergentes ? "error.main" : "text.secondary"}
                >
                  Soma das parcelas: {formatCurrency(totalParcelas)} • Total
                  informado: {formatCurrency(totalValor)}
                </Typography>

                <Divider />

                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="center"
                >
                  <Typography variant="subtitle1">
                    Custos Extras (opcional)
                  </Typography>
                  <Button variant="outlined" onClick={handleAddCustoExtra}>
                    + Adicionar custos extras
                  </Button>
                </Stack>

                <Stack spacing={2}>
                  {custosExtras.map((item, index) => {
                    const parcelasValoresExtra = buildParcelasValores(
                      item.valor_total,
                      item.parcelas_qtd,
                    );
                    return (
                      <Paper key={item.id} variant="outlined" sx={{ p: 2 }}>
                        <Stack spacing={1.5}>
                          <Typography variant="subtitle2">
                            Custo extra #{index + 1}
                          </Typography>
                          <Grid container spacing={1}>
                            <Grid item xs={12} sm={6}>
                              <TextField
                                select
                                label="Fornecedor"
                                value={item.fornecedor_id}
                                onChange={(event) =>
                                  handleUpdateCustoExtra(
                                    item.id,
                                    "fornecedor_id",
                                    event.target.value,
                                  )
                                }
                                fullWidth
                                required
                              >
                                {fornecedores.map((fornecedor) => (
                                  <MenuItem
                                    key={fornecedor.id}
                                    value={fornecedor.id}
                                  >
                                    {fornecedor.razao_social}
                                  </MenuItem>
                                ))}
                              </TextField>
                            </Grid>
                            <Grid item xs={12} sm={6}>
                              <TextField
                                label="Valor total"
                                type="number"
                                value={item.valor_total}
                                onChange={(event) =>
                                  handleUpdateCustoExtra(
                                    item.id,
                                    "valor_total",
                                    event.target.value,
                                  )
                                }
                                inputProps={{ min: 0, step: "0.01" }}
                                fullWidth
                                required
                              />
                            </Grid>
                            <Grid item xs={12}>
                              <TextField
                                label="Descrição"
                                value={item.descricao}
                                onChange={(event) =>
                                  handleUpdateCustoExtra(
                                    item.id,
                                    "descricao",
                                    event.target.value,
                                  )
                                }
                                fullWidth
                                required
                              />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                              <TextField
                                select
                                label="Status pagamento"
                                value={item.status_pagamento}
                                onChange={(event) =>
                                  handleUpdateCustoExtra(
                                    item.id,
                                    "status_pagamento",
                                    event.target.value,
                                  )
                                }
                                fullWidth
                                required
                              >
                                <MenuItem value="A_PRAZO">
                                  A prazo (não pago)
                                </MenuItem>
                                <MenuItem value="PAGO">Pago</MenuItem>
                              </TextField>
                            </Grid>
                            <Grid item xs={12} sm={6}>
                              <TextField
                                label="Quantidade de parcelas"
                                type="number"
                                value={item.parcelas_qtd}
                                onChange={(event) =>
                                  handleUpdateCustoExtra(
                                    item.id,
                                    "parcelas_qtd",
                                    event.target.value,
                                  )
                                }
                                inputProps={{ min: 1, step: 1 }}
                                fullWidth
                                required
                              />
                            </Grid>
                          </Grid>

                          <Stack spacing={1}>
                            {parcelasValoresExtra.map(
                              (valorParcela, parcelaIndex) => (
                                <Grid
                                  container
                                  spacing={1}
                                  key={`${item.id}-${parcelaIndex}`}
                                >
                                  <Grid item xs={12} sm={5}>
                                    <TextField
                                      label={`Valor parcela ${parcelaIndex + 1}`}
                                      value={formatCurrency(valorParcela)}
                                      fullWidth
                                      disabled
                                    />
                                  </Grid>
                                  <Grid item xs={12} sm={7}>
                                    <TextField
                                      label={`Vencimento parcela ${parcelaIndex + 1}`}
                                      type="date"
                                      value={
                                        item.parcelas_vencimentos[
                                          parcelaIndex
                                        ] || ""
                                      }
                                      onChange={(event) =>
                                        handleUpdateVencimentoCustoExtra(
                                          item.id,
                                          parcelaIndex,
                                          event.target.value,
                                        )
                                      }
                                      fullWidth
                                      InputLabelProps={{ shrink: true }}
                                      required
                                    />
                                  </Grid>
                                </Grid>
                              ),
                            )}
                          </Stack>

                          <Button
                            color="error"
                            variant="text"
                            onClick={() => handleRemoveCustoExtra(item.id)}
                          >
                            Remover custo extra
                          </Button>
                        </Stack>
                      </Paper>
                    );
                  })}
                </Stack>

                <TextField
                  label="Observações"
                  placeholder="Observações, notas fiscais, etc..."
                  value={obs}
                  onChange={(event) => setObs(event.target.value)}
                  multiline
                  rows={2}
                />

                {errorMessage ? (
                  <Typography variant="body2" color="error.main">
                    {errorMessage}
                  </Typography>
                ) : null}

                <Button type="submit" variant="contained" disabled={!canSubmit}>
                  Registrar entrada ({formatCurrency(totalValor)})
                </Button>
              </Stack>
            </Box>
          </Paper>
        </Grid>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Entradas recentes
            </Typography>
            <Stack spacing={2}>
              {entradasComMovimento.map((entrada) => (
                <Paper key={entrada.id} variant="outlined" sx={{ p: 2 }}>
                  <Typography fontWeight={600}>
                    Entrada #{entrada.id.slice(0, 6)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Quantidade em estoque:{" "}
                    {entrada.quantidadeMovimentadaKg.toFixed(2)} kg
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Custo unitário (kg):{" "}
                    {formatCurrency(entrada.custoUnitarioMovimentado)} • Custo
                    total: {formatCurrency(entrada.custoTotalMovimentado)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total da compra: {formatCurrency(entrada.valor_total)} •
                    Parcelas: {entrada.parcelas_qtd}
                  </Typography>
                  <Stack spacing={0.5} sx={{ mt: 1 }}>
                    {entrada.parcelas.map((parcela) => (
                      <Typography
                        key={parcela.id}
                        variant="caption"
                        color="text.secondary"
                      >
                        Parcela {parcela.parcela_num}:{" "}
                        {formatCurrency(parcela.valor)} • Vencimento:{" "}
                        {formatDate(parcela.vencimento)} • Status:{" "}
                        {parcela.status}
                      </Typography>
                    ))}
                  </Stack>
                </Paper>
              ))}
              {!entradas.length ? (
                <Typography variant="body2" color="text.secondary">
                  Nenhuma entrada registrada ainda.
                </Typography>
              ) : null}
            </Stack>
          </Paper>
        </Grid>
      </Grid>
    </AppLayout>
  );
};

export default EntradaInsumosPage;
