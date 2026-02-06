import { Grid, Paper, Stack, Typography } from "@mui/material";
import AppLayout from "../../components/template/AppLayout";
import PageHeader from "../../components/atomic/PageHeader";
import { useDataStore } from "../../hooks/useDataStore";
import { formatCurrency, formatDate } from "../../utils/format";

const VendasPage = () => {
  const vendas = useDataStore((state) => state.vendas);
  const clientes = useDataStore((state) => state.clientes);

  return (
    <AppLayout>
      <PageHeader
        title="Gestão de Vendas"
        subtitle="Acompanhe vendas, parcelas e status de recebimento."
      />
      <Grid container spacing={2}>
        {vendas.map((venda) => (
          <Grid item xs={12} md={6} key={venda.id}>
            <Paper sx={{ p: 3 }}>
              <Stack spacing={1}>
                <Typography variant="h6" fontWeight={600}>
                  Venda #{venda.id.slice(0, 6)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Cliente:{" "}
                  {clientes.find((cliente) => cliente.id === venda.cliente_id)
                    ?.nome || "-"}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Data: {formatDate(venda.data_venda)} • Parcelas:{" "}
                  {venda.parcelas_qtd}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Entrega programada:{" "}
                  {venda.data_programada_entrega
                    ? formatDate(venda.data_programada_entrega)
                    : "-"}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Data entrega:{" "}
                  {venda.data_entrega ? formatDate(venda.data_entrega) : "-"} •
                  Status: {venda.status_entrega || "PENDENTE"}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Valor total: {formatCurrency(venda.valor_total)}
                </Typography>
              </Stack>
            </Paper>
          </Grid>
        ))}
        {!vendas.length ? (
          <Grid item xs={12}>
            <Typography variant="body2" color="text.secondary">
              Nenhuma venda registrada ainda.
            </Typography>
          </Grid>
        ) : null}
      </Grid>
    </AppLayout>
  );
};

export default VendasPage;
