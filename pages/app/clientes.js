import {
  Alert,
  Box,
  Button,
  Drawer,
  Grid,
  IconButton,
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
import { isValidCpfCnpj, normalizeCpfCnpj } from "../../utils/document";
import { formatDate } from "../../utils/format";

const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

const ClientesPage = () => {
  const clientes = useDataStore((state) => state.clientes);
  const addCliente = useDataStore((state) => state.addCliente);
  const [form, setForm] = useState({
    nome: "",
    email: "",
    cpf_cnpj: "",
    telefone: "",
    endereco: "",
    data_aniversario: "",
  });
  const [errors, setErrors] = useState({
    email: "",
    cpf_cnpj: "",
  });
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [feedback, setFeedback] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  const handleChange = (field) => (event) => {
    if (field === "email" || field === "cpf_cnpj") {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
    setForm((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrors({ email: "", cpf_cnpj: "" });

    if (!form.nome.trim()) {
      setFeedback({
        open: true,
        message: "Informe o nome do cliente para cadastrar.",
        severity: "error",
      });
      return;
    }

    const normalizedEmail = String(form.email || "")
      .trim()
      .toLowerCase();
    const normalizedCpfCnpj = normalizeCpfCnpj(form.cpf_cnpj);
    const nextErrors = { email: "", cpf_cnpj: "" };

    if (!normalizedEmail) {
      nextErrors.email = "Informe o e-mail do cliente.";
    } else if (!isValidEmail(normalizedEmail)) {
      nextErrors.email = "Informe um e-mail válido.";
    } else if (
      clientes.some(
        (cliente) =>
          String(cliente.email || "")
            .trim()
            .toLowerCase() === normalizedEmail,
      )
    ) {
      nextErrors.email = "Já existe um cliente com este e-mail.";
    }

    if (!normalizedCpfCnpj) {
      nextErrors.cpf_cnpj = "Informe o CPF/CNPJ do cliente.";
    } else if (!isValidCpfCnpj(normalizedCpfCnpj)) {
      nextErrors.cpf_cnpj = "CPF/CNPJ inválido.";
    } else if (
      clientes.some(
        (cliente) => normalizeCpfCnpj(cliente.cpf_cnpj) === normalizedCpfCnpj,
      )
    ) {
      nextErrors.cpf_cnpj = "Já existe um cliente com este CPF/CNPJ.";
    }

    if (nextErrors.email || nextErrors.cpf_cnpj) {
      setErrors(nextErrors);
      setFeedback({
        open: true,
        message: nextErrors.email || nextErrors.cpf_cnpj,
        severity: "error",
      });
      return;
    }

    const result = await addCliente({
      ...form,
      email: normalizedEmail,
    });

    if (!result?.ok) {
      setFeedback({
        open: true,
        message: result?.error || "Não foi possível cadastrar o cliente.",
        severity: "error",
      });
      return;
    }

    setForm({
      nome: "",
      email: "",
      cpf_cnpj: "",
      telefone: "",
      endereco: "",
      data_aniversario: "",
    });
    setDrawerOpen(false);
    setFeedback({
      open: true,
      message: "Cliente cadastrado com sucesso.",
      severity: "success",
    });
  };

  return (
    <AppLayout>
      <PageHeader
        title="Gestão de Clientes"
        subtitle="Cadastre clientes e acompanhe o histórico comercial."
        action={
          <Button
            variant="contained"
            startIcon={<PersonAdd />}
            onClick={() => setDrawerOpen(true)}
          >
            Cadastrar cliente
          </Button>
        }
      />
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Clientes cadastrados
            </Typography>
            <Stack spacing={2}>
              {clientes.map((cliente) => (
                <Paper key={cliente.id} variant="outlined" sx={{ p: 2 }}>
                  <Typography fontWeight={600}>{cliente.nome}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {cliente.cpf_cnpj || "CPF/CNPJ não informado"} •{" "}
                    {cliente.telefone || "Sem telefone"}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {cliente.email || "Sem e-mail"}
                  </Typography>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    display="block"
                  >
                    {cliente.data_aniversario
                      ? `Aniversário: ${formatDate(cliente.data_aniversario)}`
                      : "Sem data de aniversário"}
                  </Typography>
                  {cliente.protegido ? (
                    <Typography variant="caption" color="warning.main">
                      Cliente protegido por regra de sistema.
                    </Typography>
                  ) : null}
                </Paper>
              ))}
              {!clientes.length ? (
                <Typography variant="body2" color="text.secondary">
                  Nenhum cliente cadastrado ainda.
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
        sx={{ zIndex: (theme) => theme.zIndex.tooltip + 1 }}
        PaperProps={{ sx: { width: { xs: "100%", sm: 360 }, p: 3 } }}
      >
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          mb={2}
        >
          <Typography variant="h6">Cadastrar cliente</Typography>
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
              label="E-mail"
              type="email"
              value={form.email}
              onChange={handleChange("email")}
              required
              error={Boolean(errors.email)}
              helperText={errors.email}
            />
            <TextField
              label="CPF/CNPJ"
              value={form.cpf_cnpj}
              onChange={handleChange("cpf_cnpj")}
              required
              error={Boolean(errors.cpf_cnpj)}
              helperText={errors.cpf_cnpj}
            />
            <TextField
              label="Telefone"
              value={form.telefone}
              onChange={handleChange("telefone")}
            />
            <TextField
              label="Data de aniversário"
              type="date"
              value={form.data_aniversario}
              onChange={handleChange("data_aniversario")}
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="Endereço"
              value={form.endereco}
              onChange={handleChange("endereco")}
            />
            <Button type="submit" variant="contained">
              Salvar cliente
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

export default ClientesPage;
