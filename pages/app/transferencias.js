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
import { useMemo, useState } from "react";
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
    const movInsumos = useDataStore((state) => state.movInsumos);
    const createTransferencia = useDataStore((state) => state.createTransferencia);

    const [origemId, setOrigemId] = useState("");
    const [destinoId, setDestinoId] = useState("");
    const [quantidadeKg, setQuantidadeKg] = useState("");
    const [obs, setObs] = useState("");

    const origemSelecionada = useMemo(
        () => insumos.find((item) => item.id === origemId) || null,
        [insumos, origemId]
    );

    const destinoSelecionado = useMemo(
        () => insumos.find((item) => item.id === destinoId) || null,
        [insumos, destinoId]
    );

    const saldoOrigem = useMemo(
        () => (origemId ? getSaldo(movInsumos, origemId) : 0),
        [movInsumos, origemId]
    );

    const custoUnitarioOrigem = useMemo(
        () => (origemSelecionada ? toNumber(origemSelecionada.preco_kg) : 0),
        [origemSelecionada]
    );

    const parsedQuatidade = toNumber(quantidadeKg);
    const semSaldo = parsedQuatidade > saldoOrigem;

    const podeTransferir =
        origemId &&
        destinoId &&
        origemId !== destinoId &&
        parsedQuatidade > 0 &&
        !semSaldo;

    const handleTransferir = async (event) => {
        event.preventDefault();
        if (!podeTransferir) return;

        await createTransferencia({
            origem_id: origemId,
            destino_id: destinoId,
            quantidade_kg: parsedQuatidade,
            custo_unitario: custoUnitarioOrigem,
            obs,
        });

        setOrigemId("");
        setDestinoId("");
        setQuantidadeKg("");
        setObs("");
    };

    return (
        <AppLayout>
            <PageHeader
                title="Transferências Internas"
                subtitle="Desmembre, reembale ou converta formatos de estoque transferindo o saldo e os custos financeiros entre produtos."
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
                                        {origemSelecionada && (
                                            <Grid item xs={12}>
                                                <Typography variant="body2" color={semSaldo ? "error" : "text.secondary"}>
                                                    Saldo disponível: {saldoOrigem.toFixed(2)} kg
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary">
                                                    Custo médio atual: R$ {custoUnitarioOrigem.toFixed(2)} / kg
                                                </Typography>
                                            </Grid>
                                        )}
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
                                    <Grid item xs={12} md={6}>
                                        <TextField
                                            label="Quantidade a transferir (kg)"
                                            type="number"
                                            value={quantidadeKg}
                                            onChange={(e) => setQuantidadeKg(e.target.value)}
                                            fullWidth
                                            required
                                            error={semSaldo}
                                            helperText={
                                                semSaldo
                                                    ? "Quantidade superior ao saldo disponível."
                                                    : "A mesma quantidade abatida da Origem será somada no Destino."
                                            }
                                        />
                                    </Grid>
                                </Grid>

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
