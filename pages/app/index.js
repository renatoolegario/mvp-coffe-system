import { Grid, Stack, Typography } from "@mui/material";
import { useEffect, useState } from "react";
import AppLayout from "../../components/template/AppLayout";
import InfoCard from "../../components/atomic/InfoCard";
import { formatCurrency } from "../../utils/format";

const emptyResumo = {
  clientesAtivos: 0,
  fornecedoresAtivos: 0,
  totalVendas: 0,
  totalReceberEmAberto: 0,
  totalPagarEmAberto: 0,
};

const AppHome = () => {
  const [resumo, setResumo] = useState(emptyResumo);

  useEffect(() => {
    const carregarResumo = async () => {
      try {
        const response = await fetch("/api/v1/dashboard/resumo");
        if (!response.ok) return;
        const result = await response.json();
        setResumo({
          clientesAtivos: Number(result.clientesAtivos) || 0,
          fornecedoresAtivos: Number(result.fornecedoresAtivos) || 0,
          totalVendas: Number(result.totalVendas) || 0,
          totalReceberEmAberto: Number(result.totalReceberEmAberto) || 0,
          totalPagarEmAberto: Number(result.totalPagarEmAberto) || 0,
        });
      } catch (error) {
        return;
      }
    };

    carregarResumo();
  }, []);

  return (
    <AppLayout>
      <Stack spacing={3}>
        <Typography variant="h4" fontWeight={700}>
          Visão geral do negócio
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={3}>
            <InfoCard
              title="Clientes"
              value={resumo.clientesAtivos}
              subtitle="cadastros ativos"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <InfoCard
              title="Fornecedores"
              value={resumo.fornecedoresAtivos}
              subtitle="parceiros cadastrados"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <InfoCard
              title="Vendas"
              value={formatCurrency(resumo.totalVendas)}
              subtitle="total"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <InfoCard
              title="Recebíveis"
              value={formatCurrency(resumo.totalReceberEmAberto)}
              subtitle="em aberto"
            />
          </Grid>
        </Grid>
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <InfoCard
              title="Contas a pagar"
              value={formatCurrency(resumo.totalPagarEmAberto)}
              subtitle="em aberto"
            />
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
