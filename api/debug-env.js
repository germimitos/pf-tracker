// Endpoint temporaire de diagnostic — liste les noms des variables d'env disponibles
// À supprimer une fois la KV configurée
module.exports = function handler(req, res) {
  const kvVars = Object.keys(process.env).filter(
    (k) => k.includes("KV") || k.includes("UPSTASH") || k.includes("REDIS")
  );
  res.json({
    found: kvVars,
    kv_rest_api_url_set:   !!process.env.KV_REST_API_URL,
    kv_rest_api_token_set: !!process.env.KV_REST_API_TOKEN,
  });
};
