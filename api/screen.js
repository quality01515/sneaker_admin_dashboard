const crypto = require('crypto');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.ELLIPTIC_API_KEY;
  const apiSecret = process.env.ELLIPTIC_API_SECRET;

  if (!apiKey || !apiSecret) {
    return res.status(503).json({ error: 'Screening service credentials not configured.' });
  }

  const { type, hash } = req.body ?? {};
  if (!hash || !type) return res.status(400).json({ error: 'Missing required fields: type, hash' });

  const isTransaction = type === 'transaction';
  const path = isTransaction ? '/v2/transaction/synchronous' : '/v2/wallet/synchronous';

  const body = JSON.stringify({
    subject: {
      asset: 'SOL',
      type: isTransaction ? 'transaction' : 'address',
      hash,
      blockchain: 'solana',
    },
    type: isTransaction ? 'transaction_screening' : 'wallet_exposure',
  });

  const timestamp = Date.now().toString();
  const signingString = timestamp + 'POST' + path.toLowerCase() + body;

  // Elliptic secret is base64-encoded key bytes — decode before use as HMAC key
  const secretBuffer = Buffer.from(apiSecret, 'base64');
  const signature = crypto.createHmac('sha256', secretBuffer).update(signingString).digest('base64');

  // Debug: log key length, timestamp, and first 20 chars of signature (never logs the secret itself)
  console.log('[screen] keyLen:', apiKey.length, 'secretLen:', apiSecret.length,
    'ts:', timestamp, 'path:', path, 'bodyLen:', body.length,
    'sig:', signature.substring(0, 20) + '...');

  try {
    const response = await fetch(`https://aml-api.elliptic.co${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-access-key': apiKey,
        'x-access-sign': signature,
        'x-access-timestamp': timestamp,
      },
      body,
    });

    let data;
    try { data = await response.json(); } catch { data = {}; }

    console.log('[screen] elliptic status:', response.status, 'risk_score:', data.risk_score,
      'blockchain_info:', JSON.stringify(data.blockchain_info ?? null),
      'triggers:', (data.triggers ?? []).length);

    if (!response.ok) {
      return res.status(response.status).json({ error: data.message ?? data.error ?? `Screening request failed (${response.status})` });
    }

    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message ?? 'Screening request failed' });
  }
};
