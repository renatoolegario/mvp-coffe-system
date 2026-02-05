import { Box, Grid, MenuItem, Paper, Stack, TextField, Typography } from "@mui/material";
import { useMemo, useState } from "react";
import AppLayout from "../../components/template/AppLayout";
import PageHeader from "../../components/atomic/PageHeader";
import { useDataStore } from "../../hooks/useDataStore";
import { formatCurrency, formatDate } from "../../utils/format";

const DetalheClientePage = () => {
  const clientes = useDataStore((state) => state.clientes);
  const vendas = useDataStore((state) => state.vendas);
  const contasReceber = useDataStore((state) => state.contasReceber);
  const parcelas = useDataStore((state) => state.contasReceberParcelas);
  const [clienteId, setClienteId] = useState("");

  const clienteVendas = useMemo(
    () => vendas.filter((venda) => venda.cliente_id === clienteId),
    [clienteId, vendas]
  );
  const clienteContas = useMemo(
    () => contasReceber.filter((conta) => conta.cliente_id === clienteId),
    [clienteId, contasReceber]
  );
  const clienteParcelas = useMemo(
    () =>
      parcelas.filter((parcela) =>
        clienteContas.some((conta) => conta.id === parcela.conta_receber_id)
      ),
    [parcelas, clienteContas]
  );

  const inadimplente = clienteParcelas.some(
    (parcela) => parcela.status === "ABERTA" && new Date(parcela.vencimento) < new Date()
  );

  return (
    <AppLayout>
      <PageHeader
        title="Detalhe do Cliente"
        subtitle="Histórico de compras, parcelas e inadimplência."
      />
      <Box maxWidth={400} mb={3}>
        <TextField
          select
          label="Selecione o cliente"
          value={clienteId}
          onChange={(event) => setClienteId(event.target.value)}
          fullWidth
        >
          {clientes.map((cliente) => (
            <MenuItem key={cliente.id} value={cliente.id}>
              {cliente.nome}
            </MenuItem>
          ))}
        </TextField>
      </Box>
      {clienteId ? (
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Compras
              </Typography>
              <Stack spacing={2}>
                {clienteVendas.map((venda) => (
                  <Paper key={venda.id} variant="outlined" sx={{ p: 2 }}>
                    <Typography fontWeight={600}>Venda #{venda.id.slice(0, 6)}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {formatDate(venda.data_venda)} • {formatCurrency(venda.valor_total)}
                    </Typography>
                  </Paper>
                ))}
                {!clienteVendas.length ? (
                  <Typography variant="body2" color="text.secondary">
                    Nenhuma venda registrada.
                  </Typography>
                ) : null}
              </Stack>
            </Paper>
          </Grid>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Parcelas
              </Typography>
              <Typography variant="body2" color={inadimplente ? "error" : "text.secondary"} gutterBottom>
                Status: {inadimplente ? "Inadimplente" : "Em dia"}
              </Typography>
              <Stack spacing={2}>
                {clienteParcelas.map((parcela) => (
                  <Paper key={parcela.id} variant="outlined" sx={{ p: 2 }}>
                    <Typography fontWeight={600}>Parcela #{parcela.parcela_num}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Vencimento: {formatDate(parcela.vencimento)} • {formatCurrency(parcela.valor)} • {parcela.status}
                    </Typography>
                  </Paper>
                ))}
                {!clienteParcelas.length ? (
                  <Typography variant="body2" color="text.secondary">
                    Nenhuma parcela registrada.
                  </Typography>
                ) : null}
              </Stack>
            </Paper>
          </Grid>
        </Grid>
      ) : (
        <Typography variant="body2" color="text.secondary">
          Selecione um cliente para visualizar o histórico.
        </Typography>
      )}
    </AppLayout>
  );
};

export default DetalheClientePage;
