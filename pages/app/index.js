import { Grid, Stack, Typography } from "@mui/material";
import AppLayout from "../../components/template/AppLayout";
import InfoCard from "../../components/atomic/InfoCard";
import { useDataStore } from "../../hooks/useDataStore";
import { formatCurrency } from "../../utils/format";

const AppHome = () => {
  const clientes = useDataStore((state) => state.clientes);
  const fornecedores = useDataStore((state) => state.fornecedores);
  const vendas = useDataStore((state) => state.vendas);
  const contasReceber = useDataStore((state) => state.contasReceber);
  const contasPagar = useDataStore((state) => state.contasPagar);

  const totalVendas = vendas.reduce((total, venda) => total + venda.valor_total, 0);
  const totalReceber = contasReceber.reduce(
    (total, conta) => total + conta.valor_total,
    0
  );
  const totalPagar = contasPagar.reduce((total, conta) => total + conta.valor_total, 0);

  return (
    <AppLayout>
      <Stack spacing={3}>
        <Typography variant="h4" fontWeight={700}>
          Visão geral do negócio
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={3}>
            <InfoCard title="Clientes" value={clientes.length} subtitle="cadastros ativos" />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <InfoCard
              title="Fornecedores"
              value={fornecedores.length}
              subtitle="parceiros cadastrados"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <InfoCard title="Vendas" value={formatCurrency(totalVendas)} subtitle="total" />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <InfoCard title="Recebíveis" value={formatCurrency(totalReceber)} subtitle="em aberto" />
          </Grid>
        </Grid>
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <InfoCard title="Contas a pagar" value={formatCurrency(totalPagar)} subtitle="em aberto" />
          </Grid>
          <Grid item xs={12} md={6}>
            <InfoCard
              title="Ações rápidas"
              value="Operações do dia"
              subtitle="Use o menu lateral para acessar módulos e cadastros."
            />
          </Grid>
        </Grid>
      </Stack>
    </AppLayout>
  );
};

export default AppHome;
