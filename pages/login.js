import Head from "next/head";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  FormControlLabel,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { createSession, getSession } from "../hooks/useSession";

const EMAIL_STORAGE_KEY = "coffee-login-email";
const BENEFICIOS = [
  "Produção centralizada",
  "Estoque em tempo real",
  "Vendas e financeiro integrados",
];
const lightFieldSx = {
  "& .MuiInputLabel-root": {
    color: "#526762",
  },
  "& .MuiInputLabel-root.Mui-focused": {
    color: "#8A6500",
  },
  "& .MuiOutlinedInput-root": {
    color: "#102723",
    backgroundColor: "#FFFFFF",
    borderRadius: 3,
  },
  "& .MuiOutlinedInput-input": {
    color: "#102723",
  },
  "& .MuiOutlinedInput-notchedOutline": {
    borderColor: "rgba(16,39,35,0.16)",
  },
  "& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline": {
    borderColor: "rgba(16,39,35,0.28)",
  },
  "& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline": {
    borderColor: "#F2B705",
  },
};

const LoginPage = () => {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [error, setError] = useState("");
  const [lembrarEmail, setLembrarEmail] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedEmail = window.localStorage.getItem(EMAIL_STORAGE_KEY);
      if (savedEmail) {
        setEmail(savedEmail);
        setLembrarEmail(true);
      }
    }

    if (getSession()) {
      router.replace("/app");
    }
  }, [router]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (isSubmitting) return;
    setError("");
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, senha }),
      });

      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "Credenciais inválidas ou usuário inativo.");
        setIsSubmitting(false);
        return;
      }

      const usuario = data.usuario;
      if (typeof window !== "undefined") {
        if (lembrarEmail) {
          window.localStorage.setItem(EMAIL_STORAGE_KEY, email.trim());
        } else {
          window.localStorage.removeItem(EMAIL_STORAGE_KEY);
        }
      }

      createSession({
        usuario_id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        perfil: usuario.perfil,
        token: data.token,
        expira_em: data.expira_em,
      });
      router.push("/app");
    } catch (error) {
      setError("Erro ao autenticar. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Head>
        <title>Login | Café Essências do Brasil</title>
        <meta
          name="description"
          content="Acesse o painel operacional do Café Essências do Brasil."
        />
      </Head>

      <Box
        component="main"
        sx={{
          minHeight: "100dvh",
          display: "flex",
          alignItems: "center",
          px: { xs: 2, md: 3 },
          py: { xs: 2, md: 2.5 },
          background:
            "radial-gradient(circle at 10% 20%, rgba(242,183,5,0.14), transparent 34%), radial-gradient(circle at 90% 0%, rgba(63,169,245,0.12), transparent 26%), linear-gradient(180deg, #0F241F 0%, #091613 100%)",
        }}
      >
        <Box
          sx={{
            width: "100%",
            maxWidth: 1080,
            mx: "auto",
            display: "grid",
            gap: { xs: 0, lg: 2 },
            alignItems: "stretch",
            gridTemplateColumns: { xs: "1fr", lg: "minmax(0, 1fr) 420px" },
          }}
        >
          <Paper
            elevation={0}
            sx={{
              display: { xs: "none", lg: "flex" },
              flexDirection: "column",
              justifyContent: "center",
              p: 4,
              borderRadius: 5,
              overflow: "hidden",
              background:
                "linear-gradient(145deg, rgba(18,43,37,0.96) 0%, rgba(10,24,21,0.98) 100%)",
              position: "relative",
            }}
          >
            <Box
              sx={{
                position: "absolute",
                inset: 0,
                pointerEvents: "none",
                background:
                  "radial-gradient(circle at 12% 18%, rgba(242,183,5,0.12), transparent 22%), radial-gradient(circle at 78% 14%, rgba(63,169,245,0.08), transparent 20%)",
              }}
            />

            <Stack spacing={3} sx={{ position: "relative", zIndex: 1 }}>
              <Stack direction="row" spacing={2} alignItems="center">
                <Box
                  component="img"
                  src="/logotipo.jpg"
                  alt="Café Essências do Brasil"
                  sx={{
                    width: 64,
                    height: 64,
                    borderRadius: 3,
                    objectFit: "cover",
                    boxShadow: "0 18px 40px rgba(0,0,0,0.22)",
                  }}
                />
                <Box>
                  <Typography
                    variant="overline"
                    sx={{ color: "primary.main", letterSpacing: "0.18em" }}
                  >
                    Acesso ao painel
                  </Typography>
                  <Typography
                    variant="h5"
                    fontWeight={800}
                    sx={{ lineHeight: 1.05 }}
                  >
                    Café Essências do Brasil
                  </Typography>
                </Box>
              </Stack>

              <Box sx={{ maxWidth: 680 }}>
                <Typography
                  variant="h2"
                  fontWeight={900}
                  sx={{
                    fontSize: "2.8rem",
                    lineHeight: 0.98,
                    letterSpacing: "-0.03em",
                  }}
                >
                  Login direto para a operação do dia.
                </Typography>
                <Typography
                  variant="body1"
                  color="text.secondary"
                  sx={{ mt: 1.5, maxWidth: 560, fontSize: "1rem" }}
                >
                  Acompanhe produção, estoque, vendas e financeiro em um fluxo
                  só, com acesso rápido e seguro para a equipe.
                </Typography>
              </Box>

              <Stack direction="row" gap={1.2} flexWrap="wrap" useFlexGap>
                {BENEFICIOS.map((item) => (
                  <Box
                    key={item}
                    sx={{
                      px: 1.5,
                      py: 0.9,
                      borderRadius: 999,
                      border: "1px solid rgba(242,183,5,0.28)",
                      backgroundColor: "rgba(242,183,5,0.08)",
                      color: "text.primary",
                      fontSize: 13,
                      fontWeight: 700,
                    }}
                  >
                    {item}
                  </Box>
                ))}
              </Stack>

              <Box
                sx={{
                  p: 2.5,
                  borderRadius: 4,
                  backgroundColor: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                <Typography variant="overline" color="primary.main">
                  Fluxo simplificado
                </Typography>
                <Typography variant="h6" fontWeight={800} sx={{ mt: 0.5 }}>
                  Uma tela enxuta para entrar e seguir a rotina.
                </Typography>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mt: 1 }}
                >
                  Removemos excesso de blocos e mantivemos só o contexto
                  essencial para o acesso ao sistema.
                </Typography>
              </Box>
            </Stack>
          </Paper>

          <Paper
            elevation={0}
            sx={{
              display: "flex",
              alignItems: "center",
              p: { xs: 3, sm: 3.5, md: 4 },
              borderRadius: 5,
              background:
                "linear-gradient(180deg, rgba(247,249,248,0.98) 0%, rgba(238,244,242,0.98) 100%)",
              color: "#102723",
              minHeight: { xs: "auto", lg: 560 },
            }}
          >
            <Box sx={{ width: "100%", maxWidth: 420, mx: "auto" }}>
              <Stack spacing={2.5}>
                <Box>
                  <Stack
                    direction="row"
                    spacing={1.5}
                    alignItems="center"
                    sx={{ mb: 2 }}
                  >
                    <Box
                      component="img"
                      src="/logotipo.jpg"
                      alt="Café Essências do Brasil"
                      sx={{
                        width: 56,
                        height: 56,
                        borderRadius: 2.5,
                        objectFit: "cover",
                        boxShadow: "0 12px 28px rgba(15,36,31,0.12)",
                      }}
                    />
                    <Box>
                      <Typography
                        variant="body2"
                        sx={{ color: "#526762", fontWeight: 700 }}
                      >
                        Café Essências do Brasil
                      </Typography>
                      <Typography variant="caption" sx={{ color: "#6A7E79" }}>
                        Painel operacional
                      </Typography>
                    </Box>
                  </Stack>

                  <Typography
                    variant="overline"
                    sx={{
                      color: "#8A6500",
                      letterSpacing: "0.18em",
                      fontWeight: 800,
                    }}
                  >
                    Acesso ao painel
                  </Typography>
                  <Typography
                    variant="h3"
                    fontWeight={900}
                    sx={{
                      mt: 0.4,
                      color: "#102723",
                      fontSize: { xs: "1.9rem", md: "2.2rem" },
                    }}
                  >
                    Faça seu login
                  </Typography>
                  <Typography sx={{ mt: 1, color: "#415854" }}>
                    Entre com seu e-mail e senha para continuar a operação sem
                    etapas extras.
                  </Typography>
                </Box>

                {error ? <Alert severity="error">{error}</Alert> : null}

                <Box component="form" onSubmit={handleSubmit}>
                  <Stack spacing={1.75}>
                    <TextField
                      label="E-mail"
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      required
                      fullWidth
                      autoComplete="email"
                      inputMode="email"
                      sx={lightFieldSx}
                    />
                    <TextField
                      label="Senha"
                      type="password"
                      value={senha}
                      onChange={(event) => setSenha(event.target.value)}
                      required
                      fullWidth
                      autoComplete="current-password"
                      sx={lightFieldSx}
                    />

                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={lembrarEmail}
                          onChange={(event) =>
                            setLembrarEmail(event.target.checked)
                          }
                        />
                      }
                      label="Lembrar meu e-mail neste navegador"
                      sx={{ color: "#415854", my: -0.25 }}
                    />

                    <Button
                      type="submit"
                      variant="contained"
                      size="large"
                      disabled={isSubmitting}
                      sx={{
                        minHeight: 52,
                        borderRadius: 3,
                        fontWeight: 800,
                      }}
                    >
                      {isSubmitting ? "Entrando..." : "Entrar"}
                    </Button>
                  </Stack>
                </Box>

                <Box
                  sx={{
                    borderRadius: 3,
                    p: 1.75,
                    backgroundColor: "rgba(15,36,31,0.06)",
                    border: "1px solid rgba(16,39,35,0.08)",
                  }}
                >
                  <Typography fontWeight={700} sx={{ color: "#102723" }}>
                    Primeiro acesso?
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 0.8, color: "#415854" }}>
                    Se precisar popular a base com dados iniciais, execute o
                    seed em <strong>/system</strong> antes de entrar.
                  </Typography>
                </Box>
              </Stack>
            </Box>
          </Paper>
        </Box>
      </Box>
    </>
  );
};

export default LoginPage;
