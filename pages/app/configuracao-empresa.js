import {
  Alert,
  Box,
  Button,
  Grid,
  Paper,
  Snackbar,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from "@mui/material";
import { useEffect, useState } from "react";
import AppLayout from "../../components/template/AppLayout";
import PageHeader from "../../components/atomic/PageHeader";

const integracoesIniciais = {
  asaas: { chave: "", configurado: false, editando: true },
  resend: { chave: "", configurado: false, editando: true },
};

const ConfiguracaoEmpresaPage = () => {
  const [tab, setTab] = useState("estoque");
  const [faixas, setFaixas] = useState([]);
  const [integracoes, setIntegracoes] = useState(integracoesIniciais);
  const [feedback, setFeedback] = useState({
    open: false,
    severity: "success",
    message: "",
  });

  const loadFaixas = async () => {
    try {
      const response = await fetch("/api/v1/configuracao-empresa/estoque");
      if (!response.ok) return;
      const data = await response.json();
      setFaixas(data.faixas || []);
    } catch (error) {
      setFaixas([]);
    }
  };

  const loadIntegracoes = async () => {
    try {
      const response = await fetch("/api/v1/configuracao-empresa/integracoes");
      if (!response.ok) return;
      const data = await response.json();

      setIntegracoes((prev) => {
        const next = { ...prev };
        for (const integracao of data.integracoes || []) {
          const provedor = integracao.provedor;
          next[provedor] = {
            ...prev[provedor],
            configurado: Boolean(integracao.configurado),
            editando: !integracao.configurado,
            chave: "",
          };
        }
        return next;
      });
    } catch (error) {
      setIntegracoes(integracoesIniciais);
    }
  };

  useEffect(() => {
    loadFaixas();
    loadIntegracoes();
  }, []);

  const handleFaixaChange = (index, field) => (event) => {
    const value = event.target.value;
    setFaixas((prev) =>
      prev.map((faixa, idx) =>
        idx === index
          ? {
              ...faixa,
              [field]:
                field === "label" ? value : value === "" ? "" : Number(value),
            }
          : faixa,
      ),
    );
  };

  const handleIntegracaoField = (provedor) => (event) => {
    const value = event.target.value;
    setIntegracoes((prev) => ({
      ...prev,
      [provedor]: {
        ...prev[provedor],
        chave: value,
      },
    }));
  };

  const handleEditarIntegracao = (provedor) => {
    setIntegracoes((prev) => ({
      ...prev,
      [provedor]: {
        ...prev[provedor],
        chave: "",
        editando: true,
      },
    }));
  };

  const handleSalvarIntegracao = async (provedor) => {
    const chave = integracoes[provedor]?.chave?.trim();

    if (!chave) {
      setFeedback({
        open: true,
        severity: "error",
        message: "Informe a chave da integração antes de salvar.",
      });
      return;
    }

    try {
      const response = await fetch("/api/v1/configuracao-empresa/integracoes", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provedor, chave }),
      });
      const data = await response.json();

      if (!response.ok) {
        setFeedback({
          open: true,
          severity: "error",
          message: data.error || "Não foi possível salvar a integração.",
        });
        return;
      }

      setIntegracoes((prev) => ({
        ...prev,
        [provedor]: {
          ...prev[provedor],
          configurado: true,
          editando: false,
          chave: "",
        },
      }));
      setFeedback({
        open: true,
        severity: "success",
        message: `Integração ${provedor.toUpperCase()} salva com sucesso.`,
      });
    } catch (error) {
      setFeedback({
        open: true,
        severity: "error",
        message: "Erro ao salvar integração.",
      });
    }
  };

  const handleSaveFaixas = async () => {
    try {
      const response = await fetch("/api/v1/configuracao-empresa/estoque", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ faixas }),
      });
      const data = await response.json();
      if (!response.ok) {
        setFeedback({
          open: true,
          severity: "error",
          message: data.error || "Não foi possível salvar as faixas.",
        });
        return;
      }
      setFeedback({
        open: true,
        severity: "success",
        message: "Configuração de estoque salva com sucesso.",
      });
      setFaixas(data.faixas || []);
    } catch (error) {
      setFeedback({
        open: true,
        severity: "error",
        message: "Erro ao salvar configuração.",
      });
    }
  };

  return (
    <AppLayout>
      <PageHeader
        title="Configuração da Empresa"
        subtitle="Defina as regras de estoque e as integrações externas do sistema."
      />

      <Paper sx={{ p: 2, mb: 2 }}>
        <Tabs value={tab} onChange={(_, value) => setTab(value)}>
          <Tab value="estoque" label="Status de Estoque" />
          <Tab value="integracoes" label="Integrações" />
        </Tabs>
      </Paper>

      {tab === "estoque" ? (
        <Paper sx={{ p: 3 }}>
          <Stack spacing={2}>
            <Typography variant="body2" color="text.secondary">
              Defina os intervalos percentuais sem sobreposição. Ex.: Crítico 0
              a 30, Normal 30 a 80, Elevado 80 a 130 e Excesso acima de 130.
            </Typography>

            {faixas.map((faixa, index) => (
              <Grid container spacing={2} key={faixa.chave}>
                <Grid item xs={12} md={3}>
                  <TextField
                    label="Nome"
                    value={faixa.label}
                    onChange={handleFaixaChange(index, "label")}
                    fullWidth
                  />
                </Grid>
                <Grid item xs={12} md={3}>
                  <TextField
                    label="Mínimo (%)"
                    type="number"
                    value={faixa.percentual_min ?? ""}
                    onChange={handleFaixaChange(index, "percentual_min")}
                    fullWidth
                  />
                </Grid>
                <Grid item xs={12} md={3}>
                  <TextField
                    label="Máximo (%)"
                    type="number"
                    value={faixa.percentual_max ?? ""}
                    onChange={handleFaixaChange(index, "percentual_max")}
                    fullWidth
                    helperText="Deixe em branco para faixa aberta"
                  />
                </Grid>
                <Grid item xs={12} md={3}>
                  <TextField
                    label="Ordem"
                    type="number"
                    value={faixa.ordem ?? ""}
                    onChange={handleFaixaChange(index, "ordem")}
                    fullWidth
                  />
                </Grid>
              </Grid>
            ))}

            <Box>
              <Button variant="contained" onClick={handleSaveFaixas}>
                Salvar configuração
              </Button>
            </Box>
          </Stack>
        </Paper>
      ) : null}

      {tab === "integracoes" ? (
        <Paper sx={{ p: 3 }}>
          <Stack spacing={3}>
            <Typography variant="body2" color="text.secondary">
              Configure as chaves das integrações. Por segurança, a chave não é
              exibida novamente depois de salva.
            </Typography>

            {Object.entries(integracoes).map(([provedor, integracao]) => {
              const bloqueado = integracao.configurado && !integracao.editando;
              return (
                <Grid container spacing={2} key={provedor} alignItems="center">
                  <Grid item xs={12} md={4}>
                    <Typography fontWeight={700}>
                      {provedor.toUpperCase()}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} md={5}>
                    <TextField
                      fullWidth
                      type="password"
                      label="Chave da integração"
                      placeholder={
                        bloqueado ? "••••••••••••" : "Digite a chave"
                      }
                      value={bloqueado ? "" : integracao.chave}
                      onChange={handleIntegracaoField(provedor)}
                      disabled={bloqueado}
                    />
                  </Grid>
                  <Grid item xs={12} md={3}>
                    {bloqueado ? (
                      <Button
                        variant="outlined"
                        fullWidth
                        onClick={() => handleEditarIntegracao(provedor)}
                      >
                        Editar
                      </Button>
                    ) : (
                      <Button
                        variant="contained"
                        fullWidth
                        onClick={() => handleSalvarIntegracao(provedor)}
                      >
                        Salvar
                      </Button>
                    )}
                  </Grid>
                </Grid>
              );
            })}
          </Stack>
        </Paper>
      ) : null}

      <Snackbar
        open={feedback.open}
        autoHideDuration={4000}
        onClose={() => setFeedback((prev) => ({ ...prev, open: false }))}
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

export default ConfiguracaoEmpresaPage;
