const https = require('https');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const body = JSON.stringify(req.body);

  return new Promise((resolve) => {
    const options = {
      hostname: 'lite-api.jup.ag',
      path: '/swap/v1/swap',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
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
      res.status(500).json({ error: err.message || 'Swap request failed' });
      resolve(null);
    });

    req2.write(body);
    req2.end();
  });
};
