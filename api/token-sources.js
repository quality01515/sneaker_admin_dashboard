const VANISH_PROGRAM = 'vanshF62ku4jVVdf8DS47SXuJC1rq8qokGSANAomhey';

function unknown(name, address) {
  return { name, address, classification: 'unknown', txSignature: null, source: null, type: null, fromUserAccount: null, recentTxs: [] };
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGIN ?? '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-api-key');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const expectedKey = process.env.ADMIN_DASHBOARD_API_KEY;
  if (expectedKey && req.headers['x-api-key'] !== expectedKey) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const rpcUrl = process.env.HELIUS_RPC_SECRET_URL;
  if (!rpcUrl) return res.status(503).json({ error: 'RPC not configured' });

  const { accounts, mint } = req.body;
  if (!Array.isArray(accounts) || !mint) {
    return res.status(400).json({ error: 'Missing accounts or mint' });
  }

  const results = await Promise.all(
    accounts.map(async ({ name, address, tokenAcctPubkey }) => {
      if (!tokenAcctPubkey) return unknown(name, address);

      try {
        const sigsResp = await fetch(rpcUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0', id: 1,
            method: 'getSignaturesForAddress',
            params: [tokenAcctPubkey, { limit: 25, commitment: 'confirmed' }],
          }),
        });
        if (!sigsResp.ok) return unknown(name, address);
        const sigsData = await sigsResp.json();
        const sigs = sigsData.result ?? [];
        if (!sigs.length) return unknown(name, address);

        const batchResp = await fetch(rpcUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(
            sigs.map((s, i) => ({
              jsonrpc: '2.0', id: i + 1,
              method: 'getTransaction',
              params: [s.signature, { encoding: 'jsonParsed', maxSupportedTransactionVersion: 0, commitment: 'confirmed' }],
            }))
          ),
        });
        if (!batchResp.ok) return unknown(name, address);
        const batchData = await batchResp.json();
        const txs = (Array.isArray(batchData) ? batchData : [])
          .map(r => ({ sig: sigs[r.id - 1]?.signature, tx: r.result }))
          .filter(r => r.tx);

        const recentTxs = [];
        let firstInbound = null;

        for (const { sig, tx } of txs) {
          const accountKeys  = tx.transaction?.message?.accountKeys ?? [];
          const preBalances  = tx.meta?.preTokenBalances  ?? [];
          const postBalances = tx.meta?.postTokenBalances ?? [];
          const timestamp    = tx.blockTime ?? null;
          const hasVanish    = accountKeys.some(k => k.pubkey === VANISH_PROGRAM);

          const ourKeyIdx = accountKeys.findIndex(k => k.pubkey === tokenAcctPubkey);
          if (ourKeyIdx < 0) continue;

          const ourPre  = preBalances.find(b  => b.accountIndex === ourKeyIdx)?.uiTokenAmount?.uiAmount ?? 0;
          const ourPost = postBalances.find(b => b.accountIndex === ourKeyIdx)?.uiTokenAmount?.uiAmount ?? 0;
          const delta   = ourPost - ourPre;

          if (Math.abs(delta) < 0.000001) continue;

          const isIn          = delta > 0;
          const classification = hasVanish ? 'trade' : 'deposit';
          const typeLabel      = hasVanish ? 'SWAP' : 'TRANSFER';

          const senderOwner = isIn ? (() => {
            const senderEntry = preBalances.find(b => {
              if (b.accountIndex === ourKeyIdx || b.mint !== mint) return false;
              const postB = postBalances.find(pb => pb.accountIndex === b.accountIndex);
              return (b.uiTokenAmount?.uiAmount ?? 0) > (postB?.uiTokenAmount?.uiAmount ?? 0);
            });
            return senderEntry?.owner ?? null;
          })() : null;

          recentTxs.push({
            signature: sig, timestamp, type: typeLabel, source: null,
            amount: Math.abs(delta), direction: isIn ? 'in' : 'out',
            fromUserAccount: isIn && !hasVanish ? senderOwner : null,
            toUserAccount: isIn ? address : null,
          });

          if (isIn && !firstInbound) {
            firstInbound = { classification, typeLabel, sig, senderOwner };
          }

          if (recentTxs.length >= 8) break;
        }

        if (!firstInbound) return { ...unknown(name, address), recentTxs };

        return {
          name, address,
          classification:  firstInbound.classification,
          txSignature:     firstInbound.sig,
          source:          null,
          type:            firstInbound.typeLabel,
          fromUserAccount: firstInbound.senderOwner,
          recentTxs,
        };

      } catch {
        return unknown(name, address);
      }
    })
  );

  return res.status(200).json({ results });
};
