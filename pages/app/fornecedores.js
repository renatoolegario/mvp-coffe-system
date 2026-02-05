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

const FornecedoresPage = () => {
  const fornecedores = useDataStore((state) => state.fornecedores);
  const addFornecedor = useDataStore((state) => state.addFornecedor);
  const [form, setForm] = useState({
    razao_social: "",
    cpf_cnpj: "",
    telefone: "",
    endereco: "",
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
    if (!form.razao_social.trim()) {
      setFeedback({
        open: true,
        message: "Informe a razão social do fornecedor para cadastrar.",
        severity: "error",
      });
      return;
    }

    addFornecedor(form);
    setForm({ razao_social: "", cpf_cnpj: "", telefone: "", endereco: "" });
    setDrawerOpen(false);
    setFeedback({
      open: true,
      message: "Fornecedor cadastrado com sucesso.",
      severity: "success",
    });
  };

  return (
    <AppLayout>
      <PageHeader
        title="Gestão de Fornecedores"
        subtitle="Cadastre fornecedores e acompanhe pagamentos."
        action={
          <Button
            variant="contained"
            startIcon={<PersonAdd />}
            onClick={() => setDrawerOpen(true)}
          >
            Cadastrar fornecedor
          </Button>
        }
      />
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Fornecedores cadastrados
            </Typography>
            <Stack spacing={2}>
              {fornecedores.map((fornecedor) => (
                <Paper key={fornecedor.id} variant="outlined" sx={{ p: 2 }}>
                  <Typography fontWeight={600}>
                    {fornecedor.razao_social}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {fornecedor.cpf_cnpj || "CPF/CNPJ não informado"} •{" "}
                    {fornecedor.telefone || "Sem telefone"}
                  </Typography>
                </Paper>
              ))}
              {!fornecedores.length ? (
                <Typography variant="body2" color="text.secondary">
                  Nenhum fornecedor cadastrado ainda.
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
          <Typography variant="h6">Cadastrar fornecedor</Typography>
          <IconButton onClick={() => setDrawerOpen(false)}>
            <Close />
          </IconButton>
        </Stack>
        <Box component="form" onSubmit={handleSubmit}>
          <Stack spacing={2}>
            <TextField
              label="Razão social"
              value={form.razao_social}
              onChange={handleChange("razao_social")}
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
            <Button type="submit" variant="contained">
              Salvar fornecedor
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

export default FornecedoresPage;
