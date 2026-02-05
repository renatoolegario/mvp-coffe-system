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

const UsuariosPage = () => {
  const usuarios = useDataStore((state) => state.usuarios);
  const addUsuario = useDataStore((state) => state.addUsuario);
  const toggleUsuario = useDataStore((state) => state.toggleUsuario);
  const [form, setForm] = useState({
    nome: "",
    email: "",
    senha: "",
    perfil: "vendas",
  });

  const handleChange = (field) => (event) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    addUsuario(form);
    setForm({ nome: "", email: "", senha: "", perfil: "vendas" });
  };

  return (
    <AppLayout>
      <PageHeader
        title="Usuários"
        subtitle="Gerencie acessos e perfis do sistema."
      />
      <Grid container spacing={3}>
        <Grid item xs={12} md={5}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Novo usuário
            </Typography>
            <Box component="form" onSubmit={handleSubmit}>
              <Stack spacing={2}>
                <TextField label="Nome" value={form.nome} onChange={handleChange("nome")} required />
                <TextField label="Email" type="email" value={form.email} onChange={handleChange("email")} required />
                <TextField label="Senha" type="password" value={form.senha} onChange={handleChange("senha")} required />
                <TextField select label="Perfil" value={form.perfil} onChange={handleChange("perfil")}
                >
                  <MenuItem value="admin">Admin</MenuItem>
                  <MenuItem value="financeiro">Financeiro</MenuItem>
                  <MenuItem value="producao">Produção</MenuItem>
                  <MenuItem value="vendas">Vendas</MenuItem>
                </TextField>
                <Button type="submit" variant="contained">
                  Criar usuário
                </Button>
              </Stack>
            </Box>
          </Paper>
        </Grid>
        <Grid item xs={12} md={7}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Usuários cadastrados
            </Typography>
            <Stack spacing={2}>
              {usuarios.map((usuario) => (
                <Paper key={usuario.id} variant="outlined" sx={{ p: 2 }}>
                  <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ xs: "flex-start", sm: "center" }} spacing={2}>
                    <Box>
                      <Typography fontWeight={600}>{usuario.nome}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {usuario.email} • {usuario.perfil}
                      </Typography>
                    </Box>
                    <Button
                      variant="outlined"
                      color={usuario.ativo ? "secondary" : "primary"}
                      onClick={() => toggleUsuario(usuario.id)}
                    >
                      {usuario.ativo ? "Desativar" : "Ativar"}
                    </Button>
                  </Stack>
                </Paper>
              ))}
            </Stack>
          </Paper>
        </Grid>
      </Grid>
    </AppLayout>
  );
};

export default UsuariosPage;
