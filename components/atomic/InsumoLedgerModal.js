import {
  Alert,
  Box,
  Drawer,
  IconButton,
  Snackbar,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from "@mui/material";
import { Close, ContentCopyRounded, DownloadRounded } from "@mui/icons-material";
import { useMemo, useState } from "react";
import { useDataStore } from "../../hooks/useDataStore";
import { formatDate, formatCurrency } from "../../utils/format";
import { downloadWorkbookXlsx } from "../../utils/xlsx";

const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const getTipoLabel = (tipo) => {
  const map = {
    ENTRADA_INSUMO: "Entrada/Compra",
    RESERVA_PRODUCAO: "Reserva para OP",
    ENTRADA_PRODUCAO: "Entrada de OP",
    ESTORNO_PRODUCAO: "Estorno de OP",
    TRANSFERENCIA_SAIDA: "Transferencia (Saida)",
    TRANSFERENCIA_ENTRADA: "Transferencia (Entrada)",
    VENDA: "Venda",
  };
  return map[tipo] || tipo;
};

export default function InsumoLedgerModal({ open, onClose, insumo }) {
  const movInsumos = useDataStore((state) => state.movInsumos);
  const [feedback, setFeedback] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  const movimentosOrdenados = useMemo(() => {
    if (!insumo) return [];

    const movs = movInsumos
      .filter((m) => m.insumo_id === insumo.id)
      .sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime());

    let saldoAcumulado = 0;

    return movs.map((mov) => {
      const entrada = toNumber(mov.quantidade_entrada);
      const saida = toNumber(mov.quantidade_saida);

      // Fallback para movimentacoes antigas que usavam apenas "quantidade"
      let variacao = entrada - saida;
      if (entrada === 0 && saida === 0 && mov.quantidade !== undefined) {
        variacao = toNumber(mov.quantidade);
      }

      saldoAcumulado += variacao;

      return {
        ...mov,
        variacao,
        saldoAcumulado,
        label_tipo: getTipoLabel(mov.tipo),
      };
    });
  }, [movInsumos, insumo]);

  const handleExportLedger = () => {
    if (!movimentosOrdenados.length) {
      setFeedback({
        open: true,
        message: "Nao ha historico para exportar.",
        severity: "warning",
      });
      return;
    }

    const rows = movimentosOrdenados.map((mov) => ({
      data: mov.data || "",
      movimento: mov.label_tipo || "",
      variacao_kg: Number(mov.variacao) || 0,
      saldo_kg: Number(mov.saldoAcumulado) || 0,
      custo_unit_kg: Number(mov.custo_unit) || 0,
      custo_total_mov: Number(mov.custo_unit) * Math.abs(Number(mov.variacao) || 0),
      referencia_tipo: mov.referencia_tipo || "",
      referencia_id: mov.referencia_id || "",
      observacao: mov.obs || "",
    }));

    downloadWorkbookXlsx({
      fileName: `extrato_${String(insumo?.nome || "insumo")
        .replace(/\s+/g, "_")
        .toLowerCase()}_${new Date().toISOString().slice(0, 10)}`,
      sheets: [
        {
          name: "Extrato",
          columns: [
            { key: "data", header: "Data" },
            { key: "movimento", header: "Movimento" },
            { key: "variacao_kg", header: "Variacao (kg)" },
            { key: "saldo_kg", header: "Saldo (kg)" },
            { key: "custo_unit_kg", header: "Custo unitario (R$/kg)" },
            { key: "custo_total_mov", header: "Custo total (R$)" },
            { key: "referencia_tipo", header: "Origem tipo" },
            { key: "referencia_id", header: "Origem codigo completo" },
            { key: "observacao", header: "Observacao" },
          ],
          rows,
        },
      ],
    });

    setFeedback({
      open: true,
      message: "Extrato exportado em XLSX.",
      severity: "success",
    });
  };

  const handleCopyReference = async (referenceId) => {
    if (!referenceId) return;

    const value = String(referenceId);
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = value;
        textarea.setAttribute("readonly", "true");
        textarea.style.position = "absolute";
        textarea.style.left = "-9999px";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      setFeedback({
        open: true,
        message: "Codigo de referencia copiado.",
        severity: "success",
      });
    } catch (error) {
      setFeedback({
        open: true,
        message: "Nao foi possivel copiar a referencia.",
        severity: "error",
      });
    }
  };

  return (
    <>
      <Drawer
        anchor="right"
        open={open}
        onClose={onClose}
        sx={{ zIndex: (theme) => theme.zIndex.tooltip + 1 }}
      >
        <Box
          sx={{
            width: "50vw",
            minWidth: 450,
            height: "100vh",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <Box
            display="flex"
            justifyContent="space-between"
            alignItems="center"
            p={2}
            borderBottom="1px solid #e0e0e0"
          >
            <Box>
              <Typography variant="h6">Extrato: {insumo?.nome}</Typography>
              <Typography variant="body2" color="text.secondary">
                Acompanhamento de entradas e saidas e impacto no custo medio
              </Typography>
            </Box>
            <Stack direction="row" spacing={0.5}>
              <Tooltip title="Baixar historico em XLSX">
                <IconButton onClick={handleExportLedger} size="small">
                  <DownloadRounded fontSize="small" />
                </IconButton>
              </Tooltip>
              <IconButton onClick={onClose} size="small">
                <Close />
              </IconButton>
            </Stack>
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
                            color:
                              mov.variacao > 0
                                ? "success.main"
                                : mov.variacao < 0
                                  ? "error.main"
                                  : "inherit",
                            fontWeight: "bold",
                          }}
                        >
                          {mov.variacao > 0 ? "+" : ""}
                          {mov.variacao.toFixed(2)}
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 600 }}>
                          {mov.saldoAcumulado.toFixed(2)}
                        </TableCell>
                        <TableCell align="right">{formatCurrency(mov.custo_unit)}</TableCell>
                        <TableCell align="right">
                          {formatCurrency(mov.custo_unit * Math.abs(mov.variacao))}
                        </TableCell>
                        <TableCell sx={{ fontSize: "0.75rem", color: "text.secondary" }}>
                          <Stack direction="row" spacing={0.5} alignItems="center">
                            <Typography
                              component="span"
                              sx={{ fontSize: "0.75rem", color: "text.secondary" }}
                            >
                              {mov.referencia_id ? String(mov.referencia_id).slice(0, 8) : "-"}
                            </Typography>
                            {mov.referencia_id ? (
                              <Tooltip title="Copiar codigo completo">
                                <IconButton
                                  size="small"
                                  onClick={() => handleCopyReference(mov.referencia_id)}
                                >
                                  <ContentCopyRounded sx={{ fontSize: 14 }} />
                                </IconButton>
                              </Tooltip>
                            ) : null}
                          </Stack>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} align="center">
                        Nenhuma movimentacao encontrada para este insumo.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        </Box>
      </Drawer>

      <Snackbar
        open={feedback.open}
        autoHideDuration={2800}
        onClose={() => setFeedback((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert
          severity={feedback.severity}
          variant="filled"
          onClose={() => setFeedback((prev) => ({ ...prev, open: false }))}
        >
          {feedback.message}
        </Alert>
      </Snackbar>
    </>
  );
}
