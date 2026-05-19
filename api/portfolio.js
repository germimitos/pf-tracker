// Vercel KV (Upstash Redis) — stockage du portefeuille
// Nécessite KV_REST_API_URL + KV_REST_API_TOKEN (injectés par Vercel quand la KV store est liée)
const KV_URL   = process.env.KV_REST_API_URL;
const KV_TOKEN = process.env.KV_REST_API_TOKEN;

async function kvCommand(cmd) {
  const res = await fetch(KV_URL, {
    method:  "POST",
    headers: {
      Authorization:  `Bearer ${KV_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(cmd),
  });
  if (!res.ok) throw new Error(`KV ${res.status}`);
  return res.json();
}

module.exports = async function handler(req, res) {
  if (!KV_URL || !KV_TOKEN) {
    return res.status(503).json({ error: "Database not configured" });
  }

  // GET — charge le portefeuille
  if (req.method === "GET") {
    try {
      const { result } = await kvCommand(["GET", "portfolio"]);
      return res.json(result ? JSON.parse(result) : null);
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  // POST — sauvegarde le portefeuille
  if (req.method === "POST") {
    try {
      const { pea, ct } = req.body ?? {};
      if (!pea || !ct) {
        return res.status(400).json({ error: "Payload invalide" });
      }
      await kvCommand(["SET", "portfolio", JSON.stringify({ pea, ct })]);
      return res.json({ ok: true });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  res.status(405).end();
};
