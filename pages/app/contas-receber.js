import {
  Box,
  Button,
  Checkbox,
  Drawer,
  FormControlLabel,
  Grid,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useMemo, useState } from "react";
import AppLayout from "../../components/template/AppLayout";
import PageHeader from "../../components/atomic/PageHeader";
import { useDataStore } from "../../hooks/useDataStore";
import { formatCurrency, formatDate } from "../../utils/format";

const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const ContasReceberPage = () => {
  const contas = useDataStore((state) => state.contasReceber);
  const parcelas = useDataStore((state) => state.contasReceberParcelas);
  const clientes = useDataStore((state) => state.clientes);
  const fornecedores = useDataStore((state) => state.fornecedores);
  const auxFormasPagamento = useDataStore((state) => state.auxFormasPagamento);
  const marcarParcelaRecebida = useDataStore((state) => state.marcarParcelaRecebida);

  const [selecionadas, setSelecionadas] = useState([]);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const [formaRecebimento, setFormaRecebimento] = useState("PIX");
  const [formaRecebimentoReal, setFormaRecebimentoReal] = useState("PIX");
  const [valorRecebido, setValorRecebido] = useState("");
  const [motivoDiferenca, setMotivoDiferenca] = useState("");
  const [acaoDiferenca, setAcaoDiferenca] = useState("ACEITAR_ENCERRAR");
  const [origemRecebimento, setOrigemRecebimento] = useState("NORMAL");
  const [fornecedorDestinoId, setFornecedorDestinoId] = useState("");
  const [comprovanteUrl, setComprovanteUrl] = useState("");
  const [observacao, setObservacao] = useState("");

  const parcelasAbertas = useMemo(
    () => parcelas.filter((parcela) => parcela.status === "ABERTA"),
    [parcelas],
  );

  const formasPagamento = useMemo(
    () =>
      auxFormasPagamento.length
        ? auxFormasPagamento
        : [
          { codigo: "CHEQUE", label: "Cheque" },
          { codigo: "TRANSFERENCIA", label: "Transferência" },
          { codigo: "DINHEIRO", label: "Dinheiro" },
          { codigo: "PIX", label: "Pix" },
          { codigo: "CREDITO", label: "Crédito" },
          { codigo: "DEBITO", label: "Débito" },
        ],
    [auxFormasPagamento],
  );

  const totalSelecionado = useMemo(
    () =>
      selecionadas.reduce((acc, id) => {
        const parcela = parcelasAbertas.find((item) => item.id === id);
        return acc + toNumber(parcela?.valor_programado || parcela?.valor);
      }, 0),
    [selecionadas, parcelasAbertas],
  );

  const toggleSelecionada = (id) => {
    setSelecionadas((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const abrirConfirmacao = () => {
    if (!selecionadas.length) return;
    setDrawerOpen(true);
  };

  const confirmarRecebimento = async () => {
    if (!selecionadas.length) return;

    const valorRecebidoNormalizado =
      valorRecebido === "" ? null : Math.max(0, toNumber(valorRecebido));

    const parcelaReferencia = parcelasAbertas.find((parcela) => parcela.id === selecionadas[0]);
    const valorProgramadoRef = toNumber(
      parcelaReferencia?.valor_programado || parcelaReferencia?.valor,
    );
    const valorComparacao =
      valorRecebidoNormalizado === null ? valorProgramadoRef : valorRecebidoNormalizado;

    if (valorComparacao < valorProgramadoRef && !motivoDiferenca.trim()) {
      return;
    }

    await marcarParcelaRecebida({
      ids: selecionadas,
      forma_recebimento: formaRecebimento,
      forma_recebimento_real: formaRecebimentoReal,
      valor_recebido: valorRecebidoNormalizado,
      motivo_diferenca: motivoDiferenca,
      acao_diferenca: acaoDiferenca,
      origem_recebimento: origemRecebimento,
      fornecedor_destino_id:
        origemRecebimento === "DIRETO_FORNECEDOR" ? fornecedorDestinoId : null,
      comprovante_url: comprovanteUrl || null,
      observacao_recebimento: observacao,
    });

    setSelecionadas([]);
    setDrawerOpen(false);
    setFormaRecebimento("PIX");
    setFormaRecebimentoReal("PIX");
    setValorRecebido("");
    setMotivoDiferenca("");
    setAcaoDiferenca("ACEITAR_ENCERRAR");
    setOrigemRecebimento("NORMAL");
    setFornecedorDestinoId("");
    setComprovanteUrl("");
    setObservacao("");
  };

  return (
    <AppLayout>
      <PageHeader
        title="Contas a Receber"
        subtitle="Confirme recebimentos com ajuste de valor, método e recebimento especial."
      />

      <Grid container spacing={3}>
        <Grid item xs={12} md={5}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Faturas em aberto
            </Typography>
            <Stack spacing={2}>
              {contas
                .filter((conta) =>
                  parcelasAbertas.some((parcela) => parcela.conta_receber_id === conta.id),
                )
                .map((conta) => (
                  <Paper key={conta.id} variant="outlined" sx={{ p: 2 }}>
                    <Typography fontWeight={600}>Fatura #{conta.id.slice(0, 8)}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Cliente: {clientes.find((item) => item.id === conta.cliente_id)?.nome || "-"}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Valor: {formatCurrency(conta.valor_total)} • Emissão: {formatDate(conta.data_emissao)}
                    </Typography>
                  </Paper>
                ))}

              {!contas.length ? (
                <Typography variant="body2" color="text.secondary">
                  Nenhuma conta a receber registrada.
                </Typography>
              ) : null}
            </Stack>
          </Paper>
        </Grid>

        <Grid item xs={12} md={7}>
          <Paper sx={{ p: 3 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6">Parcelas abertas</Typography>
              <Button
                variant="contained"
                disabled={!selecionadas.length}
                onClick={abrirConfirmacao}
              >
                Confirmar recebimento ({selecionadas.length})
              </Button>
            </Stack>

            <Stack spacing={1.5}>
              {parcelasAbertas.map((parcela) => (
                <Paper key={parcela.id} variant="outlined" sx={{ p: 2 }}>
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <Checkbox
                      checked={selecionadas.includes(parcela.id)}
                      onChange={() => toggleSelecionada(parcela.id)}
                    />
                    <Box sx={{ flex: 1 }}>
                      <Typography fontWeight={600}>
                        Parcela #{parcela.parcela_num}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Vencimento: {formatDate(parcela.vencimento)}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Programado: {formatCurrency(parcela.valor_programado || parcela.valor)}
                      </Typography>
                    </Box>
                  </Stack>
                </Paper>
              ))}

              {!parcelasAbertas.length ? (
                <Typography variant="body2" color="text.secondary">
                  Não há parcelas em aberto.
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
        PaperProps={{ sx: { width: { xs: "100%", md: "46%" }, p: 3 } }}
      >
        <Typography variant="h6" fontWeight={700} gutterBottom>
          Confirmação de recebimento
        </Typography>
        <Stack spacing={2}>
          <Typography variant="body2" color="text.secondary">
            Parcelas selecionadas: {selecionadas.length}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Valor programado total: {formatCurrency(totalSelecionado)}
          </Typography>

          <TextField
            select
            label="Forma programada/recebida"
            value={formaRecebimento}
            onChange={(event) => setFormaRecebimento(event.target.value)}
          >
            {formasPagamento.map((forma) => (
              <MenuItem key={forma.codigo} value={forma.codigo}>
                {forma.label}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            select
            label="Forma real recebida"
            value={formaRecebimentoReal}
            onChange={(event) => setFormaRecebimentoReal(event.target.value)}
          >
            {formasPagamento.map((forma) => (
              <MenuItem key={forma.codigo} value={forma.codigo}>
                {forma.label}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            label="Valor recebido (deixe vazio para valor integral)"
            type="number"
            value={valorRecebido}
            onChange={(event) => setValorRecebido(event.target.value)}
          />

          <TextField
            select
            label="Origem do recebimento"
            value={origemRecebimento}
            onChange={(event) => setOrigemRecebimento(event.target.value)}
          >
            <MenuItem value="NORMAL">Pagamento direto do cliente</MenuItem>
            <MenuItem value="DIRETO_FORNECEDOR">Cliente pagou direto ao fornecedor</MenuItem>
          </TextField>

          {origemRecebimento === "DIRETO_FORNECEDOR" ? (
            <TextField
              select
              label="Fornecedor que recebeu"
              value={fornecedorDestinoId}
              onChange={(event) => setFornecedorDestinoId(event.target.value)}
            >
              {fornecedores.map((fornecedor) => (
                <MenuItem key={fornecedor.id} value={fornecedor.id}>
                  {fornecedor.razao_social}
                </MenuItem>
              ))}
            </TextField>
          ) : null}

          <TextField
            label="Comprovante (URL no blob storage)"
            value={comprovanteUrl}
            onChange={(event) => setComprovanteUrl(event.target.value)}
          />

          <TextField
            label="Motivo da diferença (obrigatório se receber menor)"
            value={motivoDiferenca}
            onChange={(event) => setMotivoDiferenca(event.target.value)}
            multiline
            rows={2}
          />

          <TextField
            select
            label="Ação para diferença"
            value={acaoDiferenca}
            onChange={(event) => setAcaoDiferenca(event.target.value)}
          >
            <MenuItem value="JOGAR_PROXIMA">Jogar diferença para próxima cobrança</MenuItem>
            <MenuItem value="ACEITAR_ENCERRAR">Aceitar diferença e encerrar cobrança</MenuItem>
          </TextField>

          <FormControlLabel
            control={<Checkbox checked={Boolean(observacao)} onChange={(e) => setObservacao(e.target.checked ? "Recebimento confirmado" : "")} />}
            label="Adicionar observação padrão"
          />
          <TextField
            label="Observações"
            value={observacao}
            onChange={(event) => setObservacao(event.target.value)}
            multiline
            rows={2}
          />

          <Stack direction="row" spacing={1} justifyContent="flex-end">
            <Button variant="outlined" onClick={() => setDrawerOpen(false)}>
              Cancelar
            </Button>
            <Button variant="contained" onClick={confirmarRecebimento}>
              Confirmar
            </Button>
          </Stack>
        </Stack>
      </Drawer>
    </AppLayout>
  );
};

export default ContasReceberPage;
