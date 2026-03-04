import {
  Box,
  Button,
  Chip,
  Drawer,
  Grid,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import { useMemo, useState } from "react";
import AppLayout from "../../components/template/AppLayout";
import PageHeader from "../../components/atomic/PageHeader";
import { useDataStore } from "../../hooks/useDataStore";
import { formatCurrency, formatDate } from "../../utils/format";

const todayDate = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const createDespesa = () => ({
  id: crypto.randomUUID(),
  fornecedor_id: "",
  descricao: "",
  valor: "",
  data: todayDate(),
  status_pagamento: "A_PRAZO",
  forma_pagamento: "TRANSFERENCIA",
});

const VendasPage = () => {
  const vendas = useDataStore((state) => state.vendas);
  const clientes = useDataStore((state) => state.clientes);
  const fornecedores = useDataStore((state) => state.fornecedores);
  const confirmarEntregaVenda = useDataStore((state) => state.confirmarEntregaVenda);

  const [vendaSelecionada, setVendaSelecionada] = useState(null);
  const [dataEntrega, setDataEntrega] = useState(todayDate());
  const [despesas, setDespesas] = useState([]);

  const vendasPendentes = useMemo(
    () => vendas.filter((venda) => venda.status_entrega !== "ENTREGUE"),
    [vendas],
  );

  const abrirFinalizacao = (venda) => {
    setVendaSelecionada(venda);
    setDataEntrega(venda.data_programada_entrega || todayDate());
    setDespesas([]);
  };

  const handleDespesaChange = (id, field, value) => {
    setDespesas((prev) =>
      prev.map((despesa) =>
        despesa.id === id ? { ...despesa, [field]: value } : despesa,
      ),
    );
  };

  const finalizarEntrega = async () => {
    if (!vendaSelecionada || !dataEntrega) return;

    const custosValidos = despesas
      .map((despesa) => ({
        ...despesa,
        valor: Number(despesa.valor) || 0,
      }))
      .filter(
        (despesa) =>
          despesa.fornecedor_id &&
          despesa.valor > 0 &&
          despesa.descricao,
      );

    await confirmarEntregaVenda({
      venda_id: vendaSelecionada.id,
      data_entrega: dataEntrega,
      custos_extras: custosValidos,
    });

    setVendaSelecionada(null);
    setDataEntrega(todayDate());
    setDespesas([]);
  };

  return (
    <AppLayout>
      <PageHeader
        title="Gestão de Vendas"
        subtitle="Acompanhe entregas pendentes e finalize com custos extras quando necessário."
      />

      <Grid container spacing={2}>
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Entregas pendentes
            </Typography>
            <Stack spacing={2}>
              {vendasPendentes.map((venda) => (
                <Paper key={venda.id} variant="outlined" sx={{ p: 2 }}>
                  <Stack
                    direction={{ xs: "column", md: "row" }}
                    justifyContent="space-between"
                    alignItems={{ xs: "flex-start", md: "center" }}
                    spacing={2}
                  >
                    <Box>
                      <Typography fontWeight={700}>Venda #{venda.id.slice(0, 8)}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        Cliente: {clientes.find((cliente) => cliente.id === venda.cliente_id)?.nome || "-"}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Programada: {venda.data_programada_entrega ? formatDate(venda.data_programada_entrega) : "-"}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Valor: {formatCurrency(venda.valor_total)}
                      </Typography>
                    </Box>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Chip label={venda.status_entrega || "PENDENTE"} color="warning" />
                      <Button variant="contained" onClick={() => abrirFinalizacao(venda)}>
                        Finalizar entrega
                      </Button>
                    </Stack>
                  </Stack>
                </Paper>
              ))}

              {!vendasPendentes.length ? (
                <Typography variant="body2" color="text.secondary">
                  Não há entregas pendentes.
                </Typography>
              ) : null}
            </Stack>
          </Paper>
        </Grid>
      </Grid>

      <Drawer
        anchor="right"
        open={Boolean(vendaSelecionada)}
        onClose={() => setVendaSelecionada(null)}
        PaperProps={{ sx: { width: { xs: "100%", md: "46%" }, p: 3 } }}
      >
        <Typography variant="h6" fontWeight={700} gutterBottom>
          Finalizar entrega
        </Typography>
        {vendaSelecionada ? (
          <Stack spacing={2}>
            <Typography variant="body2" color="text.secondary">
              Venda #{vendaSelecionada.id.slice(0, 8)}
            </Typography>
            <Typography variant="body2">
              Cliente: {clientes.find((cliente) => cliente.id === vendaSelecionada.cliente_id)?.nome || "-"}
            </Typography>
            <Typography variant="body2">Valor: {formatCurrency(vendaSelecionada.valor_total)}</Typography>

            <TextField
              label="Data da entrega"
              type="date"
              value={dataEntrega}
              onChange={(event) => setDataEntrega(event.target.value)}
              InputLabelProps={{ shrink: true }}
            />

            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography fontWeight={600}>Custos extras (opcional)</Typography>
              <Button
                variant="outlined"
                startIcon={<AddIcon />}
                onClick={() => setDespesas((prev) => [...prev, createDespesa()])}
              >
                Adicionar
              </Button>
            </Stack>

            {despesas.map((despesa) => (
              <Paper key={despesa.id} variant="outlined" sx={{ p: 2 }}>
                <Grid container spacing={1.5}>
                  <Grid item xs={12} md={6}>
                    <TextField
                      select
                      label="Fornecedor"
                      value={despesa.fornecedor_id}
                      onChange={(event) =>
                        handleDespesaChange(despesa.id, "fornecedor_id", event.target.value)
                      }
                      fullWidth
                    >
                      {fornecedores.map((fornecedor) => (
                        <MenuItem key={fornecedor.id} value={fornecedor.id}>
                          {fornecedor.razao_social}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      label="Descrição"
                      value={despesa.descricao}
                      onChange={(event) =>
                        handleDespesaChange(despesa.id, "descricao", event.target.value)
                      }
                      fullWidth
                    />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <TextField
                      label="Valor"
                      type="number"
                      value={despesa.valor}
                      onChange={(event) =>
                        handleDespesaChange(despesa.id, "valor", event.target.value)
                      }
                      fullWidth
                    />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <TextField
                      label="Data de pagamento"
                      type="date"
                      value={despesa.data}
                      onChange={(event) =>
                        handleDespesaChange(despesa.id, "data", event.target.value)
                      }
                      InputLabelProps={{ shrink: true }}
                      fullWidth
                    />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <TextField
                      select
                      label="Status"
                      value={despesa.status_pagamento}
                      onChange={(event) =>
                        handleDespesaChange(despesa.id, "status_pagamento", event.target.value)
                      }
                      fullWidth
                    >
                      <MenuItem value="A_PRAZO">A prazo</MenuItem>
                      <MenuItem value="A_VISTA">Pago na hora</MenuItem>
                      </TextField>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <TextField
                      label="Método pagamento"
                      value={despesa.forma_pagamento}
                      onChange={(event) =>
                        handleDespesaChange(despesa.id, "forma_pagamento", event.target.value)
                      }
                      fullWidth
                    />
                  </Grid>
                </Grid>
              </Paper>
            ))}

            <Stack direction="row" spacing={1} justifyContent="flex-end">
              <Button variant="outlined" onClick={() => setVendaSelecionada(null)}>
                Cancelar
              </Button>
              <Button variant="contained" onClick={finalizarEntrega}>
                Confirmar entrega
              </Button>
            </Stack>
          </Stack>
        ) : null}
      </Drawer>
    </AppLayout>
  );
};

export default VendasPage;
