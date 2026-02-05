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

const InsumosPage = () => {
  const insumos = useDataStore((state) => state.insumos);
  const addInsumo = useDataStore((state) => state.addInsumo);
  const [form, setForm] = useState({
    nome: "",
    unidade: "kg",
    kg_por_saco: "1",
    estoque_minimo: "",
  });
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [feedback, setFeedback] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  const handleChange = (field) => (event) => {
    const value = event.target.value;
    setForm((prev) => {
      if (field === "unidade") {
        return {
          ...prev,
          unidade: value,
          kg_por_saco: value === "saco" ? prev.kg_por_saco || "1" : "1",
        };
      }

      return { ...prev, [field]: value };
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!form.nome.trim()) {
      setFeedback({
        open: true,
        message: "Informe o nome do insumo para cadastrar.",
        severity: "error",
      });
      return;
    }

    if (form.unidade === "saco" && Number(form.kg_por_saco) <= 0) {
      setFeedback({
        open: true,
        message: "Informe quantos kg vêm em cada saco.",
        severity: "error",
      });
      return;
    }

    await addInsumo({
      ...form,
      estoque_minimo: Number(form.estoque_minimo) || 0,
      kg_por_saco: form.unidade === "saco" ? Number(form.kg_por_saco) : 1,
    });
    setForm({ nome: "", unidade: "kg", kg_por_saco: "1", estoque_minimo: "" });
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
                    Unidade de cadastro: {insumo.unidade} • Kg por saco:{" "}
                    {Number(insumo.kg_por_saco) || 1}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Estoque mínimo: {insumo.estoque_minimo || "-"}{" "}
                    {insumo.unidade}
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
              select
              label="Tipo de cadastro"
              value={form.unidade}
              onChange={handleChange("unidade")}
              required
            >
              <MenuItem value="kg">Kg</MenuItem>
              <MenuItem value="saco">Saco</MenuItem>
            </TextField>
            {form.unidade === "saco" ? (
              <TextField
                label="Kg por saco"
                type="number"
                value={form.kg_por_saco}
                onChange={handleChange("kg_por_saco")}
                inputProps={{ min: 0.01, step: "0.01" }}
                required
              />
            ) : null}
            <TextField
              label={`Estoque mínimo (${form.unidade})`}
              type="number"
              value={form.estoque_minimo}
              onChange={handleChange("estoque_minimo")}
              inputProps={{ min: 0, step: "0.01" }}
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
