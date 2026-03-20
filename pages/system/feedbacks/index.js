import React, { useCallback, useEffect, useMemo, useState } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import {
  Alert,
  Box,
  Button,
  Chip,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Drawer,
  FormControl,
  IconButton,
  InputLabel,
  Link,
  MenuItem,
  Paper,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import EditNoteIcon from "@mui/icons-material/EditNote";
import PostAddIcon from "@mui/icons-material/PostAdd";
import VisibilityIcon from "@mui/icons-material/Visibility";
import CloseIcon from "@mui/icons-material/Close";
import CircularProgress from "@mui/material/CircularProgress";
import { authenticatedFetch } from "../../../hooks/useSession";

const TASK_API_URL = "/api/v1/system/feedbacks/task";

const ONDE_OPTIONS = [
  "Dashboard",
  "Login",
  "Cronograma",
  "Clientes",
  "Fornecedores",
  "Insumos",
  "Produção",
  "Produções em Trânsito",
  "Transferências Internas",
  "Nova Venda",
  "Gestão de Vendas",
  "Detalhe do Cliente",
  "Contas a Pagar",
  "Contas a Receber",
  "Usuários",
  "Configuração da Empresa",
  "APIs Internas",
  "System",
  "Outros",
];

const STATUS_OPTIONS = [
  { value: 1, label: "Pendente", color: "warning" },
  { value: 2, label: "Processando", color: "info" },
  { value: 3, label: "Concluído", color: "success" },
];

const STATUS_LABEL_BY_ID = STATUS_OPTIONS.reduce((acc, item) => {
  acc[item.value] = item.label;
  return acc;
}, {});

const STATUS_COLOR_BY_ID = STATUS_OPTIONS.reduce((acc, item) => {
  acc[item.value] = item.color;
  return acc;
}, {});

const FILTER_ALL = "__all__";
const LIMITE_DESCRICAO_TABELA = 30;
const MAX_ATTACHMENT_ITEMS = 5;
const MAX_ATTACHMENT_SIZE_BYTES = 3 * 1024 * 1024;
const ondeCollator = new Intl.Collator("pt-BR", { sensitivity: "base" });

function truncarDescricao(texto, limite = LIMITE_DESCRICAO_TABELA) {
  const textoNormalizado = String(texto || "");

  if (textoNormalizado.length <= limite) {
    return textoNormalizado;
  }

  return `${textoNormalizado.slice(0, limite)}...`;
}

function getTaskAttachmentUrls(task) {
  const unique = new Set();

  return [
    task?.url_anexo,
    ...(Array.isArray(task?.url_anexos) ? task.url_anexos : []),
  ]
    .map((url) => (typeof url === "string" ? url.trim() : ""))
    .filter((url) => {
      if (!url || unique.has(url)) {
        return false;
      }

      unique.add(url);
      return true;
    });
}

function formatarTamanhoArquivo(size) {
  const valor = Number(size);

  if (!Number.isFinite(valor) || valor <= 0) {
    return "0 KB";
  }

  if (valor >= 1024 * 1024) {
    return `${(valor / (1024 * 1024)).toFixed(1)} MB`;
  }

  return `${Math.max(1, Math.round(valor / 1024))} KB`;
}

function normalizeOndeValue(value) {
  return String(value || "").trim();
}

function montarIntroducaoPrompt() {
  return ["Entre no diretório raiz do projeto."];
}

function montarPromptTask(task) {
  const id = Number(task?.id);
  const descricao = String(task?.descricao || "").trim() || "(sem descrição)";
  const onde = String(task?.onde || "").trim() || "(origem não informada)";
  const urlAnexos = getTaskAttachmentUrls(task);
  const blocoAnexo = urlAnexos.length
    ? `url referência: ${urlAnexos.join(" | ")}.`
    : "sem anexo informado.";

  return [
    ...montarIntroducaoPrompt(),
    "",
    "Tarefa:",
    `[ID feedback_tasks]: ${Number.isInteger(id) && id > 0 ? id : "{id}"}`,
    "",
    "Objetivo:",
    `Avaliar a seguinte solicitação: ${descricao}`,
    "",
    "Contexto:",
    `Esse item foi reportado como melhoria ou erro em ${onde}.`,
    blocoAnexo ? `(Se houver anexo) ${blocoAnexo}` : "",
    "",
    "Instruções:",
    `1. Antes de tudo, atualize \`feedback_tasks.status = 2\` para o registro ${Number.isInteger(id) && id > 0 ? id : "{id}"} se você tiver acesso ao banco neste fluxo.`,
    "   - Se não tiver acesso ao banco, siga a implementação normalmente e reporte isso no resumo final.",
    "",
    "2. Analise se o problema relatado realmente existe.",
    "",
    "3. Se for válido:",
    "   - implemente a correção;",
    "   - revise as migrations em `infra/migrations` para entender a estrutura das tabelas;",
    "   - revise os endpoints em `pages/api` para entender o backend consumido;",
    "   - ajuste frontend, endpoint, migration e fluxo de dados se isso for necessário para resolver a demanda por completo.",
    "",
    "4. Pode criar migration e ajustar endpoints quando isso for necessário e seguro.",
    "",
    "5. Antes de concluir:",
    "   - valide que a alteração não quebrou nada;",
    "   - confirme se a mudança afeta outras páginas, seeds ou rotinas administrativas;",
    "   - se houver impacto relevante, descreva objetivamente o que foi afetado.",
    "",
    `6. Ao finalizar com sucesso, atualize \`feedback_tasks.status = 3\` para o registro ${Number.isInteger(id) && id > 0 ? id : "{id}"} se você tiver acesso ao banco neste fluxo.`,
    "   - Se não tiver acesso ao banco, informe que a atualização precisa ser feita manualmente.",
    "",
    "Saída esperada:",
    "   - diagnóstico do problema;",
    "   - arquivos alterados;",
    "   - resumo técnico do que foi feito;",
    "   - validação final informando se houve ou não impacto colateral.",
  ]
    .filter(Boolean)
    .join("\n");
}

async function copiarTexto(texto) {
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(texto);
    return;
  }

  if (typeof document !== "undefined") {
    const textarea = document.createElement("textarea");
    textarea.value = texto;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.left = "-9999px";
    document.body.appendChild(textarea);
    textarea.select();
    const copiado = document.execCommand("copy");
    document.body.removeChild(textarea);

    if (copiado) {
      return;
    }
  }

  throw new Error("Não foi possível copiar o texto.");
}

async function requestApi(url, options = {}) {
  const response = await authenticatedFetch(url, options);
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload?.error || "Falha na requisição.");
  }

  return payload;
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () =>
      reject(new Error(`Falha ao ler o anexo ${file.name}.`));

    reader.readAsDataURL(file);
  });
}

const estadoInicialCadastro = {
  onde: ONDE_OPTIONS[0],
  quem: "",
  descricao: "",
  arquivos: [],
};

const estadoInicialEdicao = {
  open: false,
  id: null,
  status: 1,
  parecer: "",
  gitCommit: "",
};

const estadoInicialLeituraDescricao = {
  open: false,
  texto: "",
  task: null,
};

const estadoInicialEdicaoDados = {
  open: false,
  id: null,
  onde: ONDE_OPTIONS[0],
  quem: "",
  descricao: "",
};

const FeedbacksPage = () => {
  const router = useRouter();
  const [tasks, setTasks] = useState([]);
  const [loadingLista, setLoadingLista] = useState(true);
  const [erroLista, setErroLista] = useState("");
  const [filtroOnde, setFiltroOnde] = useState(FILTER_ALL);
  const [filtroStatus, setFiltroStatus] = useState(FILTER_ALL);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [cadastro, setCadastro] = useState(estadoInicialCadastro);
  const [loadingCadastro, setLoadingCadastro] = useState(false);

  const [edicao, setEdicao] = useState(estadoInicialEdicao);
  const [loadingEdicao, setLoadingEdicao] = useState(false);
  const [edicaoDados, setEdicaoDados] = useState(estadoInicialEdicaoDados);
  const [loadingEdicaoDados, setLoadingEdicaoDados] = useState(false);
  const [mensagem, setMensagem] = useState(null);
  const [leituraDescricao, setLeituraDescricao] = useState(
    estadoInicialLeituraDescricao,
  );

  const adminParam = router.query?.admin;
  const isAdminMode = Array.isArray(adminParam)
    ? adminParam.includes("1")
    : adminParam === "1";
  const taskApiUrl = isAdminMode ? `${TASK_API_URL}?admin=1` : TASK_API_URL;
  const totalColunas = isAdminMode ? 10 : 7;

  const opcoesOndeFiltro = useMemo(() => {
    const valoresUnicos = new Set();

    tasks.forEach((task) => {
      const onde = normalizeOndeValue(task?.onde);
      if (onde) {
        valoresUnicos.add(onde);
      }
    });

    return Array.from(valoresUnicos).sort((left, right) =>
      ondeCollator.compare(left, right),
    );
  }, [tasks]);

  const opcoesOndeFormulario = useMemo(() => {
    const valoresUnicos = new Set(
      ONDE_OPTIONS.map((option) => normalizeOndeValue(option)).filter(Boolean),
    );

    opcoesOndeFiltro.forEach((option) => {
      valoresUnicos.add(option);
    });

    const ondeEmEdicao = normalizeOndeValue(edicaoDados.onde);
    if (ondeEmEdicao) {
      valoresUnicos.add(ondeEmEdicao);
    }

    return Array.from(valoresUnicos).sort((left, right) =>
      ondeCollator.compare(left, right),
    );
  }, [edicaoDados.onde, opcoesOndeFiltro]);

  const tasksFiltradas = useMemo(() => {
    return tasks.filter((task) => {
      const correspondeOnde =
        filtroOnde === FILTER_ALL ||
        normalizeOndeValue(task?.onde) === filtroOnde;
      const correspondeStatus =
        filtroStatus === FILTER_ALL ||
        Number(task?.status) === Number(filtroStatus);

      return correspondeOnde && correspondeStatus;
    });
  }, [filtroOnde, filtroStatus, tasks]);

  const filtrosAtivos =
    filtroOnde !== FILTER_ALL || filtroStatus !== FILTER_ALL;

  const resumo = useMemo(() => {
    const pendente = tasksFiltradas.filter(
      (task) => Number(task.status) === 1,
    ).length;
    const processando = tasksFiltradas.filter(
      (task) => Number(task.status) === 2,
    ).length;
    const concluido = tasksFiltradas.filter(
      (task) => Number(task.status) === 3,
    ).length;

    return { pendente, processando, concluido };
  }, [tasksFiltradas]);

  const carregarTasks = useCallback(async () => {
    setLoadingLista(true);
    setErroLista("");

    try {
      const payload = await requestApi(taskApiUrl);
      setTasks(Array.isArray(payload?.tasks) ? payload.tasks : []);
    } catch (error) {
      setErroLista(error.message || "Erro ao carregar lista.");
    } finally {
      setLoadingLista(false);
    }
  }, [taskApiUrl]);

  useEffect(() => {
    carregarTasks();
  }, [carregarTasks]);

  useEffect(() => {
    if (filtroOnde !== FILTER_ALL && !opcoesOndeFiltro.includes(filtroOnde)) {
      setFiltroOnde(FILTER_ALL);
    }
  }, [filtroOnde, opcoesOndeFiltro]);

  const abrirLeituraDescricao = (task) => {
    setLeituraDescricao({
      open: true,
      texto: String(task?.descricao || "").trim(),
      task: task || null,
    });
  };

  const fecharLeituraDescricao = () => {
    setLeituraDescricao(estadoInicialLeituraDescricao);
  };

  const handleCadastrar = async () => {
    if (loadingCadastro) return;

    const descricao = String(cadastro.descricao || "").trim();
    const onde = String(cadastro.onde || "").trim();
    const quem = String(cadastro.quem || "").trim();

    if (!descricao) {
      setMensagem({ tipo: "error", texto: "Descrição é obrigatória." });
      return;
    }

    if (!onde) {
      setMensagem({ tipo: "error", texto: "Selecione o campo Onde." });
      return;
    }

    if (cadastro.arquivos.length > MAX_ATTACHMENT_ITEMS) {
      setMensagem({
        tipo: "error",
        texto: `Selecione no máximo ${MAX_ATTACHMENT_ITEMS} anexos.`,
      });
      return;
    }

    const arquivoInvalido = cadastro.arquivos.find(
      (arquivo) => arquivo.size > MAX_ATTACHMENT_SIZE_BYTES,
    );
    if (arquivoInvalido) {
      setMensagem({
        tipo: "error",
        texto: `O anexo ${arquivoInvalido.name} excede 3 MB.`,
      });
      return;
    }

    setLoadingCadastro(true);
    setMensagem(null);

    try {
      const urlAnexos = await Promise.all(
        cadastro.arquivos.map((arquivo) => readFileAsDataUrl(arquivo)),
      );

      await requestApi(taskApiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          descricao,
          onde,
          quem: quem || null,
          url_anexo: urlAnexos[0] || null,
          url_anexos: urlAnexos,
        }),
      });

      setMensagem({
        tipo: "success",
        texto: "Feedback cadastrado com sucesso.",
      });
      setCadastro(estadoInicialCadastro);
      setDrawerOpen(false);
      await carregarTasks();
    } catch (error) {
      setMensagem({
        tipo: "error",
        texto: error.message || "Erro ao cadastrar feedback.",
      });
    } finally {
      setLoadingCadastro(false);
    }
  };

  const abrirModalEdicao = (task) => {
    setEdicao({
      open: true,
      id: Number(task.id),
      status: Number(task.status) || 1,
      parecer: task.parecer || "",
      gitCommit: task.git_commit || "",
    });
    setMensagem(null);
  };

  const fecharModalEdicao = () => {
    if (loadingEdicao) return;
    setEdicao(estadoInicialEdicao);
  };

  const abrirModalEdicaoDados = (task) => {
    const taskId = Number(task?.id);
    if (!Number.isInteger(taskId) || taskId <= 0) {
      return;
    }

    setEdicaoDados({
      open: true,
      id: taskId,
      onde: String(task?.onde || "").trim() || ONDE_OPTIONS[0],
      quem: String(task?.quem || "").trim(),
      descricao: String(task?.descricao || "").trim(),
    });
    setMensagem(null);
  };

  const fecharModalEdicaoDados = () => {
    if (loadingEdicaoDados) return;
    setEdicaoDados(estadoInicialEdicaoDados);
  };

  const handleAtualizarTask = async () => {
    if (loadingEdicao || !edicao.id) return;
    if (!isAdminMode) {
      setMensagem({
        tipo: "error",
        texto: "Abra a página com admin=1 para atualizar.",
      });
      return;
    }

    const parecer = String(edicao.parecer || "").trim();
    if (!parecer) {
      setMensagem({
        tipo: "error",
        texto: "Para atualizar status, informe o parecer técnico.",
      });
      return;
    }

    setLoadingEdicao(true);
    setMensagem(null);

    try {
      await requestApi(taskApiUrl, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: edicao.id,
          status: Number(edicao.status),
          parecer,
          git_commit: String(edicao.gitCommit || "").trim() || null,
        }),
      });

      setMensagem({
        tipo: "success",
        texto: "Feedback atualizado com sucesso.",
      });
      setEdicao(estadoInicialEdicao);
      await carregarTasks();
    } catch (error) {
      setMensagem({
        tipo: "error",
        texto: error.message || "Erro ao atualizar feedback.",
      });
    } finally {
      setLoadingEdicao(false);
    }
  };

  const handleAtualizarDadosTask = async () => {
    if (loadingEdicaoDados || !edicaoDados.id) return;
    if (!isAdminMode) {
      setMensagem({
        tipo: "error",
        texto: "Abra a página com admin=1 para editar.",
      });
      return;
    }

    const descricao = String(edicaoDados.descricao || "").trim();
    const onde = String(edicaoDados.onde || "").trim();
    const quem = String(edicaoDados.quem || "").trim();

    if (!descricao) {
      setMensagem({
        tipo: "error",
        texto: "Descrição é obrigatória para editar a pendência.",
      });
      return;
    }

    if (!onde) {
      setMensagem({
        tipo: "error",
        texto: "Selecione o campo Onde para editar a pendência.",
      });
      return;
    }

    setLoadingEdicaoDados(true);
    setMensagem(null);

    try {
      await requestApi(taskApiUrl, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: edicaoDados.id,
          descricao,
          onde,
          quem: quem || null,
        }),
      });

      setMensagem({
        tipo: "success",
        texto: "Dados do feedback atualizados com sucesso.",
      });
      setLeituraDescricao((prev) =>
        prev.task && Number(prev.task.id) === Number(edicaoDados.id)
          ? {
              ...prev,
              texto: descricao,
              task: {
                ...prev.task,
                descricao,
                onde,
                quem: quem || null,
              },
            }
          : prev,
      );
      setEdicaoDados(estadoInicialEdicaoDados);
      await carregarTasks();
    } catch (error) {
      setMensagem({
        tipo: "error",
        texto: error.message || "Erro ao atualizar os dados do feedback.",
      });
    } finally {
      setLoadingEdicaoDados(false);
    }
  };

  const handleCopiarPrompt = async (task) => {
    try {
      const prompt = montarPromptTask(task);
      await copiarTexto(prompt);
      setMensagem({
        tipo: "success",
        texto: `Prompt do feedback #${task.id} copiado.`,
      });
    } catch (error) {
      setMensagem({
        tipo: "error",
        texto: "Não foi possível copiar o prompt.",
      });
    }
  };

  const handleLimparFiltros = () => {
    setFiltroOnde(FILTER_ALL);
    setFiltroStatus(FILTER_ALL);
  };

  return (
    <>
      <Head>
        <title>Feedbacks | Café Essências do Brasil</title>
      </Head>

      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Stack spacing={2.5}>
          <Stack
            direction={{ xs: "column", md: "row" }}
            spacing={2}
            justifyContent="space-between"
            alignItems={{ xs: "stretch", md: "center" }}
          >
            <Box>
              <Typography variant="h4" fontWeight={700}>
                Pendências e Feedbacks
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mt: 0.75 }}
              >
                Página pública para registro e acompanhamento de demandas do
                sistema.
              </Typography>
            </Box>

            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={1}
              sx={{ alignSelf: { xs: "flex-start", md: "auto" } }}
            >
              {!isAdminMode ? (
                <Button
                  variant="outlined"
                  href="/system/feedbacks?admin=1"
                  component="a"
                >
                  Abrir modo admin
                </Button>
              ) : null}
              <Button
                variant="contained"
                onClick={() => setDrawerOpen(true)}
                startIcon={<PostAddIcon fontSize="small" />}
              >
                Nova pendência
              </Button>
            </Stack>
          </Stack>

          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Chip label={`Pendente: ${resumo.pendente}`} color="warning" />
            <Chip label={`Processando: ${resumo.processando}`} color="info" />
            <Chip label={`Concluído: ${resumo.concluido}`} color="success" />
            <Chip
              label={`Exibindo: ${tasksFiltradas.length}`}
              variant="outlined"
            />
            {filtrosAtivos ? (
              <Chip label={`Total geral: ${tasks.length}`} variant="outlined" />
            ) : null}
          </Stack>

          <Paper variant="outlined" sx={{ p: 2 }}>
            <Stack spacing={2}>
              <Stack
                direction={{ xs: "column", lg: "row" }}
                spacing={2}
                justifyContent="space-between"
                alignItems={{ xs: "stretch", lg: "center" }}
              >
                <Stack
                  direction={{ xs: "column", md: "row" }}
                  spacing={2}
                  sx={{ flex: 1 }}
                >
                  <FormControl size="small" fullWidth>
                    <InputLabel id="filtro-onde-label">
                      Filtro por onde
                    </InputLabel>
                    <Select
                      labelId="filtro-onde-label"
                      label="Filtro por onde"
                      value={filtroOnde}
                      onChange={(event) => setFiltroOnde(event.target.value)}
                    >
                      <MenuItem value={FILTER_ALL}>Todos</MenuItem>
                      {opcoesOndeFiltro.map((option) => (
                        <MenuItem key={option} value={option}>
                          {option}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <FormControl size="small" fullWidth>
                    <InputLabel id="filtro-status-label">
                      Filtro por status
                    </InputLabel>
                    <Select
                      labelId="filtro-status-label"
                      label="Filtro por status"
                      value={filtroStatus}
                      onChange={(event) => setFiltroStatus(event.target.value)}
                    >
                      <MenuItem value={FILTER_ALL}>Todos</MenuItem>
                      {STATUS_OPTIONS.map((option) => (
                        <MenuItem
                          key={option.value}
                          value={String(option.value)}
                        >
                          {option.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Stack>

                <Button
                  variant="outlined"
                  onClick={handleLimparFiltros}
                  disabled={!filtrosAtivos}
                  sx={{ alignSelf: { xs: "flex-start", lg: "center" } }}
                >
                  Limpar filtros
                </Button>
              </Stack>

              <Typography variant="body2" color="text.secondary">
                {filtrosAtivos
                  ? `Exibindo ${tasksFiltradas.length} de ${tasks.length} pendências com os filtros aplicados.`
                  : `Exibindo todas as ${tasks.length} pendências cadastradas.`}
              </Typography>
            </Stack>
          </Paper>

          {mensagem ? (
            <Alert severity={mensagem.tipo}>{mensagem.texto}</Alert>
          ) : null}
          {erroLista ? <Alert severity="error">{erroLista}</Alert> : null}

          <TableContainer component={Paper} variant="outlined">
            <Table size="small" sx={{ minWidth: isAdminMode ? 1240 : 980 }}>
              <TableHead>
                <TableRow>
                  <TableCell width={70}>ID</TableCell>
                  <TableCell width={220}>Onde</TableCell>
                  <TableCell sx={{ minWidth: 340 }}>Descrição</TableCell>
                  <TableCell width={160}>Quem</TableCell>
                  <TableCell width={140}>Anexo</TableCell>
                  <TableCell width={130}>Status</TableCell>
                  {isAdminMode ? (
                    <TableCell width={180}>Git commit</TableCell>
                  ) : null}
                  <TableCell width={300}>Parecer técnico</TableCell>
                  {isAdminMode ? (
                    <TableCell width={150}>Ações</TableCell>
                  ) : null}
                  {isAdminMode ? (
                    <TableCell width={120}>Prompt</TableCell>
                  ) : null}
                </TableRow>
              </TableHead>
              <TableBody>
                {loadingLista ? (
                  <TableRow>
                    <TableCell colSpan={totalColunas}>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <CircularProgress size={18} />
                        <Typography variant="body2">
                          Carregando pendências...
                        </Typography>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ) : null}

                {!loadingLista && tasks.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={totalColunas}>
                      <Typography variant="body2" color="text.secondary">
                        Nenhuma pendência cadastrada até o momento.
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : null}

                {!loadingLista &&
                tasks.length > 0 &&
                tasksFiltradas.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={totalColunas}>
                      <Typography variant="body2" color="text.secondary">
                        Nenhuma pendência encontrada para os filtros
                        selecionados.
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : null}

                {!loadingLista
                  ? tasksFiltradas.map((task) => {
                      const descricaoCompleta = String(
                        task.descricao || "",
                      ).trim();
                      const descricaoExibicao = descricaoCompleta
                        ? truncarDescricao(descricaoCompleta)
                        : "-";
                      const anexos = getTaskAttachmentUrls(task);

                      return (
                        <TableRow key={task.id} hover>
                          <TableCell>{task.id}</TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {task.onde || "-"}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Stack
                              direction="row"
                              spacing={0.5}
                              alignItems="center"
                            >
                              <Tooltip title="Ver descrição completa">
                                <span>
                                  <IconButton
                                    size="small"
                                    aria-label="Ver descrição completa"
                                    onClick={() => abrirLeituraDescricao(task)}
                                    disabled={!descricaoCompleta}
                                  >
                                    <VisibilityIcon fontSize="small" />
                                  </IconButton>
                                </span>
                              </Tooltip>
                              <Typography variant="body2">
                                {descricaoExibicao}
                              </Typography>
                            </Stack>
                          </TableCell>
                          <TableCell>{task.quem || "-"}</TableCell>
                          <TableCell>
                            {anexos.length ? (
                              <Stack spacing={0.5}>
                                {anexos.map((url, index) => (
                                  <Link
                                    key={`${task.id}-${url}`}
                                    href={url}
                                    target="_blank"
                                    rel="noreferrer"
                                    underline="hover"
                                  >
                                    {anexos.length === 1
                                      ? "Ver anexo"
                                      : `Anexo ${index + 1}`}
                                  </Link>
                                ))}
                              </Stack>
                            ) : (
                              "-"
                            )}
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={
                                STATUS_LABEL_BY_ID[Number(task.status)] ||
                                "Indefinido"
                              }
                              color={
                                STATUS_COLOR_BY_ID[Number(task.status)] ||
                                "default"
                              }
                              size="small"
                            />
                          </TableCell>
                          {isAdminMode ? (
                            <TableCell>{task.git_commit || "-"}</TableCell>
                          ) : null}
                          <TableCell>
                            <Typography variant="body2">
                              {task.parecer || "-"}
                            </Typography>
                          </TableCell>
                          {isAdminMode ? (
                            <TableCell>
                              <Button
                                variant="outlined"
                                size="small"
                                startIcon={<EditNoteIcon />}
                                onClick={() => abrirModalEdicao(task)}
                              >
                                Atualizar
                              </Button>
                            </TableCell>
                          ) : null}
                          {isAdminMode ? (
                            <TableCell>
                              <Button
                                variant="outlined"
                                size="small"
                                onClick={() => handleCopiarPrompt(task)}
                              >
                                Copy
                              </Button>
                            </TableCell>
                          ) : null}
                        </TableRow>
                      );
                    })
                  : null}
              </TableBody>
            </Table>
          </TableContainer>
        </Stack>
      </Container>

      <Drawer
        anchor="right"
        open={leituraDescricao.open}
        onClose={fecharLeituraDescricao}
        PaperProps={{
          sx: {
            width: { xs: "100%", md: "20vw" },
            minWidth: { md: 320 },
            p: 2.5,
          },
        }}
      >
        <Stack spacing={2} sx={{ height: "100%" }}>
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
          >
            <Typography variant="h6" fontWeight={700}>
              Descrição completa
            </Typography>
            <IconButton
              onClick={fecharLeituraDescricao}
              aria-label="Fechar leitura de descrição"
            >
              <CloseIcon />
            </IconButton>
          </Stack>

          {isAdminMode ? (
            <Button
              variant="outlined"
              startIcon={<EditNoteIcon />}
              onClick={() => {
                if (leituraDescricao.task) {
                  abrirModalEdicaoDados(leituraDescricao.task);
                }
              }}
              disabled={!leituraDescricao.task}
            >
              Editar
            </Button>
          ) : null}

          <Paper variant="outlined" sx={{ p: 2, overflowY: "auto", flex: 1 }}>
            <Typography
              variant="body2"
              sx={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}
            >
              {leituraDescricao.texto || "Sem descrição informada."}
            </Typography>
          </Paper>
        </Stack>
      </Drawer>

      <Dialog
        open={edicaoDados.open}
        onClose={fecharModalEdicaoDados}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Editar dados da pendência</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 0.75 }}>
            <FormControl fullWidth size="small">
              <InputLabel id="editar-onde-label">Onde</InputLabel>
              <Select
                labelId="editar-onde-label"
                label="Onde"
                value={edicaoDados.onde}
                onChange={(event) =>
                  setEdicaoDados((prev) => ({
                    ...prev,
                    onde: event.target.value,
                  }))
                }
                disabled={loadingEdicaoDados}
              >
                {opcoesOndeFormulario.map((option) => (
                  <MenuItem key={option} value={option}>
                    {option}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              label="Quem"
              size="small"
              fullWidth
              value={edicaoDados.quem}
              onChange={(event) =>
                setEdicaoDados((prev) => ({
                  ...prev,
                  quem: event.target.value,
                }))
              }
              disabled={loadingEdicaoDados}
            />

            <TextField
              label="Descrição"
              multiline
              minRows={6}
              fullWidth
              value={edicaoDados.descricao}
              onChange={(event) =>
                setEdicaoDados((prev) => ({
                  ...prev,
                  descricao: event.target.value,
                }))
              }
              disabled={loadingEdicaoDados}
              required
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={fecharModalEdicaoDados}
            disabled={loadingEdicaoDados}
          >
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={handleAtualizarDadosTask}
            disabled={loadingEdicaoDados}
            startIcon={
              loadingEdicaoDados ? (
                <CircularProgress size={18} color="inherit" />
              ) : null
            }
          >
            {loadingEdicaoDados ? "Salvando..." : "Salvar dados"}
          </Button>
        </DialogActions>
      </Dialog>

      <Drawer
        anchor="right"
        open={drawerOpen}
        onClose={() => (!loadingCadastro ? setDrawerOpen(false) : null)}
        PaperProps={{
          sx: {
            width: { xs: "100%", md: "20vw" },
            minWidth: { md: 320 },
            maxWidth: { md: 460 },
            height: "100vh",
            p: 2.5,
          },
        }}
      >
        <Stack spacing={2}>
          <Typography variant="h6" fontWeight={700}>
            Nova pendência
          </Typography>

          <FormControl fullWidth size="small">
            <InputLabel id="onde-label">Onde</InputLabel>
            <Select
              labelId="onde-label"
              label="Onde"
              value={cadastro.onde}
              onChange={(event) => {
                setCadastro((prev) => ({ ...prev, onde: event.target.value }));
              }}
              disabled={loadingCadastro}
            >
              {opcoesOndeFormulario.map((option) => (
                <MenuItem key={option} value={option}>
                  {option}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            label="Qual seu nome? (opcional)"
            size="small"
            value={cadastro.quem}
            onChange={(event) =>
              setCadastro((prev) => ({ ...prev, quem: event.target.value }))
            }
            disabled={loadingCadastro}
            fullWidth
          />

          <TextField
            label="Descrição"
            multiline
            minRows={6}
            value={cadastro.descricao}
            onChange={(event) =>
              setCadastro((prev) => ({
                ...prev,
                descricao: event.target.value,
              }))
            }
            disabled={loadingCadastro}
            fullWidth
            required
          />

          <Button
            variant="outlined"
            component="label"
            disabled={loadingCadastro}
          >
            Selecionar anexos (imagens)
            <input
              type="file"
              hidden
              multiple
              accept="image/*"
              onChange={(event) => {
                const arquivos = Array.from(event.target.files || []);
                setCadastro((prev) => ({
                  ...prev,
                  arquivos: arquivos.slice(0, MAX_ATTACHMENT_ITEMS),
                }));
                event.target.value = "";
              }}
            />
          </Button>

          {cadastro.arquivos.length ? (
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              {cadastro.arquivos.map((arquivo) => (
                <Chip
                  key={`${arquivo.name}-${arquivo.lastModified}-${arquivo.size}`}
                  label={`${arquivo.name} (${formatarTamanhoArquivo(arquivo.size)})`}
                  color="primary"
                  variant="outlined"
                  onDelete={
                    loadingCadastro
                      ? undefined
                      : () =>
                          setCadastro((prev) => ({
                            ...prev,
                            arquivos: prev.arquivos.filter(
                              (item) =>
                                !(
                                  item.name === arquivo.name &&
                                  item.lastModified === arquivo.lastModified &&
                                  item.size === arquivo.size
                                ),
                            ),
                          }))
                  }
                />
              ))}
            </Stack>
          ) : null}

          <Typography variant="caption" color="text.secondary">
            Até {MAX_ATTACHMENT_ITEMS} imagens de no máximo 3 MB cada.
          </Typography>

          <Button
            variant="contained"
            onClick={handleCadastrar}
            disabled={loadingCadastro}
            startIcon={
              loadingCadastro ? (
                <CircularProgress size={18} color="inherit" />
              ) : null
            }
          >
            {loadingCadastro ? "Cadastrando..." : "Cadastrar"}
          </Button>
        </Stack>
      </Drawer>

      <Dialog
        open={edicao.open}
        onClose={fecharModalEdicao}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Atualizar status e parecer técnico</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 0.75 }}>
            <FormControl fullWidth size="small">
              <InputLabel id="status-label">Status</InputLabel>
              <Select
                labelId="status-label"
                label="Status"
                value={edicao.status}
                onChange={(event) =>
                  setEdicao((prev) => ({
                    ...prev,
                    status: Number(event.target.value),
                  }))
                }
                disabled={loadingEdicao}
              >
                {STATUS_OPTIONS.map((statusOption) => (
                  <MenuItem key={statusOption.value} value={statusOption.value}>
                    {statusOption.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              label="Git commit (opcional)"
              size="small"
              fullWidth
              value={edicao.gitCommit}
              onChange={(event) =>
                setEdicao((prev) => ({
                  ...prev,
                  gitCommit: event.target.value,
                }))
              }
              disabled={loadingEdicao}
            />

            <TextField
              label="Parecer técnico (obrigatório)"
              multiline
              minRows={5}
              fullWidth
              value={edicao.parecer}
              onChange={(event) =>
                setEdicao((prev) => ({ ...prev, parecer: event.target.value }))
              }
              disabled={loadingEdicao}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={fecharModalEdicao} disabled={loadingEdicao}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={handleAtualizarTask}
            disabled={loadingEdicao}
            startIcon={
              loadingEdicao ? (
                <CircularProgress size={18} color="inherit" />
              ) : null
            }
          >
            {loadingEdicao ? "Salvando..." : "Salvar"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default FeedbacksPage;
