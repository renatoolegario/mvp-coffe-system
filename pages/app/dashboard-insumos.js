import { Grid, Paper, Stack, Typography } from "@mui/material";
import { useEffect, useState } from "react";
import AppLayout from "../../components/template/AppLayout";
import PageHeader from "../../components/atomic/PageHeader";
import { formatCurrency } from "../../utils/format";

const DashboardInsumosPage = () => {
  const [insumos, setInsumos] = useState([]);

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const response = await fetch("/api/v1/dashboard/insumos");
        if (!response.ok) {
          return;
        }
        const data = await response.json();
        setInsumos(data.insumos || []);
      } catch (error) {
        setInsumos([]);
      }
    };

    loadDashboard();
  }, []);

  return (
    <AppLayout>
      <PageHeader
        title="Dashboard de Insumos"
        subtitle="Saldo, custo médio e valor em estoque de matérias-primas."
      />
      <Grid container spacing={2}>
        {insumos.map((insumo) => (
          <Grid item xs={12} md={6} key={insumo.id}>
            <Paper sx={{ p: 3 }}>
              <Stack spacing={1}>
                <Typography variant="h6" fontWeight={600}>
                  {insumo.nome}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Estoque (kg): {Number(insumo.saldo_kg).toFixed(2)} kg
                </Typography>
                {insumo.unidade === "saco" ? (
                  <Typography variant="body2" color="text.secondary">
                    Estoque (sacos): {Number(insumo.saldo_sacos).toFixed(2)}{" "}
                    sacos
                  </Typography>
                ) : null}
                <Typography variant="body2" color="text.secondary">
                  Custo médio: {formatCurrency(insumo.custo_medio)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Valor em estoque: {formatCurrency(insumo.valor_estoque)}
                </Typography>
              </Stack>
            </Paper>
          </Grid>
        ))}
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
