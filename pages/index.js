import Head from "next/head";
import Link from "next/link";
import { useEffect } from "react";
import { normalizeImageBase64 } from "../utils/image";

const WHATSAPP_URL =
  "https://wa.me/5534992399036?text=Ol%C3%A1!%20Gostaria%20de%20fazer%20um%20pedido%20de%20caf%C3%A9.";
const LOCATION_LABEL = "R. Joao Luciano Barbosa, 100, Perdizes - MG, 38170-000";
const MAPS_PLACE_URL =
  "https://www.google.com/maps/place/R.+Jo%C3%A3o+Luciano+Barbosa,+100,+Perdizes+-+MG,+38170-000/data=!4m2!3m1!1s0x94affb33db336f71:0x1863f13762d79dae?sa=X&ved=1t:242&ictx=111";
const MAPS_EMBED_URL =
  "https://www.google.com/maps?q=R.+Jo%C3%A3o+Luciano+Barbosa,+100,+Perdizes+-+MG,+38170-000&output=embed";
const DEFAULT_HOME_PRODUCT_IMAGE = "/logotipo.jpg";
const PRICE_FORMATTER = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});
const resolveUnitPriceLabel = (unitCode, unitLabel) => {
  const normalized = String(unitCode || "").trim().toUpperCase();
  if (normalized === "KG") return "kg";
  if (normalized === "SACO") return "saco";
  return String(unitLabel || normalized || "").trim().toLowerCase();
};
const formatProductPrice = (value, unitCode, unitLabel) => {
  const formattedUnit = resolveUnitPriceLabel(unitCode, unitLabel);
  return `${PRICE_FORMATTER.format(Number(value) || 0)}/${formattedUnit}`;
};
const buildProductWhatsAppUrl = (productName) =>
  `https://wa.me/5534992399036?text=${encodeURIComponent(
    `Olá! Gostaria de pedir o produto ${productName}.`,
  )}`;

const features = [
  {
    id: "torra",
    titulo: "Torra fresca semanal",
    descricao: "Lotes planejados para manter aroma, corpo e consistência.",
  },
  {
    id: "rastreio",
    titulo: "Rastreabilidade por lote",
    descricao: "Controle da origem ao empacotamento para cada linha de café.",
  },
  {
    id: "logistica",
    titulo: "Logística para revenda",
    descricao: "Rotas recorrentes para cafeterias, mercados e distribuidores.",
  },
];

const roastSteps = [
  {
    titulo: "Seleção do lote",
    descricao:
      "Curadoria dos grãos com foco em origem, umidade e perfil sensorial.",
  },
  {
    titulo: "Curva de torra",
    descricao:
      "Controle de tempo e temperatura para destacar acidez, doçura e corpo.",
  },
  {
    titulo: "Descanso técnico",
    descricao:
      "Ponto ideal de descanso para estabilidade aromática após a torra.",
  },
  {
    titulo: "Empacotamento",
    descricao:
      "Envase por formato a granel, 23 kg e 5 kg pronto para distribuição.",
  },
];

const movingHighlights = [
  "Torra fresca toda semana",
  "Perfil sensorial consistente",
  "Entrega recorrente para revenda",
  "Rastreabilidade por lote",
  "Atendimento via WhatsApp",
  "Catalogo A, B e C",
];

const FeatureIcon = ({ id }) => {
  if (id === "torra") {
    return (
      <svg
        viewBox="0 0 24 24"
        className="h-5 w-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      >
        <path d="M6 12c0-3.2 2.8-5.5 6-5.5S18 8.8 18 12" />
        <path d="M5 13.5c0 3.3 3.2 6 7 6s7-2.7 7-6v-1.3c0-.7-.6-1.2-1.2-1.2H6.2c-.7 0-1.2.5-1.2 1.2v1.3Z" />
        <path d="M11 4.7c0 1.1-.8 1.7-1.4 2.2-.5.4-.8.7-.8 1.3" />
        <path d="M15 4.5c0 .9-.6 1.4-1.1 1.8-.4.3-.7.6-.7 1.1" />
      </svg>
    );
  }

  if (id === "rastreio") {
    return (
      <svg
        viewBox="0 0 24 24"
        className="h-5 w-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      >
        <path d="M3 7.5 12 3l9 4.5-9 4.5-9-4.5Z" />
        <path d="M3 12.5 12 17l9-4.5" />
        <path d="M3 17.5 12 22l9-4.5" />
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M2 12h11" />
      <path d="m9 5 7 7-7 7" />
      <rect x="14" y="6" width="8" height="5" rx="1" />
    </svg>
  );
};

const BadgeIcon = () => (
  <svg
    viewBox="0 0 24 24"
    className="h-4 w-4"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path d="m12 3 2.2 4.5L19 8.2l-3.5 3.4.8 4.9L12 14.2 7.7 16.5l.8-4.9L5 8.2l4.8-.7L12 3Z" />
  </svg>
);

const WhatsAppIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden>
    <path d="M19.1 4.9A9.9 9.9 0 0 0 12 2a10 10 0 0 0-8.8 14.8L2 22l5.4-1.4A10 10 0 1 0 19.1 4.9Zm-7.1 15a8.1 8.1 0 0 1-4.1-1.1l-.3-.2-3.2.8.9-3.1-.2-.3A8.1 8.1 0 1 1 12 19.9Zm4.5-6.1-.6-.3c-.3-.2-1.8-.9-2-.9s-.5-.1-.7.2-.8.9-1 1.1-.3.3-.6.1a6.6 6.6 0 0 1-2-1.2 7.3 7.3 0 0 1-1.4-1.8c-.2-.3 0-.5.2-.6l.4-.5c.1-.1.2-.3.3-.5l.1-.5-.8-2c-.2-.4-.4-.4-.6-.4h-.5a1 1 0 0 0-.8.4 3 3 0 0 0-.9 2.2c0 1.3.9 2.5 1 2.7.2.2 2 3 4.8 4.2a16.2 16.2 0 0 0 1.6.6c.6.2 1 .2 1.4.1.5-.1 1.8-.7 2.1-1.4s.3-1.2.2-1.3-.2-.2-.5-.4Z" />
  </svg>
);

const IndexPage = ({ products = [], homeProductsLoadError = false }) => {
  useEffect(() => {
    const root = document.documentElement;
    root.classList.add("motion-ready");

    const revealNodes = Array.from(document.querySelectorAll("[data-reveal]"));
    if (!revealNodes.length) {
      return () => root.classList.remove("motion-ready");
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("reveal-visible");
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.2, rootMargin: "0px 0px -8% 0px" },
    );

    revealNodes.forEach((node) => {
      const delay = node.getAttribute("data-reveal-delay");
      if (delay) {
        node.style.setProperty("--reveal-delay", `${delay}ms`);
      }
      observer.observe(node);
    });

    return () => {
      observer.disconnect();
      root.classList.remove("motion-ready");
    };
  }, []);

  return (
    <>
      <Head>
        <title>Café Essências do Brasil | Torra e vendas de café</title>
        <meta
          name="description"
          content="Landing page de torra e vendas de café com catálogo, WhatsApp e localização."
        />
      </Head>

      <main className="relative min-h-screen overflow-x-clip bg-brand-forest text-brand-text">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(circle at 10% 20%, rgba(242,183,5,0.22), transparent 36%), radial-gradient(circle at 85% 0%, rgba(63,169,245,0.15), transparent 30%), linear-gradient(180deg, #0F241F 0%, #0A1916 55%, #0F241F 100%)",
          }}
        />
        <div className="pointer-events-none absolute -left-24 top-8 h-56 w-56 rounded-full bg-brand-accent/25 blur-3xl animate-drift-slow" />
        <div className="pointer-events-none absolute right-4 top-36 h-72 w-72 rounded-full bg-[#3FA9F5]/12 blur-3xl animate-drift-reverse" />

        <div className="relative z-10 mx-auto w-full max-w-7xl px-4 pb-24 sm:px-6 lg:px-8">
          <header
            data-reveal
            className="reveal-fade flex items-center justify-between py-4 sm:py-6"
          >
            <div className="flex items-center gap-3">
              <img
                src="/logotipo.jpg"
                alt="Café Essências do Brasil"
                className="h-12 w-12 rounded-full border-2 border-brand-accent object-cover shadow-[0_10px_28px_rgba(0,0,0,0.38)]"
              />
              <div>
                <p className="text-base font-extrabold tracking-[0.03em]">
                  Café Essências do Brasil
                </p>
                <p className="text-xs text-brand-muted">
                  Torra e distribuição profissional
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <a
                href={WHATSAPP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="hidden items-center gap-2 rounded-xl border border-brand-accent/60 px-4 py-2 text-sm font-semibold text-brand-accent transition duration-300 hover:-translate-y-0.5 hover:bg-brand-accent hover:text-brand-panel sm:inline-flex"
              >
                <WhatsAppIcon />
                WhatsApp
              </a>
              <Link
                href="/login"
                className="rounded-xl bg-brand-accent px-4 py-2 text-sm font-bold text-brand-panel transition duration-300 hover:-translate-y-0.5 hover:bg-brand-accent-soft"
              >
                Acessar sistema
              </Link>
            </div>
          </header>

          <section className="grid items-center gap-8 py-6 md:grid-cols-[1.2fr_0.8fr] md:py-10">
            <div data-reveal className="reveal-lift">
              <span className="inline-flex items-center rounded-full border border-brand-accent/50 bg-brand-accent/15 px-3 py-1 text-xs font-bold uppercase tracking-[0.08em] text-[#F5D573]">
                Especialista em torra e venda de café
              </span>

              <h1 className="mt-4 max-w-4xl text-4xl font-black leading-[1.03] sm:text-5xl lg:text-6xl">
                Qualidade de torra com visual premium e entrega que gira junto
                com o seu negócio.
              </h1>

              <p className="mt-4 max-w-3xl text-base text-brand-muted sm:text-xl">
                Catálogo alimentado pelo cadastro real do sistema: os produtos
                marcados para aparecer na página inicial entram aqui com
                descrição, valor de venda e imagem configurados no backoffice.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <a
                  href={WHATSAPP_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-brand-accent px-5 py-3 font-bold text-brand-panel transition duration-300 hover:-translate-y-0.5 hover:bg-brand-accent-soft"
                >
                  <WhatsAppIcon />
                  Fazer pedido no WhatsApp
                </a>
                <a
                  href="#produtos"
                  className="inline-flex items-center justify-center rounded-2xl border border-brand-accent/70 px-5 py-3 font-semibold text-brand-accent transition duration-300 hover:-translate-y-0.5 hover:bg-brand-accent/10"
                >
                  Ver produtos em destaque
                </a>
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                {[
                  "Lotes consistentes",
                  "Produção orientada por dados",
                  "Entrega regional",
                ].map((item) => (
                  <span
                    key={item}
                    className="rounded-full border border-brand-muted/30 bg-brand-deep/55 px-3 py-1 text-xs font-medium text-[#dce4e1]"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>

            <div
              data-reveal
              data-reveal-delay="120"
              className="reveal-rise motion-card rounded-[1.6rem] border border-brand-accent/30 bg-gradient-to-br from-brand-deep/95 to-brand-panel/95 p-3 shadow-[0_24px_44px_rgba(0,0,0,0.33)] animate-hero-float"
            >
              <img
                src="https://images.unsplash.com/photo-1559496417-e7f25cb247f3?auto=format&fit=crop&w=1200&q=80"
                alt="Café em torra"
                className="h-72 w-full rounded-2xl object-cover"
              />
              <div className="space-y-2 p-3">
                <h2 className="text-xl font-bold">
                  Torra artesanal com escala profissional
                </h2>
                <p className="text-sm text-brand-muted">
                  Curva de torra controlada, perfil sensorial definido e
                  planejamento de reposição para cada cliente.
                </p>
              </div>
            </div>
          </section>

          <section
            data-reveal
            data-reveal-delay="120"
            className="reveal-fade mt-2 overflow-hidden rounded-2xl border border-brand-muted/25 bg-brand-panel/70 py-3"
          >
            <div className="marquee-track">
              {[...movingHighlights, ...movingHighlights].map((item, index) => (
                <span key={`${item}-${index}`} className="marquee-chip">
                  <span className="h-1.5 w-1.5 rounded-full bg-brand-accent" />
                  {item}
                </span>
              ))}
            </div>
          </section>

          <section id="produtos" className="scroll-mt-24 pt-8 md:pt-10">
            <div data-reveal className="reveal-lift">
              <p className="text-sm font-extrabold uppercase tracking-[0.08em] text-brand-accent">
                Produtos em destaque
              </p>
              <h3 className="mt-1 text-3xl font-black sm:text-4xl">
                Lista dinâmica vinda do cadastro de insumos
              </h3>
              <p className="mt-2 text-brand-muted">
                Apenas os itens com o campo de exibição habilitado aparecem
                nesta vitrine pública.
              </p>
            </div>

            {!products.length ? (
              <div
                data-reveal
                className="reveal-rise mt-5 rounded-3xl border border-dashed border-brand-muted/35 bg-brand-deep/60 p-6 text-center"
              >
                <p className="text-lg font-bold">
                  Nenhum produto em destaque cadastrado no momento.
                </p>
                <p className="mt-2 text-sm text-brand-muted">
                  Marque um insumo com a opção de exibição na página inicial
                  para publicar a vitrine automaticamente.
                </p>
                {homeProductsLoadError ? (
                  <p className="mt-2 text-sm text-[#FDE8AA]">
                    A página carregou, mas não foi possível consultar os
                    produtos destacados agora.
                  </p>
                ) : null}
              </div>
            ) : (
              <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {products.map((product, index) => (
                  <article
                    key={product.id}
                    data-reveal
                    data-reveal-delay={String(70 + (index % 3) * 90)}
                    className="reveal-rise motion-card group relative overflow-hidden rounded-3xl border border-brand-muted/25 bg-brand-deep/80 shadow-[0_14px_28px_rgba(0,0,0,0.28)]"
                  >
                    <div className="shimmer-layer pointer-events-none absolute inset-0 z-20" />
                    <img
                      src={
                        normalizeImageBase64(
                          product.imagem_pagina_inicial_base64,
                        ) || DEFAULT_HOME_PRODUCT_IMAGE
                      }
                      alt={product.nome}
                      className="h-48 w-full object-cover"
                      loading="lazy"
                    />
                    <div className="space-y-3 p-4">
                      <div className="flex items-center justify-between gap-2">
                        <span className="rounded-full border border-brand-accent/35 bg-brand-accent/20 px-2.5 py-1 text-xs font-bold text-[#FDE8AA]">
                          {product.unidade_label || product.unidade_codigo}
                        </span>
                        <span className="text-xs text-brand-muted">
                          {product.pode_ser_produzivel
                            ? "Produzido internamente"
                            : "Selecionado para venda"}
                        </span>
                      </div>

                      <h4 className="text-xl font-extrabold leading-tight">
                        {product.nome}
                      </h4>
                      <p className="min-h-[2.6rem] text-sm text-brand-muted">
                        {product.descricao ||
                          "Produto disponível para pedido via WhatsApp."}
                      </p>

                      <div className="flex items-end justify-between border-t border-brand-divider/80 pt-3">
                        <div>
                          <p className="text-base font-extrabold text-brand-accent">
                            {formatProductPrice(
                              product.valor_venda,
                              product.unidade_codigo,
                              product.unidade_label,
                            )}
                          </p>
                          <p className="text-xs text-brand-muted">
                            Estoque configurado no sistema e exibição controlada
                            pelo cadastro.
                          </p>
                        </div>
                        <a
                          href={buildProductWhatsAppUrl(product.nome)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-xl px-3 py-1.5 text-sm font-semibold text-brand-accent transition duration-300 hover:bg-brand-accent/12"
                        >
                          Pedir
                        </a>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="pt-10 md:pt-14">
            <div data-reveal className="reveal-lift">
              <p className="text-sm font-extrabold uppercase tracking-[0.08em] text-brand-accent">
                Diferenciais
              </p>
              <h3 className="mt-1 text-3xl font-black sm:text-4xl">
                Operação desenhada para consistência e escala
              </h3>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-3">
              {features.map((item, index) => (
                <article
                  key={item.id}
                  data-reveal
                  data-reveal-delay={String(80 + index * 90)}
                  className="reveal-rise motion-card rounded-3xl border border-brand-muted/25 bg-brand-deep/75 p-5"
                >
                  <div className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-brand-accent text-brand-panel">
                    <FeatureIcon id={item.id} />
                  </div>
                  <h4 className="mt-3 text-xl font-bold">{item.titulo}</h4>
                  <p className="mt-1 text-sm text-brand-muted">
                    {item.descricao}
                  </p>
                </article>
              ))}
            </div>
          </section>

          <section className="pt-10 md:pt-14">
            <div data-reveal className="reveal-lift">
              <p className="text-sm font-extrabold uppercase tracking-[0.08em] text-brand-accent">
                Processo da Torra
              </p>
              <h3 className="mt-1 text-3xl font-black sm:text-4xl">
                Fluxo técnico da seleção ao envio
              </h3>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {roastSteps.map((step, index) => (
                <article
                  key={step.titulo}
                  data-reveal
                  data-reveal-delay={String(90 + index * 80)}
                  className="reveal-rise motion-card relative overflow-hidden rounded-3xl border border-brand-muted/25 bg-brand-panel/85 p-5"
                >
                  <div className="pointer-events-none absolute right-0 top-0 h-24 w-24 rounded-full bg-brand-accent/12 blur-2xl" />
                  <div className="relative z-10">
                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-brand-accent/60 bg-brand-accent/20 text-sm font-extrabold text-brand-accent">
                      {index + 1}
                    </span>
                    <h4 className="mt-3 text-lg font-bold">{step.titulo}</h4>
                    <p className="mt-1 text-sm text-brand-muted">
                      {step.descricao}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="grid gap-4 pt-10 md:grid-cols-[0.95fr_1.05fr] md:pt-14">
            <div
              data-reveal
              className="reveal-rise rounded-3xl border border-brand-accent/35 bg-brand-deep/80 p-5 sm:p-6"
            >
              <p className="text-sm font-extrabold uppercase tracking-[0.08em] text-brand-accent">
                Contato e Localizacao
              </p>
              <h3 className="mt-2 text-3xl font-black">
                Fale com a equipe comercial agora
              </h3>
              <p className="mt-2 text-brand-muted">
                Atendimento direto para pedido, tabela por volume, condições de
                entrega e reposição recorrente.
              </p>

              <div className="mt-5 space-y-2.5">
                <a
                  href={WHATSAPP_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-accent px-4 py-3 font-bold text-brand-panel transition duration-300 hover:-translate-y-0.5 hover:bg-brand-accent-soft sm:justify-start"
                >
                  <WhatsAppIcon />
                  WhatsApp: (34) 99239-9036
                </a>

                <a
                  href={MAPS_PLACE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex w-full items-center justify-center rounded-2xl border border-brand-accent/65 px-4 py-3 font-semibold text-brand-accent transition duration-300 hover:-translate-y-0.5 hover:bg-brand-accent/12 sm:justify-start"
                >
                  Abrir no Google Maps
                </a>
              </div>

              <div className="mt-4 rounded-2xl border border-dashed border-brand-muted/40 p-3.5">
                <p className="text-sm font-bold">Localização temporária</p>
                <p className="mt-1 text-sm text-brand-muted">
                  {LOCATION_LABEL}
                </p>
              </div>
            </div>

            <div
              data-reveal
              data-reveal-delay="120"
              className="reveal-rise overflow-hidden rounded-3xl border border-brand-muted/30 shadow-[0_16px_34px_rgba(0,0,0,0.3)] min-h-[320px] md:min-h-[430px]"
            >
              <iframe
                title="Mapa da loja"
                src={MAPS_EMBED_URL}
                loading="lazy"
                className="h-full w-full border-0"
              />
            </div>
          </section>

          <footer
            data-reveal
            className="reveal-fade mt-10 flex flex-col items-start justify-between gap-2 border-t border-brand-muted/25 pt-4 text-sm md:mt-14 md:flex-row md:items-center"
          >
            <p className="text-brand-muted">
              Café Essências do Brasil 2026 | Torra, venda e distribuição
              regional de café.
            </p>
            <p className="inline-flex items-center gap-1.5 text-brand-muted">
              <span className="text-brand-accent">
                <BadgeIcon />
              </span>
              Interface leve, responsiva e pronta para conversão.
            </p>
          </footer>
        </div>

        <a
          href={WHATSAPP_URL}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Abrir WhatsApp"
          className="whatsapp-float fixed bottom-4 right-4 z-20 inline-flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-[#07210F] shadow-[0_12px_28px_rgba(0,0,0,0.4)] transition hover:bg-[#1DBB5A] sm:bottom-6 sm:right-6"
        >
          <WhatsAppIcon />
        </a>
      </main>
    </>
  );
};

export async function getServerSideProps() {
  try {
    const { query } = await import("../infra/database");
    const result = await query(`
      SELECT
        i.id,
        i.nome,
        i.descricao,
        i.valor_venda,
        i.imagem_pagina_inicial_base64,
        i.pode_ser_produzivel,
        u.codigo AS unidade_codigo,
        u.label AS unidade_label
      FROM insumos i
      LEFT JOIN aux_unidade u ON u.id = i.unidade_id
      WHERE i.ativo = true
        AND i.pode_ser_vendido = true
        AND i.aparecer_pagina_inicial = true
      ORDER BY i.criado_em DESC, i.nome ASC
    `);

    return {
      props: {
        products: result.rows.map((row) => ({
          id: row.id,
          nome: row.nome,
          descricao: String(row.descricao || "").trim(),
          valor_venda: Number(row.valor_venda) || 0,
          imagem_pagina_inicial_base64:
            row.imagem_pagina_inicial_base64 || "",
          pode_ser_produzivel: Boolean(row.pode_ser_produzivel),
          unidade_codigo: row.unidade_codigo || "KG",
          unidade_label: row.unidade_label || "Quilograma",
        })),
        homeProductsLoadError: false,
      },
    };
  } catch (error) {
    return {
      props: {
        products: [],
        homeProductsLoadError: true,
      },
    };
  }
}

export default IndexPage;
