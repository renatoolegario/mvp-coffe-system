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

  const handleChange = (field) => (event) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    addCliente(form);
    setForm({ nome: "", cpf_cnpj: "", telefone: "", endereco: "", limite_credito: "" });
  };

  return (
    <AppLayout>
      <PageHeader
        title="Gestão de Clientes"
        subtitle="Cadastre clientes e acompanhe o histórico comercial."
      />
      <Grid container spacing={3}>
        <Grid item xs={12} md={5}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Novo cliente
            </Typography>
            <Box component="form" onSubmit={handleSubmit}>
              <Stack spacing={2}>
                <TextField label="Nome" value={form.nome} onChange={handleChange("nome")} required />
                <TextField label="CPF/CNPJ" value={form.cpf_cnpj} onChange={handleChange("cpf_cnpj")} />
                <TextField label="Telefone" value={form.telefone} onChange={handleChange("telefone")} />
                <TextField label="Endereço" value={form.endereco} onChange={handleChange("endereco")} />
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
          </Paper>
        </Grid>
        <Grid item xs={12} md={7}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Clientes cadastrados
            </Typography>
            <Stack spacing={2}>
              {clientes.map((cliente) => (
                <Paper key={cliente.id} variant="outlined" sx={{ p: 2 }}>
                  <Typography fontWeight={600}>{cliente.nome}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {cliente.cpf_cnpj || "CPF/CNPJ não informado"} • {cliente.telefone || "Sem telefone"}
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
    </AppLayout>
  );
};

export default ClientesPage;
