import {
  Box,
  Button,
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
import { useMemo, useState } from "react";
import AppLayout from "../../components/template/AppLayout";
import PageHeader from "../../components/atomic/PageHeader";
import { useDataStore } from "../../hooks/useDataStore";
import { formatCurrency } from "../../utils/format";

const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const createDetalhe = () => ({
  insumo_id: "",
  quantidade: "",
  unidade: "KG",
});

const getSaldo = (movimentos, insumoId) =>
  movimentos
    .filter((mov) => mov.insumo_id === insumoId)
    .reduce((acc, mov) => acc + toNumber(mov.quantidade), 0);

const getQuantidadeKg = (registro, insumo) => {
  const quantidade = toNumber(registro.quantidade);
  if (!insumo) return 0;
  if (registro.unidade === "SACO") {
    return quantidade * (toNumber(insumo.kg_por_saco) || 1);
  }
  return quantidade;
};

const ProducaoPage = () => {
  const insumos = useDataStore((state) => state.insumos);
  const auxUnidades = useDataStore((state) => state.auxUnidades);
  const movimentoProducao = useDataStore((state) => state.movInsumos);
  const createProducao = useDataStore((state) => state.createProducao);

  const [obsCriacao, setObsCriacao] = useState("");
  const [detalhes, setDetalhes] = useState([createDetalhe()]);

  const insumosConsumiveis = useMemo(
    () => insumos.filter((insumo) => Boolean(insumo.pode_ser_insumo)),
    [insumos],
  );

  const detalhesComMetadados = useMemo(
    () =>
      detalhes.map((detalhe) => {
        const insumo = insumos.find((item) => item.id === detalhe.insumo_id);
        const quantidadeKg = getQuantidadeKg(detalhe, insumo);
        const saldo = detalhe.insumo_id
          ? getSaldo(movimentoProducao, detalhe.insumo_id)
          : 0;
        const custoUnitario = toNumber(insumo?.preco_kg);
        return {
          ...detalhe,
          quantidadeKg,
          saldo,
          custoUnitario,
          custoTotal: quantidadeKg * custoUnitario,
          semSaldo: quantidadeKg > saldo,
        };
      }),
    [detalhes, insumos, movimentoProducao],
  );

  const consumoTotalKg = detalhesComMetadados.reduce(
    (acc, item) => acc + item.quantidadeKg,
    0,
  );
  const retornoTeoricoKg = consumoTotalKg * 0.75;

  const podeCriarProducao =
    detalhesComMetadados.length > 0 &&
    detalhesComMetadados.every(
      (item) => item.insumo_id && item.quantidadeKg > 0 && !item.semSaldo,
    );

  const handleChangeDetalhe = (index, field, value) => {
    if (field === "insumo_id") {
      const insumo = insumos.find((item) => item.id === value);
      const unidadeDefault = insumo?.unidade_codigo || "KG";
      setDetalhes((prev) =>
        prev.map((item, currentIndex) =>
          currentIndex === index
            ? { ...item, insumo_id: value, unidade: unidadeDefault }
            : item,
        ),
      );
      return;
    }

    setDetalhes((prev) =>
      prev.map((item, currentIndex) =>
        currentIndex === index ? { ...item, [field]: value } : item,
      ),
    );
  };

  const handleCriarProducao = async (event) => {
    event.preventDefault();
    if (!podeCriarProducao) return;

    const resultado = await createProducao({
      modo_geracao: "PRODUTO_FINAL",
      detalhes: detalhesComMetadados.map((item) => ({
        insumo_id: item.insumo_id,
        quantidade_kg: item.quantidadeKg,
      })),
      obs: obsCriacao,
    });

    if (resultado?.ok === false) {
      alert(resultado.error || "Não foi possível criar a produção.");
      return;
    }

    setObsCriacao("");
    setDetalhes([createDetalhe()]);
  };

  return (
    <AppLayout>
      <PageHeader
        title="Produção"
        subtitle="Etapa 1: enviar apenas os insumos consumidos na OP. Os produtos retornados serão informados no Retorno de Produção."
      />
      <Grid container spacing={3}>
        <Grid item xs={12} lg={8}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Criar produção
            </Typography>
            <Box component="form" onSubmit={handleCriarProducao}>
              <Stack spacing={2}>
                <Typography variant="subtitle1">Insumos enviados na OP</Typography>

                {detalhesComMetadados.map((item, index) => (
                  <Paper key={`detalhe-${index}`} variant="outlined" sx={{ p: 2 }}>
                    <Grid container spacing={1.5} alignItems="center">
                      <Grid item xs={12} md={4}>
                        <TextField
                          select
                          label="Insumo"
                          value={item.insumo_id}
                          onChange={(event) =>
                            handleChangeDetalhe(index, "insumo_id", event.target.value)
                          }
                          fullWidth
                        >
                          {insumosConsumiveis.map((insumo) => (
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
                          value={item.unidade}
                          onChange={(event) =>
                            handleChangeDetalhe(index, "unidade", event.target.value)
                          }
                          fullWidth
                        >
                          {(auxUnidades?.length
                            ? auxUnidades
                            : [
                                { id: "kg", codigo: "KG", label: "Quilograma" },
                                { id: "saco", codigo: "SACO", label: "Saco" },
                              ]
                          ).map((unidade) => (
                            <MenuItem key={unidade.id} value={unidade.codigo}>
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
                            handleChangeDetalhe(index, "quantidade", event.target.value)
                          }
                          fullWidth
                        />
                      </Grid>
                      <Grid item xs={12} md={3}>
                        <Typography variant="body2">
                          Consumo: {item.quantidadeKg.toFixed(2)} kg
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Saldo: {item.saldo.toFixed(2)} kg
                        </Typography>
                        {item.semSaldo ? (
                          <Typography variant="caption" color="error.main" display="block">
                            Estoque insuficiente
                          </Typography>
                        ) : null}
                      </Grid>
                      <Grid item xs={12} md={1}>
                        <IconButton
                          onClick={() =>
                            setDetalhes((prev) =>
                              prev.length > 1
                                ? prev.filter((_, current) => current !== index)
                                : prev,
                            )
                          }
                          disabled={detalhesComMetadados.length <= 1}
                        >
                          <DeleteOutlineIcon />
                        </IconButton>
                      </Grid>
                    </Grid>
                  </Paper>
                ))}

                <Button
                  variant="outlined"
                  startIcon={<AddIcon />}
                  onClick={() => setDetalhes((prev) => [...prev, createDetalhe()])}
                >
                  Adicionar insumo
                </Button>

                <TextField
                  label="Observações"
                  value={obsCriacao}
                  onChange={(event) => setObsCriacao(event.target.value)}
                  multiline
                  rows={2}
                />

                <Button type="submit" variant="contained" disabled={!podeCriarProducao}>
                  Criar produção (Pendente)
                </Button>
              </Stack>
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} lg={4}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Resumo da produção
            </Typography>
            <Stack spacing={1}>
              <Typography variant="body2">
                Consumo total de insumos: {consumoTotalKg.toFixed(2)} kg
              </Typography>
              <Typography variant="body2" color="primary" fontWeight="bold">
                Retorno teórico (75%): {retornoTeoricoKg.toFixed(2)} kg
              </Typography>
              <Typography variant="body2" color="secondary" fontWeight="bold">
                ≈ {(retornoTeoricoKg / 23).toFixed(1)} sacos de 23kg
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Os produtos retornados serão definidos na tela de Retorno de Produção.
              </Typography>
              <Typography variant="body2" mt={2}>
                Custo de envio: {" "}
                {formatCurrency(
                  detalhesComMetadados.reduce((acc, item) => acc + item.custoTotal, 0),
                )}
              </Typography>
            </Stack>
          </Paper>
        </Grid>
      </Grid>
    </AppLayout>
  );
};

export default ProducaoPage;
