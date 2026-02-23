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
import { Close, Edit, PersonAdd, AddBusiness, Search } from "@mui/icons-material";
import { useState, useMemo } from "react";
import AppLayout from "../../components/template/AppLayout";
import PageHeader from "../../components/atomic/PageHeader";
import InsumoLedgerModal from "../../components/atomic/InsumoLedgerModal";
import EntradaInsumoDrawer from "../../components/atomic/EntradaInsumoDrawer";
import { useDataStore } from "../../hooks/useDataStore";

const initialForm = {
  nome: "",
  kg_por_saco: "1",
  estoque_minimo: "",
  estoque_minimo_unidade: "kg",
  tipo: "CONSUMIVEL",
  pode_ser_insumo: true,
  pode_ser_produzivel: false,
  pode_ser_vendido: false,
};

const InsumosPage = () => {
  const insumos = useDataStore((state) => state.insumos);
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

  const openLedgerDialog = (insumo) => {
    setSelectedInsumo(insumo);
    setLedgerOpen(true);
  };

  const handleChange = (field) => (event) => {
    const value = event.target.type === "checkbox" ? event.target.checked : event.target.value;
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleEditChange = (field) => (event) => {
    const value = event.target.type === "checkbox" ? event.target.checked : event.target.value;
    setEditForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleToggleEstoqueMinimoUnidade = (event) => {
    const value = event.target.checked ? "saco" : "kg";
    setForm((prev) => ({ ...prev, estoque_minimo_unidade: value }));
  };

  const handleToggleEditEstoqueMinimoUnidade = (event) => {
    const value = event.target.checked ? "saco" : "kg";
    setEditForm((prev) => ({ ...prev, estoque_minimo_unidade: value }));
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

    if (Number(form.kg_por_saco) <= 0) {
      setFeedback({
        open: true,
        message: "Informe quantos kg vêm em cada saco.",
        severity: "error",
      });
      return;
    }

    await addInsumo({
      ...form,
      unidade: "kg",
      estoque_minimo: Number(form.estoque_minimo) || 0,
      estoque_minimo_unidade: form.estoque_minimo_unidade,
      kg_por_saco: Number(form.kg_por_saco) || 1,
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
      kg_por_saco: String(Number(insumo.kg_por_saco) || 1),
      estoque_minimo: String(Number(insumo.estoque_minimo) || 0),
      estoque_minimo_unidade:
        insumo.estoque_minimo_unidade === "saco" ? "saco" : "kg",
      tipo: insumo.tipo === "FISICO" ? "FISICO" : "CONSUMIVEL",
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

    if (Number(editForm.kg_por_saco) <= 0) {
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
      kg_por_saco: Number(editForm.kg_por_saco) || 1,
      estoque_minimo: Number(editForm.estoque_minimo) || 0,
      estoque_minimo_unidade: editForm.estoque_minimo_unidade,
      tipo: editForm.tipo,
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
                        Unidade de cadastro: {insumo.unidade} • Kg por saco:{" "}
                        {Number(insumo.kg_por_saco) || 1}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Estoque mínimo: {insumo.estoque_minimo || "-"}{" "}
                        {insumo.estoque_minimo_unidade || "kg"}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Finalidade: {[
                          insumo.pode_ser_insumo ? "Insumo" : "",
                          insumo.pode_ser_produzivel ? "Produzível" : "",
                          insumo.pode_ser_vendido ? "Venda" : "",
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
        sx={{ zIndex: (theme) => theme.zIndex.drawer + 2 }}
        PaperProps={{ sx: { width: "50vw", minWidth: 450, height: "100vh", p: 3 } }}
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
              label="Tipo do insumo"
              value={form.tipo}
              onChange={handleChange("tipo")}
              required
            >
              <MenuItem value="CONSUMIVEL">Consumível</MenuItem>
              <MenuItem value="FISICO">Físico</MenuItem>
            </TextField>
            <TextField
              label="Kg por saco"
              type="number"
              value={form.kg_por_saco}
              onChange={handleChange("kg_por_saco")}
              inputProps={{ min: 0.01, step: "0.01" }}
              required
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={form.estoque_minimo_unidade === "saco"}
                  onChange={handleToggleEstoqueMinimoUnidade}
                />
              }
              label={`Estoque mínimo em saco (${Number(form.kg_por_saco) || 1} kg/saco)`}
            />
            <TextField
              label={`Estoque mínimo (${form.estoque_minimo_unidade})`}
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
              label="Pode ser usado como INSUMO"
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={form.pode_ser_produzivel}
                  onChange={handleChange("pode_ser_produzivel")}
                />
              }
              label="Pode ser PRODUZIDO internamente"
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={form.pode_ser_vendido}
                  onChange={handleChange("pode_ser_vendido")}
                />
              }
              label="Pode ser VENDIDO ao cliente final"
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
        sx={{ zIndex: (theme) => theme.zIndex.drawer + 2 }}
        PaperProps={{
          sx: { width: "50vw", minWidth: 450, height: "100vh", p: 3 },
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
              label="Tipo do insumo"
              value={editForm.tipo}
              onChange={handleEditChange("tipo")}
              required
            >
              <MenuItem value="CONSUMIVEL">Consumível</MenuItem>
              <MenuItem value="FISICO">Físico</MenuItem>
            </TextField>
            <TextField
              label="Kg por saco"
              type="number"
              value={editForm.kg_por_saco}
              onChange={handleEditChange("kg_por_saco")}
              inputProps={{ min: 0.01, step: "0.01" }}
              required
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={editForm.estoque_minimo_unidade === "saco"}
                  onChange={handleToggleEditEstoqueMinimoUnidade}
                />
              }
              label={`Estoque mínimo em saco (${Number(editForm.kg_por_saco) || 1} kg/saco)`}
            />
            <TextField
              label={`Estoque mínimo (${editForm.estoque_minimo_unidade})`}
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
              label="Pode ser usado como INSUMO"
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={editForm.pode_ser_produzivel}
                  onChange={handleEditChange("pode_ser_produzivel")}
                />
              }
              label="Pode ser PRODUZIDO internamente"
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={editForm.pode_ser_vendido}
                  onChange={handleEditChange("pode_ser_vendido")}
                />
              }
              label="Pode ser VENDIDO ao cliente final"
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
