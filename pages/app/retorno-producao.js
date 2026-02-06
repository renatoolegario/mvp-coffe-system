import {
  Box,
  Button,
  Grid,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import Link from "next/link";
import { useState } from "react";
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

  const [producaoSelecionadaId, setProducaoSelecionadaId] = useState("");
  const [pesoReal, setPesoReal] = useState("");
  const [taxaReal, setTaxaReal] = useState("");
  const [obsRetorno, setObsRetorno] = useState("");
  const [custosAdicionais, setCustosAdicionais] = useState([
    createCustoAdicional(),
  ]);

  const producoesPendentes = producoes.filter(
    (producao) => Number(producao.status) === 1,
  );
  const producaoSelecionada = producoesPendentes.find(
    (item) => item.id === producaoSelecionadaId,
  );
  const detalhesDaProducaoSelecionada = detalhesProducao.filter(
    (detalhe) => detalhe.producao_id === producaoSelecionadaId,
  );

  const handleChangeCusto = (index, field, value) => {
    setCustosAdicionais((prev) =>
      prev.map((item, currentIndex) =>
        currentIndex === index ? { ...item, [field]: value } : item,
      ),
    );
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
        title="Retorno da Produção"
        subtitle="Etapa 2: confirmar retorno, custos e entrada do produto final."
      />
      <Stack direction="row" justifyContent="flex-end" sx={{ mb: 2 }}>
        <Button component={Link} href="/app/producao" variant="outlined">
          Criar produção
        </Button>
      </Stack>
      <Grid container spacing={3}>
        <Grid item xs={12} lg={8}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Retorno de Produção
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

export default RetornoProducaoPage;
