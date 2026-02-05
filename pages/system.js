import {
  Alert,
  Box,
  Button,
  Container,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import { useState } from "react";
import { useDataStore } from "../hooks/useDataStore";
import { resetIndexedDb } from "../utils/indexedDb";
import { normalizeSeedData, serializeSeedData } from "../utils/seed";

const SystemPage = () => {
  const hydrateFromSeed = useDataStore((state) => state.hydrateFromSeed);
  const dataSnapshot = useDataStore((state) => ({
    usuarios: state.usuarios,
    clientes: state.clientes,
    fornecedores: state.fornecedores,
    insumos: state.insumos,
    tiposCafe: state.tiposCafe,
    lotes: state.lotes,
    movInsumos: state.movInsumos,
    movLotes: state.movLotes,
    entradasInsumos: state.entradasInsumos,
    ordensProducao: state.ordensProducao,
    vendas: state.vendas,
    contasPagar: state.contasPagar,
    contasPagarParcelas: state.contasPagarParcelas,
    contasReceber: state.contasReceber,
    contasReceberParcelas: state.contasReceberParcelas,
  }));
  const [status, setStatus] = useState(null);
  const [loadingSeed, setLoadingSeed] = useState(false);

  const handleSeedDatabase = async () => {
    setLoadingSeed(true);
    setStatus(null);
    try {
      await resetIndexedDb();
      const seedModule = await import("../docs/seed.json");
      const seedData = normalizeSeedData(seedModule.default ?? seedModule);
      hydrateFromSeed(seedData);
      setStatus({
        severity: "success",
        message: "Banco recriado no IndexedDB e dados importados do seed.json.",
      });
    } catch (error) {
      setStatus({
        severity: "error",
        message: "Não foi possível alimentar o banco de dados. Tente novamente.",
      });
    } finally {
      setLoadingSeed(false);
    }
  };

  const handleDownloadSeed = () => {
    setStatus(null);
    const seedData = serializeSeedData(dataSnapshot);
    const blob = new Blob([JSON.stringify(seedData, null, 2)], {
      type: "application/json",
    });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "seed.json";
    anchor.click();
    window.URL.revokeObjectURL(url);
    setStatus({
      severity: "success",
      message: "Seed.json gerado com os dados atuais do IndexedDB.",
    });
  };

  return (
    <Box sx={{ backgroundColor: "#f9f5f1", minHeight: "100vh", py: 10 }}>
      <Container maxWidth="sm">
        <Paper sx={{ p: 4, borderRadius: 4 }} elevation={1}>
          <Stack spacing={3}>
            <Box>
              <Typography variant="h4" fontWeight={700} gutterBottom>
                System
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Controle o IndexedDB local com ações rápidas de carga e exportação.
              </Typography>
            </Box>
            {status ? <Alert severity={status.severity}>{status.message}</Alert> : null}
            <Stack spacing={2}>
              <Button
                variant="contained"
                size="large"
                onClick={handleSeedDatabase}
                disabled={loadingSeed}
              >
                {loadingSeed ? "Alimentando banco de dados..." : "Alimentar banco de dados"}
              </Button>
              <Button variant="outlined" size="large" onClick={handleDownloadSeed}>
                Gerar seed.json
              </Button>
            </Stack>
          </Stack>
        </Paper>
      </Container>
    </Box>
  );
};

export default SystemPage;
