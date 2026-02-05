import { Button, Grid, Paper, Stack, Typography } from "@mui/material";
import AppLayout from "../../components/template/AppLayout";
import PageHeader from "../../components/atomic/PageHeader";
import { useDataStore } from "../../hooks/useDataStore";
import { formatCurrency, formatDate } from "../../utils/format";

const ContasReceberPage = () => {
  const contas = useDataStore((state) => state.contasReceber);
  const parcelas = useDataStore((state) => state.contasReceberParcelas);
  const clientes = useDataStore((state) => state.clientes);
  const marcarParcelaRecebida = useDataStore((state) => state.marcarParcelaRecebida);

  return (
    <AppLayout>
      <PageHeader
        title="Contas a Receber"
        subtitle="Acompanhe recebíveis e confirme pagamentos." 
      />
      <Grid container spacing={3}>
        <Grid item xs={12} md={5}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Contas
            </Typography>
            <Stack spacing={2}>
              {contas.map((conta) => (
                <Paper key={conta.id} variant="outlined" sx={{ p: 2 }}>
                  <Typography fontWeight={600}>Conta #{conta.id.slice(0, 6)}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Cliente: {clientes.find((item) => item.id === conta.cliente_id)?.nome || "-"}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Valor: {formatCurrency(conta.valor_total)} • Emissão: {formatDate(conta.data_emissao)}
                  </Typography>
                </Paper>
              ))}
              {!contas.length ? (
                <Typography variant="body2" color="text.secondary">
                  Nenhuma conta a receber registrada.
                </Typography>
              ) : null}
            </Stack>
          </Paper>
        </Grid>
        <Grid item xs={12} md={7}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Parcelas
            </Typography>
            <Stack spacing={2}>
              {parcelas.map((parcela) => (
                <Paper key={parcela.id} variant="outlined" sx={{ p: 2 }}>
                  <Stack spacing={1}>
                    <Typography fontWeight={600}>Parcela #{parcela.parcela_num}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Vencimento: {formatDate(parcela.vencimento)} • {formatCurrency(parcela.valor)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Status: {parcela.status}
                    </Typography>
                    {parcela.status === "ABERTA" ? (
                      <Button variant="contained" onClick={() => marcarParcelaRecebida(parcela.id)}>
                        Confirmar recebimento
                      </Button>
                    ) : null}
                  </Stack>
                </Paper>
              ))}
              {!parcelas.length ? (
                <Typography variant="body2" color="text.secondary">
                  Nenhuma parcela registrada.
                </Typography>
              ) : null}
            </Stack>
          </Paper>
        </Grid>
      </Grid>
    </AppLayout>
  );
};

export default ContasReceberPage;
