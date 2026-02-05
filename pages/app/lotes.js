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

const LotesPage = () => {
  const lotes = useDataStore((state) => state.lotes);
  const tiposCafe = useDataStore((state) => state.tiposCafe);
  const addLote = useDataStore((state) => state.addLote);
  const [form, setForm] = useState({
    nome: "",
    tipo_cafe_id: "",
    unidade: "kg",
  });

  const handleChange = (field) => (event) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    addLote(form);
    setForm({ nome: "", tipo_cafe_id: "", unidade: "kg" });
  };

  return (
    <AppLayout>
      <PageHeader
        title="Gestão de Lotes"
        subtitle="Cadastre os produtos finais de café torrado."
      />
      <Grid container spacing={3}>
        <Grid item xs={12} md={5}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Novo lote
            </Typography>
            <Box component="form" onSubmit={handleSubmit}>
              <Stack spacing={2}>
                <TextField label="Nome" value={form.nome} onChange={handleChange("nome")} required />
                <TextField
                  select
                  label="Tipo de café"
                  value={form.tipo_cafe_id}
                  onChange={handleChange("tipo_cafe_id")}
                  helperText="Defina o tipo para calcular overhead."
                >
                  <MenuItem value="">Sem tipo</MenuItem>
                  {tiposCafe.map((tipo) => (
                    <MenuItem key={tipo.id} value={tipo.id}>
                      {tipo.nome}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField label="Unidade" value={form.unidade} onChange={handleChange("unidade")} />
                <Button type="submit" variant="contained">
                  Salvar lote
                </Button>
              </Stack>
            </Box>
          </Paper>
        </Grid>
        <Grid item xs={12} md={7}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Lotes cadastrados
            </Typography>
            <Stack spacing={2}>
              {lotes.map((lote) => (
                <Paper key={lote.id} variant="outlined" sx={{ p: 2 }}>
                  <Typography fontWeight={600}>{lote.nome}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Unidade: {lote.unidade} • Tipo: {tiposCafe.find((tipo) => tipo.id === lote.tipo_cafe_id)?.nome || "-"}
                  </Typography>
                </Paper>
              ))}
              {!lotes.length ? (
                <Typography variant="body2" color="text.secondary">
                  Nenhum lote cadastrado ainda.
                </Typography>
              ) : null}
            </Stack>
          </Paper>
        </Grid>
      </Grid>
    </AppLayout>
  );
};

export default LotesPage;
