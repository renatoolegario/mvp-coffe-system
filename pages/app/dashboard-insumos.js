import { Grid, Paper, Stack, Typography } from "@mui/material";
import AppLayout from "../../components/template/AppLayout";
import PageHeader from "../../components/atomic/PageHeader";
import { useDataStore } from "../../hooks/useDataStore";
import { formatCurrency } from "../../utils/format";
import { getCustoMedio, getSaldoInsumo } from "../../utils/stock";

const DashboardInsumosPage = () => {
  const insumos = useDataStore((state) => state.insumos);
  const movimentos = useDataStore((state) => state.movInsumos);

  return (
    <AppLayout>
      <PageHeader
        title="Dashboard de Insumos"
        subtitle="Saldo, custo médio e valor em estoque de matérias-primas."
      />
      <Grid container spacing={2}>
        {insumos.map((insumo) => {
          const saldo = getSaldoInsumo(movimentos, insumo.id);
          const custoMedio = getCustoMedio(movimentos, (mov) => mov.insumo_id === insumo.id);
          const valor = saldo * custoMedio;
          return (
            <Grid item xs={12} md={6} key={insumo.id}>
              <Paper sx={{ p: 3 }}>
                <Stack spacing={1}>
                  <Typography variant="h6" fontWeight={600}>
                    {insumo.nome}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Saldo: {saldo} {insumo.unidade}
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
        {!insumos.length ? (
          <Grid item xs={12}>
            <Typography variant="body2" color="text.secondary">
              Cadastre insumos para acompanhar o estoque.
            </Typography>
          </Grid>
        ) : null}
      </Grid>
    </AppLayout>
  );
};

export default DashboardInsumosPage;
