import { Grid, Paper, Stack, Typography } from "@mui/material";
import AppLayout from "../../components/template/AppLayout";
import PageHeader from "../../components/atomic/PageHeader";
import { useDataStore } from "../../hooks/useDataStore";
import { formatCurrency } from "../../utils/format";
import { getCustoMedio, getSaldoLote } from "../../utils/stock";

const DashboardLotesPage = () => {
  const lotes = useDataStore((state) => state.lotes);
  const movimentos = useDataStore((state) => state.movLotes);

  return (
    <AppLayout>
      <PageHeader
        title="Dashboard de Lotes"
        subtitle="Saldo, custo médio e valor em estoque dos produtos finais."
      />
      <Grid container spacing={2}>
        {lotes.map((lote) => {
          const saldo = getSaldoLote(movimentos, lote.id);
          const custoMedio = getCustoMedio(movimentos, (mov) => mov.lote_id === lote.id);
          const valor = saldo * custoMedio;
          return (
            <Grid item xs={12} md={6} key={lote.id}>
              <Paper sx={{ p: 3 }}>
                <Stack spacing={1}>
                  <Typography variant="h6" fontWeight={600}>
                    {lote.nome}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Saldo: {saldo} {lote.unidade}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Custo médio: {formatCurrency(custoMedio)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Valor em estoque: {formatCurrency(valor)}
                  </Typography>
                </Stack>
              </Paper>
            </Grid>
          );
        })}
        {!lotes.length ? (
          <Grid item xs={12}>
            <Typography variant="body2" color="text.secondary">
              Cadastre lotes e gere fabricação para acompanhar o estoque.
            </Typography>
          </Grid>
        ) : null}
      </Grid>
    </AppLayout>
  );
};

export default DashboardLotesPage;
