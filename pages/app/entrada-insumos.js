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
import { formatCurrency } from "../../utils/format";

const parseNumber = (value) => Number(String(value).replace(",", ".")) || 0;

const EntradaInsumosPage = () => {
  const fornecedores = useDataStore((state) => state.fornecedores);
  const insumos = useDataStore((state) => state.insumos);
  const entradas = useDataStore((state) => state.entradasInsumos);
  const addEntradaInsumos = useDataStore((state) => state.addEntradaInsumos);

  const [fornecedorId, setFornecedorId] = useState("");
  const [insumoId, setInsumoId] = useState("");
  const [quantidade, setQuantidade] = useState("");
  const [valorTotal, setValorTotal] = useState("");
  const [parcelasQtd, setParcelasQtd] = useState(1);
  const [parcelasValores, setParcelasValores] = useState([""]);
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
  };

  const handleChangeParcela = (index, value) => {
    setParcelasValores((prev) =>
      prev.map((parcela, currentIndex) =>
        currentIndex === index ? value : parcela,
      ),
    );
  };

  const canSubmit =
    fornecedorId &&
    insumoId &&
    parseNumber(quantidade) > 0 &&
    totalValor > 0 &&
    parcelasValores.every((parcela) => parseNumber(parcela) > 0) &&
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
      obs,
    });

    setFornecedorId("");
    setInsumoId("");
    setQuantidade("");
    setValorTotal("");
    setParcelasQtd(1);
    setParcelasValores([""]);
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
                  {parcelasValores.map((parcela, index) => (
                    <TextField
                      key={`parcela-${index + 1}`}
                      label={`Valor da parcela ${index + 1}`}
                      type="number"
                      value={parcela}
                      onChange={(event) =>
                        handleChangeParcela(index, event.target.value)
                      }
                      inputProps={{ min: 0, step: "0.01" }}
                      required
                    />
                  ))}
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
              {entradas.map((entrada) => (
                <Paper key={entrada.id} variant="outlined" sx={{ p: 2 }}>
                  <Typography fontWeight={600}>
                    Entrada #{entrada.id.slice(0, 6)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total: {formatCurrency(entrada.valor_total)} • Parcelas:{" "}
                    {entrada.parcelas_qtd}
                  </Typography>
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
