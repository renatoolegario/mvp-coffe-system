import {
  Box,
  Button,
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
  const [quantidade, setQuantidade] = useState("");
  const [valorTotal, setValorTotal] = useState("");
  const [parcelasQtd, setParcelasQtd] = useState(1);
  const [parcelasValores, setParcelasValores] = useState([""]);
  const [parcelasVencimentos, setParcelasVencimentos] = useState([""]);
  const [obs, setObs] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

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

        const quantidadeMovimentada = movimentosDaEntrada.reduce(
          (total, movimento) => total + parseNumber(movimento.quantidade),
          0,
        );
        const custoTotalMovimentado = movimentosDaEntrada.reduce(
          (total, movimento) => total + parseNumber(movimento.custo_total),
          0,
        );
        const custoUnitarioMovimentado = quantidadeMovimentada
          ? custoTotalMovimentado / quantidadeMovimentada
          : 0;

        return {
          ...entrada,
          quantidadeMovimentada,
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
    setParcelasValores((prev) => {
      const next = Array.from(
        { length: nextQtd },
        (_, index) => prev[index] || "",
      );
      return next;
    });
    setParcelasVencimentos((prev) => {
      const next = Array.from(
        { length: nextQtd },
        (_, index) => prev[index] || "",
      );
      return next;
    });
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

  const canSubmit =
    fornecedorId &&
    insumoId &&
    parseNumber(quantidade) > 0 &&
    totalValor > 0 &&
    parcelasValores.every((parcela) => parseNumber(parcela) > 0) &&
    parcelasVencimentos.every((vencimento) => Boolean(vencimento)) &&
    !parcelasDivergentes;

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!canSubmit) {
      setErrorMessage(
        "A soma das parcelas deve ser igual ao valor total para registrar a entrada.",
      );
      return;
    }

    setErrorMessage("");

    await addEntradaInsumos({
      fornecedor_id: fornecedorId,
      insumo_id: insumoId,
      quantidade: parseNumber(quantidade),
      valor_total: totalValor,
      parcelas_qtd: parcelasQtd,
      parcelas_valores: parcelasValores.map(parseNumber),
      parcelas_vencimentos: parcelasVencimentos.map((vencimento) =>
        new Date(vencimento).toISOString(),
      ),
      obs,
    });

    setFornecedorId("");
    setInsumoId("");
    setQuantidade("");
    setValorTotal("");
    setParcelasQtd(1);
    setParcelasValores([""]);
    setParcelasVencimentos([""]);
    setObs("");
  };

  return (
    <AppLayout>
      <PageHeader
        title="Entrada de Insumos"
        subtitle="Registre compras e atualize estoque de matérias-primas."
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
                  label="Quantidade"
                  type="number"
                  value={quantidade}
                  onChange={(event) => setQuantidade(event.target.value)}
                  inputProps={{ min: 0, step: "0.01" }}
                  required
                />
                <TextField
                  label="Valor total"
                  type="number"
                  value={valorTotal}
                  onChange={(event) => setValorTotal(event.target.value)}
                  inputProps={{ min: 0, step: "0.01" }}
                  required
                />
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
                        <Grid item xs={12} sm={7}>
                          <TextField
                            label={`Valor da parcela ${parcelaNum}`}
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
                        <Grid item xs={12} sm={5}>
                          <TextField
                            label={`Vencimento parcela ${parcelaNum}`}
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
                    Quantidade: {entrada.quantidadeMovimentada} • Custo
                    unitário: {formatCurrency(entrada.custoUnitarioMovimentado)}
                    • Custo total:{" "}
                    {formatCurrency(entrada.custoTotalMovimentado)}
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
                        {formatDate(parcela.vencimento)}
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
