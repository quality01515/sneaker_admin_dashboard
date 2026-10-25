module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const rpcUrl = process.env.HELIUS_RPC_SECRET_URL;
  if (!rpcUrl) return res.status(503).json({ error: 'RPC not configured' });

  const { address } = req.query;
  if (!address) return res.status(400).json({ error: 'Missing address' });

  try {
    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'getBalance', params: [address] }),
    });
    const data = await response.json();
    const lamports = data?.result?.value ?? 0;
    return res.status(200).json({ sol: lamports / 1e9 });
  } catch (err) {
    return res.status(500).json({ error: err.message ?? 'RPC request failed' });
  }
};
