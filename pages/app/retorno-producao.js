import {
  Box,
  Button,
  Grid,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import { useMemo, useState } from "react";
import AppLayout from "../../components/template/AppLayout";
import PageHeader from "../../components/atomic/PageHeader";
import { useDataStore } from "../../hooks/useDataStore";
import { formatDate } from "../../utils/format";

const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const createCustoAdicional = () => ({
  fornecedor_id: "",
  descricao: "",
  valor: "",
  status_pagamento: "PENDENTE",
  forma_pagamento: "",
});

const RetornoProducaoPage = () => {
  const insumos = useDataStore((state) => state.insumos);
  const fornecedores = useDataStore((state) => state.fornecedores);
  const producoes = useDataStore((state) => state.producoes);
  const detalhesProducao = useDataStore((state) => state.detalhesProducao);
  const confirmarRetornoProducao = useDataStore(
    (state) => state.confirmarRetornoProducao,
  );

  const [producaoConfirmadaId, setProducaoConfirmadaId] = useState("");
  const [pesoReal, setPesoReal] = useState("");
  const [taxaReal, setTaxaReal] = useState("");
  const [obsRetorno, setObsRetorno] = useState("");
  const [custosAdicionais, setCustosAdicionais] = useState([
    createCustoAdicional(),
  ]);

  const producoesPendentes = useMemo(
    () => producoes.filter((producao) => Number(producao.status) === 1),
    [producoes],
  );

  const producaoConfirmada = useMemo(
    () => producoesPendentes.find((item) => item.id === producaoConfirmadaId),
    [producoesPendentes, producaoConfirmadaId],
  );

  const detalhesDaProducaoConfirmada = useMemo(
    () =>
      detalhesProducao.filter(
        (detalhe) => detalhe.producao_id === producaoConfirmadaId,
      ),
    [detalhesProducao, producaoConfirmadaId],
  );

  const resetFormulario = () => {
    setPesoReal("");
    setTaxaReal("");
    setObsRetorno("");
    setCustosAdicionais([createCustoAdicional()]);
  };

  const handleChangeCusto = (index, field, value) => {
    setCustosAdicionais((prev) =>
      prev.map((item, currentIndex) =>
        currentIndex === index ? { ...item, [field]: value } : item,
      ),
    );
  };

  const handleSelecionarProducao = (producaoId) => {
    if (!producaoId) return;
    setProducaoConfirmadaId(producaoId);
    resetFormulario();
  };

  const handleConfirmarRetorno = async (event) => {
    event.preventDefault();
    if (!producaoConfirmadaId || toNumber(pesoReal) <= 0) return;

    const custosValidos = custosAdicionais
      .map((item) => ({
        ...item,
        valor: toNumber(item.valor),
      }))
      .filter((item) => item.valor > 0 && item.descricao);

    await confirmarRetornoProducao({
      producao_id: producaoConfirmadaId,
      peso_real: toNumber(pesoReal),
      taxa_conversao_real: toNumber(taxaReal) || null,
      custos_adicionais: custosValidos,
      obs: obsRetorno,
    });

    setProducaoConfirmadaId("");
    resetFormulario();
  };

  return (
    <AppLayout>
      <PageHeader
        title="Retorno da Produção"
        subtitle="Etapa 2: confirmar retorno, custos e entrada do produto final."
      />
      <Grid container spacing={3}>
        <Grid item xs={12} lg={8}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Produções pendentes
            </Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>ID</TableCell>
                    <TableCell>Data</TableCell>
                    <TableCell align="right">Peso previsto (kg)</TableCell>
                    <TableCell align="right">Ação</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {producoesPendentes.length > 0 ? (
                    producoesPendentes.map((item) => {
                      const linhaSelecionada = item.id === producaoConfirmadaId;
                      return (
                        <TableRow key={item.id} selected={linhaSelecionada}>
                          <TableCell>{item.id.slice(0, 8)}</TableCell>
                          <TableCell>
                            {formatDate(item.data_producao)}
                          </TableCell>
                          <TableCell align="right">
                            {toNumber(item.peso_previsto).toFixed(2)}
                          </TableCell>
                          <TableCell align="right">
                            <Button
                              variant={
                                linhaSelecionada ? "outlined" : "contained"
                              }
                              onClick={() => handleSelecionarProducao(item.id)}
                            >
                              Confirmar retorno
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} align="center">
                        Nenhuma produção pendente para retorno.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>

        {producaoConfirmada ? (
          <Grid item xs={12} lg={8}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Retorno de Produção
              </Typography>
              <Box component="form" onSubmit={handleConfirmarRetorno}>
                <Stack spacing={2}>
                  <Paper variant="outlined" sx={{ p: 2 }}>
                    <Typography variant="body2" fontWeight={600}>
                      Produção confirmada: {producaoConfirmada.id.slice(0, 8)}
                    </Typography>
                    <Typography variant="body2" fontWeight={600}>
                      Peso previsto:{" "}
                      {toNumber(producaoConfirmada.peso_previsto).toFixed(2)} kg
                    </Typography>
                    {detalhesDaProducaoConfirmada.map((detalhe) => {
                      const insumo = insumos.find(
                        (item) => item.id === detalhe.insumo_id,
                      );
                      return (
                        <Typography
                          key={detalhe.id}
                          variant="caption"
                          display="block"
                        >
                          {insumo?.nome || "Insumo"}:{" "}
                          {toNumber(detalhe.quantidade_kg).toFixed(2)} kg
                        </Typography>
                      );
                    })}
                  </Paper>

                  <TextField
                    label="Peso real gerado (kg)"
                    type="number"
                    value={pesoReal}
                    onChange={(event) => setPesoReal(event.target.value)}
                    required
                  />
                  <TextField
                    label="Taxa de conversão real (%)"
                    type="number"
                    value={taxaReal}
                    onChange={(event) => setTaxaReal(event.target.value)}
                  />

                  <Typography variant="subtitle2">Custos adicionais</Typography>
                  {custosAdicionais.map((custo, index) => (
                    <Paper
                      key={`custo-${index}`}
                      variant="outlined"
                      sx={{ p: 2 }}
                    >
                      <Grid container spacing={1.5}>
                        <Grid item xs={12}>
                          <TextField
                            select
                            label="Fornecedor"
                            value={custo.fornecedor_id}
                            onChange={(event) =>
                              handleChangeCusto(
                                index,
                                "fornecedor_id",
                                event.target.value,
                              )
                            }
                            fullWidth
                          >
                            <MenuItem value="">Sem fornecedor</MenuItem>
                            {fornecedores.map((fornecedor) => (
                              <MenuItem
                                key={fornecedor.id}
                                value={fornecedor.id}
                              >
                                {fornecedor.razao_social}
                              </MenuItem>
                            ))}
                          </TextField>
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <TextField
                            label="Descrição"
                            value={custo.descricao}
                            onChange={(event) =>
                              handleChangeCusto(
                                index,
                                "descricao",
                                event.target.value,
                              )
                            }
                            fullWidth
                          />
                        </Grid>
                        <Grid item xs={12} md={3}>
                          <TextField
                            label="Valor"
                            type="number"
                            value={custo.valor}
                            onChange={(event) =>
                              handleChangeCusto(
                                index,
                                "valor",
                                event.target.value,
                              )
                            }
                            fullWidth
                          />
                        </Grid>
                        <Grid item xs={12} md={3}>
                          <TextField
                            select
                            label="Pagamento"
                            value={custo.status_pagamento}
                            onChange={(event) =>
                              handleChangeCusto(
                                index,
                                "status_pagamento",
                                event.target.value,
                              )
                            }
                            fullWidth
                          >
                            <MenuItem value="PENDENTE">Pendente</MenuItem>
                            <MenuItem value="A_VISTA">À vista</MenuItem>
                          </TextField>
                        </Grid>
                      </Grid>
                    </Paper>
                  ))}

                  <Button
                    variant="outlined"
                    startIcon={<AddIcon />}
                    onClick={() =>
                      setCustosAdicionais((prev) => [
                        ...prev,
                        createCustoAdicional(),
                      ])
                    }
                  >
                    Adicionar custo adicional
                  </Button>

                  <TextField
                    label="Observações do retorno"
                    value={obsRetorno}
                    onChange={(event) => setObsRetorno(event.target.value)}
                    multiline
                    rows={2}
                  />

                  <Button
                    type="submit"
                    variant="contained"
                    disabled={!producaoConfirmadaId || toNumber(pesoReal) <= 0}
                  >
                    Confirmar retorno (status 2)
                  </Button>
                </Stack>
              </Box>
            </Paper>
          </Grid>
        ) : null}
      </Grid>
    </AppLayout>
  );
};

export default RetornoProducaoPage;
