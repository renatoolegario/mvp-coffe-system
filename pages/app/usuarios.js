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
import { Close, Edit, PersonAdd } from "@mui/icons-material";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import SearchableSelect from "../../components/atomic/SearchableSelect";
import AppLayout from "../../components/template/AppLayout";
import PageHeader from "../../components/atomic/PageHeader";
import { useDataStore } from "../../hooks/useDataStore";
import { clearSession, getSession } from "../../hooks/useSession";
import { PERFIS, toPerfilCode, toPerfilLabel } from "../../utils/profile";

const MIN_PASSWORD_LENGTH = 5;

const getInitialForm = () => ({
  nome: "",
  email: "",
  senha: "",
  perfil: PERFIS.COMUM,
});

const getInitialPasswordForm = () => ({
  senha: "",
  confirmacao: "",
});

const UsuariosPage = () => {
  const router = useRouter();
  const usuarios = useDataStore((state) => state.usuarios);
  const addUsuario = useDataStore((state) => state.addUsuario);
  const toggleUsuario = useDataStore((state) => state.toggleUsuario);
  const updateUsuarioSenha = useDataStore((state) => state.updateUsuarioSenha);
  const [form, setForm] = useState(getInitialForm);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [passwordDrawerOpen, setPasswordDrawerOpen] = useState(false);
  const [selectedUsuario, setSelectedUsuario] = useState(null);
  const [currentUserId, setCurrentUserId] = useState("");
  const [passwordForm, setPasswordForm] = useState(getInitialPasswordForm);
  const [errors, setErrors] = useState({ email: "", senha: "" });
  const [passwordErrors, setPasswordErrors] = useState({
    senha: "",
    confirmacao: "",
  });
  const [isAdmin, setIsAdmin] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [passwordSubmitError, setPasswordSubmitError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  useEffect(() => {
    const session = getSession();
    setIsAdmin(toPerfilCode(session?.perfil) === PERFIS.ADMIN);
    setCurrentUserId(String(session?.usuario_id || ""));
  }, []);

  const closeCreateDrawer = () => {
    setDrawerOpen(false);
    setForm(getInitialForm());
    setErrors({ email: "", senha: "" });
    setSubmitError("");
  };

  const openCreateDrawer = () => {
    setDrawerOpen(true);
    setForm(getInitialForm());
    setErrors({ email: "", senha: "" });
    setSubmitError("");
  };

  const openPasswordDrawer = (usuario) => {
    setSelectedUsuario(usuario);
    setPasswordForm(getInitialPasswordForm());
    setPasswordErrors({ senha: "", confirmacao: "" });
    setPasswordSubmitError("");
    setPasswordDrawerOpen(true);
  };

  const closePasswordDrawer = () => {
    setPasswordDrawerOpen(false);
    setSelectedUsuario(null);
    setPasswordForm(getInitialPasswordForm());
    setPasswordErrors({ senha: "", confirmacao: "" });
    setPasswordSubmitError("");
  };

  const logoutToLogin = () => {
    clearSession();
    router.replace("/login");
  };

  const handleChange = (field) => (event) => {
    const value =
      field === "perfil" ? Number(event.target.value) : event.target.value;

    setForm((prev) => ({ ...prev, [field]: value }));
    if (field === "email" || field === "senha") {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
    setSubmitError("");
  };

  const handlePasswordChange = (field) => (event) => {
    const value = event.target.value;
    setPasswordForm((prev) => ({ ...prev, [field]: value }));
    setPasswordErrors((prev) => ({ ...prev, [field]: "" }));
    setPasswordSubmitError("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!isAdmin || isSubmitting) return;

    const email = form.email.trim().toLowerCase();
    const senha = form.senha.trim();
    const emailExists = usuarios.some(
      (usuario) => usuario.email?.trim().toLowerCase() === email,
    );
    const senhaValida = senha.length >= MIN_PASSWORD_LENGTH;

    setSubmitError("");

    if (emailExists || !senhaValida) {
      setErrors({
        email: emailExists ? "Já existe um usuário com este e-mail." : "",
        senha: !senhaValida
          ? `A senha precisa ter no mínimo ${MIN_PASSWORD_LENGTH} caracteres.`
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

    closeCreateDrawer();
    setSnackbar({
      open: true,
      message: "Usuário cadastrado com sucesso.",
      severity: "success",
    });
  };

  const handleToggleUsuario = async (usuario) => {
    if (!isAdmin) return;

    const result = await toggleUsuario(usuario.id);
    if (!result?.ok) {
      setSnackbar({
        open: true,
        message: result?.error || "Não foi possível alterar o usuário.",
        severity: "error",
      });
      return;
    }

    if (!result.data?.ativo && String(usuario.id) === currentUserId) {
      logoutToLogin();
      return;
    }

    setSnackbar({
      open: true,
      message: result.data?.ativo
        ? "Usuário ativado com sucesso."
        : "Usuário desativado com sucesso.",
      severity: "success",
    });
  };

  const handlePasswordSubmit = async (event) => {
    event.preventDefault();
    if (!isAdmin || !selectedUsuario || isUpdatingPassword) return;

    const senha = passwordForm.senha.trim();
    const confirmacao = passwordForm.confirmacao.trim();
    const nextErrors = {
      senha:
        senha.length >= MIN_PASSWORD_LENGTH
          ? ""
          : `A senha precisa ter no mínimo ${MIN_PASSWORD_LENGTH} caracteres.`,
      confirmacao:
        senha === confirmacao ? "" : "A confirmação da senha não confere.",
    };

    setPasswordErrors(nextErrors);
    setPasswordSubmitError("");

    if (nextErrors.senha || nextErrors.confirmacao) {
      return;
    }

    setIsUpdatingPassword(true);
    const result = await updateUsuarioSenha({
      id: selectedUsuario.id,
      senha,
    });
    setIsUpdatingPassword(false);

    if (!result?.ok) {
      const message =
        result?.error || "Não foi possível atualizar a senha do usuário.";
      setPasswordSubmitError(message);
      setSnackbar({
        open: true,
        message,
        severity: "error",
      });
      return;
    }

    const usuarioIdAtualizado = String(selectedUsuario.id);
    closePasswordDrawer();

    if (usuarioIdAtualizado === currentUserId) {
      logoutToLogin();
      return;
    }

    setSnackbar({
      open: true,
      message: "Senha atualizada com sucesso.",
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
        subtitle="Gerencie acessos, senhas e perfis do sistema."
        action={
          <Button
            variant="contained"
            startIcon={<PersonAdd />}
            disabled={!isAdmin}
            onClick={openCreateDrawer}
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
                        {usuario.email} • {toPerfilLabel(usuario.perfil)} •{" "}
                        {usuario.ativo ? "Ativo" : "Inativo"}
                      </Typography>
                    </Box>
                    <Stack
                      direction={{ xs: "column", sm: "row" }}
                      spacing={1}
                      width={{ xs: "100%", sm: "auto" }}
                    >
                      <Button
                        variant="outlined"
                        startIcon={<Edit />}
                        disabled={!isAdmin}
                        onClick={() => openPasswordDrawer(usuario)}
                      >
                        Alterar senha
                      </Button>
                      <Button
                        variant="outlined"
                        color={usuario.ativo ? "secondary" : "primary"}
                        disabled={!isAdmin}
                        onClick={() => handleToggleUsuario(usuario)}
                      >
                        {usuario.ativo ? "Desativar" : "Ativar"}
                      </Button>
                    </Stack>
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
        onClose={closeCreateDrawer}
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
          <IconButton onClick={closeCreateDrawer}>
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
              helperText={errors.senha || "Mínimo 5 caracteres."}
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
      <Drawer
        anchor="right"
        open={passwordDrawerOpen}
        onClose={closePasswordDrawer}
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
          <Typography variant="h6">Alterar senha</Typography>
          <IconButton onClick={closePasswordDrawer}>
            <Close />
          </IconButton>
        </Stack>
        <Box component="form" onSubmit={handlePasswordSubmit}>
          <Stack spacing={2}>
            {passwordSubmitError ? (
              <Alert severity="error">{passwordSubmitError}</Alert>
            ) : null}
            <TextField
              label="Usuário"
              value={selectedUsuario?.nome || ""}
              disabled
            />
            <TextField
              label="Nova senha"
              type="password"
              value={passwordForm.senha}
              onChange={handlePasswordChange("senha")}
              error={Boolean(passwordErrors.senha)}
              helperText={passwordErrors.senha || "Mínimo 5 caracteres."}
              required
            />
            <TextField
              label="Confirmar nova senha"
              type="password"
              value={passwordForm.confirmacao}
              onChange={handlePasswordChange("confirmacao")}
              error={Boolean(passwordErrors.confirmacao)}
              helperText={passwordErrors.confirmacao}
              required
            />
            <Button
              type="submit"
              variant="contained"
              disabled={!isAdmin || isUpdatingPassword}
            >
              {isUpdatingPassword ? "Salvando..." : "Atualizar senha"}
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
