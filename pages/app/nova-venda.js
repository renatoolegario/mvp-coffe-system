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
import { getCustoMedio } from "../../utils/stock";

const NovaVendaPage = () => {
  const clientes = useDataStore((state) => state.clientes);
  const tiposCafe = useDataStore((state) => state.tiposCafe);
  const movimentos = useDataStore((state) => state.movLotes);
  const addVenda = useDataStore((state) => state.addVenda);
  const [clienteId, setClienteId] = useState("");
  const [parcelas, setParcelas] = useState(1);
  const [obs, setObs] = useState("");
  const [item, setItem] = useState({ tipo_cafe_id: "", quantidade: "", preco_unit: "" });
  const [itens, setItens] = useState([]);

  const total = itens.reduce(
    (acc, current) => acc + current.quantidade * current.preco_unit,
    0
  );

  const addItem = () => {
    if (!item.tipo_cafe_id || !item.quantidade || !item.preco_unit) return;
    const custoUnit = getCustoMedio(
      movimentos,
      (mov) => mov.tipo_cafe_id === item.tipo_cafe_id
    );
    setItens((prev) => [
      ...prev,
      {
        ...item,
        quantidade: Number(item.quantidade),
        preco_unit: Number(item.preco_unit),
        custo_unit: custoUnit,
      },
    ]);
    setItem({ tipo_cafe_id: "", quantidade: "", preco_unit: "" });
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!clienteId || !itens.length) return;
    addVenda({ cliente_id: clienteId, itens, parcelas_qtd: Number(parcelas), obs });
    setClienteId("");
    setParcelas(1);
    setObs("");
    setItens([]);
  };

  return (
    <AppLayout>
      <PageHeader
        title="Nova Venda"
        subtitle="Registre vendas e gere contas a receber." 
      />
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Dados da venda
            </Typography>
            <Box component="form" onSubmit={handleSubmit}>
              <Stack spacing={2}>
                <TextField
                  select
                  label="Cliente"
                  value={clienteId}
                  onChange={(event) => setClienteId(event.target.value)}
                  required
                >
                  {clientes.map((cliente) => (
                    <MenuItem key={cliente.id} value={cliente.id}>
                      {cliente.nome}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  select
                  label="Tipo de café"
                  value={item.tipo_cafe_id}
                  onChange={(event) =>
                    setItem((prev) => ({ ...prev, tipo_cafe_id: event.target.value }))
                  }
                >
                  {tiposCafe.map((tipo) => (
                    <MenuItem key={tipo.id} value={tipo.id}>
                      {tipo.nome}
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
                  label="Preço unitário"
                  type="number"
                  value={item.preco_unit}
                  onChange={(event) => setItem((prev) => ({ ...prev, preco_unit: event.target.value }))}
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
                  Registrar venda ({formatCurrency(total)})
                </Button>
              </Stack>
            </Box>
          </Paper>
        </Grid>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Itens da venda
            </Typography>
            <Stack spacing={1}>
              {itens.map((current, index) => (
                <Typography key={`${current.tipo_cafe_id}-${index}`} variant="body2">
                  {tiposCafe.find((tipo) => tipo.id === current.tipo_cafe_id)?.nome} • {current.quantidade} x {formatCurrency(current.preco_unit)}
                </Typography>
              ))}
              {!itens.length ? (
                <Typography variant="body2" color="text.secondary">
                  Adicione tipos de café para compor a venda.
                </Typography>
              ) : null}
            </Stack>
          </Paper>
        </Grid>
      </Grid>
    </AppLayout>
  );
};

export default NovaVendaPage;
