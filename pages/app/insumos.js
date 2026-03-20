import {
  Alert,
  Box,
  Button,
  Checkbox,
  Drawer,
  FormControlLabel,
  Grid,
  IconButton,
  MenuItem,
  Paper,
  Snackbar,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import {
  AddBusiness,
  Close,
  DownloadRounded,
  Edit,
  PersonAdd,
  Search,
} from "@mui/icons-material";
import { useState, useMemo } from "react";
import AppLayout from "../../components/template/AppLayout";
import PageHeader from "../../components/atomic/PageHeader";
import InsumoLedgerModal from "../../components/atomic/InsumoLedgerModal";
import EntradaInsumoDrawer from "../../components/atomic/EntradaInsumoDrawer";
import StockStatusChip from "../../components/atomic/StockStatusChip";
import { useDataStore } from "../../hooks/useDataStore";
import { downloadWorkbookXlsx } from "../../utils/xlsx";
import {
  isImageFile,
  normalizeImageBase64,
  readFileAsDataUrl,
} from "../../utils/image";

const initialForm = {
  nome: "",
  kg_por_saco: "1",
  estoque_minimo: "",
  valor_venda: "",
  descricao: "",
  imagem_pagina_inicial_base64: "",
  unidade_codigo: "KG",
  pode_ser_insumo: true,
  pode_ser_produzivel: false,
  pode_ser_vendido: false,
  aparecer_pagina_inicial: false,
};

const isSacoUnidade = (code) => String(code || "KG").toUpperCase() === "SACO";
const boolLabel = (value) => (value ? "Sim" : "Não");
const exportDate = () => new Date().toISOString().slice(0, 10);
const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});
const formatCurrency = (value) => currencyFormatter.format(Number(value) || 0);
const formatPercent = (value) => `${(Number(value) || 0).toFixed(1)}%`;
const toPositiveInputValue = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? String(parsed) : "";
};
const hasImageValue = (value) => Boolean(String(value || "").trim());
const getImageUploadKey = (file) =>
  file ? `${file.name}-${file.size}-${file.lastModified}` : "";
const createEmptyImageUpload = () => ({
  file: null,
  preview: "",
  fileName: "",
  fileKey: "",
  isLoading: false,
});
const resolveImageValueForSubmit = async (currentValue, imageUpload) => {
  if (imageUpload?.file) {
    return imageUpload.preview || readFileAsDataUrl(imageUpload.file);
  }

  return normalizeImageBase64(currentValue) || "";
};
const applyFormValueChange = (prev, field, value) => {
  if (field === "unidade_codigo") {
    const unidadeCodigo = String(value || "KG").toUpperCase();
    return {
      ...prev,
      unidade_codigo: unidadeCodigo,
      kg_por_saco: isSacoUnidade(unidadeCodigo) ? prev.kg_por_saco || "" : "1",
    };
  }

  if (field === "aparecer_pagina_inicial") {
    return {
      ...prev,
      aparecer_pagina_inicial: value,
      pode_ser_vendido: value ? true : prev.pode_ser_vendido,
    };
  }

  if (field === "pode_ser_vendido" && !value) {
    return {
      ...prev,
      pode_ser_vendido: false,
      aparecer_pagina_inicial: false,
    };
  }

  return { ...prev, [field]: value };
};
const validateInsumoForm = (
  values,
  { skipCurrentImageValidation = false } = {},
) => {
  if (!String(values.nome || "").trim()) {
    return "Informe o nome do insumo para cadastrar.";
  }

  const unidadeCodigo = String(values.unidade_codigo || "KG").toUpperCase();
  const isSaco = isSacoUnidade(unidadeCodigo);
  const kgPorSaco = isSaco ? Number(values.kg_por_saco) : 1;

  if (isSaco && kgPorSaco <= 0) {
    return "Informe quantos kg vêm em cada saco.";
  }

  if (Number(values.valor_venda) < 0) {
    return "O valor de venda não pode ser negativo.";
  }

  if (!skipCurrentImageValidation) {
    const imagemNormalizada = normalizeImageBase64(
      values.imagem_pagina_inicial_base64,
    );
    if (
      String(values.imagem_pagina_inicial_base64 || "").trim() &&
      imagemNormalizada === null
    ) {
      return "A imagem da página inicial salva está inválida. Selecione outra imagem.";
    }
  }

  if (
    values.aparecer_pagina_inicial &&
    !String(values.descricao || "").trim()
  ) {
    return "Informe uma descrição para exibir o produto na página inicial.";
  }

  if (values.aparecer_pagina_inicial && Number(values.valor_venda) <= 0) {
    return "Informe um valor de venda maior que zero para exibir na página inicial.";
  }

  return null;
};

const InsumosPage = () => {
  const insumos = useDataStore((state) => state.insumos);
  const auxUnidades = useDataStore((state) => state.auxUnidades);
  const getInsumoEstoqueStatus = useDataStore(
    (state) => state.getInsumoEstoqueStatus,
  );
  const addInsumo = useDataStore((state) => state.addInsumo);
  const updateInsumo = useDataStore((state) => state.updateInsumo);
  const [form, setForm] = useState(initialForm);
  const [editForm, setEditForm] = useState(initialForm);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editDrawerOpen, setEditDrawerOpen] = useState(false);
  const [ledgerOpen, setLedgerOpen] = useState(false);
  const [selectedInsumo, setSelectedInsumo] = useState(null);
  const [editingInsumoId, setEditingInsumoId] = useState("");
  const [feedback, setFeedback] = useState({
    open: false,
    message: "",
    severity: "success",
  });
  const [filtroNome, setFiltroNome] = useState("");
  const [entradaDrawerOpen, setEntradaDrawerOpen] = useState(false);
  const [formImageUpload, setFormImageUpload] = useState(
    createEmptyImageUpload,
  );
  const [editImageUpload, setEditImageUpload] = useState(
    createEmptyImageUpload,
  );

  const insumosFiltrados = useMemo(() => {
    if (!filtroNome.trim()) return insumos;
    const lower = filtroNome.toLowerCase();
    return insumos.filter((i) => i.nome.toLowerCase().includes(lower));
  }, [insumos, filtroNome]);

  const unidadesOptions = useMemo(
    () =>
      auxUnidades.length
        ? auxUnidades
        : [
            { id: "kg", codigo: "KG", label: "Quilograma" },
            { id: "saco", codigo: "SACO", label: "Saco" },
          ],
    [auxUnidades],
  );

  const openLedgerDialog = (insumo) => {
    setSelectedInsumo(insumo);
    setLedgerOpen(true);
  };

  const formStoredImagePreview = normalizeImageBase64(
    form.imagem_pagina_inicial_base64,
  );
  const editStoredImagePreview = normalizeImageBase64(
    editForm.imagem_pagina_inicial_base64,
  );
  const formImagePreview = formImageUpload.preview || formStoredImagePreview;
  const editImagePreview = editImageUpload.preview || editStoredImagePreview;
  const formImageInvalid =
    !formImageUpload.file &&
    hasImageValue(form.imagem_pagina_inicial_base64) &&
    formStoredImagePreview === null;
  const editImageInvalid =
    !editImageUpload.file &&
    hasImageValue(editForm.imagem_pagina_inicial_base64) &&
    editStoredImagePreview === null;

  const handleChange = (field) => (event) => {
    const value =
      event.target.type === "checkbox"
        ? event.target.checked
        : event.target.value;
    setForm((prev) => applyFormValueChange(prev, field, value));
  };

  const handleEditChange = (field) => (event) => {
    const value =
      event.target.type === "checkbox"
        ? event.target.checked
        : event.target.value;
    setEditForm((prev) => applyFormValueChange(prev, field, value));
  };
  const handleImageSelection = (setImageUpload) => async (event) => {
    const [file] = Array.from(event.target.files || []);
    event.target.value = "";

    if (!file) {
      return;
    }

    if (!isImageFile(file)) {
      setFeedback({
        open: true,
        message: "Selecione um arquivo de imagem válido.",
        severity: "error",
      });
      return;
    }

    const fileKey = getImageUploadKey(file);
    setImageUpload({
      file,
      preview: "",
      fileName: file.name || "",
      fileKey,
      isLoading: true,
    });

    try {
      const preview = await readFileAsDataUrl(file);
      setImageUpload((current) =>
        current.fileKey === fileKey
          ? {
              ...current,
              preview,
              isLoading: false,
            }
          : current,
      );
    } catch (error) {
      setImageUpload((current) =>
        current.fileKey === fileKey ? createEmptyImageUpload() : current,
      );
      setFeedback({
        open: true,
        message: error?.message || "Não foi possível ler a imagem selecionada.",
        severity: "error",
      });
    }
  };
  const clearFormImageSelection = () => {
    setFormImageUpload(createEmptyImageUpload());
  };
  const discardEditImageSelection = () => {
    setEditImageUpload(createEmptyImageUpload());
  };
  const removeEditImage = () => {
    setEditImageUpload(createEmptyImageUpload());
    setEditForm((prev) => ({
      ...prev,
      imagem_pagina_inicial_base64: "",
    }));
  };

  const handleExportInsumos = () => {
    if (!insumos.length) {
      setFeedback({
        open: true,
        message: "Não há insumos para exportar.",
        severity: "warning",
      });
      return;
    }

    const rows = insumos.map((insumo) => {
      const estoqueStatus = getInsumoEstoqueStatus(insumo.id);

      return {
        nome: insumo.nome || "",
        unidade: insumo.unidade_label || insumo.unidade_codigo || "",
        unidade_codigo: String(insumo.unidade_codigo || "KG").toUpperCase(),
        kg_por_saco: Number(insumo.kg_por_saco) || 1,
        estoque_minimo: Number(insumo.estoque_minimo) || 0,
        estoque_minimo_kg: Number(estoqueStatus.estoque_minimo_kg) || 0,
        estoque_atual_kg: Number(estoqueStatus.saldo_kg) || 0,
        percentual_estoque: Number(estoqueStatus.percentual_estoque) || 0,
        criticidade_estoque: estoqueStatus.status_label || "Sem faixa",
        custo_medio_kg: Number(insumo.custo_medio_kg) || 0,
        usar_como_insumo: boolLabel(insumo.pode_ser_insumo),
        produzir_internamente: boolLabel(insumo.pode_ser_produzivel),
        vender_cliente: boolLabel(insumo.pode_ser_vendido),
        aparece_home: boolLabel(insumo.aparecer_pagina_inicial),
        valor_venda: Number(insumo.valor_venda) || 0,
        descricao: String(insumo.descricao || "").trim(),
        possui_imagem_home: boolLabel(
          Boolean(String(insumo.imagem_pagina_inicial_base64 || "").trim()),
        ),
      };
    });

    downloadWorkbookXlsx({
      fileName: `insumos_configuracoes_estoque_${exportDate()}`,
      sheets: [
        {
          name: "Insumos",
          columns: [
            { key: "nome", header: "Insumo" },
            { key: "unidade", header: "Unidade padrão" },
            { key: "unidade_codigo", header: "Código da unidade" },
            { key: "kg_por_saco", header: "Kg por saco" },
            { key: "estoque_minimo", header: "Estoque mínimo" },
            { key: "estoque_minimo_kg", header: "Estoque mínimo (kg)" },
            { key: "estoque_atual_kg", header: "Estoque atual (kg)" },
            { key: "percentual_estoque", header: "Cobertura do mínimo (%)" },
            { key: "criticidade_estoque", header: "Criticidade" },
            { key: "custo_medio_kg", header: "Custo médio (R$/kg)" },
            {
              key: "usar_como_insumo",
              header: "Pode usar para produzir outro insumo?",
            },
            {
              key: "produzir_internamente",
              header: "Pode fabricar internamente?",
            },
            { key: "vender_cliente", header: "Pode vender ao cliente final?" },
            {
              key: "aparece_home",
              header: "Aparece na página inicial?",
            },
            { key: "valor_venda", header: "Valor de venda (R$)" },
            { key: "descricao", header: "Descrição" },
            { key: "possui_imagem_home", header: "Tem imagem?" },
          ],
          rows,
        },
      ],
    });

    setFeedback({
      open: true,
      message: "Exportação XLSX concluída.",
      severity: "success",
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const validationError = validateInsumoForm(form, {
      skipCurrentImageValidation: Boolean(formImageUpload.file),
    });
    if (validationError) {
      setFeedback({
        open: true,
        message: validationError,
        severity: "error",
      });
      return;
    }

    const unidadeCodigo = String(form.unidade_codigo || "KG").toUpperCase();
    const isSaco = isSacoUnidade(unidadeCodigo);
    const kgPorSaco = isSaco ? Number(form.kg_por_saco) : 1;
    let imagemPaginaInicialBase64 = "";

    try {
      imagemPaginaInicialBase64 = await resolveImageValueForSubmit(
        form.imagem_pagina_inicial_base64,
        formImageUpload,
      );
    } catch (error) {
      setFeedback({
        open: true,
        message:
          error?.message || "Não foi possível preparar a imagem selecionada.",
        severity: "error",
      });
      return;
    }

    const result = await addInsumo({
      ...form,
      nome: form.nome.trim(),
      descricao: String(form.descricao || "").trim(),
      unidade_codigo: unidadeCodigo,
      estoque_minimo_unidade_codigo: unidadeCodigo,
      estoque_minimo: Number(form.estoque_minimo) || 0,
      valor_venda: Number(form.valor_venda) || 0,
      kg_por_saco: kgPorSaco || 1,
      pode_ser_vendido: form.aparecer_pagina_inicial
        ? true
        : form.pode_ser_vendido,
      aparecer_pagina_inicial: form.aparecer_pagina_inicial,
      imagem_pagina_inicial_base64: imagemPaginaInicialBase64,
    });

    if (!result?.ok) {
      setFeedback({
        open: true,
        message: result?.error || "Não foi possível cadastrar o insumo.",
        severity: "error",
      });
      return;
    }

    setForm(initialForm);
    setFormImageUpload(createEmptyImageUpload());
    setDrawerOpen(false);
    setFeedback({
      open: true,
      message: "Insumo cadastrado com sucesso.",
      severity: "success",
    });
  };

  const openEditDialog = (insumo) => {
    setEditingInsumoId(insumo.id);
    setEditImageUpload(createEmptyImageUpload());
    setEditForm({
      nome: insumo.nome || "",
      kg_por_saco: isSacoUnidade(insumo.unidade_codigo)
        ? String(Number(insumo.kg_por_saco) || 1)
        : "1",
      estoque_minimo: String(Number(insumo.estoque_minimo) || 0),
      valor_venda: toPositiveInputValue(insumo.valor_venda),
      descricao: String(insumo.descricao || ""),
      imagem_pagina_inicial_base64: insumo.imagem_pagina_inicial_base64 || "",
      unidade_codigo: String(insumo.unidade_codigo || "KG").toUpperCase(),
      pode_ser_insumo: insumo.pode_ser_insumo ?? true,
      pode_ser_produzivel: insumo.pode_ser_produzivel ?? false,
      pode_ser_vendido: insumo.pode_ser_vendido ?? false,
      aparecer_pagina_inicial: insumo.aparecer_pagina_inicial ?? false,
    });
    setEditDrawerOpen(true);
  };

  const handleEditSubmit = async (event) => {
    event.preventDefault();

    const validationError = validateInsumoForm(editForm, {
      skipCurrentImageValidation: Boolean(editImageUpload.file),
    });
    if (validationError) {
      setFeedback({
        open: true,
        message: validationError,
        severity: "error",
      });
      return;
    }

    const unidadeCodigo = String(editForm.unidade_codigo || "KG").toUpperCase();
    const isSaco = isSacoUnidade(unidadeCodigo);
    const kgPorSaco = isSaco ? Number(editForm.kg_por_saco) : 1;
    let imagemPaginaInicialBase64 = "";

    try {
      imagemPaginaInicialBase64 = await resolveImageValueForSubmit(
        editForm.imagem_pagina_inicial_base64,
        editImageUpload,
      );
    } catch (error) {
      setFeedback({
        open: true,
        message:
          error?.message || "Não foi possível preparar a imagem selecionada.",
        severity: "error",
      });
      return;
    }

    const result = await updateInsumo({
      id: editingInsumoId,
      nome: editForm.nome.trim(),
      descricao: String(editForm.descricao || "").trim(),
      kg_por_saco: kgPorSaco || 1,
      estoque_minimo: Number(editForm.estoque_minimo) || 0,
      valor_venda: Number(editForm.valor_venda) || 0,
      unidade_codigo: unidadeCodigo,
      estoque_minimo_unidade_codigo: unidadeCodigo,
      pode_ser_insumo: editForm.pode_ser_insumo,
      pode_ser_produzivel: editForm.pode_ser_produzivel,
      pode_ser_vendido: editForm.aparecer_pagina_inicial
        ? true
        : editForm.pode_ser_vendido,
      aparecer_pagina_inicial: editForm.aparecer_pagina_inicial,
      imagem_pagina_inicial_base64: imagemPaginaInicialBase64,
    });

    if (!result?.ok) {
      setFeedback({
        open: true,
        message: result?.error || "Não foi possível atualizar o insumo.",
        severity: "error",
      });
      return;
    }

    setEditDrawerOpen(false);
    setEditingInsumoId("");
    setEditImageUpload(createEmptyImageUpload());
    setFeedback({
      open: true,
      message: "Insumo atualizado com sucesso.",
      severity: "success",
    });
  };

  return (
    <AppLayout>
      <PageHeader
        title="Gestão de Insumos"
        subtitle="Cadastre matérias-primas e parâmetros de estoque."
        action={
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <Button
              variant="outlined"
              startIcon={<AddBusiness />}
              onClick={() => setEntradaDrawerOpen(true)}
            >
              Entrada de Estoque
            </Button>
            <Button
              variant="contained"
              startIcon={<PersonAdd />}
              onClick={() => setDrawerOpen(true)}
            >
              Novo insumo
            </Button>
          </Stack>
        }
      />
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Stack
              direction={{ xs: "column", sm: "row" }}
              justifyContent="space-between"
              alignItems={{ xs: "flex-start", sm: "center" }}
              mb={2}
              spacing={2}
            >
              <Typography variant="h6">Insumos cadastrados</Typography>
              <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={1}
                sx={{ width: { xs: "100%", sm: "auto" } }}
              >
                <TextField
                  size="small"
                  placeholder="Buscar insumo..."
                  value={filtroNome}
                  onChange={(e) => setFiltroNome(e.target.value)}
                  InputProps={{
                    startAdornment: <Search color="action" sx={{ mr: 1 }} />,
                  }}
                  sx={{ width: { xs: "100%", sm: 300 } }}
                />
                <Button
                  variant="outlined"
                  startIcon={<DownloadRounded />}
                  onClick={handleExportInsumos}
                >
                  Baixar XLSX
                </Button>
              </Stack>
            </Stack>
            <Stack spacing={2}>
              {insumosFiltrados.map((insumo) => {
                const estoqueStatus = getInsumoEstoqueStatus(insumo.id);

                return (
                  <Paper key={insumo.id} variant="outlined" sx={{ p: 2 }}>
                    <Stack
                      direction={{ xs: "column", sm: "row" }}
                      justifyContent="space-between"
                      alignItems={{ xs: "flex-start", sm: "center" }}
                      spacing={2}
                    >
                      <Box>
                        <Stack
                          direction={{ xs: "column", sm: "row" }}
                          spacing={1}
                          alignItems={{ xs: "flex-start", sm: "center" }}
                          useFlexGap
                        >
                          <Typography fontWeight={600}>
                            {insumo.nome}
                          </Typography>
                          <StockStatusChip
                            status={estoqueStatus.status_estoque}
                            label={estoqueStatus.status_label}
                          />
                          <Typography variant="caption" color="text.secondary">
                            {formatPercent(estoqueStatus.percentual_estoque)} do
                            mínimo
                          </Typography>
                        </Stack>
                        <Typography variant="body2" color="text.secondary">
                          Unidade de cadastro:{" "}
                          {insumo.unidade_label || insumo.unidade_codigo || "-"}
                          {isSacoUnidade(insumo.unidade_codigo)
                            ? ` • Kg por saco: ${Number(insumo.kg_por_saco) || 1}`
                            : ""}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Estoque mínimo: {insumo.estoque_minimo || "-"}{" "}
                          {insumo.estoque_minimo_unidade_label ||
                            insumo.estoque_minimo_unidade_codigo ||
                            insumo.unidade_label ||
                            insumo.unidade_codigo ||
                            "KG"}
                          {` • Referência: ${Number(
                            estoqueStatus.estoque_minimo_kg,
                          ).toFixed(2)} kg`}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Estoque atual:{" "}
                          {(Number(estoqueStatus.saldo_kg) || 0).toFixed(2)} kg
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Finalidade:{" "}
                          {[
                            insumo.pode_ser_insumo ? "Usar como insumo" : "",
                            insumo.pode_ser_produzivel
                              ? "Produzir internamente"
                              : "",
                            insumo.pode_ser_vendido ? "Vender ao cliente" : "",
                          ]
                            .filter(Boolean)
                            .join(" • ") || "Nenhuma"}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Página inicial:{" "}
                          {insumo.aparecer_pagina_inicial
                            ? "Em destaque"
                            : "Não exibir"}
                          {Number(insumo.valor_venda) > 0
                            ? ` • Valor de venda: ${formatCurrency(insumo.valor_venda)}`
                            : ""}
                        </Typography>
                        {String(insumo.descricao || "").trim() ? (
                          <Typography variant="body2" color="text.secondary">
                            Descrição: {String(insumo.descricao || "").trim()}
                          </Typography>
                        ) : null}
                      </Box>
                      <Box>
                        <Button
                          variant="text"
                          onClick={() => openLedgerDialog(insumo)}
                          sx={{ mr: 1 }}
                        >
                          Extrato
                        </Button>
                        <Button
                          variant="outlined"
                          startIcon={<Edit />}
                          onClick={() => openEditDialog(insumo)}
                        >
                          Editar
                        </Button>
                      </Box>
                    </Stack>
                  </Paper>
                );
              })}
              {!insumosFiltrados.length ? (
                <Typography variant="body2" color="text.secondary">
                  Nenhum insumo cadastrado ainda.
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
        sx={{ zIndex: (theme) => theme.zIndex.modal + 20 }}
        PaperProps={{
          sx: {
            width: { xs: "100%", md: "30vw" },
            minWidth: { md: 360 },
            height: "100vh",
            p: 3,
          },
        }}
      >
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          mb={2}
        >
          <Typography variant="h6">Cadastrar insumo</Typography>
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
              select
              label="Unidade"
              value={form.unidade_codigo}
              onChange={handleChange("unidade_codigo")}
              required
            >
              {unidadesOptions.map((unidade) => (
                <MenuItem key={unidade.id} value={unidade.codigo}>
                  {unidade.label}
                </MenuItem>
              ))}
            </TextField>
            {isSacoUnidade(form.unidade_codigo) ? (
              <TextField
                label="Kg por saco"
                type="number"
                value={form.kg_por_saco}
                onChange={handleChange("kg_por_saco")}
                inputProps={{ min: 0.01, step: "0.01" }}
                required
              />
            ) : null}
            <TextField
              label="Estoque mínimo"
              type="number"
              value={form.estoque_minimo}
              onChange={handleChange("estoque_minimo")}
              inputProps={{ min: 0, step: "0.01" }}
            />
            <Typography variant="subtitle2" mt={2}>
              Finalidade no sistema
            </Typography>
            <FormControlLabel
              control={
                <Checkbox
                  checked={form.pode_ser_insumo}
                  onChange={handleChange("pode_ser_insumo")}
                />
              }
              label="Pode ser usado como insumo em outra produção?"
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={form.pode_ser_produzivel}
                  onChange={handleChange("pode_ser_produzivel")}
                />
              }
              label="Pode ser produzido internamente?"
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={form.pode_ser_vendido}
                  onChange={handleChange("pode_ser_vendido")}
                />
              }
              label="Pode ser vendido ao cliente final?"
            />
            <Typography variant="subtitle2" mt={2}>
              Vitrine e página inicial
            </Typography>
            <FormControlLabel
              control={
                <Checkbox
                  checked={form.aparecer_pagina_inicial}
                  onChange={handleChange("aparecer_pagina_inicial")}
                />
              }
              label="Aparecer na página inicial"
            />
            <TextField
              label="Valor de venda"
              type="number"
              value={form.valor_venda}
              onChange={handleChange("valor_venda")}
              inputProps={{ min: 0, step: "0.01" }}
            />
            <TextField
              label="Descrição"
              value={form.descricao}
              onChange={handleChange("descricao")}
              multiline
              minRows={3}
            />
            <Stack spacing={1}>
              <Button variant="outlined" component="label">
                Selecionar imagem da página inicial
                <input
                  type="file"
                  hidden
                  accept="image/*"
                  onChange={handleImageSelection(setFormImageUpload)}
                />
              </Button>
              {formImageUpload.file ? (
                <Button variant="text" onClick={clearFormImageSelection}>
                  Limpar imagem selecionada
                </Button>
              ) : null}
              <Typography
                variant="body2"
                color={formImageInvalid ? "error" : "text.secondary"}
              >
                {formImageUpload.isLoading
                  ? "Carregando pré-visualização da imagem..."
                  : formImageUpload.file
                    ? `Imagem selecionada: ${formImageUpload.fileName}`
                    : formImageInvalid
                      ? "A imagem salva está inválida. Selecione outra imagem."
                      : "Selecione a imagem no computador. O sistema converte e salva automaticamente no banco."}
              </Typography>
            </Stack>
            {formImagePreview ? (
              <Box
                component="img"
                src={formImagePreview}
                alt="Pré-visualização da página inicial"
                sx={{
                  width: "100%",
                  maxHeight: 220,
                  borderRadius: 2,
                  objectFit: "cover",
                  border: "1px solid",
                  borderColor: "divider",
                }}
              />
            ) : null}
            <Button type="submit" variant="contained">
              Salvar insumo
            </Button>
          </Stack>
        </Box>
      </Drawer>

      <Drawer
        anchor="right"
        open={editDrawerOpen}
        onClose={() => setEditDrawerOpen(false)}
        sx={{ zIndex: (theme) => theme.zIndex.modal + 20 }}
        PaperProps={{
          sx: {
            width: { xs: "100%", md: "30vw" },
            minWidth: { md: 360 },
            height: "100vh",
            p: 3,
          },
        }}
      >
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          mb={2}
        >
          <Typography variant="h6">Editar insumo</Typography>
          <IconButton onClick={() => setEditDrawerOpen(false)}>
            <Close />
          </IconButton>
        </Stack>
        <Box component="form" onSubmit={handleEditSubmit}>
          <Stack spacing={2}>
            <TextField
              label="Nome"
              value={editForm.nome}
              onChange={handleEditChange("nome")}
              required
            />
            <TextField
              select
              label="Unidade"
              value={editForm.unidade_codigo}
              onChange={handleEditChange("unidade_codigo")}
              required
            >
              {unidadesOptions.map((unidade) => (
                <MenuItem key={unidade.id} value={unidade.codigo}>
                  {unidade.label}
                </MenuItem>
              ))}
            </TextField>
            {isSacoUnidade(editForm.unidade_codigo) ? (
              <TextField
                label="Kg por saco"
                type="number"
                value={editForm.kg_por_saco}
                onChange={handleEditChange("kg_por_saco")}
                inputProps={{ min: 0.01, step: "0.01" }}
                required
              />
            ) : null}
            <TextField
              label="Estoque mínimo"
              type="number"
              value={editForm.estoque_minimo}
              onChange={handleEditChange("estoque_minimo")}
              inputProps={{ min: 0, step: "0.01" }}
            />
            <Typography variant="subtitle2" mt={2}>
              Finalidade no sistema
            </Typography>
            <FormControlLabel
              control={
                <Checkbox
                  checked={editForm.pode_ser_insumo}
                  onChange={handleEditChange("pode_ser_insumo")}
                />
              }
              label="Pode ser usado como insumo em outra produção?"
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={editForm.pode_ser_produzivel}
                  onChange={handleEditChange("pode_ser_produzivel")}
                />
              }
              label="Pode ser produzido internamente?"
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={editForm.pode_ser_vendido}
                  onChange={handleEditChange("pode_ser_vendido")}
                />
              }
              label="Pode ser vendido ao cliente final?"
            />
            <Typography variant="subtitle2" mt={2}>
              Vitrine e página inicial
            </Typography>
            <FormControlLabel
              control={
                <Checkbox
                  checked={editForm.aparecer_pagina_inicial}
                  onChange={handleEditChange("aparecer_pagina_inicial")}
                />
              }
              label="Aparecer na página inicial"
            />
            <TextField
              label="Valor de venda"
              type="number"
              value={editForm.valor_venda}
              onChange={handleEditChange("valor_venda")}
              inputProps={{ min: 0, step: "0.01" }}
            />
            <TextField
              label="Descrição"
              value={editForm.descricao}
              onChange={handleEditChange("descricao")}
              multiline
              minRows={3}
            />
            <Stack spacing={1}>
              <Button variant="outlined" component="label">
                Selecionar nova imagem da página inicial
                <input
                  type="file"
                  hidden
                  accept="image/*"
                  onChange={handleImageSelection(setEditImageUpload)}
                />
              </Button>
              {editImageUpload.file ? (
                <Button variant="text" onClick={discardEditImageSelection}>
                  Descartar nova imagem
                </Button>
              ) : null}
              {editImageUpload.file ||
              hasImageValue(editForm.imagem_pagina_inicial_base64) ? (
                <Button variant="text" color="error" onClick={removeEditImage}>
                  Remover imagem atual
                </Button>
              ) : null}
              <Typography
                variant="body2"
                color={editImageInvalid ? "error" : "text.secondary"}
              >
                {editImageUpload.isLoading
                  ? "Carregando pré-visualização da nova imagem..."
                  : editImageUpload.file
                    ? `Nova imagem selecionada: ${editImageUpload.fileName}`
                    : editImagePreview
                      ? "A imagem atual será mantida se você salvar sem trocar."
                      : editImageInvalid
                        ? "A imagem salva está inválida. Selecione outra ou remova a imagem atual."
                        : "Nenhuma imagem configurada para a página inicial."}
              </Typography>
            </Stack>
            {editImagePreview ? (
              <Box
                component="img"
                src={editImagePreview}
                alt="Pré-visualização da página inicial"
                sx={{
                  width: "100%",
                  maxHeight: 220,
                  borderRadius: 2,
                  objectFit: "cover",
                  border: "1px solid",
                  borderColor: "divider",
                }}
              />
            ) : null}
            <Button onClick={() => setEditDrawerOpen(false)}>Cancelar</Button>
            <Button type="submit" variant="contained">
              Salvar alterações
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

      <EntradaInsumoDrawer
        open={entradaDrawerOpen}
        onClose={() => setEntradaDrawerOpen(false)}
      />

      <InsumoLedgerModal
        open={ledgerOpen}
        onClose={() => {
          setLedgerOpen(false);
          setSelectedInsumo(null);
        }}
        insumo={selectedInsumo}
      />
    </AppLayout>
  );
};

export default InsumosPage;
