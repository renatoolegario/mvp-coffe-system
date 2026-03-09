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
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import { useMemo, useState } from "react";
import AppLayout from "../../components/template/AppLayout";
import PageHeader from "../../components/atomic/PageHeader";
import { useDataStore } from "../../hooks/useDataStore";
import { formatCurrency, formatDate } from "../../utils/format";

const FALLBACK_UNIDADES = [
  { id: "kg", codigo: "KG", label: "Quilograma" },
  { id: "saco", codigo: "SACO", label: "Saco" },
];

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

const createResultadoRetornoExtra = () => ({
  resultado_id: "",
  insumo_id: "",
  tipo_resultado: "EXTRA",
  quantidade_planejada_kg: 0,
  quantidade: "",
  unidade: "KG",
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

const getDuplicatedIds = (rows = []) => {
  const countById = new Map();
  rows.forEach((row) => {
    const id = String(row.insumo_id || "").trim();
    if (!id) return;
    countById.set(id, (countById.get(id) || 0) + 1);
  });
  return new Set(
    Array.from(countById.entries())
      .filter(([, total]) => total > 1)
      .map(([id]) => id),
  );
};

const getQuantidadeKg = (registro, insumo) => {
  const quantidade = toNumber(registro.quantidade);
  if (!insumo) return 0;
  if (registro.unidade === "SACO") {
    return quantidade * (toNumber(insumo.kg_por_saco) || 1);
  }
  return quantidade;
};

const RetornoProducaoPage = () => {
  const insumos = useDataStore((state) => state.insumos);
  const auxUnidades = useDataStore((state) => state.auxUnidades);
  const fornecedores = useDataStore((state) => state.fornecedores);
  const producoes = useDataStore((state) => state.producoes);
  const producaoResultados = useDataStore((state) => state.producaoResultados);
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
  const [resultadosRetorno, setResultadosRetorno] = useState([
    createResultadoRetornoExtra(),
  ]);
  const [obsRetorno, setObsRetorno] = useState("");
  const [erroRetorno, setErroRetorno] = useState("");
  const [custosAdicionais, setCustosAdicionais] = useState([
    createCustoAdicional(),
  ]);

  const unidadesDisponiveis = useMemo(
    () => (auxUnidades?.length ? auxUnidades : FALLBACK_UNIDADES),
    [auxUnidades],
  );

  const insumosProduziveis = useMemo(
    () => {
      const filtrados = insumos.filter((insumo) =>
        Boolean(insumo.pode_ser_produzivel),
      );
      return filtrados.length ? filtrados : insumos;
    },
    [insumos],
  );

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

  const resultadosDaProducaoSelecionada = useMemo(
    () =>
      producaoResultados.filter(
        (resultado) => resultado.producao_id === producaoSelecionadaId,
      ),
    [producaoResultados, producaoSelecionadaId],
  );

  const resultadosProgramadosDaProducao = useMemo(
    () =>
      resultadosDaProducaoSelecionada.filter(
        (item) => String(item.tipo_resultado || "").toUpperCase() === "PROGRAMADO",
      ),
    [resultadosDaProducaoSelecionada],
  );

  const resultadosExtrasDaProducao = useMemo(
    () =>
      resultadosDaProducaoSelecionada.filter(
        (item) => String(item.tipo_resultado || "").toUpperCase() === "EXTRA",
      ),
    [resultadosDaProducaoSelecionada],
  );

  const custosDaProducaoSelecionada = useMemo(
    () =>
      custosAdicionaisProducao.filter(
        (custo) => custo.producao_id === producaoSelecionadaId,
      ),
    [custosAdicionaisProducao, producaoSelecionadaId],
  );

  const consumoEnviadoKg = useMemo(
    () =>
      detalhesDaProducaoSelecionada.reduce(
        (acc, detalhe) => acc + toNumber(detalhe.quantidade_kg),
        0,
      ),
    [detalhesDaProducaoSelecionada],
  );

  const retornoProgramadoKg = useMemo(() => {
    const totalProgramado = resultadosProgramadosDaProducao.reduce(
      (acc, item) => acc + toNumber(item.quantidade_planejada_kg),
      0,
    );
    if (totalProgramado > 0) return totalProgramado;
    return consumoEnviadoKg * 0.75;
  }, [resultadosProgramadosDaProducao, consumoEnviadoKg]);

  const sacosPrevistos = retornoProgramadoKg / 23;

  const totalCustosAdicionais = useMemo(
    () =>
      custosDaProducaoSelecionada.reduce(
        (total, item) => total + toNumber(item.valor),
        0,
      ),
    [custosDaProducaoSelecionada],
  );

  const programadosInsumosIds = useMemo(
    () =>
      new Set(
        resultadosProgramadosDaProducao
          .map((item) => String(item.insumo_id || "").trim())
          .filter(Boolean),
      ),
    [resultadosProgramadosDaProducao],
  );

  const extrasIdsDuplicados = useMemo(
    () =>
      getDuplicatedIds(
        resultadosRetorno.filter((item) => item.tipo_resultado === "EXTRA"),
      ),
    [resultadosRetorno],
  );

  const resultadosRetornoComMetadados = useMemo(
    () =>
      resultadosRetorno.map((item) => {
        const insumoId = String(item.insumo_id || "").trim();
        const insumo = insumos.find((registro) => registro.id === insumoId);
        const quantidadeKg = getQuantidadeKg(item, insumo);
        const isExtra = item.tipo_resultado === "EXTRA";
        const hasInput = Boolean(insumoId || toNumber(item.quantidade) > 0);
        const duplicadoExtra = isExtra && extrasIdsDuplicados.has(insumoId);
        const conflitaProgramado = isExtra && programadosInsumosIds.has(insumoId);
        const invalido =
          hasInput &&
          (!insumoId || quantidadeKg <= 0 || duplicadoExtra || conflitaProgramado);

        return {
          ...item,
          insumo,
          insumo_id: insumoId,
          quantidadeKg,
          hasInput,
          duplicadoExtra,
          conflitaProgramado,
          invalido,
          preenchido: Boolean(insumoId) && quantidadeKg > 0,
        };
      }),
    [resultadosRetorno, insumos, extrasIdsDuplicados, programadosInsumosIds],
  );

  const resultadosParaEnvio = useMemo(
    () =>
      resultadosRetornoComMetadados
        .filter((item) => item.preenchido && !item.invalido)
        .map((item) => ({
          resultado_id: item.resultado_id || null,
          insumo_id: item.insumo_id,
          tipo_resultado: item.tipo_resultado,
          quantidade_planejada_kg: toNumber(item.quantidade_planejada_kg),
          quantidade_real_kg: item.quantidadeKg,
        })),
    [resultadosRetornoComMetadados],
  );

  const totalRetornoKg = useMemo(
    () =>
      resultadosParaEnvio.reduce(
        (acc, item) => acc + toNumber(item.quantidade_real_kg),
        0,
      ),
    [resultadosParaEnvio],
  );

  const programadosComPendencia = useMemo(
    () =>
      resultadosRetornoComMetadados.some(
        (item) => item.tipo_resultado === "PROGRAMADO" && !item.preenchido,
      ),
    [resultadosRetornoComMetadados],
  );

  const linhasInvalidas = useMemo(
    () => resultadosRetornoComMetadados.some((item) => item.invalido),
    [resultadosRetornoComMetadados],
  );

  const podeConfirmarRetorno =
    Boolean(producaoSelecionadaId) &&
    resultadosParaEnvio.length > 0 &&
    totalRetornoKg > 0 &&
    !programadosComPendencia &&
    !linhasInvalidas;

  const resetFormulario = () => {
    setResultadosRetorno([createResultadoRetornoExtra()]);
    setObsRetorno("");
    setErroRetorno("");
    setCustosAdicionais([createCustoAdicional()]);
  };

  const buildResultadosRetorno = (producaoId) => {
    const programados = producaoResultados.filter(
      (item) =>
        item.producao_id === producaoId &&
        String(item.tipo_resultado || "").toUpperCase() === "PROGRAMADO",
    );

    if (!programados.length) {
      return [createResultadoRetornoExtra()];
    }

    return programados.map((item) => {
      const insumo = insumos.find((registro) => registro.id === item.insumo_id);
      return {
        resultado_id: item.id,
        insumo_id: item.insumo_id,
        tipo_resultado: "PROGRAMADO",
        quantidade_planejada_kg: toNumber(item.quantidade_planejada_kg),
        quantidade: "",
        unidade: String(insumo?.unidade_codigo || "KG").toUpperCase(),
      };
    });
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

  const handleChangeResultadoRetorno = (index, field, value) => {
    setResultadosRetorno((prev) =>
      prev.map((item, currentIndex) => {
        if (currentIndex !== index) return item;

        if (field === "insumo_id") {
          const insumo = insumos.find((registro) => registro.id === value);
          return {
            ...item,
            insumo_id: value,
            unidade: String(insumo?.unidade_codigo || "KG").toUpperCase(),
          };
        }

        return { ...item, [field]: value };
      }),
    );
  };

  const handleAdicionarProdutoRetorno = () => {
    setResultadosRetorno((prev) => [...prev, createResultadoRetornoExtra()]);
  };

  const handleRemoverProdutoRetorno = (index) => {
    setResultadosRetorno((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((_, current) => current !== index);
    });
  };

  const handleSelecionarProducaoParaRetorno = (producaoId) => {
    if (!producaoId) return;
    setDrawerMode("retorno");
    setProducaoSelecionadaId(producaoId);
    setDrawerAberto(true);
    setErroRetorno("");
    setObsRetorno("");
    setCustosAdicionais([createCustoAdicional()]);
    setResultadosRetorno(buildResultadosRetorno(producaoId));
  };

  const handleVerDetalhes = (producaoId) => {
    if (!producaoId) return;
    setDrawerMode("detalhes");
    setProducaoSelecionadaId(producaoId);
    setDrawerAberto(true);
    setErroRetorno("");
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

    if (!podeConfirmarRetorno) {
      if (programadosComPendencia) {
        setErroRetorno(
          "Preencha a quantidade de chegada para todos os produtos programados.",
        );
      } else if (linhasInvalidas) {
        setErroRetorno("Revise os produtos extras antes de confirmar.");
      } else {
        setErroRetorno("Informe ao menos um produto retornado com quantidade.");
      }
      return;
    }

    const custosValidos = custosAdicionais
      .map((item) => ({
        ...item,
        valor: toNumber(item.valor),
      }))
      .filter((item) => item.valor > 0 && item.descricao);

    const resultado = await confirmarRetornoProducao({
      producao_id: producaoSelecionadaId,
      resultados_retorno: resultadosParaEnvio,
      custos_adicionais: custosValidos,
      obs: obsRetorno,
    });

    if (resultado?.ok === false) {
      setErroRetorno(resultado.error || "Não foi possível confirmar o retorno.");
      return;
    }

    fecharDrawer();
  };

  const handleCancelar = async () => {
    if (!producaoSelecionadaId) return;
    if (
      confirm(
        "Tem certeza que deseja cancelar (estornar) esta produção? Os insumos retornarão ao estoque disponível.",
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

  const renderResultadosHistorico = () => {
    const linhas = [
      ...resultadosProgramadosDaProducao.map((item) => ({
        ...item,
        tipo_resultado: "PROGRAMADO",
      })),
      ...resultadosExtrasDaProducao.map((item) => ({
        ...item,
        tipo_resultado: "EXTRA",
      })),
    ];

    if (!linhas.length) {
      return (
        <TableRow>
          <TableCell colSpan={4} align="center">
            Nenhum produto de retorno registrado.
          </TableCell>
        </TableRow>
      );
    }

    return linhas.map((item) => {
      const insumo = insumos.find((registro) => registro.id === item.insumo_id);
      return (
        <TableRow key={item.id}>
          <TableCell>{insumo?.nome || "Produto"}</TableCell>
          <TableCell>
            {item.tipo_resultado === "PROGRAMADO" ? "Programado" : "Extra"}
          </TableCell>
          <TableCell align="right">
            {toNumber(item.quantidade_planejada_kg).toFixed(2)}
          </TableCell>
          <TableCell align="right">
            {item.quantidade_real_kg === null || item.quantidade_real_kg === undefined
              ? "-"
              : toNumber(item.quantidade_real_kg).toFixed(2)}
          </TableCell>
        </TableRow>
      );
    });
  };

  return (
    <AppLayout>
      <PageHeader
        title="Produções em Trânsito"
        subtitle="Etapa 2: confirmar retorno informando os produtos recebidos, unidade e quantidade."
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
                        <Stack direction="row" spacing={1} justifyContent="flex-end">
                          <Button
                            size="small"
                            variant="contained"
                            startIcon={<CheckCircleOutlineIcon />}
                            onClick={() => handleSelecionarProducaoParaRetorno(item.id)}
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
        sx={{ zIndex: (theme) => theme.zIndex.modal + 20 }}
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
                  Insumos enviados: {consumoEnviadoKg.toFixed(2)} kg
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Produtos programados: {resultadosProgramadosDaProducao.length}
                </Typography>
                <Typography variant="body2" color="primary" fontWeight={600}>
                  Retorno estimado: ≈ {sacosPrevistos.toFixed(1)} sacos de 23kg
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

            <Typography variant="subtitle2">Produtos de retorno</Typography>
            <Paper variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Produto</TableCell>
                    <TableCell>Tipo</TableCell>
                    <TableCell align="right">Planejado (kg)</TableCell>
                    <TableCell align="right">Real (kg)</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>{renderResultadosHistorico()}</TableBody>
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
                      <Typography variant="subtitle2">Produtos recebidos no retorno</Typography>

                      {resultadosRetornoComMetadados.map((item, index) => (
                        <Paper key={`retorno-${index}`} variant="outlined" sx={{ p: 2 }}>
                          <Grid container spacing={1.5} alignItems="center">
                            <Grid item xs={12} md={5}>
                              {item.tipo_resultado === "PROGRAMADO" ? (
                                <>
                                  <Typography variant="body2" fontWeight={700}>
                                    {item.insumo?.nome || "Produto programado"}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    Programado na criação da OP
                                  </Typography>
                                </>
                              ) : (
                                <TextField
                                  select
                                  label="Produto"
                                  value={item.insumo_id}
                                  onChange={(event) =>
                                    handleChangeResultadoRetorno(
                                      index,
                                      "insumo_id",
                                      event.target.value,
                                    )
                                  }
                                  fullWidth
                                >
                                  {insumosProduziveis.map((insumo) => (
                                    <MenuItem key={insumo.id} value={insumo.id}>
                                      {insumo.nome}
                                    </MenuItem>
                                  ))}
                                </TextField>
                              )}
                            </Grid>

                            <Grid item xs={12} md={2}>
                              <TextField
                                select
                                label="Unidade"
                                value={item.unidade}
                                onChange={(event) =>
                                  handleChangeResultadoRetorno(
                                    index,
                                    "unidade",
                                    event.target.value,
                                  )
                                }
                                fullWidth
                              >
                                {unidadesDisponiveis.map((unidade) => (
                                  <MenuItem key={unidade.id} value={unidade.codigo}>
                                    {unidade.label}
                                  </MenuItem>
                                ))}
                              </TextField>
                            </Grid>

                            <Grid item xs={12} md={2}>
                              <TextField
                                label="Quantidade"
                                type="number"
                                value={item.quantidade}
                                onChange={(event) =>
                                  handleChangeResultadoRetorno(
                                    index,
                                    "quantidade",
                                    event.target.value,
                                  )
                                }
                                fullWidth
                              />
                            </Grid>

                            <Grid item xs={12} md={2}>
                              <Typography variant="body2">
                                {item.quantidadeKg.toFixed(2)} kg
                              </Typography>
                              {item.tipo_resultado === "PROGRAMADO" ? (
                                <Typography variant="caption" color="text.secondary" display="block">
                                  Planejado: {toNumber(item.quantidade_planejada_kg).toFixed(2)} kg
                                </Typography>
                              ) : null}
                              {item.tipo_resultado === "PROGRAMADO" && !item.preenchido ? (
                                <Typography variant="caption" color="error.main" display="block">
                                  Informe a quantidade recebida
                                </Typography>
                              ) : null}
                              {item.tipo_resultado === "EXTRA" && item.duplicadoExtra ? (
                                <Typography variant="caption" color="error.main" display="block">
                                  Produto extra duplicado
                                </Typography>
                              ) : null}
                              {item.tipo_resultado === "EXTRA" && item.conflitaProgramado ? (
                                <Typography variant="caption" color="error.main" display="block">
                                  Já existe como programado
                                </Typography>
                              ) : null}
                            </Grid>

                            <Grid item xs={12} md={1}>
                              {item.tipo_resultado === "EXTRA" ? (
                                <IconButton
                                  onClick={() => handleRemoverProdutoRetorno(index)}
                                  disabled={resultadosRetorno.length <= 1}
                                >
                                  <DeleteOutlineIcon />
                                </IconButton>
                              ) : null}
                            </Grid>
                          </Grid>
                        </Paper>
                      ))}

                      <Button
                        variant="outlined"
                        startIcon={<AddIcon />}
                        onClick={handleAdicionarProdutoRetorno}
                      >
                        Adicionar novo produto
                      </Button>

                      <Paper variant="outlined" sx={{ p: 1.5 }}>
                        <Typography variant="body2" fontWeight={700}>
                          Total retornado informado: {totalRetornoKg.toFixed(2)} kg
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          O custo total da produção será diluído automaticamente nesse total.
                        </Typography>
                      </Paper>

                      <Typography variant="subtitle2">Custos adicionais</Typography>
                      {custosAdicionais.map((custo, index) => (
                        <Paper key={`custo-${index}`} variant="outlined" sx={{ p: 2 }}>
                          <Grid container spacing={1.5}>
                            <Grid item xs={12}>
                              <TextField
                                select
                                label="Fornecedor"
                                value={custo.fornecedor_id}
                                onChange={(event) =>
                                  handleChangeCusto(index, "fornecedor_id", event.target.value)
                                }
                                fullWidth
                              >
                                <MenuItem value="">Sem fornecedor</MenuItem>
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
                                value={custo.descricao}
                                onChange={(event) =>
                                  handleChangeCusto(index, "descricao", event.target.value)
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
                                  handleChangeCusto(index, "valor", event.target.value)
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
                          setCustosAdicionais((prev) => [...prev, createCustoAdicional()])
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

                      {erroRetorno ? (
                        <Typography variant="body2" color="error.main">
                          {erroRetorno}
                        </Typography>
                      ) : null}

                      <Button
                        type="submit"
                        variant="contained"
                        startIcon={<CheckCircleOutlineIcon />}
                        disabled={!podeConfirmarRetorno}
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
