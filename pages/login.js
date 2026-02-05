import {
  Alert,
  Box,
  Button,
  Container,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { createSession, getSession } from "../hooks/useSession";
import { useDataStore } from "../hooks/useDataStore";

const LoginPage = () => {
  const router = useRouter();
  const usuarios = useDataStore((state) => state.usuarios);
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (getSession()) {
      router.replace("/app");
    }
  }, [router]);

  const handleSubmit = (event) => {
    event.preventDefault();
    setError("");
    const usuario = usuarios.find(
      (item) => item.email === email && item.senha === senha && item.ativo
    );
    if (!usuario) {
      setError("Credenciais inválidas ou usuário inativo.");
      return;
    }
    createSession({
      usuario_id: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      perfil: usuario.perfil,
    });
    router.push("/app");
  };

  return (
    <Box sx={{ backgroundColor: "#f9f5f1", minHeight: "100vh", py: 10 }}>
      <Container maxWidth="sm">
        <Paper sx={{ p: 4, borderRadius: 4 }} elevation={1}>
          <Stack spacing={3}>
            <Box>
              <Typography variant="h4" fontWeight={700} gutterBottom>
                Entrar no MVP Coffee System
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Use um dos usuários de teste ou crie novos usuários na área administrativa.
              </Typography>
            </Box>
            {error ? <Alert severity="error">{error}</Alert> : null}
            <Box component="form" onSubmit={handleSubmit}>
              <Stack spacing={2}>
                <TextField
                  label="Email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  fullWidth
                />
                <TextField
                  label="Senha"
                  type="password"
                  value={senha}
                  onChange={(event) => setSenha(event.target.value)}
                  required
                  fullWidth
                />
                <Button type="submit" variant="contained" size="large">
                  Entrar
                </Button>
              </Stack>
            </Box>
            <Box>
              <Typography variant="body2" color="text.secondary">
                Antes do primeiro acesso, alimente o banco em /system para carregar o
                seed. Usuário padrão: admin@cafemvp.com (senha mvp_admin_123).
              </Typography>
            </Box>
          </Stack>
        </Paper>
      </Container>
    </Box>
  );
};

export default LoginPage;
