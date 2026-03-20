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
import { useEffect, useMemo, useState } from "react";
import SearchableSelect from "../../components/atomic/SearchableSelect";
import AppLayout from "../../components/template/AppLayout";
import PageHeader from "../../components/atomic/PageHeader";
import StockStatusChip from "../../components/atomic/StockStatusChip";
import { useDataStore } from "../../hooks/useDataStore";

const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const UNIDADE_TRANSFERENCIA_DEFAULT = "SACO";

const getSaldo = (movimentos, insumoId) =>
  movimentos
    .filter((mov) => mov.insumo_id === insumoId)
    .reduce((acc, mov) => acc + toNumber(mov.quantidade), 0);

const TransferenciasPage = () => {
  const insumos = useDataStore((state) => state.insumos);
  const auxUnidades = useDataStore((state) => state.auxUnidades);
  const movInsumos = useDataStore((state) => state.movInsumos);
  const getInsumoEstoqueStatus = useDataStore(
    (state) => state.getInsumoEstoqueStatus,
  );
  const createTransferencia = useDataStore(
    (state) => state.createTransferencia,
  );

  const [origemId, setOrigemId] = useState("");
  const [destinoId, setDestinoId] = useState("");
  const [unidadeOperacao, setUnidadeOperacao] = useState(
    UNIDADE_TRANSFERENCIA_DEFAULT,
  );
  const [quantidadeInformada, setQuantidadeInformada] = useState("");
  const [kgPorSacoInformado, setKgPorSacoInformado] = useState("");
  const [obs, setObs] = useState("");

  const origemSelecionada = useMemo(
    () => insumos.find((item) => item.id === origemId) || null,
    [insumos, origemId],
  );

  const destinoSelecionado = useMemo(
    () => insumos.find((item) => item.id === destinoId) || null,
    [destinoId, insumos],
  );

  const saldoOrigem = useMemo(
    () => (origemId ? getSaldo(movInsumos, origemId) : 0),
    [movInsumos, origemId],
  );

  const custoUnitarioOrigem = useMemo(
    () => toNumber(origemSelecionada?.custo_medio_kg),
    [origemSelecionada],
  );

  useEffect(() => {
    if (!origemSelecionada) {
      setKgPorSacoInformado("");
      return;
    }

    setKgPorSacoInformado(String(Number(origemSelecionada.kg_por_saco) || 1));
  }, [origemSelecionada]);

  const quantidadeInfo = toNumber(quantidadeInformada);
  const kgPorSaco =
    toNumber(kgPorSacoInformado) || Number(origemSelecionada?.kg_por_saco) || 1;
  const quantidadeKg =
    unidadeOperacao === "SACO" ? quantidadeInfo * kgPorSaco : quantidadeInfo;
  const semSaldo = quantidadeKg > saldoOrigem;

  const origemStatusAtual = useMemo(
    () =>
      origemSelecionada
        ? getInsumoEstoqueStatus(origemSelecionada.id, saldoOrigem)
        : null,
    [getInsumoEstoqueStatus, origemSelecionada, saldoOrigem],
  );

  const origemStatusProjetado = useMemo(
    () =>
      origemSelecionada
        ? getInsumoEstoqueStatus(
            origemSelecionada.id,
            saldoOrigem - quantidadeKg,
          )
        : null,
    [getInsumoEstoqueStatus, origemSelecionada, saldoOrigem, quantidadeKg],
  );

  const destinoStatusAtual = useMemo(
    () =>
      destinoSelecionado ? getInsumoEstoqueStatus(destinoSelecionado.id) : null,
    [destinoSelecionado, getInsumoEstoqueStatus],
  );

  const podeTransferir =
    origemId &&
    destinoId &&
    origemId !== destinoId &&
    quantidadeKg > 0 &&
    !semSaldo;

  const handleTransferir = async (event) => {
    event.preventDefault();
    if (!podeTransferir) return;

    await createTransferencia({
      origem_id: origemId,
      destino_id: destinoId,
      unidade_operacao_codigo: unidadeOperacao,
      quantidade_informada: quantidadeInfo,
      kg_por_saco_informado: unidadeOperacao === "SACO" ? kgPorSaco : null,
      custo_unitario: custoUnitarioOrigem,
      obs,
    });

    setOrigemId("");
    setDestinoId("");
    setUnidadeOperacao(UNIDADE_TRANSFERENCIA_DEFAULT);
    setQuantidadeInformada("");
    setKgPorSacoInformado("");
    setObs("");
  };

  return (
    <AppLayout>
      <PageHeader
        title="Transferências Internas"
        subtitle="Escreva (Ex: Transferir Saco 23kg Tipo A para Agranel Balcão)"
      />
      <Grid container spacing={3}>
        <Grid item xs={12} lg={8}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Nova Transferência
            </Typography>
            <Box component="form" onSubmit={handleTransferir}>
              <Stack spacing={3}>
                <Paper
                  variant="outlined"
                  sx={{ p: 2, bgcolor: "background.default" }}
                >
                  <Typography
                    variant="subtitle2"
                    color="text.secondary"
                    gutterBottom
                  >
                    Origem (Sai do estoque)
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12}>
                      <SearchableSelect
                        label="Produto Origem"
                        value={origemId}
                        onChange={(e) => setOrigemId(e.target.value)}
                        fullWidth
                        required
                      >
                        {insumos.map((insumo) => (
                          <MenuItem key={insumo.id} value={insumo.id}>
                            {insumo.nome}
                          </MenuItem>
                        ))}
                      </SearchableSelect>
                    </Grid>
                    {origemSelecionada ? (
                      <Grid item xs={12}>
                        <Typography
                          variant="body2"
                          color={semSaldo ? "error" : "text.secondary"}
                        >
                          Saldo disponível: {saldoOrigem.toFixed(2)} kg
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Custo médio atual: R$ {custoUnitarioOrigem.toFixed(2)}{" "}
                          / kg
                        </Typography>
                        {origemStatusAtual ? (
                          <Stack
                            direction="row"
                            spacing={1}
                            mt={1}
                            flexWrap="wrap"
                            useFlexGap
                          >
                            <StockStatusChip
                              status={origemStatusAtual.status_estoque}
                              label={`Atual: ${origemStatusAtual.status_label}`}
                            />
                            <StockStatusChip
                              status={origemStatusProjetado?.status_estoque}
                              label={`Após transferência: ${
                                origemStatusProjetado?.status_label ||
                                "Sem faixa"
                              }`}
                            />
                          </Stack>
                        ) : null}
                        {origemStatusAtual ? (
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            display="block"
                          >
                            Cobertura do mínimo:{" "}
                            {origemStatusAtual.percentual_estoque.toFixed(1)}%
                            {" • "}
                            {origemStatusProjetado?.percentual_estoque?.toFixed(
                              1,
                            ) || "0.0"}
                            % após a transferência
                          </Typography>
                        ) : null}
                      </Grid>
                    ) : null}
                  </Grid>
                </Paper>

                <Paper
                  variant="outlined"
                  sx={{ p: 2, bgcolor: "background.default" }}
                >
                  <Typography
                    variant="subtitle2"
                    color="text.secondary"
                    gutterBottom
                  >
                    Destino (Entra no estoque)
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12}>
                      <SearchableSelect
                        label="Produto Destino"
                        value={destinoId}
                        onChange={(e) => setDestinoId(e.target.value)}
                        fullWidth
                        required
                      >
                        {insumos
                          .filter((i) => i.id !== origemId)
                          .map((insumo) => (
                            <MenuItem key={insumo.id} value={insumo.id}>
                              {insumo.nome}
                            </MenuItem>
                          ))}
                      </SearchableSelect>
                    </Grid>
                    {destinoSelecionado && destinoStatusAtual ? (
                      <Grid item xs={12}>
                        <Stack
                          direction="row"
                          spacing={1}
                          alignItems="center"
                          flexWrap="wrap"
                          useFlexGap
                        >
                          <Typography variant="body2" color="text.secondary">
                            Situação atual do destino:
                          </Typography>
                          <StockStatusChip
                            status={destinoStatusAtual.status_estoque}
                            label={destinoStatusAtual.status_label}
                          />
                          <Typography variant="caption" color="text.secondary">
                            {destinoStatusAtual.percentual_estoque.toFixed(1)}%
                            do mínimo
                          </Typography>
                        </Stack>
                      </Grid>
                    ) : null}
                  </Grid>
                </Paper>

                <Grid container spacing={2}>
                  <Grid item xs={12} md={4}>
                    <SearchableSelect
                      label="Unidade informada"
                      value={unidadeOperacao}
                      onChange={(event) =>
                        setUnidadeOperacao(event.target.value)
                      }
                      fullWidth
                    >
                      {(auxUnidades || []).map((unidade) => (
                        <MenuItem key={unidade.id} value={unidade.codigo}>
                          {unidade.label}
                        </MenuItem>
                      ))}
                    </SearchableSelect>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <TextField
                      label={
                        unidadeOperacao === "SACO"
                          ? "Quantidade de sacos"
                          : "Quantidade em kg"
                      }
                      type="number"
                      value={quantidadeInformada}
                      onChange={(e) => setQuantidadeInformada(e.target.value)}
                      fullWidth
                      required
                    />
                  </Grid>
                  {unidadeOperacao === "SACO" ? (
                    <Grid item xs={12} md={4}>
                      <TextField
                        label="Kg por saco"
                        type="number"
                        value={kgPorSacoInformado}
                        onChange={(e) => setKgPorSacoInformado(e.target.value)}
                        fullWidth
                        required
                      />
                    </Grid>
                  ) : null}
                </Grid>

                <Typography
                  variant="body2"
                  color={semSaldo ? "error.main" : "text.secondary"}
                >
                  Conversão aplicada: {quantidadeKg.toFixed(2)} kg
                </Typography>

                <TextField
                  label="Observações / Motivo"
                  value={obs}
                  onChange={(e) => setObs(e.target.value)}
                  multiline
                  rows={2}
                  fullWidth
                />

                <Button
                  type="submit"
                  variant="contained"
                  disabled={!podeTransferir}
                  size="large"
                >
                  Confirmar Transferência
                </Button>
              </Stack>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </AppLayout>
  );
};

export default TransferenciasPage;
