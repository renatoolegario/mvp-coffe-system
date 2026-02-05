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

  // Option 1: Remove the subscription entirely since you only need it on-demand
  // Just access the store when needed in handleDownloadSeed

  const [status, setStatus] = useState(null);
  const [loadingSeed, setLoadingSeed] = useState(false);
  const [databaseJson, setDatabaseJson] = useState("");

  const getSeedData = () => {
    const dataSnapshot = useDataStore.getState();
    return serializeSeedData({
      usuarios: dataSnapshot.usuarios,
      clientes: dataSnapshot.clientes,
      fornecedores: dataSnapshot.fornecedores,
      insumos: dataSnapshot.insumos,
      tiposCafe: dataSnapshot.tiposCafe,
      lotes: dataSnapshot.lotes,
      movInsumos: dataSnapshot.movInsumos,
      movLotes: dataSnapshot.movLotes,
      entradasInsumos: dataSnapshot.entradasInsumos,
      ordensProducao: dataSnapshot.ordensProducao,
      vendas: dataSnapshot.vendas,
      contasPagar: dataSnapshot.contasPagar,
      contasPagarParcelas: dataSnapshot.contasPagarParcelas,
      contasReceber: dataSnapshot.contasReceber,
      contasReceberParcelas: dataSnapshot.contasReceberParcelas,
    });
  };

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

    // Get the data snapshot directly when needed
    const seedData = getSeedData();

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

  const handleShowDatabaseJson = () => {
    setStatus(null);
    const seedData = getSeedData();
    setDatabaseJson(JSON.stringify(seedData, null, 2));
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

            {status && (
              <Alert severity={status.severity}>{status.message}</Alert>
            )}

            <Stack spacing={2}>
              <Button
                variant="contained"
                size="large"
                onClick={handleSeedDatabase}
                disabled={loadingSeed}
              >
                {loadingSeed
                  ? "Alimentando banco de dados..."
                  : "Alimentar banco de dados"}
              </Button>

              <Button
                variant="outlined"
                size="large"
                onClick={handleDownloadSeed}
              >
                Gerar seed.json
              </Button>

              <Button
                variant="text"
                size="large"
                onClick={handleShowDatabaseJson}
              >
                Mostrar dados em JSON
              </Button>
            </Stack>

            {databaseJson && (
              <Box
                sx={{
                  backgroundColor: "#f5f5f5",
                  borderRadius: 2,
                  maxHeight: 320,
                  overflow: "auto",
                  p: 2,
                  fontFamily: "monospace",
                  fontSize: "0.85rem",
                }}
              >
                <pre style={{ margin: 0 }}>{databaseJson}</pre>
              </Box>
            )}
          </Stack>
        </Paper>
      </Container>
    </Box>
  );
};

export default SystemPage;
