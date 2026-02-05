import {
  Box,
  Button,
  Divider,
  Grid,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import { useMemo, useState } from "react";
import AppLayout from "../../components/template/AppLayout";
import PageHeader from "../../components/atomic/PageHeader";
import { useDataStore } from "../../hooks/useDataStore";
import { formatCurrency, formatDate } from "../../utils/format";

const TAXA_PADRAO = 76;

const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const createDetalhe = () => ({
  insumo_id: "",
  quantidade: "",
  unidade: "kg",
});

const createCustoAdicional = () => ({
  fornecedor_id: "",
  descricao: "",
  valor: "",
  status_pagamento: "PENDENTE",
  forma_pagamento: "",
});

const getSaldo = (movimentos, insumoId) =>
  movimentos
    .filter((mov) => mov.insumo_id === insumoId)
    .reduce((acc, mov) => acc + toNumber(mov.quantidade), 0);

const getQuantidadeKg = (detalhe, insumo) => {
  const quantidade = toNumber(detalhe.quantidade);
  if (!insumo) return 0;
  if (detalhe.unidade === "saco") {
    return quantidade * (toNumber(insumo.kg_por_saco) || 1);
  }
  return quantidade;
};

const FabricacaoLotesPage = () => {
  const insumos = useDataStore((state) => state.insumos);
  const fornecedores = useDataStore((state) => state.fornecedores);
  const movimentoProducao = useDataStore((state) => state.movInsumos);
  const producoes = useDataStore((state) => state.producoes);
  const detalhesProducao = useDataStore((state) => state.detalhesProducao);
  const createProducao = useDataStore((state) => state.createProducao);
  const confirmarRetornoProducao = useDataStore(
    (state) => state.confirmarRetornoProducao,
  );

  const [modoGeracao, setModoGeracao] = useState("PRODUTO_FINAL");
  const [insumoFinalId, setInsumoFinalId] = useState("");
  const [taxaConversao, setTaxaConversao] = useState(TAXA_PADRAO);
  const [pesoDesejado, setPesoDesejado] = useState("");
  const [obsCriacao, setObsCriacao] = useState("");
  const [detalhes, setDetalhes] = useState([createDetalhe()]);

  const [producaoSelecionadaId, setProducaoSelecionadaId] = useState("");
  const [pesoReal, setPesoReal] = useState("");
  const [taxaReal, setTaxaReal] = useState("");
  const [obsRetorno, setObsRetorno] = useState("");
  const [custosAdicionais, setCustosAdicionais] = useState([
    createCustoAdicional(),
  ]);

  const detalhesComMetadados = useMemo(
    () =>
      detalhes.map((detalhe) => {
        const insumo = insumos.find((item) => item.id === detalhe.insumo_id);
        const quantidadeKg = getQuantidadeKg(detalhe, insumo);
        const saldo = detalhe.insumo_id
          ? getSaldo(movimentoProducao, detalhe.insumo_id)
          : 0;
        const custoUnitario = toNumber(insumo?.preco_kg);
        return {
          ...detalhe,
          quantidadeKg,
          saldo,
          custoUnitario,
          custoTotal: quantidadeKg * custoUnitario,
          semSaldo: quantidadeKg > saldo,
        };
      }),
    [detalhes, insumos, movimentoProducao],
  );

  const consumoTotalKg = detalhesComMetadados.reduce(
    (acc, item) => acc + item.quantidadeKg,
    0,
  );
  const taxa = toNumber(taxaConversao);
  const pesoPrevistoGeradoPelosInsumos = consumoTotalKg * (taxa / 100);
  const pesoPrevisto =
    modoGeracao === "PRODUTO_FINAL"
      ? toNumber(pesoDesejado)
      : pesoPrevistoGeradoPelosInsumos;

  const podeCriarProducao =
    !!insumoFinalId &&
    taxa > 0 &&
    pesoPrevisto > 0 &&
    detalhesComMetadados.length > 0 &&
    detalhesComMetadados.every(
      (item) => item.insumo_id && item.quantidadeKg > 0 && !item.semSaldo,
    );

  const producoesPendentes = producoes.filter(
    (producao) => Number(producao.status) === 1,
  );
  const producaoSelecionada = producoesPendentes.find(
    (item) => item.id === producaoSelecionadaId,
  );
  const detalhesDaProducaoSelecionada = detalhesProducao.filter(
    (detalhe) => detalhe.producao_id === producaoSelecionadaId,
  );

  const handleChangeDetalhe = (index, field, value) => {
    setDetalhes((prev) =>
      prev.map((item, currentIndex) =>
        currentIndex === index ? { ...item, [field]: value } : item,
      ),
    );
  };

  const handleChangeCusto = (index, field, value) => {
    setCustosAdicionais((prev) =>
      prev.map((item, currentIndex) =>
        currentIndex === index ? { ...item, [field]: value } : item,
      ),
    );
  };

  const handleCriarProducao = async (event) => {
    event.preventDefault();
    if (!podeCriarProducao) return;

    await createProducao({
      insumo_final_id: insumoFinalId,
      modo_geracao: modoGeracao,
      taxa_conversao_planejada: taxa,
      peso_previsto: pesoPrevisto,
      detalhes: detalhesComMetadados.map((item) => ({
        insumo_id: item.insumo_id,
        quantidade_kg: item.quantidadeKg,
      })),
      obs: obsCriacao,
    });

    setModoGeracao("PRODUTO_FINAL");
    setInsumoFinalId("");
    setTaxaConversao(TAXA_PADRAO);
    setPesoDesejado("");
    setObsCriacao("");
    setDetalhes([createDetalhe()]);
  };

  const handleConfirmarRetorno = async (event) => {
    event.preventDefault();
    if (!producaoSelecionadaId || toNumber(pesoReal) <= 0) return;

    const custosValidos = custosAdicionais
      .map((item) => ({
        ...item,
        valor: toNumber(item.valor),
      }))
      .filter((item) => item.valor > 0 && item.descricao);

    await confirmarRetornoProducao({
      producao_id: producaoSelecionadaId,
      peso_real: toNumber(pesoReal),
      taxa_conversao_real: toNumber(taxaReal) || null,
      custos_adicionais: custosValidos,
      obs: obsRetorno,
    });

    setProducaoSelecionadaId("");
    setPesoReal("");
    setTaxaReal("");
    setObsRetorno("");
    setCustosAdicionais([createCustoAdicional()]);
  };

  return (
    <AppLayout>
      <PageHeader
        title="Fabricação de Lotes"
        subtitle="Fluxo unificado de produção em 2 etapas: criação e retorno."
      />
      <Grid container spacing={3}>
        <Grid item xs={12} lg={7}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              1) Criar produção
            </Typography>
            <Box component="form" onSubmit={handleCriarProducao}>
              <Stack spacing={2}>
                <TextField
                  select
                  label="Modo de geração"
                  value={modoGeracao}
                  onChange={(event) => setModoGeracao(event.target.value)}
                >
                  <MenuItem value="PRODUTO_FINAL">Pelo produto final</MenuItem>
                  <MenuItem value="INSUMOS_USADOS">
                    Pelos insumos utilizados
                  </MenuItem>
                </TextField>

                <TextField
                  select
                  label="Insumo final gerado"
                  value={insumoFinalId}
                  onChange={(event) => setInsumoFinalId(event.target.value)}
                  required
                >
                  {insumos.map((insumo) => (
                    <MenuItem key={insumo.id} value={insumo.id}>
                      {insumo.nome}
                    </MenuItem>
                  ))}
                </TextField>

                <Grid container spacing={2}>
                  <Grid item xs={12} md={4}>
                    <TextField
                      label="Taxa de conversão (%)"
                      type="number"
                      value={taxaConversao}
                      onChange={(event) => setTaxaConversao(event.target.value)}
                      fullWidth
                    />
                  </Grid>
                  <Grid item xs={12} md={8}>
                    <TextField
                      label={
                        modoGeracao === "PRODUTO_FINAL"
                          ? "Peso final desejado (kg)"
                          : "Peso final previsto (kg)"
                      }
                      type="number"
                      value={
                        modoGeracao === "PRODUTO_FINAL"
                          ? pesoDesejado
                          : pesoPrevistoGeradoPelosInsumos.toFixed(2)
                      }
                      onChange={(event) => setPesoDesejado(event.target.value)}
                      fullWidth
                      disabled={modoGeracao !== "PRODUTO_FINAL"}
                    />
                  </Grid>
                </Grid>

                <Divider />
                <Typography variant="subtitle1">Insumos consumidos</Typography>
                {detalhesComMetadados.map((item, index) => (
                  <Paper
                    key={`detalhe-${index}`}
                    variant="outlined"
                    sx={{ p: 2 }}
                  >
                    <Grid container spacing={1.5} alignItems="center">
                      <Grid item xs={12} md={4}>
                        <TextField
                          select
                          label="Insumo"
                          value={item.insumo_id}
                          onChange={(event) =>
                            handleChangeDetalhe(
                              index,
                              "insumo_id",
                              event.target.value,
                            )
                          }
                          fullWidth
                        >
                          {insumos.map((insumo) => (
                            <MenuItem key={insumo.id} value={insumo.id}>
                              {insumo.nome}
                            </MenuItem>
                          ))}
                        </TextField>
                      </Grid>
                      <Grid item xs={12} md={2}>
                        <TextField
                          select
                          label="Unidade"
                          value={item.unidade}
                          onChange={(event) =>
                            handleChangeDetalhe(
                              index,
                              "unidade",
                              event.target.value,
                            )
                          }
                          fullWidth
                        >
                          <MenuItem value="kg">kg</MenuItem>
                          <MenuItem value="saco">saco</MenuItem>
                        </TextField>
                      </Grid>
                      <Grid item xs={12} md={2}>
                        <TextField
                          label="Quantidade"
                          type="number"
                          value={item.quantidade}
                          onChange={(event) =>
                            handleChangeDetalhe(
                              index,
                              "quantidade",
                              event.target.value,
                            )
                          }
                          fullWidth
                        />
                      </Grid>
                      <Grid item xs={12} md={3}>
                        <Typography variant="body2">
                          Consumo: {item.quantidadeKg.toFixed(2)} kg
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Saldo: {item.saldo.toFixed(2)} kg
                        </Typography>
                        {item.semSaldo ? (
                          <Typography
                            variant="caption"
                            color="error.main"
                            display="block"
                          >
                            Estoque insuficiente
                          </Typography>
                        ) : null}
                      </Grid>
                      <Grid item xs={12} md={1}>
                        <IconButton
                          onClick={() =>
                            setDetalhes((prev) =>
                              prev.length > 1
                                ? prev.filter((_, current) => current !== index)
                                : prev,
                            )
                          }
                          disabled={detalhesComMetadados.length <= 1}
                        >
                          <DeleteOutlineIcon />
                        </IconButton>
                      </Grid>
                    </Grid>
                  </Paper>
                ))}

                <Button
                  variant="outlined"
                  startIcon={<AddIcon />}
                  onClick={() =>
                    setDetalhes((prev) => [...prev, createDetalhe()])
                  }
                >
                  Adicionar insumo
                </Button>

                <TextField
                  label="Observações"
                  value={obsCriacao}
                  onChange={(event) => setObsCriacao(event.target.value)}
                  multiline
                  rows={2}
                />

                <Button
                  type="submit"
                  variant="contained"
                  disabled={!podeCriarProducao}
                >
                  Criar produção (status 1)
                </Button>
              </Stack>
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} lg={5}>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Resumo previsto
            </Typography>
            <Stack spacing={1}>
              <Typography variant="body2">
                Consumo total de insumos: {consumoTotalKg.toFixed(2)} kg
              </Typography>
              <Typography variant="body2">
                Peso final previsto: {pesoPrevisto.toFixed(2)} kg
              </Typography>
              <Typography variant="body2">
                Custo previsto dos insumos:{" "}
                {formatCurrency(
                  detalhesComMetadados.reduce(
                    (acc, item) => acc + item.custoTotal,
                    0,
                  ),
                )}
              </Typography>
            </Stack>
          </Paper>

          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              2) Retorno de produção
            </Typography>
            <Box component="form" onSubmit={handleConfirmarRetorno}>
              <Stack spacing={2}>
                <TextField
                  select
                  label="Produção pendente"
                  value={producaoSelecionadaId}
                  onChange={(event) =>
                    setProducaoSelecionadaId(event.target.value)
                  }
                  required
                >
                  {producoesPendentes.map((item) => (
                    <MenuItem key={item.id} value={item.id}>
                      {item.id.slice(0, 8)} • {formatDate(item.data_producao)}
                    </MenuItem>
                  ))}
                </TextField>

                {producaoSelecionada ? (
                  <Paper variant="outlined" sx={{ p: 2 }}>
                    <Typography variant="body2" fontWeight={600}>
                      Peso previsto:{" "}
                      {toNumber(producaoSelecionada.peso_previsto).toFixed(2)}{" "}
                      kg
                    </Typography>
                    {detalhesDaProducaoSelecionada.map((detalhe) => {
                      const insumo = insumos.find(
                        (i) => i.id === detalhe.insumo_id,
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
                ) : null}

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
                  disabled={!producaoSelecionadaId || toNumber(pesoReal) <= 0}
                >
                  Confirmar retorno (status 2)
                </Button>
              </Stack>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </AppLayout>
  );
};

export default FabricacaoLotesPage;
