import { query } from "../../../../infra/database";
import { conversaoCripto } from "../../../../utils/crypto";

const INTEGRACOES = ["asaas", "resend"];

export default async function handler(req, res) {
  if (req.method === "GET") {
    try {
      const result = await query(
        "SELECT provedor FROM empresa_configuracao_integracoes",
      );

      const integracoes = INTEGRACOES.map((provedor) => ({
        provedor,
        configurado: result.rows.some((item) => item.provedor === provedor),
      }));

      return res.status(200).json({ integracoes });
    } catch (error) {
      return res.status(500).json({ error: "Erro ao carregar integrações." });
    }
  }

  if (req.method === "PUT") {
    const provedor = String(req.body?.provedor || "")
      .trim()
      .toLowerCase();
    const chave = String(req.body?.chave || "").trim();

    if (!INTEGRACOES.includes(provedor)) {
      return res.status(400).json({ error: "Provedor inválido." });
    }

    if (!chave) {
      return res.status(400).json({ error: "Informe a chave da integração." });
    }

    try {
      const chaveCriptografada = await conversaoCripto(chave);
      await query(
        `
        INSERT INTO empresa_configuracao_integracoes (provedor, chave_criptografada, atualizado_em)
        VALUES ($1, $2, now())
        ON CONFLICT (provedor)
        DO UPDATE SET chave_criptografada = EXCLUDED.chave_criptografada, atualizado_em = now()
        `,
        [provedor, chaveCriptografada],
      );

      return res.status(200).json({ provedor, configurado: true });
    } catch (error) {
      return res.status(500).json({ error: "Erro ao salvar integração." });
    }
  }

  res.setHeader("Allow", ["GET", "PUT"]);
  return res.status(405).json({ error: "Method not allowed" });
}
