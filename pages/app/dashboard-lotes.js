import { Grid, Paper, Stack, Typography } from "@mui/material";
import AppLayout from "../../components/template/AppLayout";
import PageHeader from "../../components/atomic/PageHeader";
import { useDataStore } from "../../hooks/useDataStore";
import { formatCurrency } from "../../utils/format";
import { getCustoMedio, getSaldoTipoCafe } from "../../utils/stock";

const DashboardLotesPage = () => {
  const tiposCafe = useDataStore((state) => state.tiposCafe);
  const movimentos = useDataStore((state) => state.movLotes);
  const insumos = useDataStore((state) => state.insumos);

  return (
    <AppLayout>
      <PageHeader
        title="Dashboard de Tipos de Café"
        subtitle="Saldo, custo médio e valor em estoque por tipo."
      />
      <Grid container spacing={2}>
        {tiposCafe.map((tipo) => {
          const saldo = getSaldoTipoCafe(movimentos, tipo.id);
          const custoMedio = getCustoMedio(movimentos, (mov) => mov.tipo_cafe_id === tipo.id);
          const valor = saldo * custoMedio;
          const unidadeInsumo =
            insumos.find((insumo) => insumo.id === tipo.insumo_id)?.unidade || "un";
          return (
            <Grid item xs={12} md={6} key={tipo.id}>
              <Paper sx={{ p: 3 }}>
                <Stack spacing={1}>
                  <Typography variant="h6" fontWeight={600}>
                    {tipo.nome}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Saldo: {saldo} {unidadeInsumo}
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
        {!tiposCafe.length ? (
          <Grid item xs={12}>
            <Typography variant="body2" color="text.secondary">
              Cadastre tipos de café e gere fabricação para acompanhar o estoque.
            </Typography>
          </Grid>
        ) : null}
      </Grid>
    </AppLayout>
  );
};

export default DashboardLotesPage;
