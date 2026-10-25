const { kv } = require('@vercel/kv');

const KV_KEY = 'latency_points';
const ONE_HOUR_MS = 60 * 60 * 1000;

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method === 'GET') {
    try {
      const raw = await kv.get(KV_KEY);
      const points = Array.isArray(raw) ? raw : [];
      const cutoff = Date.now() - ONE_HOUR_MS;
      return res.status(200).json(points.filter(p => p.ts >= cutoff));
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  if (req.method === 'POST') {
    try {
      const { label, ms, ts } = req.body ?? {};
      if (typeof ms !== 'number' || !label || typeof ts !== 'number') {
        return res.status(400).json({ error: 'Missing fields' });
      }
      const cutoff = Date.now() - ONE_HOUR_MS;
      const raw = await kv.get(KV_KEY);
      const points = Array.isArray(raw) ? raw.filter(p => p.ts >= cutoff) : [];
      points.push({ label, ms, ts });
      // Keep at most 200 entries; TTL 2h so stale data self-clears
      await kv.set(KV_KEY, points.slice(-200), { ex: 7200 });
      return res.status(200).json({ ok: true });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
