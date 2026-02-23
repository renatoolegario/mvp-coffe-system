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
  const cancelarProducao = useDataStore((state) => state.cancelarProducao);

  const [producaoConfirmadaId, setProducaoConfirmadaId] = useState("");
  const [sacosRetornados, setSacosRetornados] = useState("");
  const [obsRetorno, setObsRetorno] = useState("");
  const [custosAdicionais, setCustosAdicionais] = useState([
    createCustoAdicional(),
  ]);

  const producoesPendentes = useMemo(
    () => producoes.filter((producao) => producao.status === "PENDENTE"),
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

  const sacosPrevistos = useMemo(() => {
    const totalKg = detalhesDaProducaoConfirmada.reduce(
      (acc, detalhe) => acc + toNumber(detalhe.quantidade_kg),
      0,
    );
    return (totalKg * 0.75) / 23;
  }, [detalhesDaProducaoConfirmada]);

  const resetFormulario = () => {
    setSacosRetornados("");
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
    const sacos = toNumber(sacosRetornados);
    if (!producaoConfirmadaId || sacos <= 0) return;

    const custosValidos = custosAdicionais
      .map((item) => ({
        ...item,
        valor: toNumber(item.valor),
      }))
      .filter((item) => item.valor > 0 && item.descricao);

    await confirmarRetornoProducao({
      producao_id: producaoConfirmadaId,
      peso_real: sacos * 23,
      taxa_conversao_real: 0,
      custos_adicionais: custosValidos,
      obs: obsRetorno,
    });

    setProducaoConfirmadaId("");
    resetFormulario();
  };

  const handleCancelar = async () => {
    if (!producaoConfirmadaId) return;
    if (
      confirm(
        "Tem certeza que deseja cancelar (estornar) esta produção? Os insumos retornarão ao estoque disponível."
      )
    ) {
      await cancelarProducao(producaoConfirmadaId);
      setProducaoConfirmadaId("");
      resetFormulario();
    }
  };

  return (
    <AppLayout>
      <PageHeader
        title="Produções em Trânsito"
        subtitle="Etapa 2: Acompanhar ordens abertas, confirmar retorno, atualizar custos e dar entrada do produto final."
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
                      <TableCell colSpan={3} align="center">
                        Nenhuma produção em trânsito.
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
                      Produção (OP): {producaoConfirmada.id.slice(0, 8)}
                    </Typography>
                    <Typography variant="body2" color="primary" fontWeight={600} mb={1}>
                      Retorno esperado: ≈ {sacosPrevistos.toFixed(1)} sacos de 23kg
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
                    label="Quantidade de Sacos (23kg) recebidos"
                    type="number"
                    value={sacosRetornados}
                    onChange={(event) => setSacosRetornados(event.target.value)}
                    required
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
                    disabled={!producaoConfirmadaId || toNumber(sacosRetornados) <= 0}
                  >
                    Confirmar retorno (Concluída)
                  </Button>
                  <Button
                    type="button"
                    variant="outlined"
                    color="error"
                    disabled={!producaoConfirmadaId}
                    onClick={handleCancelar}
                  >
                    Cancelar / Estornar (Retornar Estoque)
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
