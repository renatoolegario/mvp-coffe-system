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

const EntradaInsumosPage = () => {
  const fornecedores = useDataStore((state) => state.fornecedores);
  const insumos = useDataStore((state) => state.insumos);
  const entradas = useDataStore((state) => state.entradasInsumos);
  const addEntradaInsumos = useDataStore((state) => state.addEntradaInsumos);
  const [fornecedorId, setFornecedorId] = useState("");
  const [parcelas, setParcelas] = useState(1);
  const [obs, setObs] = useState("");
  const [item, setItem] = useState({ insumo_id: "", quantidade: "", custo_unit: "" });
  const [itens, setItens] = useState([]);

  const total = itens.reduce(
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
    if (!fornecedorId || !itens.length) return;
    addEntradaInsumos({ fornecedor_id: fornecedorId, itens, parcelas_qtd: Number(parcelas), obs });
    setFornecedorId("");
    setParcelas(1);
    setObs("");
    setItens([]);
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
                  label="Quantidade"
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
                  Adicionar item
                </Button>
                <Divider />
                <TextField
                  label="Parcelas"
                  type="number"
                  value={parcelas}
                  onChange={(event) => setParcelas(event.target.value)}
                />
                <TextField
                  label="Observações"
                  value={obs}
                  onChange={(event) => setObs(event.target.value)}
                  multiline
                  rows={2}
                />
                <Button type="submit" variant="contained">
                  Registrar entrada ({formatCurrency(total)})
                </Button>
              </Stack>
            </Box>
          </Paper>
        </Grid>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Itens da entrada
            </Typography>
            <Stack spacing={1}>
              {itens.map((current, index) => (
                <Typography key={`${current.insumo_id}-${index}`} variant="body2">
                  {insumos.find((insumo) => insumo.id === current.insumo_id)?.nome} • {current.quantidade} x {formatCurrency(current.custo_unit)}
                </Typography>
              ))}
              {!itens.length ? (
                <Typography variant="body2" color="text.secondary">
                  Adicione insumos para compor a entrada.
                </Typography>
              ) : null}
            </Stack>
          </Paper>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Entradas recentes
            </Typography>
            <Stack spacing={2}>
              {entradas.map((entrada) => (
                <Paper key={entrada.id} variant="outlined" sx={{ p: 2 }}>
                  <Typography fontWeight={600}>Entrada #{entrada.id.slice(0, 6)}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total: {formatCurrency(entrada.valor_total)} • Parcelas: {entrada.parcelas_qtd}
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
