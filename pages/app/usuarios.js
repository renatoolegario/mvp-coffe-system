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
import { useEffect, useState } from "react";
import SearchableSelect from "../../components/atomic/SearchableSelect";
import AppLayout from "../../components/template/AppLayout";
import PageHeader from "../../components/atomic/PageHeader";
import { useDataStore } from "../../hooks/useDataStore";
import { getSession } from "../../hooks/useSession";
import { PERFIS, toPerfilCode, toPerfilLabel } from "../../utils/profile";

const UsuariosPage = () => {
  const usuarios = useDataStore((state) => state.usuarios);
  const addUsuario = useDataStore((state) => state.addUsuario);
  const toggleUsuario = useDataStore((state) => state.toggleUsuario);
  const [form, setForm] = useState({
    nome: "",
    email: "",
    senha: "",
    perfil: PERFIS.COMUM,
  });
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [errors, setErrors] = useState({ email: "", senha: "" });
  const [isAdmin, setIsAdmin] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  useEffect(() => {
    const session = getSession();
    setIsAdmin(toPerfilCode(session?.perfil) === PERFIS.ADMIN);
  }, []);

  const handleChange = (field) => (event) => {
    const value =
      field === "perfil" ? Number(event.target.value) : event.target.value;

    setForm((prev) => ({ ...prev, [field]: value }));
    if (field === "email" || field === "senha") {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
    setSubmitError("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!isAdmin || isSubmitting) return;

    const email = form.email.trim().toLowerCase();
    const senha = form.senha.trim();
    const emailExists = usuarios.some(
      (usuario) => usuario.email?.trim().toLowerCase() === email,
    );
    const senhaValida = /^\d{5,}$/.test(senha);

    setSubmitError("");

    if (emailExists || !senhaValida) {
      setErrors({
        email: emailExists ? "Já existe um usuário com este e-mail." : "",
        senha: !senhaValida
          ? "A senha precisa ter no mínimo 5 dígitos numéricos."
          : "",
      });
      return;
    }

    setIsSubmitting(true);
    const result = await addUsuario({
      ...form,
      email,
      senha,
      perfil: Number(form.perfil),
    });
    setIsSubmitting(false);

    if (!result?.ok) {
      const message = result?.error || "Não foi possível cadastrar o usuário.";
      setSubmitError(message);
      setSnackbar({
        open: true,
        message,
        severity: "error",
      });
      return;
    }

    setForm({ nome: "", email: "", senha: "", perfil: PERFIS.COMUM });
    setErrors({ email: "", senha: "" });
    setDrawerOpen(false);
    setSnackbar({
      open: true,
      message: "Usuário cadastrado com sucesso.",
      severity: "success",
    });
  };

  return (
    <AppLayout>
      {!isAdmin ? (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Apenas usuários administradores (perfil 1) podem acessar esta área.
        </Alert>
      ) : null}
      <PageHeader
        title="Usuários"
        subtitle="Gerencie acessos e perfis do sistema."
        action={
          <Button
            variant="contained"
            startIcon={<PersonAdd />}
            disabled={!isAdmin}
            onClick={() => {
              setDrawerOpen(true);
              setSubmitError("");
              setErrors({ email: "", senha: "" });
            }}
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
                  <Stack
                    direction={{ xs: "column", sm: "row" }}
                    justifyContent="space-between"
                    alignItems={{ xs: "flex-start", sm: "center" }}
                    spacing={2}
                  >
                    <Box>
                      <Typography fontWeight={600}>{usuario.nome}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {usuario.email} • {toPerfilLabel(usuario.perfil)}
                      </Typography>
                    </Box>
                    <Button
                      variant="outlined"
                      color={usuario.ativo ? "secondary" : "primary"}
                      disabled={!isAdmin}
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
        sx={{ zIndex: (theme) => theme.zIndex.tooltip + 1 }}
        PaperProps={{
          sx: { width: { xs: "100%", sm: 360 }, p: 3 },
        }}
      >
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          mb={2}
        >
          <Typography variant="h6">Cadastrar usuário</Typography>
          <IconButton
            onClick={() => {
              setDrawerOpen(false);
              setSubmitError("");
            }}
          >
            <Close />
          </IconButton>
        </Stack>
        <Box component="form" onSubmit={handleSubmit}>
          <Stack spacing={2}>
            {submitError ? <Alert severity="error">{submitError}</Alert> : null}
            <TextField
              label="Nome"
              value={form.nome}
              onChange={handleChange("nome")}
              required
            />
            <TextField
              label="E-mail"
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
            <SearchableSelect
              label="Perfil"
              disabled={!isAdmin}
              value={form.perfil}
              onChange={handleChange("perfil")}
            >
              <MenuItem value={PERFIS.ADMIN}>Admin</MenuItem>
              <MenuItem value={PERFIS.COMUM}>Comum</MenuItem>
            </SearchableSelect>
            <Button
              type="submit"
              variant="contained"
              disabled={!isAdmin || isSubmitting}
            >
              {isSubmitting ? "Salvando..." : "Salvar"}
            </Button>
          </Stack>
        </Box>
      </Drawer>
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() =>
          setSnackbar((prev) => ({
            ...prev,
            open: false,
          }))
        }
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert
          severity={snackbar.severity}
          variant="filled"
          onClose={() =>
            setSnackbar((prev) => ({
              ...prev,
              open: false,
            }))
          }
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </AppLayout>
  );
};

export default UsuariosPage;
