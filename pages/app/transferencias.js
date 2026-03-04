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
import AppLayout from "../../components/template/AppLayout";
import PageHeader from "../../components/atomic/PageHeader";
import { useDataStore } from "../../hooks/useDataStore";

const toNumber = (value) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
};

const getSaldo = (movimentos, insumoId) =>
    movimentos
        .filter((mov) => mov.insumo_id === insumoId)
        .reduce((acc, mov) => acc + toNumber(mov.quantidade), 0);

const TransferenciasPage = () => {
    const insumos = useDataStore((state) => state.insumos);
    const auxUnidades = useDataStore((state) => state.auxUnidades);
    const movInsumos = useDataStore((state) => state.movInsumos);
    const createTransferencia = useDataStore((state) => state.createTransferencia);

    const [origemId, setOrigemId] = useState("");
    const [destinoId, setDestinoId] = useState("");
    const [unidadeOperacao, setUnidadeOperacao] = useState("KG");
    const [quantidadeInformada, setQuantidadeInformada] = useState("");
    const [kgPorSacoInformado, setKgPorSacoInformado] = useState("");
    const [obs, setObs] = useState("");

    const origemSelecionada = useMemo(
        () => insumos.find((item) => item.id === origemId) || null,
        [insumos, origemId],
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
        if (!origemSelecionada) return;
        const unidadeDefault = String(origemSelecionada.unidade_codigo || "KG").toUpperCase();
        setUnidadeOperacao(unidadeDefault === "SACO" ? "SACO" : "KG");
        setKgPorSacoInformado(String(Number(origemSelecionada.kg_por_saco) || 1));
    }, [origemSelecionada?.id]);

    const quantidadeInfo = toNumber(quantidadeInformada);
    const kgPorSaco = toNumber(kgPorSacoInformado) || Number(origemSelecionada?.kg_por_saco) || 1;
    const quantidadeKg =
        unidadeOperacao === "SACO" ? quantidadeInfo * kgPorSaco : quantidadeInfo;
    const semSaldo = quantidadeKg > saldoOrigem;

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
        setUnidadeOperacao("KG");
        setQuantidadeInformada("");
        setKgPorSacoInformado("");
        setObs("");
    };

    return (
        <AppLayout>
            <PageHeader
                title="Transferências Internas"
                subtitle="Transfira estoque em KG ou SACO, com conversão explícita para KG."
            />
            <Grid container spacing={3}>
                <Grid item xs={12} lg={8}>
                    <Paper sx={{ p: 3 }}>
                        <Typography variant="h6" gutterBottom>
                            Nova Transferência
                        </Typography>
                        <Box component="form" onSubmit={handleTransferir}>
                            <Stack spacing={3}>
                                <Paper variant="outlined" sx={{ p: 2, bgcolor: "background.default" }}>
                                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                                        Origem (Sai do estoque)
                                    </Typography>
                                    <Grid container spacing={2}>
                                        <Grid item xs={12}>
                                            <TextField
                                                select
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
                                            </TextField>
                                        </Grid>
                                        {origemSelecionada ? (
                                            <Grid item xs={12}>
                                                <Typography variant="body2" color={semSaldo ? "error" : "text.secondary"}>
                                                    Saldo disponível: {saldoOrigem.toFixed(2)} kg
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary">
                                                    Custo médio atual: R$ {custoUnitarioOrigem.toFixed(2)} / kg
                                                </Typography>
                                            </Grid>
                                        ) : null}
                                    </Grid>
                                </Paper>

                                <Paper variant="outlined" sx={{ p: 2, bgcolor: "background.default" }}>
                                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                                        Destino (Entra no estoque)
                                    </Typography>
                                    <Grid container spacing={2}>
                                        <Grid item xs={12}>
                                            <TextField
                                                select
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
                                            </TextField>
                                        </Grid>
                                    </Grid>
                                </Paper>

                                <Grid container spacing={2}>
                                    <Grid item xs={12} md={4}>
                                        <TextField
                                            select
                                            label="Unidade informada"
                                            value={unidadeOperacao}
                                            onChange={(event) => setUnidadeOperacao(event.target.value)}
                                            fullWidth
                                        >
                                            {(auxUnidades || []).map((unidade) => (
                                                <MenuItem key={unidade.id} value={unidade.codigo}>
                                                    {unidade.label}
                                                </MenuItem>
                                            ))}
                                        </TextField>
                                    </Grid>
                                    <Grid item xs={12} md={4}>
                                        <TextField
                                            label={unidadeOperacao === "SACO" ? "Quantidade de sacos" : "Quantidade em kg"}
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

                                <Typography variant="body2" color={semSaldo ? "error.main" : "text.secondary"}>
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
