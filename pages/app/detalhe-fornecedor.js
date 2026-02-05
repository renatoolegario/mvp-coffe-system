import { Box, Grid, MenuItem, Paper, Stack, TextField, Typography } from "@mui/material";
import { useMemo, useState } from "react";
import AppLayout from "../../components/template/AppLayout";
import PageHeader from "../../components/atomic/PageHeader";
import { useDataStore } from "../../hooks/useDataStore";
import { formatCurrency, formatDate } from "../../utils/format";

const DetalheFornecedorPage = () => {
  const fornecedores = useDataStore((state) => state.fornecedores);
  const contasPagar = useDataStore((state) => state.contasPagar);
  const parcelas = useDataStore((state) => state.contasPagarParcelas);
  const [fornecedorId, setFornecedorId] = useState("");

  const fornecedorContas = useMemo(
    () => contasPagar.filter((conta) => conta.fornecedor_id === fornecedorId),
    [contasPagar, fornecedorId]
  );
  const fornecedorParcelas = useMemo(
    () =>
      parcelas.filter((parcela) =>
        fornecedorContas.some((conta) => conta.id === parcela.conta_pagar_id)
      ),
    [parcelas, fornecedorContas]
  );

  return (
    <AppLayout>
      <PageHeader
        title="Detalhe do Fornecedor"
        subtitle="Histórico de compras e pagamentos."
      />
      <Box maxWidth={400} mb={3}>
        <TextField
          select
          label="Selecione o fornecedor"
          value={fornecedorId}
          onChange={(event) => setFornecedorId(event.target.value)}
          fullWidth
        >
          {fornecedores.map((fornecedor) => (
            <MenuItem key={fornecedor.id} value={fornecedor.id}>
              {fornecedor.razao_social}
            </MenuItem>
          ))}
        </TextField>
      </Box>
      {fornecedorId ? (
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Compras registradas
              </Typography>
              <Stack spacing={2}>
                {fornecedorContas.map((conta) => (
                  <Paper key={conta.id} variant="outlined" sx={{ p: 2 }}>
                    <Typography fontWeight={600}>Conta #{conta.id.slice(0, 6)}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Emissão: {formatDate(conta.data_emissao)} • {formatCurrency(conta.valor_total)}
                    </Typography>
                  </Paper>
                ))}
                {!fornecedorContas.length ? (
                  <Typography variant="body2" color="text.secondary">
                    Nenhuma compra registrada.
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
              <Stack spacing={2}>
                {fornecedorParcelas.map((parcela) => (
                  <Paper key={parcela.id} variant="outlined" sx={{ p: 2 }}>
                    <Typography fontWeight={600}>Parcela #{parcela.parcela_num}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Vencimento: {formatDate(parcela.vencimento)} • {formatCurrency(parcela.valor)} • {parcela.status}
                    </Typography>
                  </Paper>
                ))}
                {!fornecedorParcelas.length ? (
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
          Selecione um fornecedor para visualizar o histórico.
        </Typography>
      )}
    </AppLayout>
  );
};

export default DetalheFornecedorPage;
