const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const formatCurrency = (value) => currencyFormatter.format(Number(value) || 0);

const formatDate = (value) => {
  if (!value) return "-";
  const normalized = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    const [year, month, day] = normalized.split("-");
    return `${day}/${month}/${year}`;
  }
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("pt-BR");
};

const escapeHtml = (value) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const buildTableRows = (items = [], columns = []) =>
  items
    .map(
      (item) => `
        <tr>
          ${columns
            .map(
              (column) =>
                `<td style="padding:10px;border:1px solid #d6d6d6;font-size:13px;color:#222;">${escapeHtml(
                  column.render(item),
                )}</td>`,
            )
            .join("")}
        </tr>
      `,
    )
    .join("");

const buildEmailLayout = ({
  title,
  subtitle,
  summary,
  dateLabel,
  columns,
  items,
}) => `
  <!doctype html>
  <html lang="pt-BR">
    <body style="margin:0;padding:24px;background:#f5f1ea;font-family:Arial,sans-serif;color:#2d241c;">
      <div style="max-width:880px;margin:0 auto;background:#ffffff;border-radius:18px;overflow:hidden;border:1px solid #e4ddd2;">
        <div style="padding:28px 28px 18px;background:linear-gradient(135deg,#5b3f28 0%,#2f5a46 100%);color:#fff;">
          <div style="font-size:12px;letter-spacing:.12em;text-transform:uppercase;opacity:.85;">MVP Coffee</div>
          <h1 style="margin:10px 0 8px;font-size:28px;line-height:1.1;">${escapeHtml(
            title,
          )}</h1>
          <p style="margin:0;font-size:14px;line-height:1.5;opacity:.92;">${escapeHtml(
            subtitle,
          )}</p>
        </div>

        <div style="padding:24px 28px;">
          <div style="display:flex;gap:16px;flex-wrap:wrap;margin-bottom:20px;">
            <div style="flex:1 1 220px;padding:14px 16px;border-radius:14px;background:#f8f5ef;border:1px solid #ece3d6;">
              <div style="font-size:12px;text-transform:uppercase;color:#7d6b57;margin-bottom:6px;">Data de referência</div>
              <div style="font-size:18px;font-weight:700;">${escapeHtml(
                dateLabel,
              )}</div>
            </div>
            <div style="flex:2 1 320px;padding:14px 16px;border-radius:14px;background:#f8f5ef;border:1px solid #ece3d6;">
              <div style="font-size:12px;text-transform:uppercase;color:#7d6b57;margin-bottom:6px;">Resumo</div>
              <div style="font-size:14px;line-height:1.6;">${summary}</div>
            </div>
          </div>

          <table style="width:100%;border-collapse:collapse;">
            <thead>
              <tr>
                ${columns
                  .map(
                    (column) =>
                      `<th style="text-align:left;padding:10px;border:1px solid #d6d6d6;background:#efe6d8;font-size:12px;text-transform:uppercase;color:#5d4b3d;">${escapeHtml(
                        column.label,
                      )}</th>`,
                  )
                  .join("")}
              </tr>
            </thead>
            <tbody>
              ${buildTableRows(items, columns)}
            </tbody>
          </table>
        </div>
      </div>
    </body>
  </html>
`;

export const buildContasReceberHojeTemplate = ({
  dateLabel,
  totalItens,
  totalValor,
  items,
}) =>
  buildEmailLayout({
    title: "Contas a Receber com vencimento hoje",
    subtitle:
      "Resumo diário das parcelas internas que vencem na data atual do sistema.",
    dateLabel,
    summary: `${totalItens} parcela(s) somando ${escapeHtml(
      formatCurrency(totalValor),
    )}.`,
    items,
    columns: [
      { label: "Cliente", render: (item) => item.cliente_nome || "-" },
      { label: "Conta", render: (item) => item.conta_id || "-" },
      { label: "Parcela", render: (item) => item.parcela_label || "-" },
      { label: "Vencimento", render: (item) => formatDate(item.vencimento) },
      { label: "Valor", render: (item) => formatCurrency(item.valor) },
      { label: "Origem", render: (item) => item.origem_label || "-" },
    ],
  });

export const buildCobrancasAsaasHojeTemplate = ({
  dateLabel,
  totalItens,
  totalValor,
  items,
}) =>
  buildEmailLayout({
    title: "Cobranças ASAAS com vencimento hoje",
    subtitle:
      "Resumo diário das cobranças externas em aberto controladas pela integração com o ASAAS.",
    dateLabel,
    summary: `${totalItens} cobrança(s) ativa(s) somando ${escapeHtml(
      formatCurrency(totalValor),
    )}.`,
    items,
    columns: [
      { label: "Cliente", render: (item) => item.cliente_nome || "-" },
      { label: "Cobrança", render: (item) => item.asaas_payment_id || "-" },
      { label: "Tipo", render: (item) => item.billing_type || "-" },
      { label: "Vencimento", render: (item) => formatDate(item.due_date) },
      { label: "Valor", render: (item) => formatCurrency(item.value) },
      { label: "Status", render: (item) => item.status || "-" },
    ],
  });

export const buildEntregasHojeTemplate = ({
  dateLabel,
  totalItens,
  totalValor,
  items,
}) =>
  buildEmailLayout({
    title: "Entregas programadas para hoje",
    subtitle:
      "Resumo diário das vendas ainda não entregues com data programada igual à data atual do sistema.",
    dateLabel,
    summary: `${totalItens} entrega(s) pendente(s) totalizando ${escapeHtml(
      formatCurrency(totalValor),
    )}.`,
    items,
    columns: [
      { label: "Cliente", render: (item) => item.cliente_nome || "-" },
      { label: "Venda", render: (item) => item.venda_id || "-" },
      { label: "Programada", render: (item) => formatDate(item.data_programada_entrega) },
      { label: "Valor", render: (item) => formatCurrency(item.valor_total) },
      {
        label: "Recebimento",
        render: (item) =>
          `${item.parcelas_recebidas || 0}/${item.parcelas_total || 0} recebida(s)`,
      },
      { label: "Status", render: (item) => item.status_entrega || "PENDENTE" },
    ],
  });
