export default async function handler(req, res) {
  // Reconstruct the Yahoo Finance path + query string
  const segments = Array.isArray(req.query.path) ? req.query.path : [req.query.path];
  const pathStr  = segments.join("/");

  const params = { ...req.query };
  delete params.path;
  const qs    = new URLSearchParams(params).toString();
  const yfUrl = `https://query1.finance.yahoo.com/${pathStr}${qs ? "?" + qs : ""}`;

  try {
    const upstream = await fetch(yfUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "application/json",
      },
    });

    if (!upstream.ok) {
      return res.status(upstream.status).end();
    }

    const data = await upstream.json();
    res.setHeader("Cache-Control", "public, max-age=60, stale-while-revalidate=120");
    res.json(data);
  } catch (e) {
    res.status(502).json({ error: e.message });
  }
}
