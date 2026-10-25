const https = require('https');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { inputMint, outputMint, amount, slippageBps } = req.query;
  if (!inputMint || !outputMint || !amount) {
    return res.status(400).json({ error: 'Missing required params' });
  }

  const path = `/swap/v1/quote?inputMint=${inputMint}&outputMint=${outputMint}&amount=${amount}&slippageBps=${slippageBps ?? 50}`;

  return new Promise((resolve) => {
    const options = {
      hostname: 'lite-api.jup.ag',
      path,
      method: 'GET',
      headers: { Accept: 'application/json' },
    };

    const req2 = https.request(options, (resp) => {
      let data = '';
      resp.on('data', (chunk) => { data += chunk; });
      resp.on('end', () => {
        try {
          const json = JSON.parse(data);
          res.status(resp.statusCode || 200).json(json);
        } catch {
          res.status(500).json({ error: 'Invalid JSON from Jupiter' });
        }
        resolve(null);
      });
    });

    req2.on('error', (err) => {
      res.status(500).json({ error: err.message || 'Quote request failed' });
      resolve(null);
    });

    req2.end();
  });
};
