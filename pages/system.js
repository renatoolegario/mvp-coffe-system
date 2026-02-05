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
import { serializeSeedData } from "../utils/seed";

const SystemPage = () => {
  const loadData = useDataStore((state) => state.loadData);

  const [status, setStatus] = useState(null);
  const [loadingSeed, setLoadingSeed] = useState(false);
  const [databaseJson, setDatabaseJson] = useState("");

  const handleSeedDatabase = async () => {
    setLoadingSeed(true);
    setStatus(null);

    try {
      const response = await fetch("/api/v1/system/seed", {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Erro ao alimentar o banco.");
      }

      await loadData();

      setStatus({
        severity: "success",
        message: "Banco PostgreSQL recriado e dados importados do seed.json.",
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

  const handleDownloadSeed = async () => {
    setStatus(null);

    try {
      const response = await fetch("/api/v1/data");
      if (!response.ok) {
        throw new Error("Erro ao buscar dados.");
      }
      const dataSnapshot = await response.json();
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
        message: "Seed.json gerado com os dados atuais do PostgreSQL.",
      });
    } catch (error) {
      setStatus({
        severity: "error",
        message: "Não foi possível gerar o seed.json. Tente novamente.",
      });
    }
  };

  const handleShowDatabaseJson = async () => {
    setStatus(null);

    try {
      const response = await fetch("/api/v1/data");
      if (!response.ok) {
        throw new Error("Erro ao buscar dados.");
      }
      const dataSnapshot = await response.json();
      setDatabaseJson(JSON.stringify(dataSnapshot, null, 2));
    } catch (error) {
      setStatus({
        severity: "error",
        message: "Não foi possível carregar os dados em JSON.",
      });
    }
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
                Controle o banco PostgreSQL com ações rápidas de carga e exportação.
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
