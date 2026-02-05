import { Grid, Paper, Stack, Typography } from "@mui/material";
import AppLayout from "../../components/template/AppLayout";
import PageHeader from "../../components/atomic/PageHeader";
import { useDataStore } from "../../hooks/useDataStore";
import { formatCurrency } from "../../utils/format";

const DashboardFornecedoresPage = () => {
  const fornecedores = useDataStore((state) => state.fornecedores);
  const contasPagar = useDataStore((state) => state.contasPagar);

  return (
    <AppLayout>
      <PageHeader
        title="Dashboard de Fornecedores"
        subtitle="Total em aberto, pago e vencido por fornecedor."
      />
      <Grid container spacing={2}>
        {fornecedores.map((fornecedor) => {
          const contas = contasPagar.filter((conta) => conta.fornecedor_id === fornecedor.id);
          const total = contas.reduce((acc, conta) => acc + conta.valor_total, 0);
          return (
            <Grid item xs={12} md={6} key={fornecedor.id}>
              <Paper sx={{ p: 3 }}>
                <Stack spacing={1}>
                  <Typography variant="h6" fontWeight={600}>
                    {fornecedor.razao_social}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Contas registradas: {contas.length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total em aberto: {formatCurrency(total)}
                  </Typography>
                </Stack>
              </Paper>
            </Grid>
          );
        })}
        {!fornecedores.length ? (
          <Grid item xs={12}>
            <Typography variant="body2" color="text.secondary">
              Cadastre fornecedores e entradas para acompanhar o dashboard.
            </Typography>
          </Grid>
        ) : null}
      </Grid>
    </AppLayout>
  );
};

export default DashboardFornecedoresPage;
