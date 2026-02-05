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
  Snackbar,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { Close, Edit, PersonAdd } from "@mui/icons-material";
import { useState } from "react";
import AppLayout from "../../components/template/AppLayout";
import PageHeader from "../../components/atomic/PageHeader";
import { useDataStore } from "../../hooks/useDataStore";

const TiposCafePage = () => {
  const tiposCafe = useDataStore((state) => state.tiposCafe);
  const insumos = useDataStore((state) => state.insumos);
  const addTipoCafe = useDataStore((state) => state.addTipoCafe);
  const updateTipoCafe = useDataStore((state) => state.updateTipoCafe);
  const [form, setForm] = useState({
    id: "",
    nome: "",
    rendimento_percent: "",
    margem_lucro_percent: "",
    kg_saco_venda: "",
    insumo_id: "",
  });
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [feedback, setFeedback] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  const resetForm = () => {
    setForm({
      id: "",
      nome: "",
      rendimento_percent: "",
      margem_lucro_percent: "",
      kg_saco_venda: "",
      insumo_id: "",
    });
    setIsEditing(false);
  };

  const handleOpenCreate = () => {
    resetForm();
    setDrawerOpen(true);
  };

  const handleOpenEdit = (tipo) => {
    setForm({
      id: tipo.id,
      nome: tipo.nome || "",
      rendimento_percent: tipo.rendimento_percent || "",
      margem_lucro_percent: tipo.margem_lucro_percent || "",
      kg_saco_venda: tipo.kg_saco_venda || "",
      insumo_id: tipo.insumo_id || "",
    });
    setIsEditing(true);
    setDrawerOpen(true);
  };

  const handleChange = (field) => (event) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (
      !form.nome.trim() ||
      !form.insumo_id ||
      Number(form.kg_saco_venda) <= 0
    ) {
      setFeedback({
        open: true,
        message:
          "Preencha nome, insumo base e quantos kg há no saco para venda.",
        severity: "error",
      });
      return;
    }

    const payload = {
      ...form,
      kg_saco_venda: Number(form.kg_saco_venda),
    };

    if (isEditing) {
      await updateTipoCafe(payload);
    } else {
      await addTipoCafe(payload);
    }

    resetForm();
    setDrawerOpen(false);
    setFeedback({
      open: true,
      message: isEditing
        ? "Tipo de café atualizado com sucesso."
        : "Tipo de café cadastrado com sucesso.",
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
            onClick={handleOpenCreate}
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
                  <Stack
                    direction="row"
                    alignItems="center"
                    justifyContent="space-between"
                  >
                    <Typography fontWeight={600}>{tipo.nome}</Typography>
                    <IconButton
                      size="small"
                      aria-label={`Editar tipo ${tipo.nome}`}
                      onClick={() => handleOpenEdit(tipo)}
                    >
                      <Edit fontSize="small" />
                    </IconButton>
                  </Stack>
                  <Typography variant="body2" color="text.secondary">
                    Insumo:{" "}
                    {insumos.find((insumo) => insumo.id === tipo.insumo_id)
                      ?.nome || "-"}
                    {" • "}Rendimento: {tipo.rendimento_percent || "-"}%{" • "}
                    Margem: {tipo.margem_lucro_percent || "-"}%{" • "}
                    Saco: {tipo.kg_saco_venda || "-"} kg
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
          <Typography variant="h6">
            {isEditing ? "Editar tipo de café" : "Cadastrar tipo de café"}
          </Typography>
          <IconButton
            onClick={() => {
              setDrawerOpen(false);
              resetForm();
            }}
          >
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
            <Divider sx={{ mt: 1 }} />
            <TextField
              type="number"
              label="A venda do saco tem quantos kg"
              value={form.kg_saco_venda}
              onChange={handleChange("kg_saco_venda")}
              required
              inputProps={{ min: 0.01, step: "any" }}
              helperText="Campo obrigatório, deve ser maior que 0."
            />
            <Button type="submit" variant="contained">
              {isEditing ? "Salvar alterações" : "Salvar tipo"}
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
