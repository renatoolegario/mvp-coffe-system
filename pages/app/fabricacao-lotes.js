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
import { useState } from "react";
import AppLayout from "../../components/template/AppLayout";
import PageHeader from "../../components/atomic/PageHeader";
import { useDataStore } from "../../hooks/useDataStore";
import { formatCurrency } from "../../utils/format";
import { getCustoConsumoFifo, getSaldoInsumo } from "../../utils/stock";

const FabricacaoLotesPage = () => {
  const tiposCafe = useDataStore((state) => state.tiposCafe);
  const insumos = useDataStore((state) => state.insumos);
  const movInsumos = useDataStore((state) => state.movInsumos);
  const ordens = useDataStore((state) => state.ordensProducao);
  const addOrdemProducao = useDataStore((state) => state.addOrdemProducao);
  const [tipoCafeId, setTipoCafeId] = useState("");
  const [quantidade, setQuantidade] = useState("");
  const [obs, setObs] = useState("");

  const tipoSelecionado = tiposCafe.find((tipo) => tipo.id === tipoCafeId);
  const insumoSelecionado = insumos.find(
    (insumo) => insumo.id === tipoSelecionado?.insumo_id,
  );
  const rendimento = Number(tipoSelecionado?.rendimento_percent ?? 100);
  const quantidadeGerada = Number(quantidade) || 0;
  const quantidadeInsumo =
    rendimento > 0 ? quantidadeGerada / (rendimento / 100) : 0;
  const saldoInsumo = insumoSelecionado
    ? getSaldoInsumo(movInsumos, insumoSelecionado.id)
    : 0;
  const custoConsumo = insumoSelecionado
    ? getCustoConsumoFifo(movInsumos, insumoSelecionado.id, quantidadeInsumo)
    : { custoTotal: 0, custoUnitario: 0 };
  const custoUnitInsumo = custoConsumo.custoUnitario;
  const custoBase = custoConsumo.custoTotal;
  const custoTotal = custoBase;
  const statusProducao = !tipoSelecionado
    ? "Selecione um tipo de café."
    : quantidadeInsumo > saldoInsumo
      ? "Estoque insuficiente para produzir."
      : "Liberado para produzir.";
  const podeProduzir =
    tipoSelecionado &&
    quantidadeGerada > 0 &&
    insumoSelecionado &&
    quantidadeInsumo <= saldoInsumo;

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!podeProduzir) return;
    addOrdemProducao({
      tipo_cafe_id: tipoCafeId,
      quantidade_gerada: quantidadeGerada,
      obs,
    });
    setTipoCafeId("");
    setQuantidade("");
    setObs("");
  };

  return (
    <AppLayout>
      <PageHeader
        title="Fabricação de Café"
        subtitle="Baixe o insumo definido no tipo e gere entrada no estoque."
      />
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Nova fabricação
            </Typography>
            <Box component="form" onSubmit={handleSubmit}>
              <Stack spacing={2}>
                <TextField
                  select
                  label="Tipo de café"
                  value={tipoCafeId}
                  onChange={(event) => setTipoCafeId(event.target.value)}
                  required
                >
                  {tiposCafe.map((tipo) => (
                    <MenuItem key={tipo.id} value={tipo.id}>
                      {tipo.nome}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  label="Quantidade gerada"
                  type="number"
                  value={quantidade}
                  onChange={(event) => setQuantidade(event.target.value)}
                  required
                />
                <Divider />
                <TextField
                  label="Observações"
                  value={obs}
                  onChange={(event) => setObs(event.target.value)}
                  multiline
                  rows={2}
                />
                <Button
                  type="submit"
                  variant="contained"
                  disabled={!podeProduzir}
                >
                  Registrar fabricação (custo {formatCurrency(custoTotal)})
                </Button>
              </Stack>
            </Box>
          </Paper>
        </Grid>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Resumo do consumo
            </Typography>
            <Stack spacing={1}>
              <Typography variant="body2">
                Insumo: {insumoSelecionado?.nome || "-"}
              </Typography>
              <Typography variant="body2">
                Quantidade do insumo:{" "}
                {quantidadeInsumo ? quantidadeInsumo.toFixed(2) : "-"}
              </Typography>
              <Typography variant="body2">
                Custo unitário do insumo: {formatCurrency(custoUnitInsumo)}
              </Typography>
              <Typography variant="body2">
                Custo total do consumo (FIFO): {formatCurrency(custoBase)}
              </Typography>
              <Typography variant="body2">
                Saldo disponível: {insumoSelecionado ? saldoInsumo : "-"}
              </Typography>
              <Typography
                variant="body2"
                color={podeProduzir ? "success.main" : "warning.main"}
              >
                Status: {statusProducao}
              </Typography>
            </Stack>
          </Paper>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Ordens recentes
            </Typography>
            <Stack spacing={2}>
              {ordens.map((ordem) => (
                <Paper key={ordem.id} variant="outlined" sx={{ p: 2 }}>
                  <Typography fontWeight={600}>
                    Ordem #{ordem.id.slice(0, 6)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Tipo:{" "}
                    {tiposCafe.find((tipo) => tipo.id === ordem.tipo_cafe_id)
                      ?.nome || "-"}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Quantidade: {ordem.quantidade_gerada} • Custo total:{" "}
                    {formatCurrency(ordem.custo_total)}
                  </Typography>
                </Paper>
              ))}
              {!ordens.length ? (
                <Typography variant="body2" color="text.secondary">
                  Nenhuma ordem registrada ainda.
                </Typography>
              ) : null}
            </Stack>
          </Paper>
        </Grid>
      </Grid>
    </AppLayout>
  );
};

export default FabricacaoLotesPage;
