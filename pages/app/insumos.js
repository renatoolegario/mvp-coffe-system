import {
  Box,
  Button,
  Grid,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
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

  const handleChange = (field) => (event) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    addInsumo(form);
    setForm({ nome: "", unidade: "kg", estoque_minimo: "" });
  };

  return (
    <AppLayout>
      <PageHeader
        title="Gestão de Insumos"
        subtitle="Cadastre matérias-primas e parâmetros de estoque."
      />
      <Grid container spacing={3}>
        <Grid item xs={12} md={5}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Novo insumo
            </Typography>
            <Box component="form" onSubmit={handleSubmit}>
              <Stack spacing={2}>
                <TextField label="Nome" value={form.nome} onChange={handleChange("nome")} required />
                <TextField label="Unidade" value={form.unidade} onChange={handleChange("unidade")} />
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
          </Paper>
        </Grid>
        <Grid item xs={12} md={7}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Insumos cadastrados
            </Typography>
            <Stack spacing={2}>
              {insumos.map((insumo) => (
                <Paper key={insumo.id} variant="outlined" sx={{ p: 2 }}>
                  <Typography fontWeight={600}>{insumo.nome}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Unidade: {insumo.unidade} • Estoque mínimo: {insumo.estoque_minimo || "-"}
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
    </AppLayout>
  );
};

export default InsumosPage;
