import {
  Alert,
  Box,
  Button,
  Drawer,
  Grid,
  IconButton,
  Paper,
  Snackbar,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { Close, PersonAdd } from "@mui/icons-material";
import { useState } from "react";
import AppLayout from "../../components/template/AppLayout";
import PageHeader from "../../components/atomic/PageHeader";
import { useDataStore } from "../../hooks/useDataStore";

const InsumosPage = () => {
  const insumos = useDataStore((state) => state.insumos);
  const addInsumo = useDataStore((state) => state.addInsumo);
  const [form, setForm] = useState({
    nome: "",
    unidade: "kg",
    estoque_minimo: "",
  });
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [feedback, setFeedback] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  const handleChange = (field) => (event) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!form.nome.trim()) {
      setFeedback({
        open: true,
        message: "Informe o nome do insumo para cadastrar.",
        severity: "error",
      });
      return;
    }

    addInsumo(form);
    setForm({ nome: "", unidade: "kg", estoque_minimo: "" });
    setDrawerOpen(false);
    setFeedback({
      open: true,
      message: "Insumo cadastrado com sucesso.",
      severity: "success",
    });
  };

  return (
    <AppLayout>
      <PageHeader
        title="Gestão de Insumos"
        subtitle="Cadastre matérias-primas e parâmetros de estoque."
        action={
          <Button
            variant="contained"
            startIcon={<PersonAdd />}
            onClick={() => setDrawerOpen(true)}
          >
            Cadastrar insumo
          </Button>
        }
      />
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Insumos cadastrados
            </Typography>
            <Stack spacing={2}>
              {insumos.map((insumo) => (
                <Paper key={insumo.id} variant="outlined" sx={{ p: 2 }}>
                  <Typography fontWeight={600}>{insumo.nome}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Unidade: {insumo.unidade} • Estoque mínimo:{" "}
                    {insumo.estoque_minimo || "-"}
                  </Typography>
                </Paper>
              ))}
              {!insumos.length ? (
                <Typography variant="body2" color="text.secondary">
                  Nenhum insumo cadastrado ainda.
                </Typography>
              ) : null}
            </Stack>
          </Paper>
        </Grid>
      </Grid>

      <Drawer
        anchor="right"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        PaperProps={{ sx: { width: { xs: "100%", sm: 360 }, p: 3 } }}
      >
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          mb={2}
        >
          <Typography variant="h6">Cadastrar insumo</Typography>
          <IconButton onClick={() => setDrawerOpen(false)}>
            <Close />
          </IconButton>
        </Stack>
        <Box component="form" onSubmit={handleSubmit}>
          <Stack spacing={2}>
            <TextField
              label="Nome"
              value={form.nome}
              onChange={handleChange("nome")}
              required
            />
            <TextField
              label="Unidade"
              value={form.unidade}
              onChange={handleChange("unidade")}
            />
            <TextField
              label="Estoque mínimo"
              value={form.estoque_minimo}
              onChange={handleChange("estoque_minimo")}
            />
            <Button type="submit" variant="contained">
              Salvar insumo
            </Button>
          </Stack>
        </Box>
      </Drawer>

      <Snackbar
        open={feedback.open}
        autoHideDuration={4000}
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
    </AppLayout>
  );
};

export default InsumosPage;
