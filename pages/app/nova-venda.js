import {
  Box,
  Button,
  Chip,
  Divider,
  Drawer,
  Grid,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useMemo, useState } from "react";
import AppLayout from "../../components/template/AppLayout";
import PageHeader from "../../components/atomic/PageHeader";
import { useDataStore } from "../../hooks/useDataStore";
import { formatCurrency, formatDate } from "../../utils/format";
import { getCustoMedio } from "../../utils/stock";

const NovaVendaPage = () => {
  const clientes = useDataStore((state) => state.clientes);
  const fornecedores = useDataStore((state) => state.fornecedores);
  const tiposCafe = useDataStore((state) => state.tiposCafe);
  const movimentos = useDataStore((state) => state.movLotes);
  const vendas = useDataStore((state) => state.vendas);
  const addVenda = useDataStore((state) => state.addVenda);
  const confirmarEntregaVenda = useDataStore(
    (state) => state.confirmarEntregaVenda,
  );

  const [clienteId, setClienteId] = useState("");
  const [parcelas, setParcelas] = useState(1);
  const [obs, setObs] = useState("");
  const [dataProgramadaEntrega, setDataProgramadaEntrega] = useState("");
  const [item, setItem] = useState({
    tipo_cafe_id: "",
    quantidade: "",
    preco_unit: "",
  });
  const [itens, setItens] = useState([]);

  const [vendaSelecionada, setVendaSelecionada] = useState(null);
  const [dataEntrega, setDataEntrega] = useState("");
  const [adicionarDespesa, setAdicionarDespesa] = useState(false);
  const [despesa, setDespesa] = useState({
    fornecedor_id: "",
    valor: "",
    data: "",
    descricao: "",
    status_pagamento: "A_PRAZO",
  });

  const vendasProgramadas = useMemo(
    () =>
      vendas.filter(
        (venda) =>
          venda.data_programada_entrega && venda.status_entrega !== "ENTREGUE",
      ),
    [vendas],
  );

  const total = itens.reduce(
    (acc, current) => acc + current.quantidade * current.preco_unit,
    0,
  );

  const addItem = () => {
    if (!item.tipo_cafe_id || !item.quantidade || !item.preco_unit) return;
    const custoUnit = getCustoMedio(
      movimentos,
      (mov) => mov.tipo_cafe_id === item.tipo_cafe_id,
    );
    setItens((prev) => [
      ...prev,
      {
        ...item,
        quantidade: Number(item.quantidade),
        preco_unit: Number(item.preco_unit),
        custo_unit: custoUnit,
      },
    ]);
    setItem({ tipo_cafe_id: "", quantidade: "", preco_unit: "" });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!clienteId || !itens.length) return;
    await addVenda({
      cliente_id: clienteId,
      itens,
      parcelas_qtd: Number(parcelas),
      obs,
      data_programada_entrega: dataProgramadaEntrega || null,
    });
    setClienteId("");
    setParcelas(1);
    setObs("");
    setDataProgramadaEntrega("");
    setItens([]);
  };

  const abrirConfirmacao = (venda) => {
    setVendaSelecionada(venda);
    setDataEntrega(venda.data_programada_entrega || "");
    setAdicionarDespesa(false);
    setDespesa({
      fornecedor_id: "",
      valor: "",
      data: venda.data_programada_entrega || "",
      descricao: "",
      status_pagamento: "A_PRAZO",
    });
  };

  const handleConfirmarEntrega = async () => {
    if (!vendaSelecionada || !dataEntrega) return;

    const custosExtras = adicionarDespesa
      ? [
          {
            fornecedor_id: despesa.fornecedor_id,
            valor: Number(despesa.valor),
            data: despesa.data || dataEntrega,
            descricao: despesa.descricao,
            status_pagamento: despesa.status_pagamento,
          },
        ]
      : [];

    if (
      adicionarDespesa &&
      (!despesa.fornecedor_id ||
        !despesa.valor ||
        !despesa.data ||
        !despesa.descricao)
    ) {
      return;
    }

    await confirmarEntregaVenda({
      venda_id: vendaSelecionada.id,
      data_entrega: dataEntrega,
      custos_extras: custosExtras,
    });
    setVendaSelecionada(null);
  };

  return (
    <AppLayout>
      <PageHeader
        title="Nova Venda"
        subtitle="Registre vendas, programe entrega e confirme pendências."
      />
      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Programadas e não entregues
            </Typography>
            <Stack spacing={1.5}>
              {vendasProgramadas.map((venda) => (
                <Paper key={venda.id} variant="outlined" sx={{ p: 2 }}>
                  <Stack spacing={1}>
                    <Typography fontWeight={600}>
                      Venda #{venda.id.slice(0, 6)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Cliente:{" "}
                      {clientes.find(
                        (cliente) => cliente.id === venda.cliente_id,
                      )?.nome || "-"}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Programada: {formatDate(venda.data_programada_entrega)}
                    </Typography>
                    <Button
                      variant="contained"
                      size="small"
                      onClick={() => abrirConfirmacao(venda)}
                    >
                      Confirmar entrega
                    </Button>
                  </Stack>
                </Paper>
              ))}
              {!vendasProgramadas.length ? (
                <Typography variant="body2" color="text.secondary">
                  Não há vendas programadas pendentes.
                </Typography>
              ) : null}
            </Stack>
          </Paper>
        </Grid>
        <Grid item xs={12} md={8}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Dados da venda
                </Typography>
                <Box component="form" onSubmit={handleSubmit}>
                  <Stack spacing={2}>
                    <TextField
                      select
                      label="Cliente"
                      value={clienteId}
                      onChange={(event) => setClienteId(event.target.value)}
                      required
                    >
                      {clientes.map((cliente) => (
                        <MenuItem key={cliente.id} value={cliente.id}>
                          {cliente.nome}
                        </MenuItem>
                      ))}
                    </TextField>
                    <TextField
                      label="Data programada para entrega"
                      type="date"
                      value={dataProgramadaEntrega}
                      onChange={(event) =>
                        setDataProgramadaEntrega(event.target.value)
                      }
                      InputLabelProps={{ shrink: true }}
                    />
                    <TextField
                      select
                      label="Tipo de café"
                      value={item.tipo_cafe_id}
                      onChange={(event) =>
                        setItem((prev) => ({
                          ...prev,
                          tipo_cafe_id: event.target.value,
                        }))
                      }
                    >
                      {tiposCafe.map((tipo) => (
                        <MenuItem key={tipo.id} value={tipo.id}>
                          {tipo.nome}
                        </MenuItem>
                      ))}
                    </TextField>
                    <TextField
                      label="Quantidade"
                      type="number"
                      value={item.quantidade}
                      onChange={(event) =>
                        setItem((prev) => ({
                          ...prev,
                          quantidade: event.target.value,
                        }))
                      }
                    />
                    <TextField
                      label="Preço unitário"
                      type="number"
                      value={item.preco_unit}
                      onChange={(event) =>
                        setItem((prev) => ({
                          ...prev,
                          preco_unit: event.target.value,
                        }))
                      }
                    />
                    <Button variant="outlined" onClick={addItem}>
                      Adicionar item
                    </Button>
                    <Divider />
                    <TextField
                      label="Parcelas"
                      type="number"
                      value={parcelas}
                      onChange={(event) => setParcelas(event.target.value)}
                    />
                    <TextField
                      label="Observações"
                      value={obs}
                      onChange={(event) => setObs(event.target.value)}
                      multiline
                      rows={2}
                    />
                    <Button type="submit" variant="contained">
                      Registrar venda ({formatCurrency(total)})
                    </Button>
                  </Stack>
                </Box>
              </Paper>
            </Grid>
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Itens da venda
                </Typography>
                <Stack spacing={1}>
                  {itens.map((current, index) => (
                    <Typography
                      key={`${current.tipo_cafe_id}-${index}`}
                      variant="body2"
                    >
                      {
                        tiposCafe.find(
                          (tipo) => tipo.id === current.tipo_cafe_id,
                        )?.nome
                      }{" "}
                      • {current.quantidade} x{" "}
                      {formatCurrency(current.preco_unit)}
                    </Typography>
                  ))}
                  {!itens.length ? (
                    <Typography variant="body2" color="text.secondary">
                      Adicione tipos de café para compor a venda.
                    </Typography>
                  ) : null}
                </Stack>
              </Paper>
            </Grid>
          </Grid>
        </Grid>
      </Grid>
      <Drawer
        anchor="right"
        open={Boolean(vendaSelecionada)}
        onClose={() => setVendaSelecionada(null)}
        PaperProps={{ sx: { width: { xs: "100%", md: "48%" }, p: 3 } }}
      >
        <Typography variant="h5" fontWeight={700} gutterBottom>
          Confirmação de entrega
        </Typography>
        {vendaSelecionada ? (
          <Stack spacing={2}>
            <Typography variant="body2" color="text.secondary">
              Venda #{vendaSelecionada.id.slice(0, 6)}
            </Typography>
            <Typography variant="body2">
              Cliente:{" "}
              {clientes.find(
                (cliente) => cliente.id === vendaSelecionada.cliente_id,
              )?.nome || "-"}
            </Typography>
            <Typography variant="body2">
              Valor total: {formatCurrency(vendaSelecionada.valor_total)}
            </Typography>
            <Chip
              label={vendaSelecionada.status_entrega || "PENDENTE"}
              color={
                vendaSelecionada.status_entrega === "ENTREGUE"
                  ? "success"
                  : "warning"
              }
            />
            <TextField
              label="Data da Entrega"
              type="date"
              value={dataEntrega}
              onChange={(event) => setDataEntrega(event.target.value)}
              InputLabelProps={{ shrink: true }}
              required
            />
            <Button
              variant={adicionarDespesa ? "contained" : "outlined"}
              onClick={() => setAdicionarDespesa((prev) => !prev)}
            >
              + Despesas extras
            </Button>
            {adicionarDespesa ? (
              <Stack spacing={2}>
                <TextField
                  select
                  label="Fornecedor"
                  value={despesa.fornecedor_id}
                  onChange={(event) =>
                    setDespesa((prev) => ({
                      ...prev,
                      fornecedor_id: event.target.value,
                    }))
                  }
                  required
                >
                  {fornecedores.map((fornecedor) => (
                    <MenuItem key={fornecedor.id} value={fornecedor.id}>
                      {fornecedor.razao_social}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  label="Valor"
                  type="number"
                  value={despesa.valor}
                  onChange={(event) =>
                    setDespesa((prev) => ({
                      ...prev,
                      valor: event.target.value,
                    }))
                  }
                  required
                />
                <TextField
                  label="Data"
                  type="date"
                  value={despesa.data}
                  onChange={(event) =>
                    setDespesa((prev) => ({
                      ...prev,
                      data: event.target.value,
                    }))
                  }
                  InputLabelProps={{ shrink: true }}
                  required
                />
                <TextField
                  label="Descrição"
                  value={despesa.descricao}
                  onChange={(event) =>
                    setDespesa((prev) => ({
                      ...prev,
                      descricao: event.target.value,
                    }))
                  }
                  required
                />
                <TextField
                  select
                  label="Status pagamento"
                  value={despesa.status_pagamento}
                  onChange={(event) =>
                    setDespesa((prev) => ({
                      ...prev,
                      status_pagamento: event.target.value,
                    }))
                  }
                  required
                >
                  <MenuItem value="A_PRAZO">A prazo</MenuItem>
                  <MenuItem value="A_VISTA">A vista</MenuItem>
                </TextField>
              </Stack>
            ) : null}
            <Button variant="contained" onClick={handleConfirmarEntrega}>
              Confirmar entrega
            </Button>
          </Stack>
        ) : null}
      </Drawer>
    </AppLayout>
  );
};

export default NovaVendaPage;
