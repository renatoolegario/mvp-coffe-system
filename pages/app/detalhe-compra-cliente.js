import {
  Alert,
  Button,
  Chip,
  Divider,
  Grid,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { ArrowBackRounded } from "@mui/icons-material";
import { useMemo } from "react";
import { useRouter } from "next/router";
import AppLayout from "../../components/template/AppLayout";
import PageHeader from "../../components/atomic/PageHeader";
import { useDataStore } from "../../hooks/useDataStore";
import { formatCurrency, formatDate } from "../../utils/format";

const toNumber = (value) => Number(value) || 0;

const DetalheCompraClientePage = () => {
  const router = useRouter();
  const hydrated = useDataStore((state) => state.hydrated);
  const clientes = useDataStore((state) => state.clientes);
  const vendas = useDataStore((state) => state.vendas);
  const vendaItens = useDataStore((state) => state.vendaItens || []);
  const contasReceber = useDataStore((state) => state.contasReceber || []);
  const contasReceberParcelas = useDataStore(
    (state) => state.contasReceberParcelas || [],
  );
  const vendaDetalhes = useDataStore((state) => state.vendaDetalhes || []);
  const insumos = useDataStore((state) => state.insumos || []);
  const auxUnidades = useDataStore((state) => state.auxUnidades || []);

  const vendaId =
    typeof router.query.venda_id === "string" ? router.query.venda_id : "";
  const clienteId =
    typeof router.query.cliente_id === "string" ? router.query.cliente_id : "";

  const venda = useMemo(
    () => vendas.find((item) => item.id === vendaId) || null,
    [vendaId, vendas],
  );

  const cliente = useMemo(() => {
    const resolvedClienteId = venda?.cliente_id || clienteId;
    return clientes.find((item) => item.id === resolvedClienteId) || null;
  }, [clientes, clienteId, venda?.cliente_id]);

  const insumosById = useMemo(
    () => new Map(insumos.map((item) => [item.id, item])),
    [insumos],
  );

  const unidadesById = useMemo(
    () => new Map(auxUnidades.map((item) => [String(item.id), item])),
    [auxUnidades],
  );

  const itensVenda = useMemo(() => {
    if (!vendaId) return [];

    return vendaItens
      .filter((item) => item.venda_id === vendaId)
      .map((item) => {
        const insumo = insumosById.get(item.insumo_id);
        const unidade = unidadesById.get(String(item.unidade_id));
        const quantidadeInformada = toNumber(
          item.quantidade_informada ?? item.quantidade_kg,
        );
        const precoUnitario = toNumber(item.preco_unitario);

        return {
          ...item,
          nome: insumo?.nome || "Produto removido",
          unidadeLabel:
            unidade?.label || (toNumber(item.kg_por_saco) > 0 ? "Saco" : "Quilograma"),
          quantidadeInformada,
          quantidadeKg: toNumber(item.quantidade_kg),
          precoUnitario,
          valorTotal: toNumber(item.valor_total) || quantidadeInformada * precoUnitario,
        };
      });
  }, [insumosById, unidadesById, vendaId, vendaItens]);

  const contaReceber = useMemo(
    () =>
      contasReceber.find(
        (item) => item.origem_tipo === "venda" && item.origem_id === vendaId,
      ) || null,
    [contasReceber, vendaId],
  );

  const parcelasVenda = useMemo(() => {
    if (!contaReceber?.id) return [];

    return contasReceberParcelas
      .filter((item) => item.conta_receber_id === contaReceber.id)
      .sort((a, b) => {
        const numeroA = Number(a.parcela_num) || 0;
        const numeroB = Number(b.parcela_num) || 0;
        if (numeroA !== numeroB) return numeroA - numeroB;
        return String(a.vencimento || "").localeCompare(String(b.vencimento || ""));
      });
  }, [contaReceber?.id, contasReceberParcelas]);

  const eventosVenda = useMemo(() => {
    if (!venda) return [];

    const ajustes = [
      ...(toNumber(venda.desconto_valor) > 0
        ? [
            {
              id: `desconto-${venda.id}`,
              tipo_evento: "DESCONTO",
              descricao: venda.desconto_descricao || venda.desconto_tipo || "Desconto aplicado",
              valor: toNumber(venda.desconto_valor) * -1,
              data_evento: venda.data_venda,
            },
          ]
        : []),
      ...(toNumber(venda.acrescimo_valor) > 0
        ? [
            {
              id: `acrescimo-${venda.id}`,
              tipo_evento: "ACRESCIMO",
              descricao:
                venda.acrescimo_descricao || venda.acrescimo_tipo || "Valor adicional",
              valor: toNumber(venda.acrescimo_valor),
              data_evento: venda.data_venda,
            },
          ]
        : []),
      ...vendaDetalhes
        .filter((item) => item.venda_id === venda.id)
        .map((item) => ({
          ...item,
          valor: toNumber(item.valor),
        })),
    ];

    return ajustes.sort(
      (a, b) => new Date(b.data_evento || 0).getTime() - new Date(a.data_evento || 0).getTime(),
    );
  }, [venda, vendaDetalhes]);

  const totalRecebido = useMemo(
    () =>
      parcelasVenda.reduce((total, parcela) => {
        return total + toNumber(parcela.valor_recebido || parcela.valor_programado || 0);
      }, 0),
    [parcelasVenda],
  );

  const subtotalItens = useMemo(
    () => itensVenda.reduce((total, item) => total + item.valorTotal, 0),
    [itensVenda],
  );

  const handleVoltar = () => {
    router.push({
      pathname: "/app/detalhe-cliente",
      query: cliente?.id
        ? {
            cliente_id: cliente.id,
            drawer: "historico",
          }
        : undefined,
    });
  };

  return (
    <AppLayout>
      <PageHeader
        title="Detalhe da Compra"
        subtitle="Visão completa da venda, itens, parcelas e histórico financeiro vinculados ao cliente."
        action={
          <Button
            variant="outlined"
            startIcon={<ArrowBackRounded />}
            onClick={handleVoltar}
          >
            Voltar ao histórico
          </Button>
        }
      />

      {!hydrated ? (
        <Alert severity="info">Carregando dados da compra...</Alert>
      ) : null}

      {hydrated && !venda ? (
        <Alert severity="warning">
          Não foi possível localizar a compra solicitada.
        </Alert>
      ) : null}

      {venda ? (
        <Stack spacing={3}>
          <Paper sx={{ p: 3 }}>
            <Stack spacing={2}>
              <Stack
                direction={{ xs: "column", sm: "row" }}
                justifyContent="space-between"
                alignItems={{ xs: "flex-start", sm: "center" }}
                spacing={1}
              >
                <Typography variant="h6" fontWeight={700}>
                  Venda #{String(venda.id || "").slice(0, 8).toUpperCase()}
                </Typography>
                <Chip
                  label={venda.status_entrega || "PENDENTE"}
                  color={venda.status_entrega === "ENTREGUE" ? "success" : "warning"}
                />
              </Stack>

              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="text.secondary">
                    Cliente
                  </Typography>
                  <Typography fontWeight={600}>{cliente?.nome || "-"}</Typography>
                </Grid>
                <Grid item xs={12} md={3}>
                  <Typography variant="body2" color="text.secondary">
                    Data da venda
                  </Typography>
                  <Typography fontWeight={600}>{formatDate(venda.data_venda)}</Typography>
                </Grid>
                <Grid item xs={12} md={3}>
                  <Typography variant="body2" color="text.secondary">
                    Valor total
                  </Typography>
                  <Typography fontWeight={600}>
                    {formatCurrency(venda.valor_total)}
                  </Typography>
                </Grid>
                <Grid item xs={12} md={3}>
                  <Typography variant="body2" color="text.secondary">
                    Tipo de pagamento
                  </Typography>
                  <Typography fontWeight={600}>{venda.tipo_pagamento || "-"}</Typography>
                </Grid>
                <Grid item xs={12} md={3}>
                  <Typography variant="body2" color="text.secondary">
                    Forma de pagamento
                  </Typography>
                  <Typography fontWeight={600}>{venda.forma_pagamento || "-"}</Typography>
                </Grid>
                <Grid item xs={12} md={3}>
                  <Typography variant="body2" color="text.secondary">
                    Data programada
                  </Typography>
                  <Typography fontWeight={600}>
                    {formatDate(venda.data_programada_entrega)}
                  </Typography>
                </Grid>
                <Grid item xs={12} md={3}>
                  <Typography variant="body2" color="text.secondary">
                    Data de entrega
                  </Typography>
                  <Typography fontWeight={600}>{formatDate(venda.data_entrega)}</Typography>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Typography variant="body2" color="text.secondary">
                    Subtotal dos itens
                  </Typography>
                  <Typography fontWeight={600}>
                    {formatCurrency(subtotalItens)}
                  </Typography>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Typography variant="body2" color="text.secondary">
                    Desconto
                  </Typography>
                  <Typography fontWeight={600}>
                    {formatCurrency(venda.desconto_valor)}
                  </Typography>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Typography variant="body2" color="text.secondary">
                    Acréscimo
                  </Typography>
                  <Typography fontWeight={600}>
                    {formatCurrency(venda.acrescimo_valor)}
                  </Typography>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Typography variant="body2" color="text.secondary">
                    Conta a receber
                  </Typography>
                  <Typography fontWeight={600}>
                    {contaReceber?.id ? String(contaReceber.id).slice(0, 8) : "-"}
                  </Typography>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Typography variant="body2" color="text.secondary">
                    Parcelas
                  </Typography>
                  <Typography fontWeight={600}>
                    {Number(venda.parcelas_qtd) || parcelasVenda.length || 0}
                  </Typography>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Typography variant="body2" color="text.secondary">
                    Total recebido
                  </Typography>
                  <Typography fontWeight={600}>
                    {formatCurrency(totalRecebido)}
                  </Typography>
                </Grid>
              </Grid>

              {venda.obs ? (
                <>
                  <Divider />
                  <div>
                    <Typography variant="body2" color="text.secondary">
                      Observações
                    </Typography>
                    <Typography>{venda.obs}</Typography>
                  </div>
                </>
              ) : null}
            </Stack>
          </Paper>

          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Itens da venda
            </Typography>
            {itensVenda.length ? (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Produto</TableCell>
                      <TableCell>Quantidade</TableCell>
                      <TableCell>Quantidade kg</TableCell>
                      <TableCell>Preço unitário</TableCell>
                      <TableCell>Valor total</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {itensVenda.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>{item.nome}</TableCell>
                        <TableCell>
                          {item.quantidadeInformada} {item.unidadeLabel}
                        </TableCell>
                        <TableCell>{item.quantidadeKg}</TableCell>
                        <TableCell>{formatCurrency(item.precoUnitario)}</TableCell>
                        <TableCell>{formatCurrency(item.valorTotal)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <Alert severity="info">Nenhum item encontrado para esta compra.</Alert>
            )}
          </Paper>

          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Parcelas e recebimentos
            </Typography>
            {parcelasVenda.length ? (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Parcela</TableCell>
                      <TableCell>Vencimento</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Valor programado</TableCell>
                      <TableCell>Valor recebido</TableCell>
                      <TableCell>Forma real</TableCell>
                      <TableCell>Data recebimento</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {parcelasVenda.map((parcela) => (
                      <TableRow key={parcela.id}>
                        <TableCell>{parcela.parcela_num}</TableCell>
                        <TableCell>{formatDate(parcela.vencimento)}</TableCell>
                        <TableCell>{parcela.status || "-"}</TableCell>
                        <TableCell>
                          {formatCurrency(parcela.valor_programado ?? parcela.valor)}
                        </TableCell>
                        <TableCell>{formatCurrency(parcela.valor_recebido)}</TableCell>
                        <TableCell>
                          {parcela.forma_recebimento_real ||
                            parcela.forma_recebimento ||
                            "-"}
                        </TableCell>
                        <TableCell>{formatDate(parcela.data_recebimento)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <Alert severity="info">Nenhuma parcela encontrada para esta compra.</Alert>
            )}
          </Paper>

          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Histórico da compra
            </Typography>
            <Stack spacing={1.5}>
              {eventosVenda.map((evento) => (
                <Paper key={evento.id} variant="outlined" sx={{ p: 2 }}>
                  <Stack spacing={0.5}>
                    <Typography fontWeight={600}>
                      {evento.tipo_evento || "Evento"}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {formatDate(evento.data_evento)} • {formatCurrency(evento.valor)}
                    </Typography>
                    <Typography variant="body2">
                      {evento.descricao || "Sem descrição"}
                    </Typography>
                  </Stack>
                </Paper>
              ))}

              {!eventosVenda.length ? (
                <Alert severity="info">
                  Nenhum evento complementar foi registrado para esta compra.
                </Alert>
              ) : null}
            </Stack>
          </Paper>
        </Stack>
      ) : null}
    </AppLayout>
  );
};

export default DetalheCompraClientePage;
