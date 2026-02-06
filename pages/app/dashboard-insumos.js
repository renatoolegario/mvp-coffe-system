import { Chip, Grid, Paper, Stack, Typography } from "@mui/material";
import { useEffect, useState } from "react";
import AppLayout from "../../components/template/AppLayout";
import PageHeader from "../../components/atomic/PageHeader";
import { formatCurrency } from "../../utils/format";

const statusColorMap = {
  CRITICO: "error",
  NORMAL: "success",
  ELEVADO: "warning",
  EXCESSO: "secondary",
};

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
        subtitle="Saldo, custo médio e status do estoque mínimo configurado."
      />
      <Grid container spacing={2}>
        {insumos.map((insumo) => (
          <Grid item xs={12} md={6} key={insumo.id}>
            <Paper sx={{ p: 3 }}>
              <Stack spacing={1.2}>
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="center"
                >
                  <Typography variant="h6" fontWeight={600}>
                    {insumo.nome}
                  </Typography>
                  <Chip
                    size="small"
                    label={insumo.status_label || "Sem faixa"}
                    color={statusColorMap[insumo.status_estoque] || "default"}
                  />
                </Stack>

                <Typography variant="body2" color="text.secondary">
                  Estoque (kg): {Number(insumo.saldo_kg).toFixed(2)} kg
                </Typography>

                {insumo.tipo !== "FISICO" ? (
                  <Typography variant="body2" color="text.secondary">
                    Estoque (sacos): {Number(insumo.saldo_sacos).toFixed(2)}{" "}
                    sacos
                  </Typography>
                ) : null}

                <Typography variant="body2" color="text.secondary">
                  Custo médio (kg): {formatCurrency(insumo.custo_medio_kg)}
                </Typography>

                {insumo.tipo !== "FISICO" ? (
                  <Typography variant="body2" color="text.secondary">
                    Custo médio (saco):{" "}
                    {formatCurrency(insumo.custo_medio_saco)}
                  </Typography>
                ) : null}

                <Typography variant="body2" color="text.secondary">
                  Valor em estoque: {formatCurrency(insumo.valor_estoque)}
                </Typography>

                <Typography variant="body2" color="text.secondary">
                  Estoque mínimo:{" "}
                  {Number(insumo.estoque_minimo_kg || 0).toFixed(2)} kg
                </Typography>

                <Typography variant="body2" color="text.secondary">
                  Percentual sobre mínimo:{" "}
                  {Number(insumo.percentual_estoque || 0).toFixed(2)}%
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
