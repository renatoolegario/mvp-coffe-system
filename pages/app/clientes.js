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

const ClientesPage = () => {
  const clientes = useDataStore((state) => state.clientes);
  const addCliente = useDataStore((state) => state.addCliente);
  const [form, setForm] = useState({
    nome: "",
    cpf_cnpj: "",
    telefone: "",
    endereco: "",
    limite_credito: "",
  });
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [feedback, setFeedback] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  const handleChange = (field) => (event) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!form.nome.trim()) {
      setFeedback({
        open: true,
        message: "Informe o nome do cliente para cadastrar.",
        severity: "error",
      });
      return;
    }

    addCliente(form);
    setForm({
      nome: "",
      cpf_cnpj: "",
      telefone: "",
      endereco: "",
      limite_credito: "",
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
              label="CPF/CNPJ"
              value={form.cpf_cnpj}
              onChange={handleChange("cpf_cnpj")}
            />
            <TextField
              label="Telefone"
              value={form.telefone}
              onChange={handleChange("telefone")}
            />
            <TextField
              label="Endereço"
              value={form.endereco}
              onChange={handleChange("endereco")}
            />
            <TextField
              label="Limite de crédito"
              value={form.limite_credito}
              onChange={handleChange("limite_credito")}
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
