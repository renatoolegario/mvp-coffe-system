import {
    Alert,
    Box,
    Button,
    Divider,
    Drawer,
    Grid,
    IconButton,
    MenuItem,
    Paper,
    Stack,
    TextField,
    Typography,
} from "@mui/material";
import { Close } from "@mui/icons-material";
import { useMemo, useState } from "react";
import { useDataStore } from "../../hooks/useDataStore";
import { formatCurrency } from "../../utils/format";

const parseNumber = (value) => Number(String(value).replace(",", ".")) || 0;

const buildParcelasVencimentos = (qtd, previous = []) =>
    Array.from({ length: qtd }, (_, index) => previous[index] || "");

const createExtraCost = () => ({
    id: `extra-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    fornecedor_id: "",
    valor_total: "",
    descricao: "",
    parcelas_qtd: 1,
    parcelas_valores: [""],
    parcelas_vencimentos: [""],
    parcelas_status: ["A_PRAZO"],
});

export default function EntradaInsumoDrawer({ open, onClose }) {
    const fornecedores = useDataStore((state) => state.fornecedores);
    const insumos = useDataStore((state) => state.insumos);
    const addEntradaInsumos = useDataStore((state) => state.addEntradaInsumos);

    const [fornecedorId, setFornecedorId] = useState("");
    const [insumoId, setInsumoId] = useState("");
    const [modoEntrada, setModoEntrada] = useState("KG");
    const [quantidadeKg, setQuantidadeKg] = useState("");
    const [kgPorSacoEntrada, setKgPorSacoEntrada] = useState("");
    const [quantidadeSacos, setQuantidadeSacos] = useState("");
    const [valorTotal, setValorTotal] = useState("");
    const [parcelasQtd, setParcelasQtd] = useState(1);
    const [parcelasValores, setParcelasValores] = useState([""]);
    const [parcelasVencimentos, setParcelasVencimentos] = useState([""]);
    const [parcelasStatus, setParcelasStatus] = useState(["A_PRAZO"]);
    const [custosExtras, setCustosExtras] = useState([]);
    const [obs, setObs] = useState("");
    const [errorMessage, setErrorMessage] = useState("");

    const getTotalParcelasExtra = (item) =>
        item.parcelas_valores.reduce(
            (total, parcela) => total + parseNumber(parcela),
            0,
        );

    const insumoSelecionado = useMemo(
        () => insumos.find((insumo) => insumo.id === insumoId),
        [insumoId, insumos],
    );

    const kgPorSaco =
        parseNumber(kgPorSacoEntrada) ||
        Number(insumoSelecionado?.kg_por_saco) ||
        0;
    const quantidadeInformadaKg = parseNumber(quantidadeKg);
    const quantidadeInformadaSacos = parseNumber(quantidadeSacos);
    const quantidadeConvertidaKg =
        modoEntrada === "SACO"
            ? quantidadeInformadaSacos * kgPorSaco
            : quantidadeInformadaKg;

    const totalParcelas = useMemo(
        () =>
            parcelasValores.reduce(
                (total, parcela) => total + parseNumber(parcela),
                0,
            ),
        [parcelasValores],
    );

    const totalValor = parseNumber(valorTotal);
    const parcelasDivergentes = Math.abs(totalParcelas - totalValor) > 0.009;
    const custoUnitarioEmKg = quantidadeConvertidaKg
        ? totalValor / quantidadeConvertidaKg
        : 0;

    const handleChangeParcelasQtd = (event) => {
        const nextQtd = Math.max(1, Number(event.target.value) || 1);
        setParcelasQtd(nextQtd);
        setParcelasValores((prev) =>
            Array.from({ length: nextQtd }, (_, index) => prev[index] || ""),
        );
        setParcelasVencimentos((prev) => buildParcelasVencimentos(nextQtd, prev));
        setParcelasStatus((prev) =>
            Array.from({ length: nextQtd }, (_, index) => prev[index] || "A_PRAZO"),
        );
    };

    const handleChangeParcela = (index, value) => {
        setParcelasValores((prev) =>
            prev.map((parcela, currentIndex) =>
                currentIndex === index ? value : parcela,
            ),
        );
    };

    const handleChangeVencimento = (index, value) => {
        setParcelasVencimentos((prev) =>
            prev.map((vencimento, currentIndex) =>
                currentIndex === index ? value : vencimento,
            ),
        );
    };

    const handleChangeStatusParcela = (index, value) => {
        setParcelasStatus((prev) =>
            prev.map((status, currentIndex) =>
                currentIndex === index ? value : status,
            ),
        );
    };

    const handleAddCustoExtra = () => {
        setCustosExtras((prev) => [...prev, createExtraCost()]);
    };

    const handleUpdateCustoExtra = (id, key, value) => {
        setCustosExtras((prev) =>
            prev.map((item) => {
                if (item.id !== id) return item;
                if (key === "parcelas_qtd") {
                    const parcelasQtdNext = Math.max(1, Number(value) || 1);
                    return {
                        ...item,
                        parcelas_qtd: parcelasQtdNext,
                        parcelas_valores: Array.from(
                            { length: parcelasQtdNext },
                            (_, index) => item.parcelas_valores?.[index] || "",
                        ),
                        parcelas_vencimentos: buildParcelasVencimentos(
                            parcelasQtdNext,
                            item.parcelas_vencimentos,
                        ),
                        parcelas_status: Array.from(
                            { length: parcelasQtdNext },
                            (_, index) => item.parcelas_status?.[index] || "A_PRAZO",
                        ),
                    };
                }
                return { ...item, [key]: value };
            }),
        );
    };

    const handleUpdateValorParcelaCustoExtra = (id, index, value) => {
        setCustosExtras((prev) =>
            prev.map((item) => {
                if (item.id !== id) return item;
                return {
                    ...item,
                    parcelas_valores: item.parcelas_valores.map(
                        (parcela, currentIndex) =>
                            currentIndex === index ? value : parcela,
                    ),
                };
            }),
        );
    };

    const handleUpdateVencimentoCustoExtra = (id, index, value) => {
        setCustosExtras((prev) =>
            prev.map((item) => {
                if (item.id !== id) return item;
                return {
                    ...item,
                    parcelas_vencimentos: item.parcelas_vencimentos.map(
                        (vencimento, currentIndex) =>
                            currentIndex === index ? value : vencimento,
                    ),
                };
            }),
        );
    };

    const handleRemoveCustoExtra = (id) => {
        setCustosExtras((prev) => prev.filter((item) => item.id !== id));
    };

    const handleUpdateStatusParcelaCustoExtra = (id, index, value) => {
        setCustosExtras((prev) =>
            prev.map((item) => {
                if (item.id !== id) return item;
                return {
                    ...item,
                    parcelas_status: item.parcelas_status.map((status, currentIndex) =>
                        currentIndex === index ? value : status,
                    ),
                };
            }),
        );
    };

    const canSubmitEntradaBase =
        fornecedorId &&
        insumoId &&
        quantidadeConvertidaKg > 0 &&
        totalValor > 0 &&
        parcelasValores.every((parcela) => parseNumber(parcela) > 0) &&
        parcelasVencimentos.every((vencimento) => Boolean(vencimento)) &&
        !parcelasDivergentes;

    const custosExtrasValidos = custosExtras.every((item) => {
        const valorExtra = parseNumber(item.valor_total);
        const totalParcelasExtra = getTotalParcelasExtra(item);
        const parcelasDivergentesExtra =
            Math.abs(totalParcelasExtra - valorExtra) > 0.009;
        return (
            item.fornecedor_id &&
            valorExtra > 0 &&
            Boolean(item.descricao) &&
            item.parcelas_valores.every((valor) => parseNumber(valor) > 0) &&
            item.parcelas_vencimentos.every((vencimento) => Boolean(vencimento)) &&
            !parcelasDivergentesExtra
        );
    });

    const canSubmit = canSubmitEntradaBase && custosExtrasValidos;

    const handleSubmit = async (event) => {
        event.preventDefault();

        const extrasComSomaInvalida = custosExtras.some((item) => {
            const valorExtra = parseNumber(item.valor_total);
            const totalParcelasExtra = getTotalParcelasExtra(item);
            return Math.abs(totalParcelasExtra - valorExtra) > 0.009;
        });

        if (parcelasDivergentes || extrasComSomaInvalida) {
            const mensagemDivergencia =
                "A soma das parcelas precisa bater com o valor total da compra e de cada custo extra.";
            setErrorMessage(mensagemDivergencia);
            window.alert(mensagemDivergencia);
            return;
        }

        if (!canSubmit) {
            setErrorMessage(
                "Revise os dados da entrada, parcelas e custos extras para continuar.",
            );
            return;
        }

        setErrorMessage("");

        await addEntradaInsumos({
            fornecedor_id: fornecedorId,
            insumo_id: insumoId,
            unidade_entrada: modoEntrada === "SACO" ? "saco" : "kg",
            kg_por_saco_entrada: modoEntrada === "SACO" ? kgPorSaco : null,
            quantidade:
                modoEntrada === "SACO"
                    ? quantidadeInformadaSacos
                    : quantidadeInformadaKg,
            valor_total: totalValor,
            parcelas_qtd: parcelasQtd,
            parcelas_valores: parcelasValores.map(parseNumber),
            parcelas_vencimentos: parcelasVencimentos.map((vencimento) =>
                new Date(vencimento).toISOString(),
            ),
            parcelas_status: parcelasStatus,
            custos_extras: custosExtras.map((item) => ({
                fornecedor_id: item.fornecedor_id,
                valor_total: parseNumber(item.valor_total),
                descricao: item.descricao,
                parcelas_qtd: item.parcelas_qtd,
                parcelas_valores: item.parcelas_valores.map(parseNumber),
                parcelas_vencimentos: item.parcelas_vencimentos.map((vencimento) =>
                    new Date(vencimento).toISOString(),
                ),
                parcelas_status: item.parcelas_status,
            })),
            obs,
        });

        setFornecedorId("");
        setInsumoId("");
        setModoEntrada("KG");
        setQuantidadeKg("");
        setKgPorSacoEntrada("");
        setQuantidadeSacos("");
        setValorTotal("");
        setParcelasQtd(1);
        setParcelasValores([""]);
        setParcelasVencimentos([""]);
        setParcelasStatus(["A_PRAZO"]);
        setCustosExtras([]);
        setObs("");

        // Fechar o drawer após sucesso
        if (onClose) onClose();
    };

    return (
        <Drawer anchor="right" open={open} onClose={onClose} sx={{ zIndex: (theme) => theme.zIndex.drawer + 2 }}>
            <Box sx={{ width: "50vw", minWidth: 450, height: "100vh", display: "flex", flexDirection: "column" }}>
                <Box display="flex" justifyContent="space-between" alignItems="center" p={2} borderBottom="1px solid #e0e0e0">
                    <Box>
                        <Typography variant="h6">Nova Entrada de Estoque</Typography>
                        <Typography variant="body2" color="text.secondary">
                            Registre compras em KG/Saco e atualize estoque.
                        </Typography>
                    </Box>
                    <IconButton onClick={onClose} size="small">
                        <Close />
                    </IconButton>
                </Box>

                <Box p={3} flex={1} overflow="auto" component="form" onSubmit={handleSubmit}>
                    <Stack spacing={2}>
                        <TextField
                            select
                            label="Fornecedor"
                            value={fornecedorId}
                            onChange={(event) => setFornecedorId(event.target.value)}
                            required
                        >
                            {fornecedores.map((fornecedor) => (
                                <MenuItem key={fornecedor.id} value={fornecedor.id}>
                                    {fornecedor.razao_social}
                                </MenuItem>
                            ))}
                        </TextField>

                        <TextField
                            select
                            label="Insumo"
                            value={insumoId}
                            onChange={(event) => setInsumoId(event.target.value)}
                            required
                        >
                            {insumos.map((insumo) => (
                                <MenuItem key={insumo.id} value={insumo.id}>
                                    {insumo.nome}
                                </MenuItem>
                            ))}
                        </TextField>

                        <TextField
                            select
                            label="Flag obrigatório"
                            value={modoEntrada}
                            onChange={(event) => setModoEntrada(event.target.value)}
                            required
                        >
                            <MenuItem value="KG">Entrar em KG</MenuItem>
                            <MenuItem value="SACO">Entrar em Saco</MenuItem>
                        </TextField>

                        {modoEntrada === "KG" ? (
                            <TextField
                                label="Quantidade em KG"
                                type="number"
                                value={quantidadeKg}
                                onChange={(event) => setQuantidadeKg(event.target.value)}
                                inputProps={{ min: 0, step: "0.01" }}
                                required
                            />
                        ) : (
                            <>
                                <TextField
                                    label="Quantos KG tem cada saco"
                                    type="number"
                                    value={kgPorSacoEntrada}
                                    onChange={(event) =>
                                        setKgPorSacoEntrada(event.target.value)
                                    }
                                    inputProps={{ min: 0, step: "0.01" }}
                                    required
                                />
                                <TextField
                                    label="Quantidade de sacos"
                                    type="number"
                                    value={quantidadeSacos}
                                    onChange={(event) =>
                                        setQuantidadeSacos(event.target.value)
                                    }
                                    inputProps={{ min: 0, step: "0.01" }}
                                    required
                                />
                            </>
                        )}

                        <Typography variant="caption" color="text.secondary">
                            Conversão para banco (sempre KG):{" "}
                            {quantidadeConvertidaKg.toFixed(2)} kg
                        </Typography>

                        <TextField
                            label="Valor total"
                            type="number"
                            value={valorTotal}
                            onChange={(event) => setValorTotal(event.target.value)}
                            inputProps={{ min: 0, step: "0.01" }}
                            required
                        />

                        <Typography variant="caption" color="text.secondary">
                            Valor unitário em KG: {formatCurrency(totalValor)} ÷{" "}
                            {quantidadeConvertidaKg.toFixed(2)} kg ={" "}
                            {formatCurrency(custoUnitarioEmKg)}
                        </Typography>

                        <TextField
                            label="Quantidade de Parcelas"
                            type="number"
                            value={parcelasQtd}
                            onChange={handleChangeParcelasQtd}
                            inputProps={{ min: 1, step: 1 }}
                            required
                        />

                        <Stack spacing={1}>
                            {parcelasValores.map((parcela, index) => {
                                const parcelaNum = index + 1;
                                return (
                                    <Grid container spacing={1} key={`parcela-${parcelaNum}`}>
                                        <Grid item xs={12} sm={4}>
                                            <TextField
                                                label={`Valor parcela ${parcelaNum}`}
                                                type="number"
                                                value={parcela}
                                                onChange={(event) =>
                                                    handleChangeParcela(index, event.target.value)
                                                }
                                                inputProps={{ min: 0, step: "0.01" }}
                                                fullWidth
                                                required
                                            />
                                        </Grid>
                                        <Grid item xs={12} sm={4}>
                                            <TextField
                                                label={`Vencimento ${parcelaNum}`}
                                                type="date"
                                                value={parcelasVencimentos[index] || ""}
                                                onChange={(event) =>
                                                    handleChangeVencimento(index, event.target.value)
                                                }
                                                fullWidth
                                                InputLabelProps={{ shrink: true }}
                                                required
                                            />
                                        </Grid>
                                        <Grid item xs={12} sm={4}>
                                            <TextField
                                                select
                                                label="Status pagamento"
                                                value={parcelasStatus[index] || "A_PRAZO"}
                                                onChange={(event) =>
                                                    handleChangeStatusParcela(
                                                        index,
                                                        event.target.value,
                                                    )
                                                }
                                                fullWidth
                                                required
                                            >
                                                <MenuItem value="A_PRAZO">
                                                    A prazo (não pago)
                                                </MenuItem>
                                                <MenuItem value="PAGO">Pago</MenuItem>
                                            </TextField>
                                        </Grid>
                                    </Grid>
                                );
                            })}
                        </Stack>

                        <Typography
                            variant="body2"
                            color={parcelasDivergentes ? "error.main" : "text.secondary"}
                        >
                            Soma das parcelas: {formatCurrency(totalParcelas)} • Total
                            informado: {formatCurrency(totalValor)}
                        </Typography>

                        <Divider />

                        <Stack
                            direction="row"
                            justifyContent="space-between"
                            alignItems="center"
                        >
                            <Typography variant="subtitle1">
                                Custos Extras (opcional)
                            </Typography>
                            <Button variant="outlined" onClick={handleAddCustoExtra}>
                                + Adicionar custos extras
                            </Button>
                        </Stack>

                        <Stack spacing={2}>
                            {custosExtras.map((item, index) => {
                                const totalParcelasExtra = getTotalParcelasExtra(item);
                                const totalExtra = parseNumber(item.valor_total);
                                const parcelasDivergentesExtra =
                                    Math.abs(totalParcelasExtra - totalExtra) > 0.009;
                                return (
                                    <Paper key={item.id} variant="outlined" sx={{ p: 2 }}>
                                        <Stack spacing={1.5}>
                                            <Typography variant="subtitle2">
                                                Custo extra #{index + 1}
                                            </Typography>
                                            <Grid container spacing={1}>
                                                <Grid item xs={12} sm={6}>
                                                    <TextField
                                                        select
                                                        label="Fornecedor"
                                                        value={item.fornecedor_id}
                                                        onChange={(event) =>
                                                            handleUpdateCustoExtra(
                                                                item.id,
                                                                "fornecedor_id",
                                                                event.target.value,
                                                            )
                                                        }
                                                        fullWidth
                                                        required
                                                    >
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
                                                <Grid item xs={12} sm={6}>
                                                    <TextField
                                                        label="Valor total"
                                                        type="number"
                                                        value={item.valor_total}
                                                        onChange={(event) =>
                                                            handleUpdateCustoExtra(
                                                                item.id,
                                                                "valor_total",
                                                                event.target.value,
                                                            )
                                                        }
                                                        inputProps={{ min: 0, step: "0.01" }}
                                                        fullWidth
                                                        required
                                                    />
                                                </Grid>
                                                <Grid item xs={12} sm={6}>
                                                    <TextField
                                                        label="Descrição"
                                                        value={item.descricao}
                                                        onChange={(event) =>
                                                            handleUpdateCustoExtra(
                                                                item.id,
                                                                "descricao",
                                                                event.target.value,
                                                            )
                                                        }
                                                        fullWidth
                                                        required
                                                    />
                                                </Grid>
                                                <Grid item xs={12} sm={6}>
                                                    <TextField
                                                        label="Quantidade de parcelas"
                                                        type="number"
                                                        value={item.parcelas_qtd}
                                                        onChange={(event) =>
                                                            handleUpdateCustoExtra(
                                                                item.id,
                                                                "parcelas_qtd",
                                                                event.target.value,
                                                            )
                                                        }
                                                        inputProps={{ min: 1, step: 1 }}
                                                        fullWidth
                                                        required
                                                    />
                                                </Grid>
                                            </Grid>

                                            <Typography
                                                variant="body2"
                                                color={
                                                    parcelasDivergentesExtra
                                                        ? "error.main"
                                                        : "text.secondary"
                                                }
                                            >
                                                Soma das parcelas:{" "}
                                                {formatCurrency(totalParcelasExtra)}
                                                {" • "}
                                                Total informado: {formatCurrency(totalExtra)}
                                            </Typography>

                                            {parcelasDivergentesExtra ? (
                                                <Alert severity="warning">
                                                    Ajuste os valores das parcelas para fechar o total
                                                    do custo extra.
                                                </Alert>
                                            ) : null}

                                            <Stack spacing={1}>
                                                {item.parcelas_valores.map(
                                                    (valorParcela, parcelaIndex) => (
                                                        <Grid
                                                            container
                                                            spacing={1}
                                                            key={`${item.id}-${parcelaIndex}`}
                                                        >
                                                            <Grid item xs={12} sm={4}>
                                                                <TextField
                                                                    label={`Valor parcela ${parcelaIndex + 1}`}
                                                                    type="number"
                                                                    value={valorParcela}
                                                                    onChange={(event) =>
                                                                        handleUpdateValorParcelaCustoExtra(
                                                                            item.id,
                                                                            parcelaIndex,
                                                                            event.target.value,
                                                                        )
                                                                    }
                                                                    inputProps={{ min: 0, step: "0.01" }}
                                                                    fullWidth
                                                                    required
                                                                />
                                                            </Grid>
                                                            <Grid item xs={12} sm={4}>
                                                                <TextField
                                                                    label={`Vencimento parcela ${parcelaIndex + 1}`}
                                                                    type="date"
                                                                    value={
                                                                        item.parcelas_vencimentos[
                                                                        parcelaIndex
                                                                        ] || ""
                                                                    }
                                                                    onChange={(event) =>
                                                                        handleUpdateVencimentoCustoExtra(
                                                                            item.id,
                                                                            parcelaIndex,
                                                                            event.target.value,
                                                                        )
                                                                    }
                                                                    fullWidth
                                                                    InputLabelProps={{ shrink: true }}
                                                                    required
                                                                />
                                                            </Grid>
                                                            <Grid item xs={12} sm={4}>
                                                                <TextField
                                                                    select
                                                                    label="Status pagamento"
                                                                    value={
                                                                        item.parcelas_status[parcelaIndex] ||
                                                                        "A_PRAZO"
                                                                    }
                                                                    onChange={(event) =>
                                                                        handleUpdateStatusParcelaCustoExtra(
                                                                            item.id,
                                                                            parcelaIndex,
                                                                            event.target.value,
                                                                        )
                                                                    }
                                                                    fullWidth
                                                                    required
                                                                >
                                                                    <MenuItem value="A_PRAZO">
                                                                        A prazo (não pago)
                                                                    </MenuItem>
                                                                    <MenuItem value="PAGO">Pago</MenuItem>
                                                                </TextField>
                                                            </Grid>
                                                        </Grid>
                                                    ),
                                                )}
                                            </Stack>

                                            <Button
                                                color="error"
                                                variant="text"
                                                onClick={() => handleRemoveCustoExtra(item.id)}
                                            >
                                                Remover custo extra
                                            </Button>
                                        </Stack>
                                    </Paper>
                                );
                            })}
                        </Stack>

                        <TextField
                            label="Observações"
                            placeholder="Observações, notas fiscais, etc..."
                            value={obs}
                            onChange={(event) => setObs(event.target.value)}
                            multiline
                            rows={2}
                        />

                        {errorMessage ? (
                            <Typography variant="body2" color="error.main">
                                {errorMessage}
                            </Typography>
                        ) : null}

                        <Button type="submit" variant="contained" disabled={!canSubmit} size="large">
                            Registrar entrada ({formatCurrency(totalValor)})
                        </Button>
                    </Stack>
                </Box>
            </Box>
        </Drawer>
    );
}
