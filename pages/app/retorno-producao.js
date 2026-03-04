import {
  Box,
  Button,
  Chip,
  Divider,
  Drawer,
  Grid,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import CloseIcon from "@mui/icons-material/Close";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import { useMemo, useState } from "react";
import AppLayout from "../../components/template/AppLayout";
import PageHeader from "../../components/atomic/PageHeader";
import { useDataStore } from "../../hooks/useDataStore";
import { formatCurrency, formatDate } from "../../utils/format";

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

const getStatusLabel = (status) => {
  switch (String(status || "").toUpperCase()) {
    case "PENDENTE":
      return "Pendente";
    case "CONCLUIDA":
      return "Concluída";
    case "CANCELADA":
      return "Cancelada";
    default:
      return status || "-";
  }
};

const getStatusColor = (status) => {
  switch (String(status || "").toUpperCase()) {
    case "CONCLUIDA":
      return "success";
    case "CANCELADA":
      return "error";
    default:
      return "warning";
  }
};

const RetornoProducaoPage = () => {
  const insumos = useDataStore((state) => state.insumos);
  const fornecedores = useDataStore((state) => state.fornecedores);
  const producoes = useDataStore((state) => state.producoes);
  const detalhesProducao = useDataStore((state) => state.detalhesProducao);
  const custosAdicionaisProducao = useDataStore(
    (state) => state.custosAdicionaisProducao,
  );
  const confirmarRetornoProducao = useDataStore(
    (state) => state.confirmarRetornoProducao,
  );
  const cancelarProducao = useDataStore((state) => state.cancelarProducao);

  const [tabAtiva, setTabAtiva] = useState("pendentes");
  const [drawerAberto, setDrawerAberto] = useState(false);
  const [drawerMode, setDrawerMode] = useState("retorno");
  const [producaoSelecionadaId, setProducaoSelecionadaId] = useState("");
  const [idCopiado, setIdCopiado] = useState("");
  const [sacosRetornados, setSacosRetornados] = useState("");
  const [obsRetorno, setObsRetorno] = useState("");
  const [custosAdicionais, setCustosAdicionais] = useState([
    createCustoAdicional(),
  ]);

  const producoesPendentes = useMemo(
    () => producoes.filter((producao) => producao.status === "PENDENTE"),
    [producoes],
  );

  const producoesHistorico = useMemo(
    () => producoes.filter((producao) => producao.status !== "PENDENTE"),
    [producoes],
  );

  const producaoSelecionada = useMemo(
    () => producoes.find((item) => item.id === producaoSelecionadaId),
    [producoes, producaoSelecionadaId],
  );

  const detalhesDaProducaoSelecionada = useMemo(
    () =>
      detalhesProducao.filter(
        (detalhe) => detalhe.producao_id === producaoSelecionadaId,
      ),
    [detalhesProducao, producaoSelecionadaId],
  );

  const custosDaProducaoSelecionada = useMemo(
    () =>
      custosAdicionaisProducao.filter(
        (custo) => custo.producao_id === producaoSelecionadaId,
      ),
    [custosAdicionaisProducao, producaoSelecionadaId],
  );

  const insumoFinalSelecionado = useMemo(
    () => insumos.find((item) => item.id === producaoSelecionada?.insumo_final_id),
    [insumos, producaoSelecionada],
  );

  const sacosPrevistos = useMemo(() => {
    const totalKg = detalhesDaProducaoSelecionada.reduce(
      (acc, detalhe) => acc + toNumber(detalhe.quantidade_kg),
      0,
    );
    return (totalKg * 0.75) / 23;
  }, [detalhesDaProducaoSelecionada]);

  const totalCustosAdicionais = useMemo(
    () =>
      custosDaProducaoSelecionada.reduce(
        (total, item) => total + toNumber(item.valor),
        0,
      ),
    [custosDaProducaoSelecionada],
  );

  const resetFormulario = () => {
    setSacosRetornados("");
    setObsRetorno("");
    setCustosAdicionais([createCustoAdicional()]);
  };

  const fecharDrawer = () => {
    setDrawerAberto(false);
    setDrawerMode("retorno");
    setProducaoSelecionadaId("");
    resetFormulario();
  };

  const handleChangeCusto = (index, field, value) => {
    setCustosAdicionais((prev) =>
      prev.map((item, currentIndex) =>
        currentIndex === index ? { ...item, [field]: value } : item,
      ),
    );
  };

  const handleSelecionarProducaoParaRetorno = (producaoId) => {
    if (!producaoId) return;
    setDrawerMode("retorno");
    setProducaoSelecionadaId(producaoId);
    setDrawerAberto(true);
    resetFormulario();
  };

  const handleVerDetalhes = (producaoId) => {
    if (!producaoId) return;
    setDrawerMode("detalhes");
    setProducaoSelecionadaId(producaoId);
    setDrawerAberto(true);
  };

  const handleCopiarId = async (producaoId) => {
    if (!producaoId) return;
    try {
      await navigator.clipboard.writeText(producaoId);
    } catch (error) {
      const input = document.createElement("textarea");
      input.value = producaoId;
      input.style.position = "fixed";
      input.style.opacity = "0";
      document.body.appendChild(input);
      input.focus();
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
    }
    setIdCopiado(producaoId);
    setTimeout(() => setIdCopiado(""), 1200);
  };

  const handleConfirmarRetorno = async (event) => {
    event.preventDefault();
    const sacos = toNumber(sacosRetornados);
    if (!producaoSelecionadaId || sacos <= 0) return;

    const custosValidos = custosAdicionais
      .map((item) => ({
        ...item,
        valor: toNumber(item.valor),
      }))
      .filter((item) => item.valor > 0 && item.descricao);

    await confirmarRetornoProducao({
      producao_id: producaoSelecionadaId,
      peso_real: sacos * 23,
      taxa_conversao_real: 0,
      custos_adicionais: custosValidos,
      obs: obsRetorno,
    });

    fecharDrawer();
  };

  const handleCancelar = async () => {
    if (!producaoSelecionadaId) return;
    if (
      confirm(
        "Tem certeza que deseja cancelar (estornar) esta produção? Os insumos retornarão ao estoque disponível."
      )
    ) {
      await cancelarProducao(producaoSelecionadaId);
      fecharDrawer();
    }
  };

  const renderCellId = (producaoId) => (
    <Stack direction="row" spacing={0.5} alignItems="center">
      <Typography variant="body2" fontWeight={600}>
        {producaoId}
      </Typography>
      <Tooltip title={idCopiado === producaoId ? "Copiado!" : "Copiar ID"}>
        <IconButton size="small" onClick={() => handleCopiarId(producaoId)}>
          <ContentCopyIcon sx={{ fontSize: 16 }} />
        </IconButton>
      </Tooltip>
    </Stack>
  );

  return (
    <AppLayout>
      <PageHeader
        title="Produções em Trânsito"
        subtitle="Etapa 2: Acompanhar ordens abertas, confirmar retorno, atualizar custos e dar entrada do produto final."
      />
      <Paper sx={{ p: 2, mb: 3 }}>
        <Tabs value={tabAtiva} onChange={(_, value) => setTabAtiva(value)}>
          <Tab
            value="pendentes"
            label={`Produções pendentes (${producoesPendentes.length})`}
          />
          <Tab
            value="historico"
            label={`Histórico de Produções (${producoesHistorico.length})`}
          />
        </Tabs>
      </Paper>

      <Paper sx={{ p: 3 }}>
        <TableContainer>
          {tabAtiva === "pendentes" ? (
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
                  producoesPendentes.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{renderCellId(item.id)}</TableCell>
                      <TableCell>{formatDate(item.data_producao)}</TableCell>
                      <TableCell align="right">
                        <Stack
                          direction="row"
                          spacing={1}
                          justifyContent="flex-end"
                        >
                          <Button
                            size="small"
                            variant="contained"
                            startIcon={<CheckCircleOutlineIcon />}
                            onClick={() =>
                              handleSelecionarProducaoParaRetorno(item.id)
                            }
                          >
                            Confirmar retorno
                          </Button>
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<VisibilityOutlinedIcon />}
                            onClick={() => handleVerDetalhes(item.id)}
                          >
                            Detalhes
                          </Button>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={3} align="center">
                      Nenhuma produção em trânsito.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          ) : (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>ID</TableCell>
                  <TableCell>Data</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Ação</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {producoesHistorico.length > 0 ? (
                  producoesHistorico.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{renderCellId(item.id)}</TableCell>
                      <TableCell>{formatDate(item.data_producao)}</TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={getStatusLabel(item.status)}
                          color={getStatusColor(item.status)}
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<VisibilityOutlinedIcon />}
                          onClick={() => handleVerDetalhes(item.id)}
                        >
                          Detalhes
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} align="center">
                      Nenhum histórico de produção.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </TableContainer>
      </Paper>

      <Drawer
        anchor="right"
        open={drawerAberto}
        onClose={fecharDrawer}
        sx={{ zIndex: (theme) => theme.zIndex.tooltip + 1 }}
        PaperProps={{
          sx: {
            width: { xs: "100%", md: "30vw" },
            maxWidth: "100%",
            height: "100vh",
            p: 3,
          },
        }}
      >
        {producaoSelecionada ? (
          <Stack spacing={2}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="h6" fontWeight={700}>
                {drawerMode === "retorno"
                  ? "Retorno de Produção"
                  : "Detalhes da Produção"}
              </Typography>
              <IconButton onClick={fecharDrawer}>
                <CloseIcon />
              </IconButton>
            </Stack>

            <Paper variant="outlined" sx={{ p: 2 }}>
              <Stack spacing={1}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography variant="body2" fontWeight={700}>
                    OP: {producaoSelecionada.id}
                  </Typography>
                  <Chip
                    size="small"
                    label={getStatusLabel(producaoSelecionada.status)}
                    color={getStatusColor(producaoSelecionada.status)}
                    variant="outlined"
                  />
                </Stack>
                <Typography variant="body2" color="text.secondary">
                  Data: {formatDate(producaoSelecionada.data_producao)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Produto final: {insumoFinalSelecionado?.nome || "-"}
                </Typography>
                <Typography variant="body2" color="primary" fontWeight={600}>
                  Retorno esperado: ≈ {sacosPrevistos.toFixed(1)} sacos de 23kg
                </Typography>
                {producaoSelecionada.peso_real ? (
                  <Typography variant="body2" color="text.secondary">
                    Peso real retornado: {toNumber(producaoSelecionada.peso_real).toFixed(2)} kg
                  </Typography>
                ) : null}
                {producaoSelecionada.custo_total_real ? (
                  <Typography variant="body2" color="text.secondary">
                    Custo total real: {formatCurrency(producaoSelecionada.custo_total_real)}
                  </Typography>
                ) : null}
              </Stack>
            </Paper>

            <Typography variant="subtitle2">Insumos enviados na OP</Typography>
            <Paper variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Insumo</TableCell>
                    <TableCell align="right">Quantidade (kg)</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {detalhesDaProducaoSelecionada.length ? (
                    detalhesDaProducaoSelecionada.map((detalhe) => {
                      const insumo = insumos.find(
                        (item) => item.id === detalhe.insumo_id,
                      );
                      return (
                        <TableRow key={detalhe.id}>
                          <TableCell>{insumo?.nome || "Insumo"}</TableCell>
                          <TableCell align="right">
                            {toNumber(detalhe.quantidade_kg).toFixed(2)}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={2} align="center">
                        Nenhum insumo vinculado.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </Paper>

            {custosDaProducaoSelecionada.length ? (
              <>
                <Typography variant="subtitle2">Custos adicionais lançados</Typography>
                <Stack spacing={1}>
                  {custosDaProducaoSelecionada.map((custo) => {
                    const fornecedor = fornecedores.find(
                      (item) => item.id === custo.fornecedor_id,
                    );
                    return (
                      <Paper key={custo.id} variant="outlined" sx={{ p: 1.5 }}>
                        <Typography variant="body2" fontWeight={600}>
                          {custo.descricao || "Custo adicional"}
                        </Typography>
                        <Typography variant="caption" display="block" color="text.secondary">
                          Fornecedor: {fornecedor?.razao_social || "Sem fornecedor"}
                        </Typography>
                        <Typography variant="body2">
                          {formatCurrency(custo.valor)}
                        </Typography>
                      </Paper>
                    );
                  })}
                  <Typography variant="body2" fontWeight={700}>
                    Total adicionais: {formatCurrency(totalCustosAdicionais)}
                  </Typography>
                </Stack>
              </>
            ) : null}

            {drawerMode === "retorno" ? (
              <>
                <Divider />
                {producaoSelecionada.status !== "PENDENTE" ? (
                  <Typography variant="body2" color="text.secondary">
                    Esta produção não está pendente para confirmação de retorno.
                  </Typography>
                ) : (
                  <Box component="form" onSubmit={handleConfirmarRetorno}>
                    <Stack spacing={2}>
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
                        startIcon={<CheckCircleOutlineIcon />}
                        disabled={!producaoSelecionadaId || toNumber(sacosRetornados) <= 0}
                      >
                        Confirmar retorno (Concluída)
                      </Button>
                      <Button
                        type="button"
                        variant="outlined"
                        color="error"
                        disabled={!producaoSelecionadaId}
                        onClick={handleCancelar}
                      >
                        Cancelar / Estornar (Retornar Estoque)
                      </Button>
                    </Stack>
                  </Box>
                )}
              </>
            ) : null}
          </Stack>
        ) : null}
      </Drawer>
    </AppLayout>
  );
};

export default RetornoProducaoPage;
