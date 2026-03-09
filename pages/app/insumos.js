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
import { useDataStore } from "../../hooks/useDataStore";
import { downloadWorkbookXlsx } from "../../utils/xlsx";

const initialForm = {
  nome: "",
  kg_por_saco: "1",
  estoque_minimo: "",
  unidade_codigo: "KG",
  pode_ser_insumo: true,
  pode_ser_produzivel: false,
  pode_ser_vendido: false,
};

const isSacoUnidade = (code) => String(code || "KG").toUpperCase() === "SACO";
const boolLabel = (value) => (value ? "Sim" : "Nao");
const exportDate = () => new Date().toISOString().slice(0, 10);

const InsumosPage = () => {
  const insumos = useDataStore((state) => state.insumos);
  const auxUnidades = useDataStore((state) => state.auxUnidades);
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

  const handleChange = (field) => (event) => {
    const value = event.target.type === "checkbox" ? event.target.checked : event.target.value;
    if (field === "unidade_codigo") {
      const unidadeCodigo = String(value || "KG").toUpperCase();
      setForm((prev) => ({
        ...prev,
        unidade_codigo: unidadeCodigo,
        kg_por_saco: isSacoUnidade(unidadeCodigo) ? prev.kg_por_saco || "" : "1",
      }));
      return;
    }
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleEditChange = (field) => (event) => {
    const value = event.target.type === "checkbox" ? event.target.checked : event.target.value;
    if (field === "unidade_codigo") {
      const unidadeCodigo = String(value || "KG").toUpperCase();
      setEditForm((prev) => ({
        ...prev,
        unidade_codigo: unidadeCodigo,
        kg_por_saco: isSacoUnidade(unidadeCodigo) ? prev.kg_por_saco || "" : "1",
      }));
      return;
    }
    setEditForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleExportInsumos = () => {
    if (!insumos.length) {
      setFeedback({
        open: true,
        message: "Nao ha insumos para exportar.",
        severity: "warning",
      });
      return;
    }

    const rows = insumos.map((insumo) => ({
      nome: insumo.nome || "",
      unidade: insumo.unidade_label || insumo.unidade_codigo || "",
      unidade_codigo: String(insumo.unidade_codigo || "KG").toUpperCase(),
      kg_por_saco: Number(insumo.kg_por_saco) || 1,
      estoque_minimo: Number(insumo.estoque_minimo) || 0,
      estoque_atual_kg: Number(insumo.saldo_kg) || 0,
      custo_medio_kg: Number(insumo.custo_medio_kg) || 0,
      usar_como_insumo: boolLabel(insumo.pode_ser_insumo),
      produzir_internamente: boolLabel(insumo.pode_ser_produzivel),
      vender_cliente: boolLabel(insumo.pode_ser_vendido),
    }));

    downloadWorkbookXlsx({
      fileName: `insumos_configuracoes_estoque_${exportDate()}`,
      sheets: [
        {
          name: "Insumos",
          columns: [
            { key: "nome", header: "Insumo" },
            { key: "unidade", header: "Unidade padrao" },
            { key: "unidade_codigo", header: "Codigo unidade" },
            { key: "kg_por_saco", header: "Kg por saco" },
            { key: "estoque_minimo", header: "Estoque minimo" },
            { key: "estoque_atual_kg", header: "Estoque atual (kg)" },
            { key: "custo_medio_kg", header: "Custo medio (R$/kg)" },
            {
              key: "usar_como_insumo",
              header: "Pode usar para produzir outro insumo?",
            },
            {
              key: "produzir_internamente",
              header: "Pode fabricar internamente?",
            },
            { key: "vender_cliente", header: "Pode vender ao cliente final?" },
          ],
          rows,
        },
      ],
    });

    setFeedback({
      open: true,
      message: "Exportacao XLSX concluida.",
      severity: "success",
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!form.nome.trim()) {
      setFeedback({
        open: true,
        message: "Informe o nome do insumo para cadastrar.",
        severity: "error",
      });
      return;
    }

    const unidadeCodigo = String(form.unidade_codigo || "KG").toUpperCase();
    const isSaco = isSacoUnidade(unidadeCodigo);
    const kgPorSaco = isSaco ? Number(form.kg_por_saco) : 1;

    if (isSaco && kgPorSaco <= 0) {
      setFeedback({
        open: true,
        message: "Informe quantos kg vêm em cada saco.",
        severity: "error",
      });
      return;
    }

    await addInsumo({
      ...form,
      unidade_codigo: unidadeCodigo,
      estoque_minimo_unidade_codigo: unidadeCodigo,
      estoque_minimo: Number(form.estoque_minimo) || 0,
      kg_por_saco: kgPorSaco || 1,
    });
    setForm(initialForm);
    setDrawerOpen(false);
    setFeedback({
      open: true,
      message: "Insumo cadastrado com sucesso.",
      severity: "success",
    });
  };

  const openEditDialog = (insumo) => {
    setEditingInsumoId(insumo.id);
    setEditForm({
      nome: insumo.nome || "",
      kg_por_saco: isSacoUnidade(insumo.unidade_codigo)
        ? String(Number(insumo.kg_por_saco) || 1)
        : "1",
      estoque_minimo: String(Number(insumo.estoque_minimo) || 0),
      unidade_codigo: String(insumo.unidade_codigo || "KG").toUpperCase(),
      pode_ser_insumo: insumo.pode_ser_insumo ?? true,
      pode_ser_produzivel: insumo.pode_ser_produzivel ?? false,
      pode_ser_vendido: insumo.pode_ser_vendido ?? false,
    });
    setEditDrawerOpen(true);
  };

  const handleEditSubmit = async (event) => {
    event.preventDefault();

    if (!editForm.nome.trim()) {
      setFeedback({
        open: true,
        message: "Informe o nome do insumo para editar.",
        severity: "error",
      });
      return;
    }

    const unidadeCodigo = String(editForm.unidade_codigo || "KG").toUpperCase();
    const isSaco = isSacoUnidade(unidadeCodigo);
    const kgPorSaco = isSaco ? Number(editForm.kg_por_saco) : 1;

    if (isSaco && kgPorSaco <= 0) {
      setFeedback({
        open: true,
        message: "Informe quantos kg vêm em cada saco.",
        severity: "error",
      });
      return;
    }

    await updateInsumo({
      id: editingInsumoId,
      nome: editForm.nome,
      kg_por_saco: kgPorSaco || 1,
      estoque_minimo: Number(editForm.estoque_minimo) || 0,
      unidade_codigo: unidadeCodigo,
      estoque_minimo_unidade_codigo: unidadeCodigo,
      pode_ser_insumo: editForm.pode_ser_insumo,
      pode_ser_produzivel: editForm.pode_ser_produzivel,
      pode_ser_vendido: editForm.pode_ser_vendido,
    });

    setEditDrawerOpen(false);
    setEditingInsumoId("");
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
            <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ xs: "flex-start", sm: "center" }} mb={2} spacing={2}>
              <Typography variant="h6">
                Insumos cadastrados
              </Typography>
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
              {insumosFiltrados.map((insumo) => (
                <Paper key={insumo.id} variant="outlined" sx={{ p: 2 }}>
                  <Stack
                    direction={{ xs: "column", sm: "row" }}
                    justifyContent="space-between"
                    alignItems={{ xs: "flex-start", sm: "center" }}
                    spacing={2}
                  >
                    <Box>
                      <Typography fontWeight={600}>{insumo.nome}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        Unidade de cadastro: {insumo.unidade_label || insumo.unidade_codigo || "-"}
                        {isSacoUnidade(insumo.unidade_codigo)
                          ? ` • Kg por saco: ${Number(insumo.kg_por_saco) || 1}`
                          : ""}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Estoque mínimo: {insumo.estoque_minimo || "-"}{" "}
                        {insumo.unidade_label || insumo.unidade_codigo || "KG"}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Estoque atual: {(Number(insumo.saldo_kg) || 0).toFixed(2)} kg
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Finalidade: {[
                          insumo.pode_ser_insumo ? "Usar para produzir" : "",
                          insumo.pode_ser_produzivel ? "Fabricar internamente" : "",
                          insumo.pode_ser_vendido ? "Vender ao cliente" : "",
                        ].filter(Boolean).join(" • ") || "Nenhuma"}
                      </Typography>
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
              ))}
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
              label="Pode ser usada como insumo? (Posso usar para produzir outro insumo)"
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={form.pode_ser_produzivel}
                  onChange={handleChange("pode_ser_produzivel")}
                />
              }
              label="Pode ser produzida internamente? (Posso fabricar ela)"
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={form.pode_ser_vendido}
                  onChange={handleChange("pode_ser_vendido")}
                />
              }
              label="Pode ser vendida ao cliente final? (Posso vender)"
            />
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
              label="Pode ser usada como insumo? (Posso usar para produzir outro insumo)"
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={editForm.pode_ser_produzivel}
                  onChange={handleEditChange("pode_ser_produzivel")}
                />
              }
              label="Pode ser produzida internamente? (Posso fabricar ela)"
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={editForm.pode_ser_vendido}
                  onChange={handleEditChange("pode_ser_vendido")}
                />
              }
              label="Pode ser vendida ao cliente final? (Posso vender)"
            />
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
