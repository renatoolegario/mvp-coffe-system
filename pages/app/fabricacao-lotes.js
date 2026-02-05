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

const FabricacaoLotesPage = () => {
  const lotes = useDataStore((state) => state.lotes);
  const insumos = useDataStore((state) => state.insumos);
  const ordens = useDataStore((state) => state.ordensProducao);
  const addOrdemProducao = useDataStore((state) => state.addOrdemProducao);
  const [loteId, setLoteId] = useState("");
  const [quantidade, setQuantidade] = useState("");
  const [obs, setObs] = useState("");
  const [item, setItem] = useState({ insumo_id: "", quantidade: "", custo_unit: "" });
  const [itens, setItens] = useState([]);

  const custoBase = itens.reduce(
    (acc, current) => acc + current.quantidade * current.custo_unit,
    0
  );

  const addItem = () => {
    if (!item.insumo_id || !item.quantidade || !item.custo_unit) return;
    setItens((prev) => [
      ...prev,
      {
        ...item,
        quantidade: Number(item.quantidade),
        custo_unit: Number(item.custo_unit),
      },
    ]);
    setItem({ insumo_id: "", quantidade: "", custo_unit: "" });
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!loteId || !quantidade || !itens.length) return;
    addOrdemProducao({ lote_id: loteId, quantidade_gerada: Number(quantidade), itens, obs });
    setLoteId("");
    setQuantidade("");
    setObs("");
    setItens([]);
  };

  return (
    <AppLayout>
      <PageHeader
        title="Fabricação de Lotes"
        subtitle="Baixe insumos e gere entrada no estoque de lotes."
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
                  label="Lote"
                  value={loteId}
                  onChange={(event) => setLoteId(event.target.value)}
                  required
                >
                  {lotes.map((lote) => (
                    <MenuItem key={lote.id} value={lote.id}>
                      {lote.nome}
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
                  select
                  label="Insumo"
                  value={item.insumo_id}
                  onChange={(event) => setItem((prev) => ({ ...prev, insumo_id: event.target.value }))}
                >
                  {insumos.map((insumo) => (
                    <MenuItem key={insumo.id} value={insumo.id}>
                      {insumo.nome}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  label="Quantidade consumida"
                  type="number"
                  value={item.quantidade}
                  onChange={(event) => setItem((prev) => ({ ...prev, quantidade: event.target.value }))}
                />
                <TextField
                  label="Custo unitário"
                  type="number"
                  value={item.custo_unit}
                  onChange={(event) => setItem((prev) => ({ ...prev, custo_unit: event.target.value }))}
                />
                <Button variant="outlined" onClick={addItem}>
                  Adicionar insumo
                </Button>
                <Divider />
                <TextField
                  label="Observações"
                  value={obs}
                  onChange={(event) => setObs(event.target.value)}
                  multiline
                  rows={2}
                />
                <Button type="submit" variant="contained">
                  Registrar fabricação (custo base {formatCurrency(custoBase)})
                </Button>
              </Stack>
            </Box>
          </Paper>
        </Grid>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Insumos consumidos
            </Typography>
            <Stack spacing={1}>
              {itens.map((current, index) => (
                <Typography key={`${current.insumo_id}-${index}`} variant="body2">
                  {insumos.find((insumo) => insumo.id === current.insumo_id)?.nome} • {current.quantidade} x {formatCurrency(current.custo_unit)}
                </Typography>
              ))}
              {!itens.length ? (
                <Typography variant="body2" color="text.secondary">
                  Adicione insumos para compor a fabricação.
                </Typography>
              ) : null}
            </Stack>
          </Paper>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Ordens recentes
            </Typography>
            <Stack spacing={2}>
              {ordens.map((ordem) => (
                <Paper key={ordem.id} variant="outlined" sx={{ p: 2 }}>
                  <Typography fontWeight={600}>Ordem #{ordem.id.slice(0, 6)}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Quantidade: {ordem.quantidade_gerada} • Custo total: {formatCurrency(ordem.custo_total)}
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
