const ACCOUNTS = [
  { id: 1,  name: 'Account #1',  address: '7ozoNcVqgptbAUHjLR1vNHgEfKiE5aYufStEHzJhxKeG' },
  { id: 2,  name: 'Account #2',  address: 'DM1kVwqbNJYeDgKn2T3UbCHqquSh3PAYHJpRYfTCcbrK' },
  { id: 3,  name: 'Account #3',  address: '2bxLnNUgnbf7d4CX4sfdY2YoJkKirNc5FHE6awRwKKYY' },
  { id: 4,  name: 'Account #4',  address: '3PMpWWXCVUrkhHpFWPH1prxBYxQ4SV4rucJchYRSBojH' },
  { id: 5,  name: 'Account #5',  address: '8MjKXQgj97NPVNhj9gJrQNP7BibGCGkFMVJ2qZsC58E'  },
  { id: 6,  name: 'Account #6',  address: 'Evamno6in8wQGBKUnVbu3FQV5eNwn2ttE5456yDbnodR' },
  { id: 7,  name: 'Account #7',  address: '49zHSpdFZaSc92ygkooaMGVeeriLSXX5ujriDWVxTwVS' },
  { id: 8,  name: 'Account #8',  address: '37p56C7BLiMyG2jEa7zTNSewj94C34SuFEnxnRZ87kWw' },
  { id: 9,  name: 'Account #9',  address: '2QbCx4cTy11nv5FieXJkAKPvSVGdFcZPFdDMTo9vEfqm' },
  { id: 10, name: 'Account #10', address: '7juKfkXpvYHqjhxwK1Se2Mod96hHETHNduC9BMxBdxyt' },
];

// Native SOL — entered as the System Program address since SOL has no SPL mint
const NATIVE_SOL_MINT = '11111111111111111111111111111111';

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGIN ?? '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-api-key');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const expectedKey = process.env.ADMIN_DASHBOARD_API_KEY;
  if (expectedKey && req.headers['x-api-key'] !== expectedKey) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const rpcUrl = process.env.HELIUS_RPC_SECRET_URL;
  if (!rpcUrl) return res.status(503).json({ error: 'RPC not configured' });

  const { mint } = req.query;
  if (!mint) return res.status(400).json({ error: 'Missing mint param' });

  // Native SOL: batch getBalance calls (lamports, 9 decimals)
  if (mint === NATIVE_SOL_MINT) {
    const batch = ACCOUNTS.map((acct, i) => ({
      jsonrpc: '2.0',
      id: i + 1,
      method: 'getBalance',
      params: [acct.address, { commitment: 'confirmed' }],
    }));

    try {
      const rpcRes = await fetch(rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(batch),
      });
      const data = await rpcRes.json();

      const accounts = ACCOUNTS.map((acct, i) => {
        const entry = Array.isArray(data) ? data.find((r) => r.id === i + 1) : null;
        if (!entry || entry.error) return { ...acct, balance: null, tokenAcctPubkey: null, error: true };
        const lamports = entry.result?.value ?? 0;
        return { ...acct, balance: lamports / 1e9, tokenAcctPubkey: null, error: false };
      });

      return res.status(200).json({ accounts });
    } catch (err) {
      return res.status(500).json({ error: err.message ?? 'RPC request failed' });
    }
  }

  // SPL token: batch getTokenAccountsByOwner
  const batch = ACCOUNTS.map((acct, i) => ({
    jsonrpc: '2.0',
    id: i + 1,
    method: 'getTokenAccountsByOwner',
    params: [acct.address, { mint }, { encoding: 'jsonParsed' }],
  }));

  try {
    const rpcRes = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(batch),
    });
    const data = await rpcRes.json();

    const accounts = ACCOUNTS.map((acct, i) => {
      const entry = Array.isArray(data) ? data.find((r) => r.id === i + 1) : null;
      if (!entry || entry.error) return { ...acct, balance: null, error: true };
      const tokenAccts = entry.result?.value ?? [];
      const balance = tokenAccts.reduce((sum, a) => {
        return sum + (a.account?.data?.parsed?.info?.tokenAmount?.uiAmount ?? 0);
      }, 0);
      const tokenAcctPubkey = tokenAccts.length > 0 ? tokenAccts[0].pubkey : null;
      return { ...acct, balance, tokenAcctPubkey, error: false };
    });

    return res.status(200).json({ accounts });
  } catch (err) {
    return res.status(500).json({ error: err.message ?? 'RPC request failed' });
  }
};
