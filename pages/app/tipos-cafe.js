import {
  Box,
  Button,
  Grid,
  MenuItem,
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
  const insumos = useDataStore((state) => state.insumos);
  const addTipoCafe = useDataStore((state) => state.addTipoCafe);
  const [form, setForm] = useState({
    nome: "",
    rendimento_percent: "",
    margem_lucro_percent: "",
    insumo_id: "",
  });

  const handleChange = (field) => (event) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    addTipoCafe(form);
    setForm({
      nome: "",
      rendimento_percent: "",
      margem_lucro_percent: "",
      insumo_id: "",
    });
  };

  return (
    <AppLayout>
      <PageHeader
        title="Tipos de Café"
        subtitle="Defina rendimento, insumo e margem de lucro para cálculo de custo." 
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
                    Insumo: {insumos.find((insumo) => insumo.id === tipo.insumo_id)?.nome || "-"}
                    {" • "}Rendimento: {tipo.rendimento_percent || "-"}%
                    {" • "}Margem: {tipo.margem_lucro_percent || "-"}%
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
