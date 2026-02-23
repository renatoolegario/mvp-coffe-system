import {
    Box,
    Drawer,
    IconButton,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Typography,
} from "@mui/material";
import { Close } from "@mui/icons-material";
import { useMemo } from "react";
import { useDataStore } from "../../hooks/useDataStore";
import { formatDate, formatCurrency } from "../../utils/format";

const toNumber = (value) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
};

const getTipoLabel = (tipo, refTipo) => {
    const map = {
        ENTRADA_INSUMO: "Entrada/Compra",
        RESERVA_PRODUCAO: "Reserva para OP",
        ENTRADA_PRODUCAO: "Entrada de OP",
        ESTORNO_PRODUCAO: "Estorno de OP",
        TRANSFERENCIA_SAIDA: "Transferência (Saída)",
        TRANSFERENCIA_ENTRADA: "Transferência (Entrada)",
        VENDA: "Venda",
    };
    return map[tipo] || tipo;
};

export default function InsumoLedgerModal({ open, onClose, insumo }) {
    const movInsumos = useDataStore((state) => state.movInsumos);

    const movimentosOrdenados = useMemo(() => {
        if (!insumo) return [];

        const movs = movInsumos
            .filter((m) => m.insumo_id === insumo.id)
            .sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime());

        let saldoAcumulado = 0;

        return movs.map((mov) => {
            const entrada = toNumber(mov.quantidade_entrada);
            const saida = toNumber(mov.quantidade_saida);

            // Fallback para movimentações antigas que usavam apenas "quantidade"
            let variacao = entrada - saida;
            if (entrada === 0 && saida === 0 && mov.quantidade !== undefined) {
                variacao = toNumber(mov.quantidade);
            }

            saldoAcumulado += variacao;

            return {
                ...mov,
                variacao,
                saldoAcumulado,
                label_tipo: getTipoLabel(mov.tipo, mov.referencia_tipo),
            };
        });
    }, [movInsumos, insumo]);

    return (
        <Drawer
            anchor="right"
            open={open}
            onClose={onClose}
            sx={{ zIndex: (theme) => theme.zIndex.drawer + 2 }}
        >
            <Box sx={{ width: "50vw", minWidth: 450, height: "100vh", display: "flex", flexDirection: "column" }}>
                <Box display="flex" justifyContent="space-between" alignItems="center" p={2} borderBottom="1px solid #e0e0e0">
                    <Box>
                        <Typography variant="h6">Extrato: {insumo?.nome}</Typography>
                        <Typography variant="body2" color="text.secondary">
                            Acompanhamento de entradas e saídas e impacto no custo médio
                        </Typography>
                    </Box>
                    <IconButton onClick={onClose} size="small">
                        <Close />
                    </IconButton>
                </Box>
                <Box p={2} flex={1} overflow="auto">
                    <TableContainer>
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell>Data</TableCell>
                                    <TableCell>Movimento</TableCell>
                                    <TableCell align="right">Qtd</TableCell>
                                    <TableCell align="right">Saldo</TableCell>
                                    <TableCell align="right">Custo Unit</TableCell>
                                    <TableCell align="right">Custo Total</TableCell>
                                    <TableCell>Origem (Ref)</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {movimentosOrdenados.length > 0 ? (
                                    movimentosOrdenados.map((mov, index) => (
                                        <TableRow key={index} hover>
                                            <TableCell>{formatDate(mov.data)}</TableCell>
                                            <TableCell>{mov.label_tipo}</TableCell>
                                            <TableCell
                                                align="right"
                                                sx={{
                                                    color: mov.variacao > 0 ? "success.main" : mov.variacao < 0 ? "error.main" : "inherit",
                                                    fontWeight: "bold",
                                                }}
                                            >
                                                {mov.variacao > 0 ? "+" : ""}{mov.variacao.toFixed(2)}
                                            </TableCell>
                                            <TableCell align="right" sx={{ fontWeight: 600 }}>
                                                {mov.saldoAcumulado.toFixed(2)}
                                            </TableCell>
                                            <TableCell align="right">
                                                {formatCurrency(mov.custo_unit)}
                                            </TableCell>
                                            <TableCell align="right">
                                                {formatCurrency(mov.custo_unit * Math.abs(mov.variacao))}
                                            </TableCell>
                                            <TableCell sx={{ fontSize: "0.75rem", color: "text.secondary" }}>
                                                {mov.referencia_id ? String(mov.referencia_id).slice(0, 8) : "-"}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={7} align="center">
                                            Nenhuma movimentação encontrada para este insumo.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Box>
            </Box>
        </Drawer>
    );
}
