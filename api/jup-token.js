const NATIVE_SOL_MINT = '11111111111111111111111111111111';
const WSOL_MINT       = 'So11111111111111111111111111111111111111112';

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGIN ?? '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-api-key');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const expectedKey = process.env.ADMIN_DASHBOARD_API_KEY;
  if (expectedKey && req.headers['x-api-key'] !== expectedKey) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { mint } = req.query;
  if (!mint) return res.status(400).json({ error: 'Missing mint param' });

  // Native SOL — return hardcoded metadata + live price via wSOL
  if (mint === NATIVE_SOL_MINT) {
    try {
      const priceRes = await fetch(`https://lite-api.jup.ag/price/v2?ids=${WSOL_MINT}`).then(r => r.json());
      const priceUsd = priceRes?.data?.[WSOL_MINT]?.price != null ? Number(priceRes.data[WSOL_MINT].price) : null;
      return res.status(200).json({
        symbol: 'SOL',
        name: 'Solana',
        logoURI: `https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/${WSOL_MINT}/logo.png`,
        priceUsd,
        totalSupply: null,
      });
    } catch {
      return res.status(200).json({ symbol: 'SOL', name: 'Solana', logoURI: null, priceUsd: null, totalSupply: null });
    }
  }

  const rpcUrl = process.env.HELIUS_RPC_SECRET_URL;

  const [assetRes, priceRes] = await Promise.allSettled([
    // Helius DAS — works for any Solana token, verified or not
    rpcUrl
      ? fetch(rpcUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            method: 'getAsset',
            params: { id: mint },
          }),
        }).then((r) => r.json())
      : Promise.reject('no rpc'),
    // Jupiter price API
    fetch(`https://lite-api.jup.ag/price/v2?ids=${mint}`)
      .then((r) => r.json()),
  ]);

  let symbol = null, name = null, logoURI = null, totalSupply = null;
  if (assetRes.status === 'fulfilled' && !assetRes.value.error) {
    const asset = assetRes.value.result;
    symbol   = asset?.content?.metadata?.symbol ?? null;
    name     = asset?.content?.metadata?.name   ?? null;
    logoURI  = asset?.content?.links?.image     ?? null;

    const rawSupply = asset?.token_info?.supply  ?? null;
    const decimals  = asset?.token_info?.decimals ?? 0;
    if (rawSupply != null) totalSupply = Number(rawSupply) / Math.pow(10, decimals);
  }

  const priceData = priceRes.status === 'fulfilled' ? priceRes.value : null;
  const priceUsd  = priceData?.data?.[mint]?.price != null
    ? Number(priceData.data[mint].price)
    : null;

  return res.status(200).json({ symbol, name, logoURI, priceUsd, totalSupply });
};
