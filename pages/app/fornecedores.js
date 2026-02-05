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

const FornecedoresPage = () => {
  const fornecedores = useDataStore((state) => state.fornecedores);
  const addFornecedor = useDataStore((state) => state.addFornecedor);
  const [form, setForm] = useState({
    razao_social: "",
    cpf_cnpj: "",
    telefone: "",
    endereco: "",
  });

  const handleChange = (field) => (event) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    addFornecedor(form);
    setForm({ razao_social: "", cpf_cnpj: "", telefone: "", endereco: "" });
  };

  return (
    <AppLayout>
      <PageHeader
        title="Gestão de Fornecedores"
        subtitle="Cadastre fornecedores e acompanhe pagamentos."
      />
      <Grid container spacing={3}>
        <Grid item xs={12} md={5}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Novo fornecedor
            </Typography>
            <Box component="form" onSubmit={handleSubmit}>
              <Stack spacing={2}>
                <TextField
                  label="Razão social"
                  value={form.razao_social}
                  onChange={handleChange("razao_social")}
                  required
                />
                <TextField label="CPF/CNPJ" value={form.cpf_cnpj} onChange={handleChange("cpf_cnpj")} />
                <TextField label="Telefone" value={form.telefone} onChange={handleChange("telefone")} />
                <TextField label="Endereço" value={form.endereco} onChange={handleChange("endereco")} />
                <Button type="submit" variant="contained">
                  Salvar fornecedor
                </Button>
              </Stack>
            </Box>
          </Paper>
        </Grid>
        <Grid item xs={12} md={7}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Fornecedores cadastrados
            </Typography>
            <Stack spacing={2}>
              {fornecedores.map((fornecedor) => (
                <Paper key={fornecedor.id} variant="outlined" sx={{ p: 2 }}>
                  <Typography fontWeight={600}>{fornecedor.razao_social}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {fornecedor.cpf_cnpj || "CPF/CNPJ não informado"} • {fornecedor.telefone || "Sem telefone"}
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
    </AppLayout>
  );
};

export default FornecedoresPage;
