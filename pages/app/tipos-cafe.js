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

const TiposCafePage = () => {
  const tiposCafe = useDataStore((state) => state.tiposCafe);
  const addTipoCafe = useDataStore((state) => state.addTipoCafe);
  const [form, setForm] = useState({
    nome: "",
    rendimento_percent: "",
    overhead_percent: "",
  });

  const handleChange = (field) => (event) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    addTipoCafe(form);
    setForm({ nome: "", rendimento_percent: "", overhead_percent: "" });
  };

  return (
    <AppLayout>
      <PageHeader
        title="Tipos de Café"
        subtitle="Defina rendimento e overhead para cálculo de custo." 
      />
      <Grid container spacing={3}>
        <Grid item xs={12} md={5}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Novo tipo
            </Typography>
            <Box component="form" onSubmit={handleSubmit}>
              <Stack spacing={2}>
                <TextField label="Nome" value={form.nome} onChange={handleChange("nome")} required />
                <TextField
                  label="Rendimento (%)"
                  value={form.rendimento_percent}
                  onChange={handleChange("rendimento_percent")}
                />
                <TextField
                  label="Overhead (%)"
                  value={form.overhead_percent}
                  onChange={handleChange("overhead_percent")}
                />
                <Button type="submit" variant="contained">
                  Salvar tipo
                </Button>
              </Stack>
            </Box>
          </Paper>
        </Grid>
        <Grid item xs={12} md={7}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Tipos cadastrados
            </Typography>
            <Stack spacing={2}>
              {tiposCafe.map((tipo) => (
                <Paper key={tipo.id} variant="outlined" sx={{ p: 2 }}>
                  <Typography fontWeight={600}>{tipo.nome}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Rendimento: {tipo.rendimento_percent || "-"}% • Overhead: {tipo.overhead_percent || "-"}%
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
    </AppLayout>
  );
};

export default TiposCafePage;
