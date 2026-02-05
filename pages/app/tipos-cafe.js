import {
  Alert,
  Box,
  Button,
  Drawer,
  Grid,
  IconButton,
  MenuItem,
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

const TiposCafePage = () => {
  const tiposCafe = useDataStore((state) => state.tiposCafe);
  const insumos = useDataStore((state) => state.insumos);
  const addTipoCafe = useDataStore((state) => state.addTipoCafe);
  const [form, setForm] = useState({
    nome: "",
    rendimento_percent: "",
    margem_lucro_percent: "",
    insumo_id: "",
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
    if (!form.nome.trim() || !form.insumo_id) {
      setFeedback({
        open: true,
        message: "Preencha nome e insumo base para cadastrar o tipo de café.",
        severity: "error",
      });
      return;
    }

    addTipoCafe(form);
    setForm({
      nome: "",
      rendimento_percent: "",
      margem_lucro_percent: "",
      insumo_id: "",
    });
    setDrawerOpen(false);
    setFeedback({
      open: true,
      message: "Tipo de café cadastrado com sucesso.",
      severity: "success",
    });
  };

  return (
    <AppLayout>
      <PageHeader
        title="Tipos de Café"
        subtitle="Defina rendimento, insumo e margem de lucro para cálculo de custo."
        action={
          <Button
            variant="contained"
            startIcon={<PersonAdd />}
            onClick={() => setDrawerOpen(true)}
          >
            Cadastrar tipo
          </Button>
        }
      />
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Tipos cadastrados
            </Typography>
            <Stack spacing={2}>
              {tiposCafe.map((tipo) => (
                <Paper key={tipo.id} variant="outlined" sx={{ p: 2 }}>
                  <Typography fontWeight={600}>{tipo.nome}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Insumo:{" "}
                    {insumos.find((insumo) => insumo.id === tipo.insumo_id)
                      ?.nome || "-"}
                    {" • "}Rendimento: {tipo.rendimento_percent || "-"}%{" • "}
                    Margem: {tipo.margem_lucro_percent || "-"}%
                  </Typography>
                </Paper>
              ))}
              {!tiposCafe.length ? (
                <Typography variant="body2" color="text.secondary">
                  Nenhum tipo cadastrado ainda.
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
          <Typography variant="h6">Cadastrar tipo de café</Typography>
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
              select
              label="Insumo base"
              value={form.insumo_id}
              onChange={handleChange("insumo_id")}
              required
            >
              {insumos.map((insumo) => (
                <MenuItem key={insumo.id} value={insumo.id}>
                  {insumo.nome}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Rendimento (%)"
              value={form.rendimento_percent}
              onChange={handleChange("rendimento_percent")}
            />
            <TextField
              label="Margem de lucro (%)"
              value={form.margem_lucro_percent}
              onChange={handleChange("margem_lucro_percent")}
            />
            <Button type="submit" variant="contained">
              Salvar tipo
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

export default TiposCafePage;
