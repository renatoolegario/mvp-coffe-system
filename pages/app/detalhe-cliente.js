import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Drawer,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import { Close } from "@mui/icons-material";
import { useMemo, useState } from "react";
import AppLayout from "../../components/template/AppLayout";
import PageHeader from "../../components/atomic/PageHeader";
import { useDataStore } from "../../hooks/useDataStore";
import { formatCurrency, formatDate } from "../../utils/format";

const drawerPaperSx = {
  width: { xs: "100%", md: 540 },
  maxWidth: "100%",
  height: "100vh",
  p: 3,
};

const DetalheClientePage = () => {
  const clientes = useDataStore((state) => state.clientes);
  const vendas = useDataStore((state) => state.vendas);
  const contasReceber = useDataStore((state) => state.contasReceber);
  const parcelas = useDataStore((state) => state.contasReceberParcelas);
  const vendaDetalhes = useDataStore((state) => state.vendaDetalhes || []);
  const updateCliente = useDataStore((state) => state.updateCliente);
  const marcarParcelaRecebida = useDataStore(
    (state) => state.marcarParcelaRecebida,
  );

  const [search, setSearch] = useState("");
  const [drawer, setDrawer] = useState({ type: null, clienteId: null });
  const [clienteForm, setClienteForm] = useState({
    id: "",
    nome: "",
    cpf_cnpj: "",
    telefone: "",
    endereco: "",
  });
  const [confirmModal, setConfirmModal] = useState({
    open: false,
    parcelaId: "",
    vendaId: "",
    forma_recebimento: "Pix",
    tipo_ajuste: "SEM_AJUSTE",
    valor_ajuste: "",
  });

  const clientesFiltrados = useMemo(() => {
    const termo = search.trim().toLowerCase();
    if (!termo) return clientes;
    return clientes.filter((cliente) => {
      const nome = (cliente.nome || "").toLowerCase();
      const documento = (cliente.cpf_cnpj || "").toLowerCase();
      const telefone = (cliente.telefone || "").toLowerCase();
      return (
        nome.includes(termo) ||
        documento.includes(termo) ||
        telefone.includes(termo)
      );
    });
  }, [clientes, search]);

  const selectedCliente = useMemo(
    () => clientes.find((cliente) => cliente.id === drawer.clienteId) || null,
    [clientes, drawer.clienteId],
  );

  const selectedClienteVendas = useMemo(() => {
    if (!selectedCliente) return [];
    return vendas
      .filter((venda) => venda.cliente_id === selectedCliente.id)
      .sort((a, b) => new Date(b.data_venda) - new Date(a.data_venda));
  }, [selectedCliente, vendas]);

  const contasByVendaId = useMemo(() => {
    const mapa = {};
    contasReceber.forEach((conta) => {
      if (conta.origem_tipo === "venda") {
        mapa[conta.origem_id] = conta;
      }
    });
    return mapa;
  }, [contasReceber]);

  const parcelasDrawer = useMemo(() => {
    if (!selectedCliente) return [];
    return selectedClienteVendas.flatMap((venda) => {
      const conta = contasByVendaId[venda.id];
      if (!conta) return [];
      return parcelas
        .filter((parcela) => parcela.conta_receber_id === conta.id)
        .map((parcela) => ({ ...parcela, venda }))
        .sort((a, b) => a.parcela_num - b.parcela_num);
    });
  }, [selectedCliente, selectedClienteVendas, contasByVendaId, parcelas]);

  const historicoDrawer = useMemo(() => {
    if (!selectedCliente) return [];
    return selectedClienteVendas.flatMap((venda) => {
      const movimentos = vendaDetalhes
        .filter((detalhe) => detalhe.venda_id === venda.id)
        .sort((a, b) => new Date(b.data_evento) - new Date(a.data_evento));
      return movimentos.map((movimento) => ({ ...movimento, venda }));
    });
  }, [selectedCliente, selectedClienteVendas, vendaDetalhes]);

  const handleOpenDrawer = (type, cliente) => {
    setDrawer({ type, clienteId: cliente.id });
    setClienteForm({
      id: cliente.id,
      nome: cliente.nome || "",
      cpf_cnpj: cliente.cpf_cnpj || "",
      telefone: cliente.telefone || "",
      endereco: cliente.endereco || "",
    });
  };

  const handleConfirmRecebimento = async () => {
    await marcarParcelaRecebida({
      id: confirmModal.parcelaId,
      venda_id: confirmModal.vendaId,
      forma_recebimento: confirmModal.forma_recebimento,
      tipo_ajuste: confirmModal.tipo_ajuste,
      valor_ajuste: confirmModal.valor_ajuste,
    });
    setConfirmModal({
      open: false,
      parcelaId: "",
      vendaId: "",
      forma_recebimento: "Pix",
      tipo_ajuste: "SEM_AJUSTE",
      valor_ajuste: "",
    });
  };

  return (
    <AppLayout>
      <PageHeader
        title="Detalhe do Cliente"
        subtitle="Tabela de clientes com ações para cadastro, histórico e parcelas."
      />

      <Paper sx={{ p: 3 }}>
        <Stack spacing={2}>
          <TextField
            label="Buscar cliente"
            placeholder="Digite nome, CPF/CNPJ ou telefone"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            fullWidth
          />

          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Cliente</TableCell>
                  <TableCell>CPF/CNPJ</TableCell>
                  <TableCell>Telefone</TableCell>
                  <TableCell align="right">Ações</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {clientesFiltrados.map((cliente) => (
                  <TableRow key={cliente.id} hover>
                    <TableCell>{cliente.nome}</TableCell>
                    <TableCell>{cliente.cpf_cnpj || "-"}</TableCell>
                    <TableCell>{cliente.telefone || "-"}</TableCell>
                    <TableCell align="right">
                      <Stack
                        direction="row"
                        spacing={1}
                        justifyContent="flex-end"
                      >
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => handleOpenDrawer("cadastro", cliente)}
                        >
                          Editar dados cadastrais
                        </Button>
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => handleOpenDrawer("historico", cliente)}
                        >
                          Histórico de compras
                        </Button>
                        <Button
                          size="small"
                          variant="contained"
                          onClick={() => handleOpenDrawer("parcelas", cliente)}
                        >
                          Parcelas
                        </Button>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {!clientesFiltrados.length ? (
            <Alert severity="info">
              Nenhum cliente encontrado para o filtro informado.
            </Alert>
          ) : null}
        </Stack>
      </Paper>

      <Drawer
        anchor="right"
        open={Boolean(drawer.type)}
        onClose={() => setDrawer({ type: null, clienteId: null })}
        PaperProps={{ sx: drawerPaperSx }}
      >
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          mb={2}
        >
          <Typography variant="h6">
            {drawer.type === "cadastro" ? "Editar dados cadastrais" : null}
            {drawer.type === "historico" ? "Histórico de compras" : null}
            {drawer.type === "parcelas" ? "Parcelas do cliente" : null}
          </Typography>
          <IconButton
            onClick={() => setDrawer({ type: null, clienteId: null })}
          >
            <Close />
          </IconButton>
        </Stack>

        {drawer.type === "cadastro" ? (
          <Stack spacing={2}>
            <TextField
              label="Nome"
              value={clienteForm.nome}
              onChange={(event) =>
                setClienteForm((prev) => ({
                  ...prev,
                  nome: event.target.value,
                }))
              }
            />
            <TextField
              label="CPF/CNPJ"
              value={clienteForm.cpf_cnpj}
              onChange={(event) =>
                setClienteForm((prev) => ({
                  ...prev,
                  cpf_cnpj: event.target.value,
                }))
              }
            />
            <TextField
              label="Telefone"
              value={clienteForm.telefone}
              onChange={(event) =>
                setClienteForm((prev) => ({
                  ...prev,
                  telefone: event.target.value,
                }))
              }
            />
            <TextField
              label="Endereço"
              value={clienteForm.endereco}
              onChange={(event) =>
                setClienteForm((prev) => ({
                  ...prev,
                  endereco: event.target.value,
                }))
              }
            />
            <Button
              variant="contained"
              onClick={async () => {
                await updateCliente(clienteForm);
                setDrawer({ type: null, clienteId: null });
              }}
            >
              Salvar dados
            </Button>
          </Stack>
        ) : null}

        {drawer.type === "historico" ? (
          <Stack spacing={2}>
            {selectedClienteVendas.map((venda) => (
              <Paper key={venda.id} variant="outlined" sx={{ p: 2 }}>
                <Typography fontWeight={600}>
                  Venda #{venda.id.slice(0, 8)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {formatDate(venda.data_venda)} •{" "}
                  {formatCurrency(venda.valor_total)}
                </Typography>
              </Paper>
            ))}

            {historicoDrawer.map((evento) => (
              <Paper key={evento.id} variant="outlined" sx={{ p: 2 }}>
                <Typography fontWeight={600}>
                  Ajuste: {evento.tipo_evento}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Venda #{evento.venda.id.slice(0, 8)} •{" "}
                  {formatDate(evento.data_evento)} •{" "}
                  {formatCurrency(evento.valor)}
                </Typography>
                <Typography variant="body2">{evento.descricao}</Typography>
              </Paper>
            ))}

            {!selectedClienteVendas.length ? (
              <Alert severity="info">
                Este cliente ainda não possui compras registradas.
              </Alert>
            ) : null}
          </Stack>
        ) : null}

        {drawer.type === "parcelas" ? (
          <Stack spacing={2}>
            {parcelasDrawer.map((parcela) => {
              const recebida = parcela.status === "RECEBIDA";
              return (
                <Paper key={parcela.id} variant="outlined" sx={{ p: 2 }}>
                  <Stack
                    direction="row"
                    justifyContent="space-between"
                    alignItems="center"
                  >
                    <Typography fontWeight={600}>
                      Venda #{parcela.venda.id.slice(0, 8)} • Parcela{" "}
                      {parcela.parcela_num}
                    </Typography>
                    <Chip
                      label={parcela.status}
                      color={recebida ? "success" : "warning"}
                      size="small"
                    />
                  </Stack>
                  <Typography variant="body2" color="text.secondary" mt={0.5}>
                    Vencimento: {formatDate(parcela.vencimento)} • Valor:{" "}
                    {formatCurrency(parcela.valor)}
                  </Typography>
                  {!recebida ? (
                    <Button
                      sx={{ mt: 1 }}
                      size="small"
                      variant="contained"
                      onClick={() =>
                        setConfirmModal({
                          open: true,
                          parcelaId: parcela.id,
                          vendaId: parcela.venda.id,
                          forma_recebimento: "Pix",
                          tipo_ajuste: "SEM_AJUSTE",
                          valor_ajuste: "",
                        })
                      }
                    >
                      Confirmar pagamento
                    </Button>
                  ) : null}
                </Paper>
              );
            })}

            {!parcelasDrawer.length ? (
              <Alert severity="info">
                Nenhuma parcela encontrada para este cliente.
              </Alert>
            ) : null}
          </Stack>
        ) : null}
      </Drawer>

      <Dialog
        open={confirmModal.open}
        onClose={() => setConfirmModal((prev) => ({ ...prev, open: false }))}
      >
        <DialogTitle>Confirmar recebimento da parcela</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            <TextField
              select
              label="Forma de recebimento"
              value={confirmModal.forma_recebimento}
              onChange={(event) =>
                setConfirmModal((prev) => ({
                  ...prev,
                  forma_recebimento: event.target.value,
                }))
              }
            >
              <MenuItem value="Pix">Pix</MenuItem>
              <MenuItem value="Dinheiro">Dinheiro</MenuItem>
              <MenuItem value="Transferência">Transferência</MenuItem>
              <MenuItem value="Boleto">Boleto</MenuItem>
            </TextField>
            <TextField
              select
              label="Ajuste"
              value={confirmModal.tipo_ajuste}
              onChange={(event) =>
                setConfirmModal((prev) => ({
                  ...prev,
                  tipo_ajuste: event.target.value,
                }))
              }
            >
              <MenuItem value="SEM_AJUSTE">Sem ajuste</MenuItem>
              <MenuItem value="DESCONTO">Desconto</MenuItem>
              <MenuItem value="JUROS">Juros</MenuItem>
            </TextField>
            <TextField
              label="Valor do ajuste"
              type="number"
              value={confirmModal.valor_ajuste}
              onChange={(event) =>
                setConfirmModal((prev) => ({
                  ...prev,
                  valor_ajuste: event.target.value,
                }))
              }
              disabled={confirmModal.tipo_ajuste === "SEM_AJUSTE"}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() =>
              setConfirmModal((prev) => ({ ...prev, open: false }))
            }
          >
            Cancelar
          </Button>
          <Button variant="contained" onClick={handleConfirmRecebimento}>
            Confirmar
          </Button>
        </DialogActions>
      </Dialog>
    </AppLayout>
  );
};

export default DetalheClientePage;
