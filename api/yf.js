// Vercel serverless function — proxy Yahoo Finance (contourne le CORS)
// Appelé via /api/yf?__path=v8/finance/chart/AAPL&interval=1d&range=1d
// (la réécriture dans vercel.json transforme /api/yf/* en /api/yf?__path=...)
module.exports = async function handler(req, res) {
  const yfpath = req.query.__path || "";
  const params = { ...req.query };
  delete params.__path;

  const qs    = new URLSearchParams(params).toString();
  const yfUrl = `https://query1.finance.yahoo.com/${yfpath}${qs ? "?" + qs : ""}`;

  try {
    const upstream = await fetch(yfUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
          "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
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
};
