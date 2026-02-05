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
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [errors, setErrors] = useState({ email: "", senha: "" });

  const handleChange = (field) => (event) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const email = form.email.trim().toLowerCase();
    const senha = form.senha.trim();
    const emailExists = usuarios.some(
      (usuario) => usuario.email?.trim().toLowerCase() === email
    );
    const senhaValida = /^\d{5,}$/.test(senha);

    if (emailExists || !senhaValida) {
      setErrors({
        email: emailExists ? "Já existe um usuário com este e-mail." : "",
        senha: !senhaValida ? "A senha precisa ter no mínimo 5 dígitos numéricos." : "",
      });
      return;
    }

    addUsuario({ ...form, email, senha });
    setForm({ nome: "", email: "", senha: "", perfil: "vendas" });
    setErrors({ email: "", senha: "" });
    setDrawerOpen(false);
    setSnackbarOpen(true);
  };

  return (
    <AppLayout>
      <PageHeader
        title="Usuários"
        subtitle="Gerencie acessos e perfis do sistema."
        action={
          <Button
            variant="contained"
            startIcon={<PersonAdd />}
            onClick={() => setDrawerOpen(true)}
          >
            Cadastrar usuário
          </Button>
        }
      />
      <Grid container spacing={3}>
        <Grid item xs={12}>
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
      <Drawer
        anchor="right"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        PaperProps={{
          sx: { width: { xs: "100%", sm: 360 }, p: 3 },
        }}
      >
        <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
          <Typography variant="h6">Cadastrar usuário</Typography>
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
              label="Email"
              type="email"
              value={form.email}
              onChange={handleChange("email")}
              error={Boolean(errors.email)}
              helperText={errors.email}
              required
            />
            <TextField
              label="Senha"
              type="password"
              value={form.senha}
              onChange={handleChange("senha")}
              error={Boolean(errors.senha)}
              helperText={errors.senha || "Mínimo 5 dígitos numéricos."}
              required
            />
            <TextField
              select
              label="Perfil"
              value={form.perfil}
              onChange={handleChange("perfil")}
            >
              <MenuItem value="admin">Admin</MenuItem>
              <MenuItem value="financeiro">Financeiro</MenuItem>
              <MenuItem value="producao">Produção</MenuItem>
              <MenuItem value="vendas">Vendas</MenuItem>
            </TextField>
            <Button type="submit" variant="contained">
              Salvar
            </Button>
          </Stack>
        </Box>
      </Drawer>
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={4000}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert severity="success" variant="filled" onClose={() => setSnackbarOpen(false)}>
          Usuário cadastrado com sucesso.
        </Alert>
      </Snackbar>
    </AppLayout>
  );
};

export default UsuariosPage;
